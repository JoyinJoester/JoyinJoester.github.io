/* ============================================================
   导航高亮当前 section + 移动端汉堡菜单开关
   ============================================================ */
(function() {
  // === 1. 导航高亮 ===
  var links = document.querySelectorAll('.nav-links a, .nav-overlay a.overlay-link');
  var sections = Array.from(links).map(function(a) {
    var href = a.getAttribute('href');
    return href && href.startsWith('#') ? document.querySelector(href) : null;
  });

  if (links.length) {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (!e.isIntersecting) return;
        var idx = sections.indexOf(e.target);
        if (idx === -1) return;
        links.forEach(function(l) {
          l.style.color = '';
          l.style.background = '';
        });
        var active = links[idx];
        active.style.color = 'var(--fg)';
        // 只有 .nav-links a 才用 background 高亮，overlay 大字不需要
        if (active.classList.contains('nav-links') || active.closest('.nav-links')) {
          active.style.background = 'var(--surface)';
        } else {
          active.style.color = 'var(--accent)';
        }
      });
    }, { threshold: 0.4 });

    sections.forEach(function(s) { if (s) io.observe(s); });
  }

  // === 2. 移动端汉堡菜单开关 ===
  var toggle = document.querySelector('.nav-menu-toggle');
  var overlay = document.querySelector('.nav-overlay');
  var lastFocused = null;

  if (!toggle || !overlay) return;

  function getFocusable() {
    return Array.prototype.slice.call(overlay.querySelectorAll('a[href], button:not([disabled])')).filter(function(el) {
      return el.offsetParent !== null;
    });
  }

  function openMenu() {
    lastFocused = document.activeElement;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', '关闭菜单');
    document.body.style.overflow = 'hidden';
    var focusable = getFocusable();
    if (focusable.length) focusable[0].focus();
  }

  function closeMenu() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '打开菜单');
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  toggle.addEventListener('click', function() {
    if (overlay.classList.contains('open')) closeMenu();
    else openMenu();
  });

  // focus trap — Tab/Shift+Tab 在 overlay 内循环
  overlay.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab' || !overlay.classList.contains('open')) return;
    var focusable = getFocusable();
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // 点击 overlay 中的链接后自动关闭（smooth-scroll.js 已经处理，这里兜底）
  overlay.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', closeMenu);
  });

  // ESC 关闭
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeMenu();
  });

  // 窗口尺寸放大时自动关闭 overlay
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && overlay.classList.contains('open')) closeMenu();
  });
})();
