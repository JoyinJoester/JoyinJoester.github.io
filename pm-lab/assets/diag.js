/* PM autofill diagnostics engine.
 *
 * Answers three questions per field: was it filled at all, was it filled by
 * something other than the keyboard, and did the value match the fixture.
 *
 * Secret policy: values of password / cc-* / one-time-code fields are NEVER put
 * into the log or localStorage. Only lengths and character-class flags are kept.
 */
(function () {
  'use strict';

  var P = (window.PM = window.PM || {});
  var NAV_T0 = performance.now();
  /* Each document owns one log key, and every key must match /^pm\.diag\..*\.log$/ so
   * P.allLogs() can find it. An iframe that shares the parent's origin must not write
   * into the same array — both documents would clobber each other on flush. */
  var LOG_KEY = document.documentElement.getAttribute('data-pm-logkey') || 'pm.diag.main.log';
  var PREF_KEY = 'pm.diag.prefs.v1';
  var LOG_CAP = 800;
  var SECRET_RE = /(password|pass|pin|cvv|cvc|csc|one-time-code|cc-|ccnumber|secret|token|otp)/i;

  /* Collapsed by default — an open log panel sits on top of the very fields a
   * password manager is trying to fill. The counter in the bar stays live. */
  var prefs = read(PREF_KEY, { dock: false, reveal: false, quiet: false });
  P.prefs = prefs;

  /* ------------------------------------------------------------------ store */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* private mode / quota — diagnostics must not break the page */
    }
  }
  P.read = read;
  P.write = write;

  function session(key, fallback) {
    try {
      var raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  P.session = function (key, value) {
    if (value === undefined) return session('pm.session.' + key, null);
    try {
      sessionStorage.setItem('pm.session.' + key, JSON.stringify(value));
    } catch (e) {}
  };

  /* -------------------------------------------------------------------- env */
  P.env = function () {
    return {
      origin: location.origin,
      host: location.hostname,
      path: location.pathname,
      protocol: location.protocol,
      secure: window.isSecureContext,
      ua: navigator.userAgent,
      platform: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform,
      mobile: matchMedia('(max-width: 720px)').matches,
      view: innerWidth + 'x' + innerHeight,
      dpr: devicePixelRatio
    };
  };

  function flag(v) {
    return v ? 'yes' : 'no';
  }

  P.capabilities = function () {
    var out = [];
    function add(name, ok, note) {
      out.push({ name: name, ok: !!ok, note: note || '' });
    }
    add('window.isSecureContext', window.isSecureContext, flag(window.isSecureContext) + ' — passkey/WebAuthn 需要 true');
    add('navigator.credentials', !!navigator.credentials, 'Credential Management API');
    add('PublicKeyCredential', !!window.PublicKeyCredential, 'WebAuthn');
    add('PasswordCredential', !!window.PasswordCredential, '原生保存/自动填充密码');
    add('FederatedCredential', !!window.FederatedCredential, '已废弃，多数浏览器仍留桩');
    add('navigator.identity (FedCM)', !!(navigator.identity && navigator.identity.login), '联合身份登录');
    add('OTPCredential', !!window.OTPCredential, 'WebOTP');
    add('PaymentRequest', !!window.PaymentRequest, '支付请求');
    add('ContactFeatures (contactsSelect)', !!navigator.contacts, '通讯录选择器');
    add('navigator.storage.persist', !!(navigator.storage && navigator.storage.persist), '持久存储');
    if (window.PublicKeyCredential) {
      add('isConditionalMediationAvailable', !!PublicKeyCredential.isConditionalMediationAvailable, 'passkey 自动建议填充');
      try {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(function (avail) {
          updateCap('平台认证器 (TouchID/Windows Hello)', avail, avail ? '可创建平台 passkey' : '本机无平台认证器，用跨平台密钥测');
        });
      } catch (e) {}
      add('平台认证器 (TouchID/Windows Hello)', null, '检测中…');
    }
    var autofillSel = false;
    try {
      document.querySelector('input:autofill');
      autofillSel = true;
    } catch (e) {}
    add('CSS :autofill 伪类', autofillSel, autofillSel ? '可编程判断填充状态' : '不支持，退回 animationstart 探测');
    add('iframe 同域可测', true, 'file:// 下 origin 为 null，必须 http(s) 起服务');
    return out;
  };
  function updateCap(name, ok, note) {
    var cell = document.querySelector('[data-cap="' + cssEscape(name) + '"]');
    if (cell) renderCapCell(cell, { name: name, ok: ok, note: note });
  }

  function cssEscape(s) {
    return (window.CSS && CSS.escape && CSS.escape(s)) || s.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }
  function renderCapCell(cell, c) {
    cell.className = 'stat__v ' + (c.ok === null || c.ok === undefined ? '' : c.ok ? 'stat__v--ok' : 'stat__v--bad');
    cell.textContent = c.ok === null || c.ok === undefined ? '…' : c.ok ? 'SUPPORTED' : 'MISSING';
    var note = cell.parentNode.querySelector('[data-capnote="' + cssEscape(c.name) + '"]');
    if (note) note.textContent = c.note;
  }
  P.renderCapabilities = function (root) {
    if (!root) return;
    var caps = P.capabilities();
    root.innerHTML = caps
      .map(
        function (c) {
          return (
            '<div class="stat"><span class="stat__k">' +
            esc(c.name) +
            '</span><span class="stat__v" data-cap="' +
            esc(c.name) +
            '"></span></div>' +
            '<div class="caption" data-capnote="' +
            esc(c.name) +
            '" style="margin-top:-6px">' +
            esc(c.note) +
            '</div>'
          );
        },
        this
      )
      .join('');
    caps.forEach(function (c) {
      var cell = root.querySelector('[data-cap="' + cssEscape(c.name) + '"]');
      if (cell) renderCapCell(cell, c);
    });
  };

  /* -------------------------------------------------------------------- log */
  var logs = read(LOG_KEY, []);
  var listeners = [];

  function nowStamp() {
    return { ms: Date.now(), rel: Math.round(performance.now() - NAV_T0) };
  }

  P.log = function (kind, message, meta) {
    var t = nowStamp();
    var entry = {
      t: t.ms,
      rel: t.rel,
      page: location.pathname.replace(/\/+$/, '').split('/').pop() || '(root)',
      kind: kind,
      msg: message,
      meta: meta ? scrub(meta) : undefined
    };
    logs.push(entry);
    if (logs.length > LOG_CAP) logs = logs.slice(-LOG_CAP);
    write(LOG_KEY, logs);
    listeners.forEach(function (fn) {
      fn(entry);
    });
    return entry;
  };
  P.logs = function () {
    return logs.slice();
  };
  function logKeys() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (/^pm\.diag\..*\.log$/.test(k)) out.push(k);
      }
    } catch (e) {}
    return out;
  }
  /* Merged view across every document on this origin. Each document keeps its own
   * key so a parent page and its iframe cannot clobber each other's array. */
  P.allLogs = function () {
    var merged = [];
    logKeys().forEach(function (k) {
      var arr = read(k, []);
      if (Array.isArray(arr)) merged = merged.concat(arr);
    });
    return merged.sort(function (a, b) {
      return a.t - b.t || a.rel - b.rel;
    });
  };
  P.logKeys = logKeys;
  P.clearLogs = function () {
    logs = [];
    logKeys().forEach(function (k) {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
    write(LOG_KEY, logs);
    P.log('info', '日志已清空（含 iframe 日志）');
  };
  P.onLog = function (fn) {
    listeners.push(fn);
  };
  P.exportLogs = function () {
    return JSON.stringify({ env: P.env(), exported: new Date().toISOString(), entries: logs }, null, 2);
  };

  function scrub(meta) {
    var out = {};
    Object.keys(meta).forEach(function (k) {
      out[k] = meta[k];
    });
    return out;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  P.esc = esc;

  /* --------------------------------------------------------- value redaction */
  function isSecretDesc(d) {
    return (
      d.type === 'password' ||
      SECRET_RE.test(d.autocomplete || '') ||
      SECRET_RE.test(d.name || '') ||
      SECRET_RE.test(d.id || '')
    );
  }

  function describeValue(value, secret, forLog) {
    if (value === '' || value == null) return { text: '—', len: 0, secret: secret };
    var len = value.length;
    /* Secrets stay masked in the persisted log even when on-screen reveal is on. */
    if (secret && (!prefs.reveal || forLog)) {
      return { text: '●'.repeat(Math.min(12, len)) + '(len ' + len + ')', len: len, secret: true };
    }
    return { text: len > 40 ? value.slice(0, 40) + '…' : value, len: len, secret: secret };
  }
  P.describeValue = describeValue;

  /* --------------------------------------------------------- field registry */
  var registry = [];
  var manualRoots = [];

  /* A closed shadow root is invisible to document.querySelectorAll('*').shadowRoot,
   * so the page holding the reference can register it explicitly. */
  P.registerRoot = function (root) {
    if (!root) return false;
    if (manualRoots.indexOf(root) === -1) manualRoots.push(root);
    P.scan();
    return true;
  };
  P.manualRoots = function () {
    return manualRoots.slice();
  };

  function roots() {
    var list = [document];
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var sr = el.shadowRoot;
      if (sr && list.indexOf(sr) === -1) list.push(sr);
    }
    manualRoots.forEach(function (r) {
      if (list.indexOf(r) === -1) list.push(r);
    });
    var frames = document.querySelectorAll('iframe');
    for (var f = 0; f < frames.length; f++) {
      try {
        if (frames[f].contentDocument) list.push(frames[f].contentDocument);
      } catch (e) {
        /* cross-origin: intentionally unreachable */
      }
    }
    return list;
  }
  P.roots = roots;

  function selectorFor(el) {
    if (el.id) return '#' + el.id;
    var name = el.getAttribute('name');
    if (name) return '[name="' + name + '"]';
    return el.tagName.toLowerCase() + (el.type ? '[type=' + el.type + ']' : '');
  }

  function labelFor(el) {
    if (el.labels && el.labels.length) return { text: el.labels[0].textContent.trim(), via: 'label[for]' };
    var aria = el.getAttribute('aria-label');
    if (aria) return { text: aria.trim(), via: 'aria-label' };
    var ariaE = el.getAttribute('aria-labelledby');
    if (ariaE) {
      var ref = (el.getRootNode() || document).getElementById(ariaE);
      if (ref) return { text: ref.textContent.trim(), via: 'aria-labelledby' };
    }
    var wrap = el.closest && el.closest('label');
    if (wrap) return { text: wrap.textContent.trim(), via: 'label-wrap' };
    if (el.placeholder) return { text: el.placeholder.trim(), via: 'placeholder-only' };
    return { text: '', via: 'none' };
  }

  function visibility(el) {
    var cs = getComputedStyle(el);
    var hidden =
      el.type === 'hidden' ||
      el.hasAttribute('hidden') ||
      cs.display === 'none' ||
      cs.visibility === 'hidden' ||
      parseFloat(cs.opacity) === 0 ||
      el.offsetWidth < 4 ||
      el.offsetHeight < 4;
    if (hidden) return 'hidden';
    if (el.disabled) return 'disabled';
    if (el.readOnly) return 'readonly';
    if (el.tabIndex < 0) return 'untabbable';
    return 'visible';
  }

  function fieldDescriptor(el, root) {
    return {
      el: el,
      uid: el.getAttribute('data-pm-uid') || assignUid(el),
      tag: el.tagName.toLowerCase(),
      type: el.type || el.tagName.toLowerCase(),
      name: el.getAttribute('name') || '',
      id: el.id || '',
      autocomplete: (el.getAttribute('autocomplete') || '').toLowerCase(),
      inputmode: el.getAttribute('inputmode') || '',
      pattern: el.getAttribute('pattern') || '',
      placeholder: el.placeholder || '',
      form: el.form ? selectorFor(el.form) : '(no form)',
      label: labelFor(el),
      vis: visibility(el),
      inShadow: !!(root && root !== document && root.host),
      inFrame: !!(root && root !== document && root.defaultView && root.defaultView !== window),
      secret: null,
      want: el.getAttribute('data-pm-want') || null,
      value: '',
      state: 'empty',
      keydowns: 0,
      lastKeyAt: 0,
      lastInputAt: 0
    };
  }

  var uidSeq = 0;
  function assignUid(el) {
    var uid = 'pmf' + ++uidSeq;
    el.setAttribute('data-pm-uid', uid);
    return uid;
  }

  /* A checkbox's .value is the literal "on" whether or not it is ticked, so "has this
   * control got data" must be asked per type — otherwise every switch reads as filled. */
  function filled(d) {
    var t = d.type;
    if (t === 'checkbox' || t === 'radio') return !!d.el.checked;
    if (t === 'button' || t === 'submit' || t === 'image' || t === 'reset') return false;
    return !!d.el.value;
  }
  P.filled = filled;

  P.scan = function () {
    var found = [];
    roots().forEach(function (r) {
      var els = r.querySelectorAll('input, select, textarea');
      for (var i = 0; i < els.length; i++) {
        /* Tooling controls (log filters on the diagnostics page) must not show up as
         * test subjects — they would pollute the very timeline they are filtering. */
        if (els[i].hasAttribute('data-pm-ignore')) continue;
        var d = fieldDescriptor(els[i], r);
        d.secret = isSecretDesc(d);
        d.value = els[i].value;
        found.push(d);
      }
    });
    var byUid = {};
    registry.forEach(function (d) {
      byUid[d.uid] = d;
    });
    found.forEach(function (d) {
      var prev = byUid[d.uid];
      if (prev) {
        d.state = prev.state;
        d.keydowns = prev.keydowns;
        d.lastKeyAt = prev.lastKeyAt;
      }
    });
    registry = found;
    return registry.slice();
  };
  P.fields = function () {
    return registry.slice();
  };
  P.fieldByUid = function (uid) {
    for (var i = 0; i < registry.length; i++) if (registry[i].uid === uid) return registry[i];
    return null;
  };

  /* ------------------------------------------------------------ expectations */
  function expectations() {
    var node = document.querySelector('[data-pm-expected]');
    if (!node) return {};
    try {
      return JSON.parse(node.textContent);
    } catch (e) {
      return {};
    }
  }
  P.expected = expectations;

  function norm(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  }

  function evaluate() {
    var want = expectations();
    var results = [];
    var byKey = {};
    registry.forEach(function (d) {
      byKey[d.name || d.id] = d;
      if (d.id) byKey[d.id] = d;
    });
    var keys = Object.keys(want);
    if (!keys.length) {
      /* No fixture on this page (most edge-case pages): fall back to per-control
       * coverage so the bar still tells you which fields exist and which got data. */
      return {
        results: registry
          .filter(function (d) {
            return d.type !== 'hidden' && d.type !== 'submit' && d.type !== 'button' && d.type !== 'checkbox';
          })
          .map(function (d) {
            return {
              key: d.name || d.id || d.uid,
              uid: d.uid,
              present: true,
              ok: filled(d) && (d.state === 'autofilled' || d.state === 'filled' || d.state === 'match'),
              partial: false,
              wantLen: null,
              got: describeValue(d.el.value, d.secret, true)
            };
          }),
        scored: false
      };
    }
    keys.forEach(function (key) {
      var d = byKey[key];
      var exp = want[key];
      var got = d ? d.el.value : '';
      var secret = d ? d.secret : SECRET_RE.test(key);
      var ok = norm(got).toLowerCase() === norm(exp).toLowerCase();
      var partial = !ok && norm(got).length > 0 && norm(exp).toLowerCase().indexOf(norm(got).toLowerCase()) === 0;
      var res = {
        key: key,
        uid: d ? d.uid : null,
        present: !!d,
        ok: ok,
        partial: partial,
        wantLen: String(exp).length,
        got: describeValue(got, secret, true)
      };
      results.push(res);
      if (d && (d.state === 'match' || d.state === 'mismatch' || d.el.value || partial)) {
        setState(d, ok ? 'match' : got ? 'mismatch' : 'empty');
      }
    });
    return { results: results, scored: true };
  }

  P.evaluate = evaluate;

  P.check = function (opts) {
    var ev = evaluate();
    var results = ev.results;
    var passed = results.filter(function (r) { return r.ok; }).length;
    var total = results.length;
    if (ev.scored) {
      results.forEach(function (r) {
        var d = r.uid && P.fieldByUid(r.uid);
        if (!d) return;
        var got = d.el.value;
        setState(d, r.ok ? 'match' : got ? 'mismatch' : 'empty');
        msg(
          d,
          r.ok
            ? 'MATCH · 与 fixture 一致'
            : got
              ? 'MISMATCH · 期望 ' + r.wantLen + ' 字符 / 实得 ' + r.got.len
              : 'EMPTY · fixture 要求此字段被填充',
          r.ok ? 'ok' : got ? 'err' : ''
        );
      });
    }
    P.log((opts && opts.kind) || 'verdict', (opts && opts.at) || '检查', {
      pass: passed,
      total: ev.scored ? total : null,
      controls: total
    });
    P.emitCoverage(results, total, passed);
    return { results: results, passed: passed, total: total, scored: ev.scored };
  };

  P.emitCoverage = function (results, total, passed) {
    document.querySelectorAll('[data-coverage]').forEach(function (bar) {
      bar.innerHTML = results
        .map(function (r) {
          var cls = r.ok ? 'on ok' : r.partial ? 'on warn' : r.present ? 'on bad' : '';
          return '<i class="' + cls + '" title="' + esc(r.key) + '"></i>';
        })
        .join('');
      var readout = bar.parentNode.querySelector('[data-coverage-readout]');
      if (readout) readout.textContent = passed + '/' + total;
    });
  };

  function setState(d, state) {
    d.state = state;
    var host = d.el.closest('.field') || d.el;
    if (!host.classList) return;
    host.classList.toggle('is-filled', state === 'filled' || state === 'match');
    host.classList.toggle('is-autofill', state === 'autofill' || state === 'autofilled' || state === 'mismatch');
    host.classList.toggle('is-err', state === 'error' || state === 'mismatch');
  }
  P.setState = setState;

  function msg(d, text, kind) {
    var host = d.el.closest('.field');
    if (!host) return;
    var line = host.querySelector('.field__msg');
    if (!line) {
      line = document.createElement('p');
      line.className = 'field__msg';
      host.appendChild(line);
    }
    line.className = 'field__msg' + (kind ? ' field__msg--' + kind : '');
    line.textContent = text;
  }

  /* Coverage bar refresh without writing a verdict entry to the log. */
  function refresh() {
    var ev = evaluate();
    P.emitCoverage(
      ev.results,
      ev.results.length,
      ev.results.filter(function (r) {
        return r.ok;
      }).length
    );
    var sum = document.querySelector('[data-checksum]');
    var out = document.querySelector('[data-checkout]');
    if (sum && out && out.children.length) {
      sum.textContent =
        ev.results.filter(function (r) { return r.ok; }).length + '/' + ev.results.length;
    }
  }
  P.refresh = refresh;

  /* ------------------------------------------------------------ event watch */
  var lastInputEventAt = {};

  function onKey(e) {
    var d = findDesc(e.target);
    if (!d) return;
    d.keydowns++;
    d.lastKeyAt = performance.now();
  }

  function findDesc(el) {
    if (!el || !el.getAttribute) return null;
    var uid = el.getAttribute('data-pm-uid');
    if (!uid) return null;
    return P.fieldByUid(uid);
  }

  function classify(d, e) {
    var sinceKey = performance.now() - d.lastKeyAt;
    var itype = e && e.inputType ? e.inputType : '';
    var trusted = e ? e.isTrusted : false;
    /* A ticked switch is a click, not a fill — and its .value is the constant "on",
     * so counting it as FILLED would invent autofill events that never happened. */
    if (d.type === 'checkbox' || d.type === 'radio') return trusted ? 'type' : 'script';
    var typedByKeyboard = sinceKey < 800 && (itype === '' || /^insert/.test(itype));
    if (!trusted) return 'script';
    if (typedByKeyboard) return 'type';
    if (itype === 'insertReplacementText' || itype === '') return 'fill';
    return 'fill';
  }

  function onInput(e) {
    var d = findDesc(e.target);
    if (!d) return;
    lastInputEventAt[d.uid] = performance.now();
    var how = classify(d, e);
    d.value = d.el.value;
    var kind = how === 'type' ? 'type' : how === 'script' ? 'script' : 'fill';
    setState(d, filled(d) ? (kind === 'type' ? 'filled' : 'autofilled') : 'empty');
    if (!prefs.quiet || kind !== 'type') {
      P.log(kind, describe(d) + ' → ' + describeValue(d.el.value, d.secret, true).text, {
        len: d.el.value.length,
        inputType: e && e.inputType,
        trusted: e && e.isTrusted,
        sinceKeyMs: Math.round(performance.now() - d.lastKeyAt)
      });
    }
    if (d.el.value) autoVerify(d);
    else msg(d, "");
    refresh();
    updateDock();
  }

  function autoVerify(d) {
    var want = expectations();
    var key = d.name || d.id;
    if (!(key in want)) return;
    var ok = norm(d.el.value).toLowerCase() === norm(want[key]).toLowerCase();
    msg(d, (ok ? 'MATCH · ' : 'MISMATCH · ') + describeValue(d.el.value, d.secret, true).text, ok ? 'ok' : 'err');
  }

  function describe(d) {
    var bits = [d.tag + (d.type !== d.tag ? '[' + d.type + ']' : '')];
    if (d.name) bits.push('name=' + d.name);
    if (d.id) bits.push('id=' + d.id);
    if (d.autocomplete) bits.push('ac=' + d.autocomplete);
    if (d.inShadow) bits.push('shadow');
    if (d.inFrame) bits.push('iframe');
    if (d.form === '(no form)') bits.push('noform');
    return bits.join(' ');
  }
  P.describe = describe;

  function onChange(e) {
    var d = findDesc(e.target);
    if (!d) return;
    d.value = d.el.value;
    var focused = document.activeElement === d.el || (d.el.getRootNode && d.el.getRootNode().activeElement === d.el);
    var toggled = d.type === 'checkbox' || d.type === 'radio';
    if (!focused && !toggled && filled(d) && performance.now() - d.lastKeyAt > 1200) {
      P.log('fill', 'change(未聚焦) ' + describe(d) + ' → ' + describeValue(d.el.value, d.secret, true).text, {
        len: d.el.value.length
      });
      setState(d, 'autofilled');
      autoVerify(d);
    }
    refresh();
    updateDock();
  }

  function onFocus(e) {
    var d = findDesc(e.target);
    if (!d) return;
    P.log('focus', 'FOCUS ' + describe(d), null);
  }

  function onSubmit(e) {
    var form = e.target && e.target.tagName === 'FORM' ? e.target : null;
    if (!form) return;
    if (form.hasAttribute('data-pm-live')) return; /* real navigation pages opt out entirely */
    var allowLive =
      (e.submitter && e.submitter.hasAttribute && e.submitter.hasAttribute('data-pm-live-trigger')) ||
      Array.prototype.some.call(document.querySelectorAll('[data-act="toggle-live"]'), function (c) {
        return c.checked;
      });
    if (allowLive) {
      P.log('warn', '放行真导航（保存提示需要真实提交才会出现）', {
        action: form.getAttribute('action') || '#',
        submitter: e.submitter ? (e.submitter.textContent || '').trim() : '(enter key)'
      });
      return; /* do not preventDefault — let the browser navigate and possibly offer to save */
    }
    e.preventDefault();
    var method = (form.getAttribute('method') || 'GET').toUpperCase();
    P.log('submit', 'SUBMIT ' + (form.getAttribute('data-pm-id') || selectorFor(form)) + ' method=' + method + '（已拦截，不会产生保存提示）', {
      action: form.getAttribute('action') || '(none)',
      defaulted: e.defaultPrevented
    });
    var r = P.check({ at: 'submit' });
    var status = form.querySelector('[data-formstatus]');
    if (status) {
      status.className = 'formstatus ' + (r.passed === r.total && r.total ? 'formstatus--ok' : 'formstatus--err');
      status.textContent = r.total
        ? '[' + (r.passed === r.total ? 'PASS' : 'FAIL') + '] ' + r.passed + '/' + r.total + ' 字段与 fixture 一致'
        : '[SUBMITTED · 本页无 fixture，仅记录提交事件]';
    }
    updateDock();
  }

  /* ------------------------------------------------ silent-fill polling */
  var snapshots = {};
  function poll(ms, rounds) {
    var i = 0;
    var timer = setInterval(function () {
      i++;
      P.scan();
      registry.forEach(function (d) {
        var prev = snapshots[d.uid];
        var cur = d.el.value;
        if (prev !== cur) {
          snapshots[d.uid] = cur;
          var sinceInput = performance.now() - (lastInputEventAt[d.uid] || 0);
          if (cur && sinceInput > 400) {
            P.log('fill', 'SILENT-FILL(无 input 事件) ' + describe(d) + ' → ' + describeValue(cur, d.secret, true).text, {
              len: cur.length,
              atMs: Math.round(performance.now() - NAV_T0)
            });
            setState(d, 'autofilled');
            autoVerify(d);
            refresh();
            updateDock();
          }
        }
      });
      if (i >= rounds) clearInterval(timer);
    }, ms);
  }

  /* ------------------------------------------------ webkit autofill probe */
  document.addEventListener(
    'animationstart',
    function (e) {
      if (e.animationName !== 'pm-autofill-probe') return;
      var d = findDesc(e.target);
      if (!d) return;
      P.log('fill', 'CSS :-webkit-autofill 命中 ' + describe(d), {
        atMs: Math.round(performance.now() - NAV_T0)
      });
      setState(d, 'autofilled');
      if (d.el.value) autoVerify(d);
      refresh();
      updateDock();
    },
    true
  );

  /* ---------------------------------------------------------------- dock */
  var dock, dockCount, dockList, dockOrigin;
  function buildDock() {
    if (dock) return;
    dock = document.createElement('div');
    dock.className = 'dock' + (prefs.dock ? ' is-open' : '');
    dock.innerHTML =
      '<div class="dock__bar" role="button" tabindex="0" aria-expanded="' + (prefs.dock ? 'true' : 'false') + '">' +
      '<span class="dock__dot"></span>' +
      '<span class="k">DIAG</span>' +
      '<span data-dock-count>0 EVENTS</span>' +
      '<span class="dim" data-dock-origin>' + esc(location.host + location.pathname) + '</span>' +
      '<span style="flex:1"></span>' +
      '<span data-dock-caret>' + (prefs.dock ? '[ HIDE ]' : '[ SHOW LOG ]') + '</span>' +
      '</div>' +
      '<div class="dock__body">' +
      '<div class="row row--between" style="padding:12px 0">' +
      '<span class="label">SESSION LOG · ' + LOG_KEY + '</span>' +
      '<span class="row">' +
      '<button type="button" class="btn btn--sm btn--secondary" data-act="copy">COPY JSON</button>' +
      '<button type="button" class="btn btn--sm btn--secondary" data-act="download">DOWNLOAD</button>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-act="reveal">REVEAL VALUES: ' + (prefs.reveal ? 'ON' : 'OFF') + '</button>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-act="clear">CLEAR</button>' +
      '</span></div>' +
      '<ul class="dock__log" data-dock-list></ul>' +
      '</div>';
    document.body.appendChild(dock);
    document.body.classList.add('has-dock');
    dockCount = dock.querySelector('[data-dock-count]');
    dockList = dock.querySelector('[data-dock-list]');
    var bar = dock.querySelector('.dock__bar');
    bar.addEventListener('click', function () {
      prefs.dock = !prefs.dock;
      write(PREF_KEY, prefs);
      dock.classList.toggle('is-open', prefs.dock);
      bar.setAttribute('aria-expanded', String(prefs.dock));
      dock.querySelector('[data-dock-caret]').textContent = prefs.dock ? '[ HIDE ]' : '[ SHOW LOG ]';
    });
    dock.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'copy') copy(P.exportLogs(), btn);
      if (act === 'download') download();
      if (act === 'clear') {
        P.clearLogs();
        dockList.innerHTML = '';
        updateDock();
      }
      if (act === 'reveal') {
        prefs.reveal = !prefs.reveal;
        write(PREF_KEY, prefs);
        btn.textContent = 'REVEAL VALUES: ' + (prefs.reveal ? 'ON' : 'OFF');
        P.log('info', '值显示切换 → ' + (prefs.reveal ? 'ON（明文出现在 DOM，注意录屏/截图）' : 'OFF'));
        renderAll();
      }
    });
    P.onLog(function (e) {
      /* Append even while collapsed: the row list is capped, and a dock that only
       * fills in after you open it would hide the events you care about most. */
      appendRow(e);
      updateDock();
    });
    logs.slice(-60).forEach(appendRow);
    /* The PAGE entry lands before the dock exists, so the counter needs one seed pass. */
    updateDock();
  }

  function copy(text, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = '[COPIED]';
      setTimeout(function () {
        btn.textContent = old;
      }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        fallbackCopy(text);
        done();
      });
    } else {
      fallbackCopy(text);
      done();
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {}
    ta.remove();
  }
  P.copy = copy;

  function download() {
    var blob = new Blob([P.exportLogs()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pm-diag-' + location.hostname + '-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 2000);
  }

  function rowHTML(e) {
    var k = e.kind;
    var label = { type: 'TYPED', fill: 'FILLED', script: 'SCRIPT', silent: 'SILENT', verdict: 'VERDICT', submit: 'SUBMIT', info: 'INFO', warn: 'WARN', error: 'ERROR', focus: 'FOCUS' }[k] || k.toUpperCase();
    var extra = '';
    if (k === 'verdict' && e.meta) {
      extra =
        e.meta.total == null
          ? ' · ' + e.meta.controls + ' 控件（本页无 fixture，仅计覆盖）'
          : ' · ' + e.meta.pass + '/' + e.meta.total;
    }
    var t = new Date(e.t);
    var hh = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') + ':' + String(t.getSeconds()).padStart(2, '0');
    var tone = k === 'verdict' && e.meta && e.meta.total != null && e.meta.pass < e.meta.total ? 'verdict-fail' : clsFor(k);
    return (
      '<li><time>' + hh + ' +' + e.rel + 'ms</time>' +
      '<span class="k k--' + tone + '">' + label + '</span>' +
      '<span>' + esc(e.page) + ' · ' + esc(e.msg) + extra + '</span></li>'
    );
  }
  function clsFor(k) {
    if (k === 'fill' || k === 'silent') return 'fill';
    if (k === 'type') return 'type';
    if (k === 'verdict') return 'verdict-pass';
    if (k === 'warn' || k === 'error') return 'warn';
    return 'info';
  }
  function appendRow(e) {
    if (!dockList) return;
    var li = document.createElement('li');
    li.innerHTML = rowHTML(e);
    dockList.appendChild(li);
    while (dockList.children.length > 200) dockList.removeChild(dockList.firstChild);
    dockList.parentNode.scrollTop = dockList.parentNode.scrollHeight;
  }
  function updateDock() {
    if (!dockCount) return;
    var n = logs.length;
    var fills = logs.filter(function (l) { return l.kind === 'fill'; }).length;
    dockCount.textContent = n + ' EVENTS · ' + fills + ' FILLS';
    var dot = dock.querySelector('.dock__dot');
    dot.classList.toggle('dock__dot--live', performance.now() - NAV_T0 < 20000);
  }

  /* ------------------------------------------------------------ full render */
  function renderAll() {
    registry.forEach(function (d) {
      if (d.state === 'match' || d.state === 'mismatch') autoVerify(d);
    });
  }

  /* ------------------------------------------------------------- page hooks */
  P.pageMeta = function () {
    var node = document.querySelector('[data-pm-page]');
    if (!node) return {};
    try {
      return JSON.parse(node.textContent);
    } catch (e) {
      return {};
    }
  };

  P.init = function () {
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onChange, true);
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('submit', onSubmit, true);
    P.scan();
    registry.forEach(function (d) {
      snapshots[d.uid] = d.el.value;
      if (filled(d)) {
        setState(d, 'filled');
        autoVerify(d);
      }
      if (d.label.via === 'none') {
        msg(d, '无 LABEL · 仅靠 ' + (d.placeholder ? 'placeholder' : '属性') + '（识别风险）', 'err');
      } else if (d.vis !== 'visible') {
        msg(d, d.vis.toUpperCase() + ' 状态，管理器通常会跳过');
      }
    });
    var pre = registry.filter(filled);
    P.log('info', 'PAGE ' + P.pageMeta().slug + ' · ' + registry.length + ' 控件 · ' + pre.length + ' 已有初始值', {
      controls: registry.length,
      prefill: pre.length,
      secure: window.isSecureContext
    });
    if (!document.documentElement.hasAttribute('data-pm-nodock')) buildDock();
    refresh();
    poll(250, 80); /* 20s window, then stop polling */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        /* layout may shift; re-measure visibility flags */
        setTimeout(function () {
          P.scan();
          refresh();
        }, 60);
      });
    }
  };

  /* ---------------------------------------- split-flow glue (login step 1→2) */
  P.identity = function (value) {
    if (value === undefined) {
      var s = P.session('flow');
      return s && s.identity ? s.identity : null;
    }
    var st = P.session('flow') || {};
    st.identity = value;
    P.session('flow', st);
  };
})();
