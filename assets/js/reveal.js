/* ============================================================
   滚动揭示 — IntersectionObserver
   ============================================================ */
(function() {
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });

  function scan(root) {
    (root || document).querySelectorAll('[data-reveal]').forEach(function(el) {
      if (el.classList.contains('in-view')) return;
      io.observe(el);
    });
  }

  scan();
  window.__revealScan = scan;
})();
