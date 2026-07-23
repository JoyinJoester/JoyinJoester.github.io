// ============================================================
// 拉取 GitHub 数据,写入 data/*.json
// 由 GitHub Actions 定时调用,前端改为读取静态 JSON
// ============================================================

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');

const USER = 'JoyinJoester';
const ORG = 'Monica-Pass';
const TOKEN = process.env.GITHUB_TOKEN;
const MAX_COMMITS = 6;
const MAX_REPOS = 6;

const API = 'https://api.github.com';
const HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'joyin-blog-data-fetcher',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

function log(label, value) {
  console.log(`[${label}]`, value);
}

async function ghFetch(pathname) {
  const res = await fetch(`${API}${pathname}`, { headers: HEADERS });
  const rateRemaining = res.headers.get('x-ratelimit-remaining');
  const rateLimit = res.headers.get('x-ratelimit-limit');
  log('fetch', `${pathname} → ${res.status} (rate ${rateRemaining}/${rateLimit})`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${pathname}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function safeRead(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJson(name, data) {
  const path = join(DATA_DIR, `${name}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  log('write', `${name}.json (${data.updated_at ?? 'no-ts'})`);
}

function shortSha(sha) {
  return sha.substring(0, 7);
}

function repoShort(fullName) {
  const parts = fullName.split('/');
  if (parts[0] === USER) return parts[1];
  return fullName;
}

function firstLine(msg) {
  const idx = msg.indexOf('\n');
  return idx === -1 ? msg : msg.substring(0, idx);
}

// ============================================================
// 1. 个人 profile
// ============================================================
async function fetchProfile() {
  const u = await ghFetch(`/users/${USER}`);
  return {
    login: u.login,
    name: u.name,
    avatar_url: u.avatar_url,
    bio: u.bio,
    blog: u.blog,
    location: u.location,
    company: u.company,
    html_url: u.html_url,
    followers: u.followers,
    following: u.following,
    public_repos: u.public_repos,
    public_gists: u.public_gists,
    created_at: u.created_at,
    updated_at: new Date().toISOString(),
  };
}

// ============================================================
// 2. 最近提交 — 从 public events 过滤 PushEvent
// ============================================================
async function fetchCommits() {
  const events = await ghFetch(`/users/${USER}/events/public`);
  const commits = [];
  for (const e of events) {
    if (e.type !== 'PushEvent') continue;
    if (!e.payload || !e.payload.commits) continue;
    // commits 在 push 内是时间正序,反转后 newest 在前
    for (const c of e.payload.commits.slice().reverse()) {
      commits.push({
        sha: c.sha,
        short_sha: shortSha(c.sha),
        message: firstLine(c.message),
        url: `https://github.com/${e.repo.name}/commit/${c.sha}`,
        repo: e.repo.name,
        repo_short: repoShort(e.repo.name),
        date: e.created_at,
      });
      if (commits.length >= MAX_COMMITS) break;
    }
    if (commits.length >= MAX_COMMITS) break;
  }
  return {
    updated_at: new Date().toISOString(),
    commits,
  };
}

// ============================================================
// 3. Monica Pass 组织仓库
// ============================================================
async function fetchOrgRepos() {
  let org;
  try {
    org = await ghFetch(`/orgs/${ORG}`);
  } catch (err) {
    log('warn', `org fetch failed: ${err.message}`);
    return null;
  }

  const repos = await ghFetch(`/orgs/${ORG}/repos?sort=updated&per_page=${MAX_REPOS}`);
  const picked = repos
    .filter(r => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, MAX_REPOS)
    .map(r => ({
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      html_url: r.html_url,
      language: r.language,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      open_issues_count: r.open_issues_count,
      updated_at: r.updated_at,
      pushed_at: r.pushed_at,
      license: r.license ? r.license.spdx_id : null,
      topics: r.topics || [],
    }));

  const total_stars = picked.reduce((sum, r) => sum + r.stargazers_count, 0);

  return {
    org: {
      login: org.login,
      name: org.name,
      avatar_url: org.avatar_url,
      description: org.description,
      html_url: org.html_url,
      public_repos: org.public_repos,
      followers: org.followers,
      total_stars,
    },
    repos: picked,
    updated_at: new Date().toISOString(),
  };
}

// ============================================================
// main
// ============================================================
async function main() {
  log('start', `${USER} / ${ORG} @ ${new Date().toISOString()}`);
  mkdirSync(DATA_DIR, { recursive: true });

  // 每个 fetch 独立 try/catch,某个失败时保留旧数据,不阻塞其他
  const tasks = [
    ['profile', fetchProfile],
    ['commits', fetchCommits],
    ['repos', fetchOrgRepos],
  ];

  let anySuccess = false;
  for (const [name, fn] of tasks) {
    try {
      const data = await fn();
      if (data) {
        writeJson(name, data);
        anySuccess = true;
      }
    } catch (err) {
      log('error', `${name}: ${err.message}`);
      const prev = safeRead(join(DATA_DIR, `${name}.json`));
      if (prev) log('keep', `${name}: retained previous data (${prev.updated_at})`);
    }
  }

  if (!anySuccess) {
    log('fail', 'no data refreshed; aborting to avoid wiping existing files');
    process.exit(1);
  }
  log('done', 'refresh complete');
}

main().catch(err => {
  console.error('fatal:', err);
  process.exit(1);
});
