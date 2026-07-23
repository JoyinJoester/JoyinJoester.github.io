/* ============================================================
   主题切换 + View Transitions 涟漪扩散
   ============================================================ */
(function() {
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  var stored = localStorage.getItem('jj-theme');
  var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  var initial = stored || (prefersLight ? 'light' : 'dark');
  root.setAttribute('data-theme', initial);

  function syncAria() {
    if (!toggle) return;
    var cur = root.getAttribute('data-theme');
    toggle.setAttribute('aria-pressed', cur === 'light' ? 'true' : 'false');
    toggle.setAttribute('aria-label', cur === 'light' ? '切换到深色主题' : '切换到浅色主题');
  }
  syncAria();

  function applyTheme(next) {
    root.setAttribute('data-theme', next);
    localStorage.setItem('jj-theme', next);
    syncAria();
  }

  if (!toggle) return;

  toggle.addEventListener('click', function(ev) {
    var cur = root.getAttribute('data-theme');
    var next = cur === 'dark' ? 'light' : 'dark';

    // 计算扩散圆心 — 点击按钮中心
    var rect = this.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    root.style.setProperty('--ripple-x', x + 'px');
    root.style.setProperty('--ripple-y', y + 'px');

    // 优先使用 View Transitions API，不支持则平滑降级
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(function() {
        applyTheme(next);
      });
    } else {
      applyTheme(next);
    }
  });
})();
