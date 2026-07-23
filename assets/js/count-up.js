/* ============================================================
   数字 count-up — requestAnimationFrame + IntersectionObserver
   等待 data-loader.js 写入 data-count 后再扫描
   ============================================================ */
(function() {
  var ready = Promise.resolve(window.__profileReady).catch(function() { return null; });
  var timeout = new Promise(function(resolve) { setTimeout(resolve, 2000); });

  Promise.race([ready, timeout]).then(start);

  // profile 加载完成后可能才写入 data-count，再扫一次
  document.addEventListener('profile:loaded', function() {
    // 给 applyProfile 一帧时间写完属性
    requestAnimationFrame(start);
  });

  var started = false;
  var counted = new WeakSet();
  var io = null;

  function animate(el) {
    if (counted.has(el)) return;
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    counted.add(el);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = String(target);
      return;
    }

    var dur = 1400;
    var startTs = performance.now();
    function tick(now) {
      var p = Math.min((now - startTs) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.floor(target * eased));
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = String(target);
    }
    requestAnimationFrame(tick);
  }

  function start() {
    if (!io) {
      io = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
          if (!e.isIntersecting) return;
          animate(e.target);
          io.unobserve(e.target);
        });
      }, { threshold: 0.5 });
    }

    document.querySelectorAll('[data-count]').forEach(function(el) {
      if (counted.has(el)) return;
      io.observe(el);
    });
    started = true;
  }
})();
