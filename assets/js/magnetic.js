/* ============================================================
   磁性按钮 / 项目卡光斑跟随
   卡片用事件委托，兼容动态插入的项目卡
   ============================================================ */
(function() {
  // 触屏 / reduced-motion 直接跳过
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.magnetic').forEach(function(el) {
    el.addEventListener('mousemove', function(e) {
      var r = el.getBoundingClientRect();
      var x = e.clientX - r.left - r.width / 2;
      var y = e.clientY - r.top - r.height / 2;
      el.style.transform = 'translate(' + (x * 0.18) + 'px,' + (y * 0.28) + 'px) translateY(-2px)';
    });
    el.addEventListener('mouseleave', function() {
      el.style.transform = '';
    });
  });

  document.addEventListener('mousemove', function(e) {
    var el = e.target.closest('.magnetic-card');
    if (!el) return;
    var r = el.getBoundingClientRect();
    var x = ((e.clientX - r.left) / r.width) * 100;
    var y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty('--mx', x + '%');
    el.style.setProperty('--my', y + '%');
  });
})();
