# Joyin Joester · 个人主页

前端工程师 · Tokyo · 部署在 GitHub Pages

站点只展示能从 GitHub **自动拉取** 的真实数据，没有手写假笔记 / 假项目 / 假技能清单。

## 技术栈

- 纯 HTML / CSS / Vanilla JS，零依赖，无需构建
- OKLCH 色彩系统 + CSS 变量 token
- GitHub Actions 定时拉取数据，前端读静态 JSON
- 响应式覆盖 360px – 1920px
- 深色 / 浅色主题切换 (View Transitions API)

## 页面模块

| 模块 | 数据来源 |
|------|---------|
| 个人资料 / 粉丝数 / 仓库数 | `data/profile.json` ← Actions |
| 贡献热力图 | `ghchart.rshah.org` 实时图 |
| 最近提交 | `data/commits.json` ← Actions |
| Monica Pass 组织仓库 | `data/repos.json` ← Actions |
| 关于 / 联系 | 手写（非动态数据） |

## 本地预览

```bash
python -m http.server 4321
# 或
npx serve .
```

打开 http://localhost:4321

本地预览前可手动拉一次数据：

```bash
# 可选：设置 token 提高 API 限额
# $env:GITHUB_TOKEN = "ghp_..."
node scripts/fetch-github.mjs
```

## 目录结构

```
.
├── index.html
├── 404.html
├── sitemap.xml
├── .nojekyll
├── assets/
│   ├── css/
│   └── js/                 # data-loader / commits / projects ...
├── data/                   # Actions 写入，前端只读
│   ├── profile.json
│   ├── commits.json
│   └── repos.json
├── scripts/
│   └── fetch-github.mjs
└── .github/workflows/
    └── refresh-data.yml    # 每 30 分钟刷新
```

## 部署到 GitHub Pages

1. 创建仓库（推荐 `JoyinJoester.github.io`）
2. 推送到 `main`
3. Settings → Pages → Deploy from a branch → `main` / `/ (root)`
4. 等待几分钟访问 `https://<用户名>.github.io/`

数据刷新 workflow 会自动启用：
- 每 30 分钟拉取最新 GitHub 数据
- 有变化则 commit 到 `data/`
- Pages 随 push 重新部署

## 自定义

修改 `scripts/fetch-github.mjs` 顶部常量：

- `USER` — GitHub 用户名
- `ORG` — 组织名
- `MAX_COMMITS` / `MAX_REPOS` — 拉取数量
