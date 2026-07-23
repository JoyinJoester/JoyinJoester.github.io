/* ============================================================
   平滑滚动锚点
   用 window.scrollTo 替代 scrollIntoView，避免 iframe 嵌入时的滚动冲突
   ============================================================ */
(function() {
  var navHeight = 88;

  function getNavHeight() {
    var nav = document.querySelector('.nav');
    if (nav) return nav.getBoundingClientRect().height;
    return 88;
  }

  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var href = a.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      var rect = target.getBoundingClientRect();
      var top = rect.top + window.scrollY - getNavHeight() - 12;

      // #top 特殊处理 — 滚到 0
      if (href === '#top') top = 0;

      window.scrollTo({
        top: top,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });

      // 关闭移动端 overlay（如果在打开状态）
      var overlay = document.querySelector('.nav-overlay');
      var toggle = document.querySelector('.nav-menu-toggle');
      if (overlay && overlay.classList.contains('open')) {
        overlay.classList.remove('open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  });
})();
