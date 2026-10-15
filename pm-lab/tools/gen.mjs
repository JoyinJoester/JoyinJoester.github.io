/* Emit static HTML for every page described in tools/specs-*.mjs, plus assets/pages.js.
 * Output is plain files on purpose: a password manager must not have to wait for JS
 * to see the form, otherwise the baseline itself becomes a dynamic-DOM test. */
import fs from 'node:fs';
import path from 'node:path';
import { PAGES as CORE, FX } from './specs-core.mjs';
import { EDGE_PAGES } from './specs-edge.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ALL = [...CORE, ...EDGE_PAGES].sort((a, b) => a.num.localeCompare(b.num));

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const idOf = (k) => 'f-' + String(k).replace(/[^a-zA-Z0-9_-]/g, '-');

function field(f) {
  const id = f.id || idOf(f.key);
  const cls = 'field' + (f.w && f.w !== 12 ? ` field--${f.w}` : '');
  const attrs = [
    `name="${esc(f.name || f.key)}"`,
    `type="${f.type || 'text'}"`,
    f.ac ? `autocomplete="${esc(f.ac)}"` : '',
    f.ph ? `placeholder="${esc(f.ph)}"` : '',
    f.req ? 'required' : '',
    f.inputmode ? `inputmode="${esc(f.inputmode)}"` : '',
    f.pattern ? `pattern="${esc(f.pattern)}"` : '',
    f.maxlength ? `maxlength="${f.maxlength}"` : '',
    f.value ? `value="${esc(f.value)}"` : '',
    f.attrs || '',
    'data-pm-uid=""'
  ]
    .filter(Boolean)
    .join(' ');
  /* No attribute at all ≠ autocomplete="off". The former lets the browser decide,
   * the latter is a (weak) request not to fill. Pages here must not blur the two. */
  const acNote = f.ac
    ? `autocomplete=${esc(f.ac)}`
    : '<span class="field__ac field__ac--none">无 autocomplete 属性</span>';
  let control;
  if (f.type === 'select') {
    control =
      `<select class="field__input" id="${id}" ${attrs}>` +
      (f.options || [])
        .map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`)
        .join('') +
      `</select>`;
  } else if (f.hiddenInput) {
    control =
      `<input class="field__input" id="${id}" ${attrs}>` +
      `<p class="caption">↑ type=hidden：不参与填充，仅用于回显上一步数据</p>`;
  } else {
    control = `<input class="field__input" id="${id}" ${attrs}>`;
  }
  return (
    `<div class="${cls}">` +
    `<div class="field__top"><label class="field__label" for="${id}">${esc(f.label || f.key)}${f.req ? '<span class="badge-required"> *</span>' : ''}</label>` +
    `<span class="field__ac">${acNote}</span></div>` +
    control +
    (f.hint ? `<p class="caption">${esc(f.hint)}</p>` : '') +
    `<p class="field__msg"></p>` +
    `</div>`
  );
}

function form(spec) {
  if (!spec) return '';
  return (
    `<form class="form" id="${spec.id}" data-pm-id="${spec.id}" method="${spec.method || 'POST'}" action="${spec.action || '#'}"` +
    (spec.live ? ' data-pm-live="1"' : '') +
    ` autocomplete="on">` +
    `<div class="formgrid">` +
    (spec.fields || []).map(field).join('\n') +
    `</div>` +
    `<div class="form__foot">` +
    `<button class="btn btn--primary" type="submit">${esc(spec.submit || 'SUBMIT')}</button>` +
    (spec.second ? `<button class="btn btn--secondary" type="submit" formaction="${spec.secondAction || '#'}" data-pm-live-trigger>${esc(spec.second)}</button>` : '') +
    `<span class="formstatus" data-formstatus></span>` +
    `</div>` +
    (spec.after || '') +
    `</form>`
  );
}

function fixtureTable(expected) {
  const keys = Object.keys(expected || {});
  if (!keys.length) return '';
  return (
    `<section class="panel stack-sm" aria-label="Fixture">` +
    `<div class="row row--between"><span class="label">FIXTURE · 先把这条存进密码管理器</span><span class="caption">测试专用假数据</span></div>` +
    `<table class="fixture table"><thead><tr><th>字段</th><th>期望值</th><th></th></tr></thead><tbody>` +
    keys
      .map(
        (k) =>
          `<tr><td>${esc(k)}</td><td>${esc(expected[k])}</td><td><button type="button" class="btn btn--sm btn--ghost" data-copy-expected="${esc(k)}">COPY</button></td></tr>`
      )
      .join('') +
    `</tbody></table></section>`
  );
}

function page(p) {
  const head = `<!doctype html>
<html lang="zh-CN" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.num)} ${esc(p.short)} · PM Autofill Lab</title>
<meta name="description" content="${esc(p.title)} — 密码管理器自动填充调试台">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="assets/nothing.css">
<script>(function(){try{var t=new URLSearchParams(location.search).get('theme')||localStorage.getItem('pm.theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})();</script>
</head>
<body>
<a class="skip" href="#main">跳到表单</a>
<header class="topbar">
  <div class="topbar__inner">
    <a class="brand" href="index.html"><span class="brand__mark">PM·LAB</span><span class="brand__sub">AUTOFILL TESTBED</span></a>
    <nav class="topnav" aria-label="主导航">
      <a href="index.html">INDEX</a>
      <a href="diagnostics.html">DIAGNOSTICS</a>
      <a href="passkey-login.html">PASSKEY</a>
    </nav>
    <div class="topbar__tools"><button type="button" class="iconbtn" data-act="theme" aria-label="切换深浅色">◐</button></div>
  </div>
</header>
<main id="main" class="wrap">`;

  const pagehead = `
<section class="pagehead">
  <div class="pagehead__id">
    <span class="pagehead__num">${esc(p.num)}</span>
    <h1 class="pagehead__title">${esc(p.title)}</h1>
  </div>
  <p class="pagehead__lede">${p.lede}</p>
  <div class="row" style="margin-top:var(--s-md)">${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
    <span class="tag tag--on">GROUP · ${esc(p.group)}</span></div>
</section>`;

  const tools = `
<section class="panel panel--raised stack-sm" style="margin-bottom:var(--s-xl)">
  <div class="row row--between">
    <span class="label">FIELD COVERAGE</span>
    <span class="mono display" data-coverage-readout>—</span>
  </div>
  <div class="segbar segbar--hero" data-coverage></div>
  <div class="row" style="margin-top:var(--s-sm)">
    <button type="button" class="btn btn--sm btn--secondary" data-act="check">CHECK FILL</button>
    <button type="button" class="btn btn--sm btn--ghost" data-act="scan">RE-SCAN DOM</button>
    <button type="button" class="btn btn--sm btn--ghost" data-act="reset">RESET FORMS</button>
    <span class="caption">CHECK 依据下方 fixture 逐字段判定 PASS / PREFIX / FAIL / ABSENT</span>
  </div>
  <div data-checkout></div>
</section>`;

  const issues = p.issues
    ? `<hr class="hairline">
<section class="stack-sm" aria-label="已知失败模式">
  <span class="label">KNOWN FAILURE MODES · 本页该观察到什么</span>
  <ul class="issues">${p.issues.map((i) => `<li>${i}</li>`).join('')}</ul>
</section>`
    : '';

  const foot = `
</main>
<footer class="footer wrap"><div class="row row--between"><span><a href="index.html">INDEX</a> · <a href="diagnostics.html">SESSION LOG</a></span><span>Nothing-inspired testbed · ${esc(p.slug)}.html</span></div></footer>
<script type="application/json" data-pm-page>${JSON.stringify({ num: p.num, slug: p.slug, group: p.group, title: p.title })}</script>
<script type="application/json" data-pm-expected>${JSON.stringify(p.expected || {})}</script>
<script src="assets/pages.js"></script>
<script src="assets/diag.js"></script>
<script src="assets/site.js"></script>
${p.script ? `<script>\n${p.script}\n</script>` : ''}
</body>
</html>
`;

  const body = [pagehead, p.before || '', tools, fixtureTable(p.expected), p.raw || form(p.form), p.after || '', issues, `<section data-pager style="margin-top:var(--s-2xl)"></section>`].join('\n');
  return head + body + foot;
}

/* Pages that are hand-authored but must still appear in the nav/pager registry. */
const EXTRA = [
  { num: '00', slug: 'index', group: 'meta', short: '总览', title: '测试矩阵总览', tags: ['index'], fields: 0 },
  { num: '06', slug: 'passkey-signup', group: 'passkey', short: 'PASSKEY 建', title: 'Passkey 创建（WebAuthn create）', tags: ['webauthn'], fields: 0 },
  { num: '07', slug: 'passkey-login', group: 'passkey', short: 'PASSKEY 验', title: 'Passkey 验证（WebAuthn get）', tags: ['webauthn'], fields: 0 },
  { num: '08', slug: 'credential-api', group: 'passkey', short: '凭证 API', title: 'Credential Management API', tags: ['passwordcredential'], fields: 0 },
  { num: '90', slug: 'diagnostics', group: 'meta', short: '诊断台', title: '跨页诊断汇总台', tags: ['log'], fields: 0 }
];

/* ---------------------------------------------------------------- emit */
fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });

for (const p of ALL) {
  const file = path.join(ROOT, `${p.slug}.html`);
  if (fs.existsSync(file) && process.argv.includes('--skip-existing')) {
    console.log('SKIP  ', p.slug + '.html');
    continue;
  }
  fs.writeFileSync(file, page(p));
  console.log('WROTE ', `${p.slug}.html`.padEnd(24), p.num, p.group);
}

const registry = [...ALL.map((p) => ({
  num: p.num,
  slug: p.slug,
  group: p.group,
  short: p.short,
  title: p.title,
  tags: p.tags || [],
  fields: Object.keys(p.expected || {}).length
})), ...EXTRA].sort((a, b) => (a.num === '00' ? -1 : b.num === '00' ? 1 : a.num === '90' ? 1 : b.num === '90' ? -1 : a.num.localeCompare(b.num)));

fs.writeFileSync(
  path.join(ROOT, 'assets', 'pages.js'),
  '/* generated by tools/gen.mjs — do not hand-edit */\nwindow.PM_PAGES = ' +
    JSON.stringify(registry, null, 1) +
    ';\n'
);
console.log('WROTE  assets/pages.js (' + registry.length + ' pages)');
console.log('FIXTURE REFERENCE: ' + JSON.stringify({ us: FX.us.email }));
