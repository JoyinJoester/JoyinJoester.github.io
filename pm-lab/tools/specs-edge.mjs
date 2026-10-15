/* Edge-case + checkout specs. These pages deliberately break the conventions that
 * password managers rely on, so a failure here is expected — the point is to see
 * exactly which signal each manager depends on. */
import { FX } from './specs-core.mjs';

const TOKENS = [
  ['name', FX.us.name], ['given-name', 'Monica'], ['family-name', 'Joyin'],
  ['organization', FX.us.company], ['organization-title', 'QA Engineer'],
  ['street-address', FX.us.street], ['address-line1', FX.us.street], ['address-line2', FX.us.street2],
  ['address-level1', 'CA'], ['address-level2', FX.us.city], ['address-level3', 'Mission District'],
  ['country', 'US'], ['country-name', 'United States'], ['postal-code', FX.us.postal],
  ['region', 'California'], ['locality', FX.us.city],
  ['tel', FX.us.tel], ['tel-country-code', '+1'], ['tel-national', '4155550102'], ['tel-area-code', '415'],
  ['email', FX.us.email], ['username', 'pm19@example.com'],
  ['new-password', 'Nth0ng!19-New'], ['current-password', 'Nth0ng!19-Current'], ['one-time-code', '246813'],
  ['cc-name', FX.card.ccName], ['cc-number', FX.card.ccNumber], ['cc-exp', '03/31'], ['cc-exp-month', '3'],
  ['cc-exp-year', '2031'], ['cc-csc', FX.card.csc],
  ['transaction-amount', '42.00'], ['language', 'zh-CN'], ['bday', '2000-01-01'],
  ['url', 'https://example.com'], ['photo', 'https://example.com/a.png'], ['sex', 'female']
];

export const EDGE_PAGES = [
  /* ============================ 分步结账 ============================ */
  {
    num: '14',
    slug: 'checkout-1-payment',
    group: 'billing',
    short: '结账 1',
    title: '结账第一步 · 支付',
    lede: '真实电商常把<strong>支付、地址、确认拆成三步跨页面导航</strong>。每一步只有部分字段，且用 URL query 或 sessionStorage 传状态。',
    tags: ['wizard', 'step-1'],
    expected: { 'cc-number': FX.card.ccNumber, 'cc-name': FX.card.ccName },
    issues: [
      '跨页向导里，管理器通常<strong>按整站记忆卡</strong>，但不会在 step2 重新建议；观察 step2 是否还弹。',
      '<strong>sessionStorage 在手改 URL 时会丢</strong>——若从地址栏直接进 step2，会看到"未收到上一步数据"。'
    ],
    form: {
      id: 'f-co1',
      action: 'checkout-2-address.html',
      method: 'get',
      live: true,
      fields: [
        { key: 'cc-name', label: 'NAME ON CARD', type: 'text', name: 'cc-name', ac: 'cc-name', req: true, w: 6 },
        { key: 'cc-number', label: 'CARD NUMBER', type: 'text', name: 'cc-number', ac: 'cc-number', inputmode: 'numeric', req: true, w: 6 }
      ],
      submit: 'CONTINUE TO ADDRESS'
    }
  },
  {
    num: '15',
    slug: 'checkout-2-address',
    group: 'billing',
    short: '结账 2',
    title: '结账第二步 · 地址',
    lede: '只有地址字段，没有支付字段。<strong>这一步能检验管理器的"地址集"与"支付集"是否互相阻塞</strong>。',
    tags: ['wizard', 'step-2'],
    expected: { 'address-line1': FX.us.street, 'address-level2': FX.us.city, 'postal-code': FX.us.postal },
    form: {
      id: 'f-co2',
      action: 'checkout-3-review.html',
      method: 'get',
      live: true,
      fields: [
        { key: 'address-line1', label: 'STREET', type: 'text', name: 'address-line1', ac: 'address-line1', req: true, w: 8 },
        { key: 'address-level2', label: 'CITY', type: 'text', name: 'address-level2', ac: 'address-level2', req: true, w: 4 },
        { key: 'postal-code', label: 'POSTAL', type: 'text', name: 'postal-code', ac: 'postal-code', req: true, w: 4 },
        { key: 'country', label: 'COUNTRY', type: 'select', name: 'country', ac: 'country-name', req: true, w: 4, options: [['US', 'United States'], ['CN', '中国'], ['JP', '日本']] },
        { key: 'email', label: 'EMAIL', type: 'email', name: 'email', ac: 'email', req: true, w: 4 }
      ],
      submit: 'CONTINUE TO REVIEW'
    },
    before: `<div class="panel panel--raised caption" data-prev-step>上一步经 URL query 传来的数据：<span data-prev>—</span></div>`,
    script: `var q = new URLSearchParams(location.search);
var card = (q.get('cc-number') || '').replace(/\\s/g, '');
document.querySelector('[data-prev]').textContent = card
  ? 'cc-number=****' + card.slice(-4) + ' · cc-name=' + (q.get('cc-name') || '(空)') + '（真导航已发生，观察管理器是否已在 step2 重新给出建议）'
  : '（无 query —— 你是直接打开本页的，或上一页被拦截了提交）';
PM.log('info', 'checkout-2 收到 query 参数 ' + q.toString(), null);`
  },
  {
    num: '16',
    slug: 'checkout-3-review',
    group: 'billing',
    short: '结账 3',
    title: '结账第三步 · 确认（只读回显）',
    lede: '确认页把前两步的值渲染成<strong>只读文本</strong>，但表单仍以 hidden input 存在——这是"看起来填好了，其实字段根本不在 DOM 里"的典型。',
    tags: ['wizard', 'step-3', 'hidden-inputs'],
    expected: { 'cc-last4': '4242', 'postal-code': FX.us.postal },
    issues: [
      'hidden input 不会被任何管理器填充（正确行为）。如果确认页数据错，是<strong>站点自己的序列化</strong>问题，不是管理器问题。',
      '<strong>只读展示 + hidden 提交</strong> 的结构下，管理器的"填充完成度"显示会是 0%，容易误判。',
      '本页 fixture 里 <strong>cc-last4 期望 4242</strong>：它只能由 JS 从 query 写入，因此 CHECK 会判它 FAIL——这是设计如此，用来确认"隐藏字段不参与填充"。'
    ],
    before: `<div class="panel stack-sm"><span class="label">REVIEW · 由 URL query 回显</span><div data-review class="stack-xs"></div></div>`,
    form: {
      id: 'f-co3',
      fields: [
        { key: 'postal-code', label: '确认账单邮编（可编辑，最后一步校验）', type: 'text', name: 'postal-code', ac: 'postal-code', req: true, w: 4 },
        { key: 'cc-last4', label: '卡末四位（HIDDEN）', type: 'hidden', name: 'cc-last4', hiddenInput: true, attrs: 'data-pm-from="checkout-1"' }
      ],
      submit: 'PLACE ORDER'
    },
    script: `var q = new URLSearchParams(location.search);
var card = (q.get('cc-number') || '').replace(/\\s/g, '');
var hid = document.querySelector('#f-cc-last4');
if (hid) hid.value = card.slice(-4);
var rows = [['卡末四位', card ? '****' + card.slice(-4) : '(空)'], ['街道', q.get('address-line1') || '(空)'], ['城市', q.get('address-level2') || '(空)'], ['邮编', q.get('postal-code') || '(空)'], ['邮箱', q.get('email') || '(空)']];
document.querySelector('[data-review]').innerHTML = rows.map(function (r) {
  return '<div class="stat"><span class="stat__k">' + r[0] + '</span><span class="stat__v">' + r[1] + '</span></div>';
}).join('');
PM.log('info', 'checkout-3 从 query 回显 ' + rows.filter(function (r) { return r[1] !== '(空)'; }).length + '/5 项；hidden 字段由脚本写入，非填充', null);`
  },

  /* ============================ 破坏性边界 ============================ */
  {
    num: '17',
    slug: 'no-form',
    group: 'edge',
    short: '无 FORM',
    title: '没有 &lt;form&gt; 的裸输入框',
    lede: 'SPA 里极常见：字段直接躺在 <strong>div</strong> 里，靠按钮的 click 事件提交。规范要求登录表单必须在 form 内，多数实现<strong>仍能</strong>识别，但保存提示会丢。',
    tags: ['no-form', 'spa'],
    expected: { email: 'pm17@example.com', password: 'Nth0ng!17-NoForm' },
    issues: [
      '无 form ⇒ <strong>没有 submit 事件</strong>，浏览器不会触发"保存密码"流程。自动填充可能仍工作，保存一定不工作。',
      '用 <strong>button[type=button] + JS</strong> 提交时，Chrome 会把这页判定为"非登录表单"的概率显著上升。',
      '对照：下方有 form 的对照组若正常、上方失败，即可确认是 <strong>form 缺失</strong>而非字段属性问题。'
    ],
    raw: `<div class="panel stack-sm">
<span class="label">VARIANT A · 无 form（错误示范）</span>
<div class="field"><div class="field__top"><label class="field__label" for="a-email">EMAIL</label><span class="field__ac">autocomplete=username</span></div>
<input class="field__input" id="a-email" name="email" type="email" autocomplete="username" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="a-password">PASSWORD</label><span class="field__ac">autocomplete=current-password</span></div>
<input class="field__input" id="a-password" name="password" type="password" autocomplete="current-password" data-pm-uid=""><p class="field__msg"></p></div>
<div class="row"><button type="button" class="btn btn--primary" data-noform-submit>SIGN IN (JS ONLY)</button><span class="caption" data-noform-status></span></div>
</div>
<hr class="hairline">
<div class="panel stack-sm">
<span class="label">VARIANT B · 有 form（对照组）</span>
<form class="form" id="f-b" data-pm-id="form-b">
<div class="field"><div class="field__top"><label class="field__label" for="b-email">EMAIL</label><span class="field__ac">autocomplete=username</span></div>
<input class="field__input" id="b-email" name="email" type="email" autocomplete="username" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="b-password">PASSWORD</label><span class="field__ac">autocomplete=current-password</span></div>
<input class="field__input" id="b-password" name="password" type="password" autocomplete="current-password" data-pm-uid=""><p class="field__msg"></p></div>
<div class="form__foot"><button class="btn btn--secondary" type="submit">SIGN IN (SUBMIT)</button></div>
</form>
</div>
<div class="caption">注意：期望值只绑定在 name=email/password 上，两组同名 ⇒ 检查表会各命中一组。用 <strong>CHECK</strong> 时看的是先出现的那个。</div>`,
    script: `document.querySelector('[data-noform-submit]').addEventListener('click', function (e) {
  var email = document.querySelector('#a-email'), pw = document.querySelector('#a-password');
  PM.log('warn','无 form 的按钮提交（不会触发浏览器保存流程）', { email: email.value ? 1 : 0, len: pw.value.length });
  document.querySelector('[data-noform-status]').textContent = '[JS SUBMIT] 已提交，但浏览器不会弹保存';
});`
  },
  {
    num: '18',
    slug: 'no-label',
    group: 'edge',
    short: '无 LABEL',
    title: '标签缺失的四种变体',
    lede: '管理器判断"这是哪个字段"依赖 <strong>label[for] / aria-label / placeholder / name / id / autocomplete</strong>。这里逐条剥掉，看还剩什么能用。',
    tags: ['label-less', 'a11y', 'heuristic'],
    expected: { v1: 'pm18-v1@example.com', v2: 'pm18-v2@example.com', v3: 'pm18-v3@example.com', z9x_kf_input: 'pm18-v4@example.com' },
    issues: [
      '<strong>variant C 只有 placeholder</strong>：可访问性上 placeholder 不是标签；且部分管理器<strong>忽略 placeholder</strong>，只按 name/autocomplete 猜。',
      '<strong>variant D 全部剥离</strong>（随机 name/id、无 autocomplete、无 label）：此时只剩<strong>DOM 顺序与相邻文本</strong>，各实现分歧最大。',
      '若 A/B 正常、C 失败 ⇒ 该管理器<strong>不读 placeholder</strong>；若 D 也正常 ⇒ 它在按位置猜，可靠性差。'
    ],
    raw: `<div class="stack-lg">
<div class="panel stack-sm"><span class="label">A · label[for] + autocomplete（最好情况）</span>
<div class="field"><div class="field__top"><label class="field__label" for="v1">EMAIL</label><span class="field__ac">autocomplete=username</span></div>
<input class="field__input" id="v1" name="v1" type="email" autocomplete="username" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="v1p">PASSWORD</label><span class="field__ac">current-password</span></div>
<input class="field__input" id="v1p" name="password_v1" type="password" autocomplete="current-password" data-pm-uid=""><p class="field__msg"></p></div></div>

<div class="panel stack-sm"><span class="label">B · 只有 aria-label（无可见 label）</span>
<div class="field"><input class="field__input" aria-label="Email address" name="v2" type="email" autocomplete="username" id="v2" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><input class="field__input" aria-label="Password" name="password_v2" type="password" autocomplete="current-password" id="v2p" data-pm-uid=""><p class="field__msg"></p></div></div>

<div class="panel stack-sm"><span class="label">C · 只有 placeholder（无 label / 无 autocomplete）</span>
<div class="field"><input class="field__input" placeholder="you@example.com" name="v3" type="email" id="v3" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><input class="field__input" placeholder="Password" name="password" type="password" id="v3p" data-pm-uid=""><p class="field__msg"></p></div></div>

<div class="panel stack-sm"><span class="label">D · 全剥离：随机 name/id，无 label、无 autocomplete、无 placeholder</span>
<div class="field"><input class="field__input" name="z9x_kf_input" type="text" id="q7f2a" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><input class="field__input" name="zz_pw_field_88" type="password" id="k1l0m" data-pm-uid=""><p class="field__msg"></p></div></div>
</div>`,
    script: `PM.log('warn','D 组无任何语义线索——若仍被填充，说明该管理器在按 DOM 位置猜测', null);`
  },
  {
    num: '19',
    slug: 'autocomplete-matrix',
    group: 'edge',
    short: 'AC 矩阵',
    title: 'autocomplete 取值矩阵',
    lede: '每个 <strong>autocomplete</strong> 取值一格，值与 token 同名。用来回答："这个管理器到底认哪些 token"——尤其是<strong>语义相近的成对 token</strong>（address-level1 vs region、country vs country-name）。',
    tags: ['autofill-token', 'matrix'],
    expected: TOKENS.reduce((a, t) => ((a[t[0]] = t[1]), a), {}),
    issues: [
      '<strong>country</strong> 期望 ISO 国家码（US），<strong>country-name</strong> 期望可读名（United States）。填错值 = 该实现没区分这对 token。',
      '<strong>address-level1 与 region</strong>、<strong>address-level2 与 locality</strong> 是同一含义的不同写法，只能填其一，看它怎么选。',
      '<strong>cc-exp</strong>（单格 MM/YY）与 <strong>cc-exp-month/year</strong>（分格）互斥，观察它填了哪种。',
      'token 值与字段 name 一致，因此 CHECK 能精确定位<strong>错位</strong>（例如把 postal 填进 region）。'
    ],
    form: {
      id: 'f-tokens',
      fields: TOKENS.map(([tok, want]) => ({
        key: tok, label: tok, name: tok, ac: tok, type: /password/.test(tok) ? 'password' : /email|username/.test(tok) ? 'email' : 'text',
        w: 4, hint: '期望 ' + want
      })),
      submit: 'SUBMIT MATRIX'
    }
  },
  {
    num: '20',
    slug: 'multi-forms',
    group: 'edge',
    short: '多表单',
    title: '同页多个表单 / 多组凭据',
    lede: '三个独立 <strong>form</strong>：两组登录 + 一个订阅。再加一组"同页两套账号密码"。管理器必须决定<strong>建议填哪一组、往哪一组写</strong>。',
    tags: ['multiple-forms', 'ambiguity'],
    expected: { email_a: 'pm20-a@example.com', password_a: 'Nth0ng!20-A', email_b: 'pm20-b@example.com', password_b: 'Nth0ng!20-B' },
    issues: [
      '两组 current-password 同页 ⇒ 管理器的建议<strong>只会指向其中一个</strong>；观察它选中哪一组、另一组是否被清空。',
      '<strong>newsletter 只有一个 email</strong>：某些实现会把它当登录邮箱，弹出账号建议——这是误判。',
      '表单顺序影响判断：<strong>先出现的 form 通常获胜</strong>。'
    ],
    raw: `<div class="stack-lg">
<form class="panel stack-sm" id="f-20a" data-pm-id="form-a">
<span class="label">FORM A · 主账号登录</span>
<div class="field"><div class="field__top"><label class="field__label" for="email_a">EMAIL</label><span class="field__ac">username</span></div><input class="field__input" id="email_a" name="email_a" type="email" autocomplete="username" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="password_a">PASSWORD</label><span class="field__ac">current-password</span></div><input class="field__input" id="password_a" name="password_a" type="password" autocomplete="current-password" data-pm-uid=""><p class="field__msg"></p></div>
<div class="form__foot"><button class="btn btn--primary" type="submit">SIGN IN A</button><span class="formstatus" data-formstatus></span></div>
</form>
<form class="panel stack-sm" id="f-20b" data-pm-id="form-b">
<span class="label">FORM B · 副账号登录（第二个密码框）</span>
<div class="field"><div class="field__top"><label class="field__label" for="email_b">EMAIL</label><span class="field__ac">username</span></div><input class="field__input" id="email_b" name="email_b" type="email" autocomplete="username" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="password_b">PASSWORD</label><span class="field__ac">current-password</span></div><input class="field__input" id="password_b" name="password_b" type="password" autocomplete="current-password" data-pm-uid=""><p class="field__msg"></p></div>
<div class="form__foot"><button class="btn btn--secondary" type="submit">SIGN IN B</button></div>
</form>
<form class="panel stack-sm" id="f-20c" data-pm-id="form-c">
<span class="label">FORM C · 订阅（只有一个 email，无密码）</span>
<div class="field"><div class="field__top"><label class="field__label" for="news_email">EMAIL</label><span class="field__ac">email</span></div><input class="field__input" id="news_email" name="news_email" type="email" autocomplete="email" data-pm-uid=""><p class="field__msg"></p></div>
<div class="form__foot"><button class="btn btn--ghost" type="submit">SUBSCRIBE</button></div>
</form>
</div>`
  },
  {
    num: '21',
    slug: 'odd-order',
    group: 'edge',
    short: '顺序反常',
    title: 'DOM 顺序反常 / 结构打断',
    lede: '密码在账号之前、按钮夹在两个字段中间、label 与 input 被 div 打断、字段用 <strong>form=</strong> 属性外挂到表单。位置启发式（很多实现的第一依据）在这里全部受考验。',
    tags: ['dom-order', 'heuristic'],
    expected: { p1_password: 'Nth0ng!21-Reversed', p2_email: 'pm21@example.com' },
    issues: [
      '<strong>password 在 username 之前</strong>：按位置猜的实现会把密码填进用户名，或整组不填。',
      'button 夹在中间会<strong>切断"相邻字段"判定</strong>。',
      '<strong>form 属性外联</strong>（input 在 form 标签之外但 form="f-21"）：Chrome 支持，部分扩展管理器忽略——字段看起来在页面里却"不在表单里"。'
    ],
    raw: `<form class="panel stack-sm" id="f-21" data-pm-id="reversed">
<span class="label">变体 1 · PASSWORD 先于 USERNAME</span>
<div class="field"><div class="field__top"><label class="field__label" for="p1_password">PASSWORD</label><span class="field__ac">current-password</span></div><input class="field__input" id="p1_password" name="p1_password" type="password" autocomplete="current-password" data-pm-uid=""><p class="field__msg"></p></div>
<div class="form__foot"><button type="button" class="btn btn--ghost btn--sm">A BUTTON IN THE MIDDLE</button></div>
<div class="field"><div class="field__top"><label class="field__label" for="p1_email">EMAIL / USERNAME</label><span class="field__ac">username</span></div><input class="field__input" id="p1_email" name="p1_email" type="email" autocomplete="username" data-pm-uid=""><p class="field__msg"></p></div>
<div class="form__foot"><button class="btn btn--secondary" type="submit">SIGN IN REVERSED</button><span class="formstatus" data-formstatus></span></div>
</form>
<hr class="hairline">
<div class="stack-sm">
<span class="label">变体 2 · 字段用 form="f-21b" 外挂（input 不在 form 标签内部）</span>
<form id="f-21b" class="panel" data-pm-id="external-form"><span class="caption">这个 form 元素本身是空的</span></form>
<div class="field"><div class="field__top"><label class="field__label" for="p2_email">EMAIL</label><span class="field__ac">username · form=f-21b</span></div><input class="field__input" id="p2_email" name="p2_email" type="email" autocomplete="username" form="f-21b" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="p2_password">PASSWORD</label><span class="field__ac">current-password · form=f-21b</span></div><input class="field__input" id="p2_password" name="p2_password" type="password" autocomplete="current-password" form="f-21b" data-pm-uid=""><p class="field__msg"></p></div>
<div class="row"><button class="btn btn--secondary" type="submit" form="f-21b">SIGN IN VIA FORM ATTR</button></div>
</div>`
  },
  {
    num: '22',
    slug: 'hidden-states',
    group: 'edge',
    short: '隐藏/只读',
    title: '隐藏、只读、禁用、蜜罐',
    lede: '八种"看得见或看不见的字段状态"，逐条验证管理器<strong>会不会往不可交互的字段里写值</strong>——以及隐藏蜜罐字段会不会被填（这是机器人检测常见的坑）。',
    tags: ['hidden', 'readonly', 'honeypot'],
    expected: { hp_company: '', state_visible: 'Nth0ng!22-Visible', state_ro: 'Nth0ng!22-Readonly' },
    issues: [
      '<strong>readonly</strong>：规范上仍可被脚本赋值，多数管理器会跳过填充。<strong>disabled</strong>：完全不提交，也基本不填。',
      '<strong>display:none / visibility:hidden / opacity:0 / 移出视口</strong> 四种隐藏方式对管理器的可见性不同，Chrome 对 <strong>offscreen</strong> 的字段仍可能填。',
      '<strong>蜜罐字段（hp_company）期望为空</strong>：一旦被填即视为机器人。本行显示为 FAIL 才是"安全上正常"的结果。',
      '<strong>autocomplete=off / no</strong>：规范要求 off 只是"建议"，多数实现照样填；这是浏览器行为，不是站点能控制的。'
    ],
    raw: `<form class="stack-lg" id="f-22" data-pm-id="states">
<div class="panel stack-sm"><span class="label">A · 正常可见（对照）</span>
<div class="field"><div class="field__top"><label class="field__label" for="state_visible">PASSWORD · VISIBLE</label><span class="field__ac">current-password</span></div><input class="field__input" id="state_visible" name="state_visible" type="password" autocomplete="current-password" data-pm-uid=""><p class="field__msg"></p></div></div>

<div class="panel stack-sm"><span class="label">B · readonly</span>
<div class="field"><div class="field__top"><label class="field__label" for="state_ro">PASSWORD · READONLY</label><span class="field__ac">current-password</span></div><input class="field__input" id="state_ro" name="state_ro" type="password" autocomplete="current-password" readonly value="locked-bytes" data-pm-uid=""><p class="field__msg"></p></div></div>

<div class="panel stack-sm"><span class="label">C · disabled</span>
<div class="field"><div class="field__top"><label class="field__label" for="state_dis">PASSWORD · DISABLED</label><span class="field__ac">current-password</span></div><input class="field__input" id="state_dis" name="state_dis" type="password" autocomplete="current-password" disabled data-pm-uid=""><p class="field__msg"></p></div></div>

<div class="panel stack-sm"><span class="label">D · display:none</span>
<div class="field" style="display:none"><input class="field__input" id="state_dn" name="state_dn" type="password" autocomplete="current-password" data-pm-uid=""><span class="field__label">display:none</span></div>
<p class="caption">字段存在于 DOM 但布局不可见</p></div>

<div class="panel stack-sm"><span class="label">E · visibility:hidden</span>
<div class="field" style="visibility:hidden"><input class="field__input" id="state_vh" name="state_vh" type="password" autocomplete="current-password" data-pm-uid=""><span class="field__label">visibility:hidden</span></div>
<p class="caption">占位但仍不可见</p></div>

<div class="panel stack-sm"><span class="label">F · opacity:0（视觉隐藏，实际可点）</span>
<div class="field"><input class="field__input" id="state_op" name="state_op" type="password" autocomplete="current-password" style="opacity:0" data-pm-uid=""><p class="field__msg"></p></div>
<p class="caption">上面那格是透明的，试着点它</p></div>

<div class="panel stack-sm"><span class="label">G · 移出视口（left:-9999px）</span>
<div class="field"><input class="field__input" id="state_off" name="state_off" type="email" autocomplete="email" style="position:absolute;left:-9999px" data-pm-uid=""></div>
<p class="caption">不可见但会参与自动填充——常被用在"隐藏的真实用户名框"</p></div>

<div class="panel stack-sm"><span class="label">H · 蜜罐（期望：不被填）</span>
<div class="field"><div class="field__top"><label class="field__label" for="hp_company">COMPANY（留空）</label><span class="field__ac">organization</span></div><input class="field__input" id="hp_company" name="hp_company" type="text" autocomplete="organization" data-pm-uid=""><p class="field__msg"></p></div></div>

<div class="panel stack-sm"><span class="label">I · autocomplete=off / no</span>
<div class="field"><div class="field__top"><label class="field__label" for="ac_off">PASSWORD · autocomplete=off</label></div><input class="field__input" id="ac_off" name="ac_off" type="password" autocomplete="off" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="ac_no">PASSWORD · autocomplete=no</label></div><input class="field__input" id="ac_no" name="ac_no" type="password" autocomplete="no" data-pm-uid=""><p class="field__msg"></p></div></div>

<div class="form__foot"><button class="btn btn--secondary" type="submit">SUBMIT STATES</button><span class="formstatus" data-formstatus></span></div>
</form>`,
    script: `PM.onLog(function (e) {
  if (e.kind === 'fill' && /hp_company/.test(e.msg)) {
    PM.log('warn','蜜罐字段被填了——真实站点会据此判定为机器人', null);
  }
});`
  },
  {
    num: '23',
    slug: 'dynamic-form',
    group: 'edge',
    short: '延迟渲染',
    title: '延迟 / 动态插入的表单',
    lede: '字段<strong>不在初始 HTML 里</strong>：0.5s、2s 后各插入一组，另一个由按钮触发。管理器需要在运行时重新扫描 DOM，否则永远填不上。',
    tags: ['late-dom', 'spa'],
    expected: { dyn_late: 'Nth0ng!23-Late', dyn_click: 'Nth0ng!23-OnClick' },
    issues: [
      '只扫描一次 DOM 的实现会<strong>完全漏掉晚插入的字段</strong>；扩展类管理器通常靠 MutationObserver 补救。',
      '点击按钮后才出现的字段（模态框、折叠面板）是最常见的"手动点了密码管理器图标却没反应"来源。',
      '注意诊断日志里的 <strong>SCRIPT</strong> 事件：脚本赋值与用户填充要分开看。'
    ],
    raw: `<div class="stack-lg">
<div class="panel stack-sm"><span class="label">A · 初始就在</span>
<div class="field"><div class="field__top"><label class="field__label" for="dyn_now">PASSWORD · 立即存在</label><span class="field__ac">current-password</span></div><input class="field__input" id="dyn_now" name="dyn_now" type="password" autocomplete="current-password" data-pm-uid=""><p class="field__msg"></p></div></div>
<div class="panel stack-sm" data-slot-late><span class="label">B · 0.5 秒后插入（本页加载中）</span><p class="dim caption">等待…</p></div>
<div class="panel stack-sm" data-slot-late2><span class="label">C · 2 秒后插入</span><p class="dim caption">等待…</p></div>
<div class="panel stack-sm" data-slot-click><span class="label">D · 点按钮才出现</span><div class="row"><button type="button" class="btn btn--secondary" data-reveal-field>REVEAL FIELD</button></div></div>
</div>`,
    script: `function mk(id, name, label, ac) {
  var d = document.createElement('div'); d.className = 'field';
  d.innerHTML = '<div class="field__top"><label class="field__label" for="' + id + '">' + label + '</label><span class="field__ac">' + ac + '</span></div><input class="field__input" id="' + id + '" name="' + name + '" type="password" autocomplete="' + ac + '"><p class="field__msg"></p>';
  return d;
}
setTimeout(function () { var s = document.querySelector('[data-slot-late]'); s.appendChild(mk('dyn_late','dyn_late','PASSWORD · +500MS','current-password')); PM.log('warn','DOM 于 +500ms 插入 dyn_late', null); P_scan(); }, 500);
setTimeout(function () { var s = document.querySelector('[data-slot-late2]'); s.appendChild(mk('dyn_late2','dyn_late2','PASSWORD · +2000MS','current-password')); PM.log('warn','DOM 于 +2000ms 插入 dyn_late2', null); P_scan(); }, 2000);
document.querySelector('[data-reveal-field]').addEventListener('click', function () {
  var s = document.querySelector('[data-slot-click]'); this.remove();
  s.appendChild(mk('dyn_click','dyn_click','PASSWORD · 用户点击后出现','current-password'));
  PM.log('warn','用户点击后插入 dyn_click（模态框场景）', null); P_scan();
});
function P_scan() { PM.scan(); }`
  },
  {
    num: '24',
    slug: 'shadow-dom',
    group: 'edge',
    short: 'SHADOW DOM',
    title: 'Shadow DOM 内外的表单',
    lede: '三种容器：<strong>light DOM 对照</strong>、<strong>open shadow root</strong>、<strong>closed shadow root</strong>。多数密码管理器<strong>不会穿透 shadow 边界</strong>，这是组件库/Web Component 的头号填充杀手。',
    tags: ['shadow-dom', 'web-components'],
    expected: { light_pass: 'Nth0ng!24-Light' },
    issues: [
      '<strong>open</strong>：脚本能访问 <strong>host.shadowRoot</strong>，本诊断台可以登记它；浏览器原生填充通常<strong>仍然失败</strong>。',
      '<strong>closed</strong>：连 <strong>host.shadowRoot === null</strong>，扩展类管理器彻底看不见；只有本页面自己保留了引用（见下方 [REGISTER] 按钮）。',
      '结论判法：若 light 能填、open 不能 ⇒ 该管理器<strong>不支持 shadow DOM</strong>，组件化表单要退回 light DOM 或 slot 外部渲染。'
    ],
    raw: `<div class="stack-lg">
<div class="panel stack-sm"><span class="label">A · LIGHT DOM（对照）</span>
<div class="field"><div class="field__top"><label class="field__label" for="light_pass">PASSWORD</label><span class="field__ac">current-password</span></div><input class="field__input" id="light_pass" name="light_pass" type="password" autocomplete="current-password" data-pm-uid=""><p class="field__msg"></p></div></div>
<div class="panel stack-sm"><span class="label">B · OPEN SHADOW ROOT（&lt;pm-open-field&gt;）</span><pm-open-field></pm-open-field><p class="caption">host.shadowRoot 可访问：<span data-open-可见性>—</span></p></div>
<div class="panel stack-sm"><span class="label">C · CLOSED SHADOW ROOT（&lt;pm-closed-field&gt;）</span><pm-closed-field></pm-closed-field><p class="caption">host.shadowRoot === <span data-closed-可见性>—</span> · 诊断台需手动登记 <button type="button" class="btn btn--sm btn--ghost" data-register-closed>[ REGISTER ]</button></p></div>
</div>`,
    script: `customElements.define('pm-open-field', class extends HTMLElement {
  connectedCallback() {
    var r = this.attachShadow({ mode: 'open' });
    r.innerHTML = '<style>:host{display:block;font-family:Space Grotesk,sans-serif}label{font-family:Space Mono;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#999}input{width:100%;margin-top:6px;padding:10px 0;background:transparent;border:0;border-bottom:1px solid #333;color:#fff;font-family:Space Mono;font-size:16px}</style><label for="shadow_pass">PASSWORD · OPEN</label><input id="shadow_pass" name="shadow_pass" type="password" autocomplete="current-password">';
    document.querySelector('[data-open-可见性]').textContent = 'true（可被脚本枚举）';
  }
});
var closedRef = null;
customElements.define('pm-closed-field', class extends HTMLElement {
  connectedCallback() {
    closedRef = this.attachShadow({ mode: 'closed' });
    closedRef.innerHTML = '<style>:host{display:block;font-family:Space Grotesk,sans-serif}label{font-family:Space Mono;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#999}input{width:100%;margin-top:6px;padding:10px 0;background:transparent;border:0;border-bottom:1px solid #333;color:#fff;font-family:Space Mono;font-size:16px}</style><label for="closed_pass">PASSWORD · CLOSED</label><input id="closed_pass" name="closed_pass" type="password" autocomplete="current-password">';
    var host = this;
    document.querySelector('[data-closed-可见性]').textContent = 'null（外部不可访问: ' + (host.shadowRoot === null) + '）';
  }
});
document.querySelector('[data-register-closed]').addEventListener('click', function () {
  PM.registerRoot(closedRef);
  PM.log('info','closed shadow root 手动登记给诊断台（真实管理器做不到这一步）', null);
});`
  },
  {
    num: '25',
    slug: 'iframe-form',
    group: 'edge',
    short: 'IFRAME',
    title: 'iframe 内的表单',
    lede: '同域 iframe 里的登录框，以及一个<strong>跨域 iframe</strong>（指向本站之外）。第三方支付/登录组件全是这个结构。',
    tags: ['iframe', 'same-origin', 'cross-origin'],
    expected: { frame_email: 'pm25@example.com', frame_password: 'Nth0ng!25-Frame' },
    issues: [
      '同域 iframe：<strong>Chrome 原生管理器能填</strong>，扩展类管理器往往只扫顶层 document → 失败。',
      '跨域 iframe：<strong>页面脚本完全读不到</strong>（SecurityError），只有浏览器本体可能填；诊断台只能记录"存在一个不可见的 iframe"。',
      '<strong>file:// 协议下 iframe 的 origin 是 null</strong>，同域判定失效——必须用 http(s) 打开本站。'
    ],
    raw: `<div class="stack-lg">
<div class="panel stack-sm"><span class="label">A · 同域 IFRAME（iframe-inner.html）</span>
<iframe src="iframe-inner.html" title="同域登录框" data-frame-same style="width:100%;height:340px;border:1px solid var(--border-visible);border-radius:var(--radius-field);background:var(--bg)"></iframe>
<p class="caption">诊断台扫描结果：<span data-frame-same-status>检测中…</span></p></div>
<div class="panel stack-sm"><span class="label">B · 跨域 IFRAME</span>
<iframe src="https://example.com/" title="跨域框" data-frame-cross style="width:100%;height:160px;border:1px solid var(--border-visible);border-radius:var(--radius-field)"></iframe>
<p class="caption">尝试访问 contentDocument：<span data-frame-cross-status>检测中…</span> — 预期 SecurityError。若这里连累页面报错，说明实现没做保护。</p></div>
</div>`,
    script: `var same = document.querySelector('[data-frame-same]');
same.addEventListener('load', function () {
  try {
    var n = same.contentDocument.querySelectorAll('input').length;
    document.querySelector('[data-frame-same-status]').textContent = '可读 · ' + n + ' 个控件已进入扫描';
    PM.scan();
  } catch (e) { document.querySelector('[data-frame-same-status]').textContent = '不可读: ' + e.name; }
});
var cross = document.querySelector('[data-frame-cross]');
setTimeout(function () {
  try { var d = cross.contentDocument; document.querySelector('[data-frame-cross-status]').textContent = d ? '意外可读（file:// 或同源代理）' : 'null（已隔离）'; }
  catch (e) { document.querySelector('[data-frame-cross-status]').textContent = e.name + ': ' + e.message; }
}, 4000);`
  },
  {
    num: '26',
    slug: 'nonstandard-names',
    group: 'edge',
    short: '非标准命名',
    title: '非标准 name / id / 类型伪装',
    lede: '没有 autocomplete 时，实现只能读 <strong>name/id 关键字</strong>。这里用 12 种真实世界出现过的写法，包括<strong>把密码放在 type=text 里</strong>的移动端骗术。',
    tags: ['heuristic', 'name-keyword'],
    expected: { pwd: 'Nth0ng!26-A', user_name: 'pm26@example.com', upwd: 'Nth0ng!26-B' },
    issues: [
      '<strong>pwd / upwd / pass / user_name / login_email</strong> 这类缩写命中靠字典；字典里没有的实现就完全不填。',
      '<strong>type=text 冒充密码框</strong>（iOS 常见：为避免系统键盘遮挡而用 text + 自定义掩码）会让管理器<strong>认不出这是密码字段</strong>——这是可预期失败。',
      '<strong>name 带中文/全角</strong> 与 <strong>name 是 UUID</strong> 是启发式的两个死角。'
    ],
    raw: `<div class="stack-lg">
<div class="panel stack-sm"><span class="label">组 1 · 关键字命中（无 autocomplete）</span>
<div class="grid-2">
<div class="field"><div class="field__top"><label class="field__label" for="n-pwd">name=pwd</label></div><input class="field__input" id="n-pwd" name="pwd" type="password" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="n-pass">name=pass</label></div><input class="field__input" id="n-pass" name="pass" type="password" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="n-user_name">name=user_name</label></div><input class="field__input" id="n-user_name" name="user_name" type="text" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="n-upwd">name=upwd</label></div><input class="field__input" id="n-upwd" name="upwd" type="password" data-pm-uid=""><p class="field__msg"></p></div>
</div></div>
<div class="panel stack-sm"><span class="label">组 2 · 类型伪装与无关键字</span>
<div class="grid-2">
<div class="field"><div class="field__top"><label class="field__label" for="n-textpw">type=text 冒充密码框</label><span class="field__ac field__ac--none">无 autocomplete</span></div><input class="field__input" id="n-textpw" name="login_pin" type="text" inputmode="text" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="n-uuid">name=UUID</label></div><input class="field__input" id="n-uuid" name="3f2a9c1e-7b4d-4a11-9c2f-88de1a0b5c77" type="password" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="n-zh">name=密码（中文）</label></div><input class="field__input" id="n-zh" name="密码" type="password" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="n-emailpw">name=email 但其实是账号</label></div><input class="field__input" id="n-emailpw" name="email" type="text" data-pm-uid=""><p class="field__msg"></p></div>
</div></div>
<div class="panel stack-sm"><span class="label">组 3 · 只有 id 有语义，name 无语义</span>
<div class="field"><div class="field__top"><label class="field__label" for="login_email">name=q1 / id=login_email</label></div><input class="field__input" id="login_email" name="q1" type="text" data-pm-uid=""><p class="field__msg"></p></div>
<div class="field"><div class="field__top"><label class="field__label" for="login_password">name=q2 / id=login_password</label></div><input class="field__input" id="login_password" name="q2" type="password" data-pm-uid=""><p class="field__msg"></p></div>
</div></div>`
  }
];
