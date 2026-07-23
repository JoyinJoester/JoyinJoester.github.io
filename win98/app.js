/* ============================================================
   Win98 desktop — window manager + apps
   ============================================================ */
(function () {
  'use strict';

  var zTop = 20;
  var openWindows = {}; // id -> { el, taskBtn, state }
  var selectedIcon = null;

  var APPS = {
    about: {
      id: 'about',
      title: '简介.txt - 记事本',
      icon: '📄',
      desktopLabel: '简介.txt',
      w: 420,
      h: 340,
      x: 80,
      y: 40,
      body: function () {
        return (
          '<div class="notepad">' +
          '<h1>简介.txt</h1>' +
          '<p>姓名：Joyin（JoyinJoester）</p>' +
          '<p>位置：Tokyo, JP</p>' +
          '<p>所属：Monica Pass</p>' +
          '<p>角色：Monica 开发者</p>' +
          '<p></p>' +
          '<p>2006年被评为年度美国时代周刊风云人物，</p>' +
          '<p>2008年感动中国组委会大奖获得者，</p>' +
          '<p>2019年获得年度地球卫士奖，</p>' +
          '<p>2022年奥林匹克杯获得者，</p>' +
          '<p>Monica 开发者。</p>' +
          '<p></p>' +
          '<p class="muted">—— 本文件只读 · 双击桌面图标打开</p>' +
          '</div>'
        );
      },
    },
    monica: {
      id: 'monica',
      title: 'Monica.exe',
      icon: '🔐',
      desktopLabel: 'Monica.exe',
      w: 460,
      h: 380,
      x: 140,
      y: 50,
      body: function () {
        return (
          '<div class="app-body" id="monicaBody">' +
          '<h1>Monica Pass</h1>' +
          '<p>开源、本地优先的跨平台密码管理器 &amp; 2FA 验证器。</p>' +
          '<p class="muted">正在从 GitHub 读取组织数据…</p>' +
          '</div>'
        );
      },
      onOpen: loadMonica,
    },
    github: {
      id: 'github',
      title: 'GitHub.url - Internet Explorer',
      icon: '🐙',
      desktopLabel: 'GitHub.url',
      w: 400,
      h: 260,
      x: 200,
      y: 70,
      body: function () {
        return (
          '<div class="app-body">' +
          '<h1>Internet Shortcut</h1>' +
          '<div class="field"><span>URL</span><span><a href="https://github.com/JoyinJoester" target="_blank" rel="noopener">https://github.com/JoyinJoester</a></span></div>' +
          '<div class="field"><span>组织</span><span><a href="https://github.com/Monica-Pass" target="_blank" rel="noopener">https://github.com/Monica-Pass</a></span></div>' +
          '<div class="field"><span>个人页</span><span><a href="../">返回现代主站 →</a></span></div>' +
          '<div class="actions">' +
          '<a class="win-btn" href="https://github.com/JoyinJoester" target="_blank" rel="noopener">打开 GitHub</a>' +
          '<a class="win-btn" href="https://github.com/Monica-Pass" target="_blank" rel="noopener">打开组织</a>' +
          '</div>' +
          '</div>'
        );
      },
    },
    contact: {
      id: 'contact',
      title: '联系我.txt - 记事本',
      icon: '✉️',
      desktopLabel: '联系我.txt',
      w: 380,
      h: 240,
      x: 120,
      y: 100,
      body: function () {
        return (
          '<div class="notepad">' +
          '<h1>联系我.txt</h1>' +
          '<p>Email：<a href="mailto:joyin8888@foxmail.com">joyin8888@foxmail.com</a></p>' +
          '<p>GitHub：<a href="https://github.com/JoyinJoester" target="_blank" rel="noopener">@JoyinJoester</a></p>' +
          '<p>Org：<a href="https://github.com/Monica-Pass" target="_blank" rel="noopener">Monica-Pass</a></p>' +
          '<p></p>' +
          '<p class="muted">欢迎合作 / issue / 咖啡邀约。</p>' +
          '</div>'
        );
      },
    },
    home: {
      id: 'home',
      title: '返回主站.url',
      icon: '🏠',
      desktopLabel: '返回主站.url',
      w: 320,
      h: 180,
      x: 220,
      y: 120,
      body: function () {
        return (
          '<div class="app-body">' +
          '<h1>返回现代主站</h1>' +
          '<p>离开 Windows 98 桌面，回到 Joyin 的个人主页。</p>' +
          '<div class="actions"><a class="win-btn" href="../">立即返回</a></div>' +
          '</div>'
        );
      },
    },
  };

  // ---- Boot ----
  var boot = document.getElementById('boot');
  function hideBoot() {
    if (!boot) return;
    boot.hidden = true;
    boot.setAttribute('aria-hidden', 'true');
    boot.style.display = 'none';
  }
  if (boot) {
    boot.hidden = false;
    boot.style.display = '';
    boot.setAttribute('aria-hidden', 'false');
    // 进度条 CSS 约 1.4s；略多留一点再关
    setTimeout(hideBoot, 1600);
    // 兜底：若动画/计时异常，3s 后强制进入桌面
    setTimeout(hideBoot, 3000);
    // 点击也可跳过
    boot.addEventListener('click', hideBoot, { once: true });
  }

  // ---- Desktop icons ----
  var iconsEl = document.getElementById('desktopIcons');
  var iconOrder = ['about', 'monica', 'github', 'contact', 'home'];
  iconOrder.forEach(function (id) {
    var app = APPS[id];
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon';
    btn.dataset.app = id;
    btn.innerHTML =
      '<span class="icon-glyph" aria-hidden="true">' + app.icon + '</span>' +
      '<span class="icon-label">' + escapeHtml(app.desktopLabel) + '</span>';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      selectIcon(btn);
    });
    btn.addEventListener('dblclick', function (e) {
      e.preventDefault();
      openApp(id);
    });
    // mobile: second tap opens
    var lastTap = 0;
    btn.addEventListener('touchend', function (e) {
      var now = Date.now();
      if (now - lastTap < 350) {
        e.preventDefault();
        openApp(id);
        lastTap = 0;
      } else {
        lastTap = now;
        selectIcon(btn);
      }
    });
    iconsEl.appendChild(btn);
  });

  document.getElementById('desktop').addEventListener('click', function (e) {
    if (e.target === e.currentTarget || e.target.id === 'desktopIcons' || e.target.classList.contains('window-layer')) {
      clearIconSelection();
      closeStartMenu();
    }
  });

  function selectIcon(btn) {
    clearIconSelection();
    btn.classList.add('selected');
    selectedIcon = btn;
  }
  function clearIconSelection() {
    if (selectedIcon) selectedIcon.classList.remove('selected');
    selectedIcon = null;
  }

  // ---- Start menu ----
  var startBtn = document.getElementById('startBtn');
  var startMenu = document.getElementById('startMenu');

  startBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleStartMenu();
  });
  startMenu.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  startMenu.querySelectorAll('[data-open]').forEach(function (el) {
    el.addEventListener('click', function () {
      openApp(el.getAttribute('data-open'));
      closeStartMenu();
    });
  });

  document.getElementById('shutdownBtn').addEventListener('click', function () {
    closeStartMenu();
    document.getElementById('shutdown').hidden = false;
  });
  document.getElementById('restartBtn').addEventListener('click', function () {
    document.getElementById('shutdown').hidden = true;
  });

  function toggleStartMenu() {
    var open = startMenu.hidden;
    startMenu.hidden = !open;
    startBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function closeStartMenu() {
    startMenu.hidden = true;
    startBtn.setAttribute('aria-expanded', 'false');
  }

  // ---- Clock ----
  var clockEl = document.getElementById('clock');
  function tickClock() {
    var d = new Date();
    var h = d.getHours();
    var m = String(d.getMinutes()).padStart(2, '0');
    var s = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    clockEl.textContent = h12 + ':' + m + ' ' + s;
    clockEl.dateTime = d.toISOString();
    clockEl.title = d.toLocaleString('zh-CN');
  }
  tickClock();
  setInterval(tickClock, 15000);

  // ---- Window manager ----
  var layer = document.getElementById('windowLayer');
  var taskButtons = document.getElementById('taskButtons');

  function openApp(id) {
    var app = APPS[id];
    if (!app) return;

    if (openWindows[id]) {
      var rec = openWindows[id];
      if (rec.state === 'minimized') {
        rec.state = 'normal';
        rec.el.classList.remove('minimized');
      }
      focusWindow(id);
      return;
    }

    var win = document.createElement('div');
    win.className = 'window';
    win.dataset.app = id;
    win.style.left = app.x + 'px';
    win.style.top = app.y + 'px';
    win.style.width = app.w + 'px';
    win.style.height = app.h + 'px';
    win.innerHTML =
      '<div class="titlebar" data-drag>' +
      '<span class="titlebar-icon" aria-hidden="true">' + app.icon + '</span>' +
      '<span class="titlebar-text">' + escapeHtml(app.title) + '</span>' +
      '<div class="titlebar-btns">' +
      '<button type="button" class="tb-btn" data-action="min" title="最小化" aria-label="最小化">_</button>' +
      '<button type="button" class="tb-btn" data-action="max" title="最大化" aria-label="最大化">□</button>' +
      '<button type="button" class="tb-btn close" data-action="close" title="关闭" aria-label="关闭">×</button>' +
      '</div>' +
      '</div>' +
      '<div class="window-body">' + app.body() + '</div>';

    layer.appendChild(win);

    var taskBtn = document.createElement('button');
    taskBtn.type = 'button';
    taskBtn.className = 'task-btn';
    taskBtn.dataset.app = id;
    taskBtn.innerHTML =
      '<span class="t-icon" aria-hidden="true">' + app.icon + '</span>' +
      '<span>' + escapeHtml(app.desktopLabel) + '</span>';
    taskBtn.addEventListener('click', function () {
      var rec = openWindows[id];
      if (!rec) return;
      if (rec.state === 'minimized') {
        rec.state = 'normal';
        rec.el.classList.remove('minimized');
        focusWindow(id);
      } else if (rec.el.classList.contains('inactive') === false && rec.state === 'normal') {
        minimizeWindow(id);
      } else {
        focusWindow(id);
      }
    });
    taskButtons.appendChild(taskBtn);

    openWindows[id] = { el: win, taskBtn: taskBtn, state: 'normal', maximized: false };

    win.addEventListener('mousedown', function () {
      focusWindow(id);
    });

    win.querySelector('[data-action="close"]').addEventListener('click', function (e) {
      e.stopPropagation();
      closeWindow(id);
    });
    win.querySelector('[data-action="min"]').addEventListener('click', function (e) {
      e.stopPropagation();
      minimizeWindow(id);
    });
    win.querySelector('[data-action="max"]').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleMaximize(id);
    });

    enableDrag(win, win.querySelector('[data-drag]'));

    // stagger default position if reopened later
    app.x = Math.min(app.x + 16, window.innerWidth - 120);
    app.y = Math.min(app.y + 16, window.innerHeight - 120);

    focusWindow(id);
    if (typeof app.onOpen === 'function') app.onOpen(win);
  }

  function closeWindow(id) {
    var rec = openWindows[id];
    if (!rec) return;
    rec.el.remove();
    rec.taskBtn.remove();
    delete openWindows[id];
  }

  function minimizeWindow(id) {
    var rec = openWindows[id];
    if (!rec) return;
    rec.state = 'minimized';
    rec.el.classList.add('minimized');
    rec.taskBtn.classList.remove('active');
  }

  function toggleMaximize(id) {
    var rec = openWindows[id];
    if (!rec) return;
    rec.maximized = !rec.maximized;
    rec.el.classList.toggle('maximized', rec.maximized);
    focusWindow(id);
  }

  function focusWindow(id) {
    var rec = openWindows[id];
    if (!rec) return;
    zTop += 1;
    rec.el.style.zIndex = String(zTop);
    rec.el.classList.remove('minimized', 'inactive');
    rec.state = 'normal';

    Object.keys(openWindows).forEach(function (k) {
      var r = openWindows[k];
      if (k === id) {
        r.el.classList.remove('inactive');
        r.taskBtn.classList.add('active');
      } else {
        r.el.classList.add('inactive');
        r.taskBtn.classList.remove('active');
      }
    });
  }

  function enableDrag(win, handle) {
    var dragging = false;
    var ox = 0;
    var oy = 0;

    handle.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      if (e.target.closest('.tb-btn')) return;
      var rec = openWindows[win.dataset.app];
      if (rec && rec.maximized) return;
      dragging = true;
      var rect = win.getBoundingClientRect();
      ox = e.clientX - rect.left;
      oy = e.clientY - rect.top;
      e.preventDefault();
    });

    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var maxX = window.innerWidth - 80;
      var maxY = window.innerHeight - 40 - 28;
      var x = Math.max(0, Math.min(e.clientX - ox, maxX));
      var y = Math.max(0, Math.min(e.clientY - oy, maxY));
      win.style.left = x + 'px';
      win.style.top = y + 'px';
    });

    window.addEventListener('mouseup', function () {
      dragging = false;
    });

    // touch drag
    handle.addEventListener('touchstart', function (e) {
      if (e.target.closest('.tb-btn')) return;
      var rec = openWindows[win.dataset.app];
      if (rec && rec.maximized) return;
      var t = e.touches[0];
      var rect = win.getBoundingClientRect();
      dragging = true;
      ox = t.clientX - rect.left;
      oy = t.clientY - rect.top;
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      var t = e.touches[0];
      var maxX = window.innerWidth - 80;
      var maxY = window.innerHeight - 40 - 28;
      var x = Math.max(0, Math.min(t.clientX - ox, maxX));
      var y = Math.max(0, Math.min(t.clientY - oy, maxY));
      win.style.left = x + 'px';
      win.style.top = y + 'px';
    }, { passive: true });

    window.addEventListener('touchend', function () {
      dragging = false;
    });
  }

  // ---- Monica data from existing JSON ----
  function loadMonica(win) {
    var body = win.querySelector('#monicaBody');
    if (!body) return;

    fetch('../data/repos.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var org = data.org || {};
        var repos = data.repos || [];
        var list = repos
          .map(function (r) {
            return (
              '<li>' +
              '<span><a href="' + escapeAttr(r.html_url) + '" target="_blank" rel="noopener">' +
              escapeHtml(r.name) +
              '</a>' +
              (r.description ? ' — ' + escapeHtml(r.description) : '') +
              '</span>' +
              '<span>★ ' + (r.stargazers_count || 0) + '</span>' +
              '</li>'
            );
          })
          .join('');

        body.innerHTML =
          '<h1>' + escapeHtml(org.name || 'Monica Pass') + '</h1>' +
          '<p>' + escapeHtml(org.description || '开源密码管理 & 2FA') + '</p>' +
          '<div class="stats">' +
          '<div class="stat"><b>' + (org.public_repos != null ? org.public_repos : '—') + '</b>仓库</div>' +
          '<div class="stat"><b>' + (org.total_stars != null ? org.total_stars : '—') + '</b>Stars</div>' +
          '<div class="stat"><b>' + (org.followers != null ? org.followers : '—') + '</b>Followers</div>' +
          '</div>' +
          '<ul class="repo-list">' + list + '</ul>' +
          '<div class="actions">' +
          '<a class="win-btn" href="' + escapeAttr(org.html_url || 'https://github.com/Monica-Pass') + '" target="_blank" rel="noopener">在 GitHub 打开</a>' +
          '</div>';
      })
      .catch(function () {
        body.innerHTML =
          '<h1>Monica Pass</h1>' +
          '<p>开源、本地优先的跨平台密码管理器。</p>' +
          '<p class="muted">仓库数据加载失败，请稍后再试。</p>' +
          '<div class="actions">' +
          '<a class="win-btn" href="https://github.com/Monica-Pass" target="_blank" rel="noopener">在 GitHub 打开</a>' +
          '</div>';
      });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, '&#96;');
  }

  // keyboard: Enter on selected icon
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && selectedIcon) {
      openApp(selectedIcon.dataset.app);
    }
    if (e.key === 'Escape') {
      closeStartMenu();
    }
  });
})();
