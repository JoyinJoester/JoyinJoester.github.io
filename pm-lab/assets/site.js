/* Site chrome behaviour: theme, prev/next pager, fixture copy, manual CHECK.
 * Field-level detection lives in diag.js. Topbar/footer markup is static in each page. */
(function () {
  'use strict';
  var P = (window.PM = window.PM || {});
  var THEME_KEY = 'pm.theme';

  function pages() {
    return (window.PM_PAGES || []).slice();
  }
  P.pages = pages;

  function slug() {
    return location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
  }

  function setTheme(t, quiet) {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch (e) {}
    document.querySelectorAll('[data-act="theme"]').forEach(function (b) {
      b.textContent = t === 'dark' ? 'DARK' : 'LIGHT';
    });
    if (!quiet && P.log) P.log('info', '主题 → ' + t, null);
  }
  P.setTheme = setTheme;

  function buildPager() {
    var host = document.querySelector('[data-pager]');
    if (!host) return;
    var list = pages();
    var i = list.findIndex(function (p) { return p.slug === slug(); });
    if (i < 0) {
      host.innerHTML = '<span class="label">未登记页面</span>';
      return;
    }
    var prev = list[i - 1];
    var next = list[i + 1];
    var group = list[i].group;
    var sibs = list.filter(function (p) { return p.group === group; });
    host.innerHTML =
      '<div class="row row--between">' +
      (prev ? '<a class="btn btn--secondary btn--sm" href="' + prev.slug + '.html">‹ ' + P.esc(prev.num) + ' ' + P.esc(prev.short) + '</a>' : '<span></span>') +
      '<span class="caption">' + P.esc(group) + ' · ' + (i + 1) + '/' + list.length + ' · ' + sibs.length + ' 页在本组</span>' +
      (next ? '<a class="btn btn--secondary btn--sm" href="' + next.slug + '.html">' + P.esc(next.num) + ' ' + P.esc(next.short) + ' ›</a>' : '<span></span>') +
      '</div>';
  }

  function renderCheckResults(r) {
    var out = document.querySelector('[data-checkout]');
    if (!out) return;
    out.innerHTML = r.results
      .map(function (x) {
        var cls = x.ok ? 'stat__v--ok' : x.partial ? 'stat__v--warn' : 'stat__v--bad';
        var verdict = x.ok ? 'PASS' : x.partial ? 'PREFIX' : x.present ? 'FAIL' : 'ABSENT';
        var got = x.got.text === '—' ? '（空）' : P.esc(x.got.text);
        return (
          '<div class="stat"><span class="stat__k">' + P.esc(x.key) + (x.present ? '' : ' · 控件不存在') + '</span>' +
          '<span class="stat__v ' + cls + '">' + verdict + ' · ' + got + (x.got.len ? ' [' + x.got.len + ']' : '') + '</span></div>'
        );
      })
      .join('');
    var sum = document.querySelector('[data-checksum]');
    if (sum) sum.textContent = r.passed + '/' + r.total;
  }
  P.renderCheckResults = renderCheckResults;

  function copyFrom(btn) {
    var sel = btn.getAttribute('data-copy');
    var text = '';
    if (btn.hasAttribute('data-copy-expected')) {
      var key = btn.getAttribute('data-copy-expected');
      text = ((P.expected && P.expected()) || {})[key] || '';
    } else if (sel) {
      var src = document.querySelector(sel);
      text = src ? (src.value !== undefined ? src.value : src.textContent) : '';
    }
    if (P.copy) P.copy(String(text).trim(), btn);
  }

  /* ------------------------------------------------------------ split OTP */
  /* A maxlength=1 box gives the keystroke nowhere to go, so without help the
   * second digit simply never appears and the group reads as "only the first
   * box works". Managers and Android SMS autofill make it worse by dropping
   * the whole code into box 1. Both cases need the same two moves: advance the
   * focus, and spread anything longer than one character. */
  function wireSplitOtp() {
    document.querySelectorAll('[data-split-otp]').forEach(function (root) {
      var boxes = Array.prototype.slice.call(root.querySelectorAll('input'));
      if (boxes.length < 2) return;
      var msg = root.parentNode.querySelector('[data-split-msg]');
      var say = function (t) { if (msg) msg.textContent = t; };

      function spread(from, raw) {
        var chars = String(raw).replace(/\D/g, '').split('');
        for (var i = 0; i < chars.length && from + i < boxes.length; i++) boxes[from + i].value = chars[i];
        var last = Math.min(from + chars.length, boxes.length) - 1;
        if (last >= from && last < boxes.length) boxes[last].focus();
        return chars.length;
      }

      boxes.forEach(function (box, i) {
        var onInput = function () {
          if (box.value.length > 1) {
            var n = spread(i, box.value);
            say('整码 ' + n + ' 位落进第 ' + (i + 1) + ' 格 → 已分发到后续格');
            if (P.log) P.log('warn', 'SPLIT-OTP 整码写入第 ' + (i + 1) + ' 格 → 分发 ' + n + ' 位', null);
          } else if (box.value.length === 1 && i < boxes.length - 1) {
            boxes[i + 1].focus();
          }
        };
        /* Managers that write the value without an input event still fire change
         * on blur, so both hooks are needed to catch the whole-code dump. */
        box.addEventListener('input', onInput);
        box.addEventListener('change', onInput);

        box.addEventListener('keydown', function (e) {
          if (e.key === 'Backspace' && !box.value && i > 0) {
            e.preventDefault();
            boxes[i - 1].value = '';
            boxes[i - 1].focus();
          } else if (e.key === 'ArrowLeft' && i > 0) {
            e.preventDefault();
            boxes[i - 1].focus();
          } else if (e.key === 'ArrowRight' && i < boxes.length - 1) {
            e.preventDefault();
            boxes[i + 1].focus();
          }
        });
        box.addEventListener('paste', function (e) {
          var t = (e.clipboardData || window.clipboardData || {}).getData
            ? (e.clipboardData || window.clipboardData).getData('text')
            : '';
          if (/\d/.test(t)) {
            e.preventDefault();
            say('粘贴 ' + spread(0, t) + ' 位已分发');
          }
        });
      });
    });
  }

  function wire() {
    wireSplitOtp();
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act],[data-copy],[data-copy-expected]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'theme') {
        setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
      } else if (act === 'check') {
        var r = P.check({ at: '手动 CHECK' });
        renderCheckResults(r);
      } else if (act === 'scan') {
        P.scan();
        P.log('info', '重新扫描控件 → ' + P.fields().length + ' 个', null);
      } else if (act === 'reset') {
        document.querySelectorAll('form').forEach(function (f) {
          f.reset();
        });
        /* The split group deliberately sits outside every form, so reset() misses it. */
        document.querySelectorAll('[data-split-otp] input').forEach(function (b) {
          b.value = '';
        });
        P.log('warn', '所有表单 reset()', null);
        var out = document.querySelector('[data-checkout]');
        if (out) out.innerHTML = '';
      } else if (act === 'scroll-fields') {
        var form = document.querySelector('form');
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (btn.hasAttribute('data-copy') || btn.hasAttribute('data-copy-expected')) copyFrom(btn);
    });
    document.querySelectorAll('[data-cap-list]').forEach(function (node) {
      P.renderCapabilities(node);
    });
    document.querySelectorAll('[data-env-list]').forEach(function (node) {
      var env = P.env();
      node.innerHTML = Object.keys(env)
        .map(function (k) {
          return '<div class="stat"><span class="stat__k">' + P.esc(k) + '</span><span class="stat__v">' + P.esc(env[k]) + '</span></div>';
        })
        .join('');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTheme(document.documentElement.dataset.theme || 'dark', true);
    buildPager();
    wire();
    if (P.init) P.init();
    var live = document.querySelector('[data-clock]');
    if (live) {
      setInterval(function () {
        live.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
      }, 1000);
      live.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
    }
  });
})();
