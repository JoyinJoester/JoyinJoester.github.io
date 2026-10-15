/* WebAuthn helpers for the passkey pages.
 * There is no server: the challenge is generated in the page and we decode the
 * clientDataJSON to prove which origin/challenge the authenticator actually signed.
 * That is enough to answer "does a password manager offer to create/fill a passkey here"
 * — it is NOT enough to authenticate a real user, and this file never claims otherwise. */
(function () {
  'use strict';
  var PK = (window.PK = {});
  var STORE = 'pm.passkeys.v1';

  PK.rp = {
    id: location.hostname,
    name: 'PM Autofill Lab'
  };

  function rand(n) {
    var a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return a;
  }
  PK.rand = rand;

  function b64u(buf) {
    var bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  PK.b64u = b64u;

  function fromB64u(str) {
    var s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  PK.fromB64u = fromB64u;

  function textOf(arrBuf) {
    return new TextDecoder().decode(new Uint8Array(arrBuf));
  }
  PK.text = textOf;

  /* ------------------------------------------------------------------ store */
  PK.list = function () {
    try {
      return JSON.parse(localStorage.getItem(STORE) || '[]');
    } catch (e) {
      return [];
    }
  };
  PK.put = function (rec) {
    var all = PK.list();
    all = all.filter(function (r) {
      return r.id !== rec.id;
    });
    all.push(rec);
    localStorage.setItem(STORE, JSON.stringify(all));
    return all;
  };
  PK.remove = function (id) {
    var all = PK.list().filter(function (r) {
      return r.id !== id;
    });
    localStorage.setItem(STORE, JSON.stringify(all));
    return all;
  };
  PK.wipe = function () {
    localStorage.removeItem(STORE);
    return [];
  };

  /* ------------------------------------------------------------------ create */
  PK.createOptions = function (o) {
    var challenge = rand(32);
    var opt = {
      publicKey: {
        challenge: challenge,
        rp: PK.rp,
        user: {
          id: rand(16),
          name: o.userName || 'pm06@example.com',
          displayName: o.userDisplayName || 'PM Tester'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
          { type: 'public-key', alg: -8 }
        ],
        timeout: (o.timeoutSec || 60) * 1000,
        excludeCredentials: o.exclude
          ? PK.list().map(function (r) {
              return { id: fromB64u(r.id), type: 'public-key' };
            })
          : [],
        authenticatorSelection: {
          residentKey: o.residentKey || 'required',
          userVerification: o.userVerification || 'preferred'
        },
        attestation: o.attestation || 'none'
      }
    };
    if (o.attachment && o.attachment !== 'any') opt.publicKey.authenticatorSelection.authenticatorAttachment = o.attachment;
    return opt;
  };

  PK.getOptions = function (o) {
    var challenge = rand(32);
    var opt = {
      publicKey: {
        challenge: challenge,
        rpId: PK.rp.id,
        timeout: (o.timeoutSec || 60) * 1000,
        userVerification: o.userVerification || 'preferred'
      }
    };
    if (o.allowStored && PK.list().length) {
      opt.publicKey.allowCredentials = PK.list().map(function (r) {
        return { id: fromB64u(r.id), type: 'public-key' };
      });
    }
    if (o.mediation) opt.mediation = o.mediation;
    return opt;
  };

  PK.summarize = function (cred, challengeBytes) {
    var out = {
      id: cred.rawId ? b64u(cred.rawId) : '',
      type: cred.type,
      transports: [],
      clientData: {},
      attObject: null
    };
    try {
      out.clientData = JSON.parse(textOf(cred.response.clientDataJSON));
    } catch (e) {
      out.clientDataError = String(e);
    }
    if (cred.response.getAuthenticatorData) {
      var ad = new Uint8Array(cred.response.getAuthenticatorData());
      out.transports = cred.response.getTransports ? cred.response.getTransports() : [];
      out.aaguid = b64u(ad.slice(37, 53));
      out.counter = new DataView(ad.buffer, ad.byteOffset + 53, 4).getUint32(0);
      out.flags = {
        UP: !!(ad[32] & 0x01),
        UV: !!(ad[32] & 0x04),
        AT: !!(ad[32] & 0x40),
        BS: !!(ad[32] & 0x10)
      };
    }
    if (cred.response.attestationObject) {
      out.attFmt = textOf(cred.response.attestationObject).slice(0, 24).replace(/[^\x20-\x7e]/g, '.');
    }
    out.challengeMatches = challengeBytes ? b64u(challengeBytes) === out.clientData.challenge : null;
    return out;
  };

  var EXPLAIN = {
    NotAllowedError: '用户取消 / 超时 / 无可用认证器。跨平台密钥需要外接密钥或手机。',
    InvalidStateError: '该浏览器上下文已存在同名凭据（excludeCredentials 命中），或调用顺序不对。',
    NotSupportedError: '平台不支持该算法或 WebAuthn 被禁用。',
    SecurityError: '安全上下文或 RP ID 不合法。file:// 或 http:// 下一定失败。',
    NetworkError: '通常出现在 ctap2 / 智能卡读取失败。',
    AbortError: '调用被 signal 取消。',
    TypeError: '参数类型错误（常见于把 base64 字符串当成 BufferSource 传给 challenge）。',
    DataError: 'COSE 算法或扩展数据不被识别。'
  };
  PK.explain = function (err) {
    var name = err && err.name ? err.name : String(err);
    return {
      name: name,
      message: (err && err.message) || '',
      hint: EXPLAIN[name] || '未收录的错误，按原文排查。',
      stack: (err && err.stack || '').split('\n').slice(0, 3).join(' | ')
    };
  };
})();
