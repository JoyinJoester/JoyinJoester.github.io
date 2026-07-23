/* ============================================================
   数据加载器 — 读取 GitHub Actions 生成的 data/*.json
   把 profile 数据写入 [data-source] 元素的 data-count 属性
   count-up.js 会等待本脚本就绪后再开始计数动画
   ============================================================ */
(function() {
  var PROFILE_URL = 'data/profile.json';
  var REPOS_URL = 'data/repos.json';

  // 全局 Promise — count-up.js 会等待它 resolve (无论成败)
  window.__profileReady = fetch(PROFILE_URL, { cache: 'no-cache' })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .catch(function(err) {
      console.warn('[data-loader] profile fetch failed:', err.message);
      return null;
    });

  window.__profileReady.then(function(profile) {
    if (!profile) return;
    applyProfile(profile);
    refreshRepos();
  });

  function applyProfile(profile) {
    document.querySelectorAll('[data-source]').forEach(function(el) {
      var key = el.getAttribute('data-source');
      var val = deriveValue(profile, key);
      if (val == null || val === '') return;
      // 数字 stat — 设置 data-count 触发 count-up
      if (typeof val === 'number') {
        el.setAttribute('data-count', String(val));
        el.textContent = '0';
      } else {
        el.textContent = val;
      }
    });

    // 头像、bio 等其他字段
    if (profile.avatar_url) {
      document.querySelectorAll('[data-avatar]').forEach(function(el) {
        if (el.tagName === 'IMG') el.src = profile.avatar_url;
      });
    }

    // 派遣一个事件,告知其他脚本数据已加载
    document.dispatchEvent(new CustomEvent('profile:loaded', { detail: profile }));
  }

  function deriveValue(profile, key) {
    switch (key) {
      case 'public_repos': return profile.public_repos;
      case 'followers':    return profile.followers;
      case 'following':    return profile.following;
      case 'created_year':
        if (!profile.created_at) return null;
        return new Date(profile.created_at).getFullYear();
      case 'location':     return profile.location;
      case 'bio':          return profile.bio;
      default:             return profile[key];
    }
  }

  // 可选:刷新 Monica Pass 仓库数据 (stars/forks 可能变化)
  function refreshRepos() {
    fetch(REPOS_URL, { cache: 'no-cache' })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        if (!data || !data.repos) return;
        document.dispatchEvent(new CustomEvent('repos:loaded', { detail: data }));
      })
      .catch(function() {
        // 静默失败 — 仓库数据是 nice-to-have
      });
  }
})();
