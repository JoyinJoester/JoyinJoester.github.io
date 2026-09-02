/* ============================================================
   Monica Pass 专页 — 读取 data/repos.json
   平台卡文案写死（属于产品叙述），Stars/语言/更新时间取真实数据
   ============================================================ */
(function() {
  var platformsEl = document.getElementById('mnPlatforms');
  var repoListEl = document.getElementById('mnRepoList');
  if (!platformsEl && !repoListEl) return;

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
  };

  // 平台叙述 — key 为仓库名
  var PLATFORMS = [
    {
      repo: 'Monica',
      os: 'Android',
      title: 'Monica for Android',
      desc: '主线客户端。密码库、TOTP 验证器、导入导出，行为以它为基准。',
      icon: '<path d="M5 16V9a7 7 0 0 1 14 0v7z"/><path d="M3 16h18M8 20v2M16 20v2M8.5 5.5L7 3M15.5 5.5L17 3"/>',
    },
    {
      repo: 'Monica-for-iOS',
      os: 'iOS',
      title: 'Monica for iOS',
      desc: 'Swift 原生客户端，与 Android 端共享同一套密码库格式。',
      icon: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 19h2"/>',
    },
    {
      repo: 'Monica-by-Avalonia',
      os: 'Desktop',
      title: 'Monica for Desktop',
      desc: '基于 Avalonia 的桌面端，一份代码覆盖 Windows / macOS / Linux。',
      icon: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    },
    {
      repo: 'Monica-for-Extension',
      os: 'Browser',
      title: 'Monica for Extension',
      desc: '浏览器扩展，在网页里直接取用密码库中的凭据与验证码。',
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l7.5 4.5M12 12L4.5 16.5"/>',
    },
    {
      repo: 'Mdbx',
      os: 'Core',
      title: 'Mdbx 存储层',
      desc: 'Rust 写的加密存储层（Monica-Database-eXtended），四端共用，MIT 许可。',
      icon: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    },
  ];

  function esc(s) {
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

  function relTime(iso) {
    var d = daysSince(iso);
    if (d === Infinity) return '—';
    if (d < 1) return 'today';
    if (d < 30) return Math.floor(d) + 'd ago';
    if (d < 365) return Math.floor(d / 30) + 'mo ago';
    return Math.floor(d / 365) + 'y ago';
  }

  function stateFor(repo) {
    var d = daysSince(repo.pushed_at || repo.updated_at);
    if (d <= 90) return { cls: 'stable', label: 'Active' };
    if (d <= 365) return { cls: '', label: 'Periodic' };
    return { cls: '', label: 'Paused' };
  }

  var STAR_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

  function renderPlatforms(byName) {
    if (!platformsEl) return;
    platformsEl.innerHTML = '';

    PLATFORMS.forEach(function(p, i) {
      var repo = byName[p.repo];
      if (!repo) return;

      var st = stateFor(repo);
      var a = document.createElement('a');
      a.href = repo.html_url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'mn-platform magnetic-card';
      a.setAttribute('data-reveal', '');
      if (i > 0) a.setAttribute('data-reveal-delay', String(Math.min(i, 3)));

      a.innerHTML =
        '<div class="mn-platform-top">' +
          '<span class="mn-platform-os">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p.icon + '</svg>' +
            esc(p.os) +
          '</span>' +
          '<span class="mn-platform-state ' + st.cls + '">' + esc(st.label) + '</span>' +
        '</div>' +
        '<h3>' + esc(p.title) + '</h3>' +
        '<p>' + esc(p.desc) + '</p>' +
        '<div class="mn-platform-foot">' +
          (repo.language
            ? '<span><span class="lang-dot" style="background:' + langColor(repo.language) + '"></span>' + esc(repo.language) + '</span>'
            : '') +
          '<span class="stars">' + STAR_SVG + (repo.stargazers_count || 0) + '</span>' +
          (repo.license ? '<span>' + esc(repo.license) + '</span>' : '') +
        '</div>';

      platformsEl.appendChild(a);
    });
  }

  function renderRepos(repos) {
    if (!repoListEl) return;
    repoListEl.innerHTML = '';

    repos.slice().sort(function(a, b) {
      return (b.stargazers_count || 0) - (a.stargazers_count || 0);
    }).forEach(function(repo) {
      var a = document.createElement('a');
      a.href = repo.html_url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'mn-repo-row';

      a.innerHTML =
        '<div class="mn-repo-name">' + esc(repo.name) +
          (repo.description ? '<div class="mn-repo-desc">' + esc(repo.description) + '</div>' : '') +
        '</div>' +
        '<div class="mn-repo-lang">' +
          (repo.language
            ? '<span class="lang-dot" style="background:' + langColor(repo.language) + '"></span>' + esc(repo.language)
            : '—') +
        '</div>' +
        '<div class="mn-repo-stars">' + STAR_SVG + (repo.stargazers_count || 0) + '</div>' +
        '<div class="mn-repo-updated">' + esc(relTime(repo.pushed_at || repo.updated_at)) + '</div>';

      repoListEl.appendChild(a);
    });
  }

  var SEGMENTS = 26;

  function applyStats(org, repos) {
    var totalStars = org && org.total_stars != null
      ? org.total_stars
      : repos.reduce(function(sum, r) { return sum + (r.stargazers_count || 0); }, 0);

    var values = {
      total_stars: totalStars,
      public_repos: org && org.public_repos != null ? org.public_repos : repos.length,
      followers: org ? org.followers : null,
    };

    document.querySelectorAll('[data-mn]').forEach(function(el) {
      var v = values[el.getAttribute('data-mn')];
      if (v == null) return;
      el.setAttribute('data-count', String(v));
      el.textContent = '0';
    });

    // 分段进度条：离散方块，填充比例 = 值 / 目标上限
    document.querySelectorAll('[data-mn-bar]').forEach(function(bar) {
      var v = values[bar.getAttribute('data-mn-bar')];
      if (v == null) return;
      var max = parseFloat(bar.getAttribute('data-mn-max')) || 1;
      var filled = Math.min(Math.round((v / max) * SEGMENTS), SEGMENTS);
      bar.innerHTML = '';
      for (var i = 0; i < SEGMENTS; i++) {
        var seg = document.createElement('span');
        seg.className = i < filled ? 'mn-seg on' : 'mn-seg';
        bar.appendChild(seg);
      }
    });
  }

  function showEmpty(msg) {
    if (repoListEl) repoListEl.innerHTML = '<div class="mn-repos-empty">' + esc(msg) + '</div>';
    if (platformsEl) platformsEl.innerHTML = '<div class="mn-repos-empty">' + esc(msg) + '</div>';
  }

  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      if (!data || !data.repos || !data.repos.length) {
        showEmpty('[ NO REPOSITORY DATA ]');
        return;
      }

      var byName = {};
      data.repos.forEach(function(r) { byName[r.name] = r; });

      renderPlatforms(byName);
      renderRepos(data.repos);
      applyStats(data.org, data.repos);

      if (typeof window.__revealScan === 'function') window.__revealScan();
      document.dispatchEvent(new CustomEvent('profile:loaded', { detail: data }));
    })
    .catch(function() {
      showEmpty('[ ERROR: FETCH FAILED ]');
    });
})();
