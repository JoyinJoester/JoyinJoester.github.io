/* ============================================================
   最近提交 — 读取 GitHub Actions 定时生成的 data/commits.json
   避免前端直接调 GitHub API 触发未认证限流 (60/h/IP)
   ============================================================ */
(function() {
  var list = document.getElementById('commitsList');
  if (!list) return;

  var MAX = 6;
  var DATA_URL = 'data/commits.json';

  function escape(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function timeAgo(dateStr) {
    var now = Date.now();
    var then = new Date(dateStr).getTime();
    var diff = Math.floor((now - then) / 1000);

    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 604800) return Math.floor(diff / 86400) + ' 天前';

    var d = new Date(dateStr);
    return d.getFullYear() + '·' + String(d.getMonth() + 1).padStart(2, '0') + '·' + String(d.getDate()).padStart(2, '0');
  }

  function renderItem(c) {
    var li = document.createElement('li');
    li.className = 'commits-item';
    var a = document.createElement('a');
    a.href = c.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'commits-row';

    var sha = document.createElement('span');
    sha.className = 'commits-sha';
    sha.textContent = c.short_sha || (c.sha ? c.sha.substring(0, 7) : '');

    var msg = document.createElement('span');
    msg.className = 'commits-msg';
    msg.textContent = c.message;

    var repo = document.createElement('span');
    repo.className = 'commits-repo';
    repo.textContent = c.repo_short || c.repo;

    var time = document.createElement('span');
    time.className = 'commits-time';
    time.dataset.time = c.date;
    time.textContent = timeAgo(c.date);

    a.appendChild(sha);
    a.appendChild(msg);
    a.appendChild(repo);
    a.appendChild(time);
    li.appendChild(a);
    return li;
  }

  function renderSkeleton() {
    list.innerHTML = '<li class="commits-skeleton"><span class="commits-skeleton-text">正在加载最近提交…</span></li>';
  }

  function renderError(msg) {
    list.innerHTML = '<li class="commits-error"><span class="commits-msg">' + escape(msg) + '</span><a href="https://github.com/JoyinJoester" target="_blank" rel="noopener" class="commits-more">在 GitHub 上查看 →</a></li>';
  }

  function render(commits) {
    if (!commits || !commits.length) {
      renderError('最近没有公开提交');
      return;
    }
    list.innerHTML = '';
    commits.slice(0, MAX).forEach(function(c) {
      list.appendChild(renderItem(c));
    });
  }

  renderSkeleton();

  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      render(data.commits || []);
    })
    .catch(function() {
      renderError('提交数据加载失败');
    });
})();
