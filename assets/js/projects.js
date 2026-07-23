/* ============================================================
   项目列表 — 读取 data/repos.json (GitHub Actions 生成)
   不写死任何仓库信息
   ============================================================ */
(function() {
  var grid = document.getElementById('projectsGrid');
  var empty = document.getElementById('projectsEmpty');
  var banner = document.getElementById('orgBanner');
  if (!grid) return;

  var DATA_URL = 'data/repos.json';

  var LANG_COLORS = {
    Kotlin: '#A97BFF',
    Swift: '#F05138',
    'C#': '#178600',
    Rust: '#DEA584',
    TypeScript: '#3178C6',
    JavaScript: '#F1E05A',
    Python: '#3572A5',
    Go: '#00ADD8',
    Java: '#B07219',
    Dart: '#00B4AB',
    HTML: '#E34C26',
    CSS: '#563D7C',
    Shell: '#89E051',
  };

  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function langColor(lang) {
    return LANG_COLORS[lang] || 'var(--accent)';
  }

  function daysSince(iso) {
    if (!iso) return Infinity;
    return (Date.now() - new Date(iso).getTime()) / 86400000;
  }

  function statusFor(repo) {
    var d = daysSince(repo.pushed_at || repo.updated_at);
    if (d <= 90) return { cls: 'active', label: '活跃维护' };
    if (d <= 365) return { cls: 'exploring', label: '间歇更新' };
    return { cls: 'exploring', label: '归档倾向' };
  }

  function applyOrg(org) {
    if (!banner || !org) return;
    banner.hidden = false;
    if (org.html_url) banner.href = org.html_url;

    var avatar = banner.querySelector('[data-org-avatar]');
    if (avatar && org.avatar_url) {
      avatar.src = org.avatar_url;
      avatar.alt = (org.name || org.login || 'org') + ' 组织头像';
    }

    banner.querySelectorAll('[data-org]').forEach(function(el) {
      var key = el.getAttribute('data-org');
      if (key === 'name') el.textContent = org.name || org.login || '';
      else if (key === 'handle') el.textContent = '@' + (org.login || '');
      else if (key === 'description') el.textContent = org.description || '';
      else if (key === 'public_repos') el.textContent = org.public_repos != null ? org.public_repos : '—';
      else if (key === 'total_stars') el.textContent = org.total_stars != null ? org.total_stars : '—';
      else if (key === 'followers') el.textContent = org.followers != null ? org.followers : '—';
    });
  }

  function renderCard(repo, index) {
    var status = statusFor(repo);
    var num = String(index + 1).padStart(2, '0');
    var topics = (repo.topics || []).slice(0, 4);
    var lang = repo.language || '';
    var license = repo.license || '';
    var desc = repo.description || '暂无描述';

    var a = document.createElement('a');
    a.href = repo.html_url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'project-card magnetic-card';
    a.setAttribute('data-reveal', '');
    if (index > 0) a.setAttribute('data-reveal-delay', String(Math.min(index, 3)));

    var tagsHtml = topics.map(function(t) {
      return '<span class="project-tag">' + escape(t) + '</span>';
    }).join('');

    var langHtml = lang
      ? '<span class="meta-lang"><span class="lang-dot" style="background:' + langColor(lang) + '"></span>' + escape(lang) + '</span>'
      : '';

    var starSvg = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    var forkSvg = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="20" r="2.5"/><path d="M6 8.5v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-3M12 14.5v3"/></svg>';

    a.innerHTML =
      '<div class="project-head">' +
        '<span class="project-num">/ ' + num + '</span>' +
        '<span class="project-status ' + status.cls + '">' + escape(status.label) + '</span>' +
      '</div>' +
      '<h3 class="project-title">' + escape(repo.name) + '</h3>' +
      '<p class="project-desc">' + escape(desc) + '</p>' +
      (tagsHtml ? '<div class="project-tags">' + tagsHtml + '</div>' : '') +
      '<div class="project-meta">' +
        langHtml +
        '<span class="meta-stars">' + starSvg + (repo.stargazers_count || 0) + '</span>' +
        '<span class="meta-fork">' + forkSvg + ' ' + (repo.forks_count || 0) + '</span>' +
        (license ? '<span>' + escape(license) + '</span>' : '') +
      '</div>';

    return a;
  }

  function showMessage(msg) {
    grid.innerHTML = '';
    var el = document.createElement('div');
    el.className = 'projects-empty';
    el.id = 'projectsEmpty';
    el.textContent = msg;
    grid.appendChild(el);
  }

  function render(data) {
    if (!data || !data.repos || !data.repos.length) {
      showMessage('暂无公开仓库数据。部署后由 GitHub Actions 自动拉取。');
      if (banner) banner.hidden = true;
      return;
    }

    applyOrg(data.org);
    grid.innerHTML = '';
    data.repos.forEach(function(repo, i) {
      grid.appendChild(renderCard(repo, i));
    });

    // 让新插入的卡片参与 reveal 动画（若脚本已就绪）
    if (typeof window.__revealScan === 'function') {
      window.__revealScan();
    } else {
      document.dispatchEvent(new CustomEvent('projects:rendered'));
    }
  }

  // 优先监听 data-loader 派发的事件，也独立 fetch 兜底
  document.addEventListener('repos:loaded', function(e) {
    render(e.detail);
  });

  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(render)
    .catch(function() {
      showMessage('仓库数据加载失败，请稍后再试。');
    });
})();
