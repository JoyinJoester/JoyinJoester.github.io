/* Page specs for the autofill testbed.
 * Everything here becomes real static HTML at build time — a password manager must
 * never see a JS-rendered baseline, otherwise every page silently becomes the
 * "dynamic form" edge case. */

export const FX = {
  card: {
    ccName: 'MONICA JOYIN',
    ccNumber: '4242424242424242',
    expMonth: '03',
    expYear: '2031',
    csc: '737',
    postal: '94107'
  },
  us: {
    name: 'Monica Joyin',
    company: 'Nothing Labs Test',
    street: '123 Nothing Lane',
    street2: 'Apt 4B',
    city: 'San Francisco',
    region: 'CA',
    postal: '94107',
    country: 'US',
    tel: '+14155550102',
    email: 'pm.address@example.com'
  },
  cn: {
    name: '莫妮卡',
    company: '无实验室（测试）',
    province: '北京市',
    city: '北京市',
    district: '朝阳区',
    street: '建国路 88 号 测试大厦 4 层',
    postal: '100022',
    country: 'CN',
    tel: '13800138000'
  },
  jp: {
    name: 'モニカ ジョイイン',
    postal: '150-0041',
    region: '東京都',
    city: '渋谷区',
    street: '宇田川町 1-2 テストビル 4F'
  }
};

const emailField = (key, name, ac, ph) => ({ key, label: 'EMAIL', type: 'email', name, ac, ph });

export const PAGES = [
  /* ============================ A. 核心认证 ============================ */
  {
    num: '01',
    slug: 'login-inline',
    group: 'auth',
    short: '同页登录',
    title: '账号 + 密码 · 同一页单表单',
    lede: '最基础的组合：<strong>username 与 password 在同一个 form 内</strong>，账号在前、密码在后。这是密码管理器的对照组——如果这一页都填不上，问题在识别，不在场景。',
    tags: ['baseline', 'single-form'],
    expected: { email: 'pm01@example.com', password: 'Nth0ng!01-Pm-Test' },
    issues: [
      '<strong>正确姿势</strong>：两个字段都在同一个 <strong>&lt;form&gt;</strong> 内，<strong>autocomplete=username</strong> + <strong>autocomplete=current-password</strong>。',
      '若管理器没弹提示：检查是否 <strong>input 在 DOM 加载后才出现</strong>，或表单被 <strong>overflow:hidden</strong> 裁到视口外。',
      '保存提示（save prompt）通常在<strong>提交后真实导航</strong>才出现。本页默认拦截提交，点 <strong>SIGN IN (REAL NAV)</strong> 那个版本才会走真导航。'
    ],
    form: {
      id: 'f-login',
      fields: [
        { key: 'email', label: 'EMAIL / USERNAME', type: 'email', name: 'email', ac: 'username', ph: 'you@example.com', req: true },
        { key: 'password', label: 'PASSWORD', type: 'password', name: 'password', ac: 'current-password', req: true, hint: '登录用 current，不是 new' }
      ],
      submit: 'SIGN IN',
      second: 'SIGN IN (REAL NAV)',
      after: `<label class="switch"><input type="checkbox" data-act="toggle-live" data-pm-uid=""><span class="switch__track"></span><span class="label">允许真导航（测保存提示）</span></label>`
    }
  },
  {
    num: '02',
    slug: 'login-step1',
    group: 'auth',
    short: '分步登录 A',
    title: '账号 · 第一页（只有账号）',
    lede: 'Google / Microsoft 式两步登录。<strong>这一页根本没有密码框</strong>，密码在下一页。这是安卓自动填充与网页密码管理器最容易翻车的结构。',
    tags: ['split-flow', 'no-password-here'],
    expected: { email: 'pm02@example.com' },
    issues: [
      '很多管理器<strong>不在无密码页弹出账号建议</strong>，因为无法确认这是登录表单。',
      '下一页拿到密码框时，已存的条目里的用户名<strong>无法与本页输入关联</strong>，导致：填充了密码但用户名空白，或整条不弹。',
      '<strong>autocomplete=username</strong> 必须写在第一页，否则第二页无从继承。',
      '本页提交后会真导航到 <strong>login-step2.html</strong>，身份通过 sessionStorage 传递——留意密码管理器是否把两步视作同一站点。'
    ],
    form: {
      id: 'f-step1',
      action: 'login-step2.html',
      method: 'get',
      live: true,
      fields: [
        { key: 'email', label: 'EMAIL / PHONE / USERNAME', type: 'text', name: 'email', ac: 'username', ph: 'you@example.com', req: true, hint: '本页唯一的凭据字段' }
      ],
      submit: 'CONTINUE'
    },
    script: `document.querySelector('#f-email')?.addEventListener('change', function (e) { PM.identity(e.target.value); });
document.querySelector('form').addEventListener('submit', function (e) { PM.identity(document.querySelector('#f-email').value); PM.log('info','step1 交出身份 → step2', null); });`
  },
  {
    num: '03',
    slug: 'login-step2',
    group: 'auth',
    short: '分步登录 B',
    title: '密码 · 第二页（只有密码）',
    lede: '上一步的账号写在页面顶部（<strong>只读展示，不是 input</strong>），下方只有一个密码框。真实站点常这样做——但很多密码管理器<strong>要求同页存在可提交的账号字段</strong>才肯填充。',
    tags: ['split-flow', 'password-only-page'],
    expected: { password: 'Nth0ng!02-Split-Test' },
    form: {
      id: 'f-step2',
      fields: [
        { key: 'password', label: 'PASSWORD', type: 'password', name: 'password', ac: 'current-password', req: true, hint: '没有同页 username input——观察建议是否出现' }
      ],
      submit: 'SIGN IN'
    },
    before: `<div class="panel panel--raised stack-xs" data-identity-box>
<span class="label">SIGNING IN AS</span>
<p class="mono display" data-identity style="font-size:var(--subheading)">(未从上一页取得身份)</p>
<p class="caption">若这里是空的，说明 sessionStorage 没跨页传过来（隐私模式 / file:// 协议会导致）。</p>
</div>`,
    script: `var id = PM.identity();
var box = document.querySelector('[data-identity]');
if (id) { box.textContent = id; } else { box.textContent = '(URL 无 email 参数，sessionStorage 也空)'; }
var url = new URL(location.href); if (url.searchParams.get('email')) { box.textContent = url.searchParams.get('email'); PM.identity(url.searchParams.get('email')); }
var hidden = document.createElement('input'); hidden.type='hidden'; hidden.name='email'; hidden.value = box.textContent; document.querySelector('#f-step2').appendChild(hidden);`
  },
  {
    num: '04',
    slug: 'signup',
    group: 'auth',
    short: '注册',
    title: '注册 · new-password',
    lede: '注册表单。<strong>autocomplete=new-password</strong> 会触发管理器的"生成强密码"路径，与登录用的 current-password 是两条完全不同的代码分支。',
    tags: ['signup', 'password-generator'],
    expected: { username: 'pm04-new', email: 'pm04-new@example.com', password: 'Nth0ng!04-Signup-Test', password_confirm: 'Nth0ng!04-Signup-Test' },
    issues: [
      '<strong>new-password</strong> 时，多数管理器<strong>拒绝填充已保存的密码</strong>（这是正确行为），只肯"建议新密码"。若你想测填充，用 current-password 的页面。',
      '确认密码框（<strong>re-enter / confirm</strong>）常被漏填：它是第二个 password 字段，规范上应写 <strong>autocomplete=new-password</strong> 同名。',
      '注册页的<strong>保存提示</strong>最容易丢：提交后若无真导航，浏览器不会记录新凭据。'
    ],
    form: {
      id: 'f-signup',
      fields: [
        { key: 'username', label: 'USERNAME', type: 'text', name: 'username', ac: 'username', req: true },
        { key: 'email', label: 'EMAIL', type: 'email', name: 'email', ac: 'email', req: true, ph: 'you@example.com' },
        { key: 'password', label: 'PASSWORD', type: 'password', name: 'password', ac: 'new-password', req: true, hint: '12+ 位，含大小写与符号' },
        { key: 'confirm', label: 'CONFIRM PASSWORD', type: 'password', name: 'password_confirm', ac: 'new-password', req: true, hint: '第二个 new-password，看管理器是否同步填充' }
      ],
      submit: 'CREATE ACCOUNT'
    }
  },
  {
    num: '05',
    slug: 'change-password',
    group: 'auth',
    short: '改密码',
    title: '修改密码 · current / new / confirm',
    lede: '三个密码框同页：<strong>current-password → new-password → new-password</strong>。这是"填了哪个、存了哪个"最难分辨的场景。',
    tags: ['three-passwords', 'rotate'],
    expected: { current_password: 'Nth0ng!05-Rotated', password: 'Nth0ng!05-New-Test' },
    issues: [
      '第一个必须是 <strong>current-password</strong>，后两个 <strong>new-password</strong>。写错会让管理器把新密码填进旧密码框。',
      'Chrome 只在<strong>最后一个</strong> password 字段显示建议图标，看起来像"没填上"，其实是 UI 行为。',
      '修改成功后应当保存<strong>新</strong>密码；若你的管理器更新了旧条目，说明它按 DOM 顺序猜的，而不是按 autocomplete。'
    ],
    form: {
      id: 'f-rotate',
      fields: [
        { key: 'current_password', label: 'CURRENT PASSWORD', type: 'password', name: 'current_password', ac: 'current-password', req: true },
        { key: 'password', label: 'NEW PASSWORD', type: 'password', name: 'password', ac: 'new-password', req: true },
        { key: 'confirm', label: 'RE-ENTER NEW PASSWORD', type: 'password', name: 'password_confirm', ac: 'new-password', req: true }
      ],
      submit: 'SAVE NEW PASSWORD'
    }
  },

  /* ============================ B. OTP ============================ */
  {
    num: '09',
    slug: 'otp',
    group: 'otp',
    short: '验证码',
    title: '一次性验证码 · 单框 / 分格 / WebOTP',
    lede: '<strong>autocomplete=one-time-code</strong> 是安卓 SMS 自动读取的开关，也是 iOS 短信码建议的开关。单框与分格（6 个 input）行为差异极大。',
    tags: ['one-time-code', 'sms', 'split-input'],
    expected: { code: '246813' },
    issues: [
      '分格输入通常<strong>只有第一格带 one-time-code</strong>，安卓会把整码塞进第一格，出现"1 格里 6 位数"的已知现象。',
      '<strong>WebOTP</strong>（OTPCredential）只走 HTTPS + 真实短信域名校验，本地 http 不会触发；此处仅登记 API 可用性。',
      '<strong>inputmode=numeric + pattern + maxlength=1</strong> 的组合会阻止某些管理器写超长值。'
    ],
    form: {
      id: 'f-otp',
      fields: [
        { key: 'code', label: 'SMS CODE (SINGLE BOX)', type: 'text', name: 'code', ac: 'one-time-code', req: true, inputmode: 'numeric', pattern: '[0-9]{6}', maxlength: 6, hint: 'maxlength=6 · inputmode=numeric' }
      ],
      submit: 'VERIFY'
    },
    after: `<hr class="hairline">
<div class="field">
<div class="field__top"><span class="field__label">SMS CODE (SPLIT BOXES)</span><span class="field__ac">6 × inputmode=numeric</span></div>
<div class="codes" data-split-otp>
<input class="field__input" aria-label="验证码第 1 位" autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]" maxlength="1" name="otp1" id="otp1" data-pm-uid="">
<input class="field__input" aria-label="验证码第 2 位" autocomplete="off" inputmode="numeric" pattern="[0-9]" maxlength="1" name="otp2" id="otp2" data-pm-uid="">
<input class="field__input" aria-label="验证码第 3 位" autocomplete="off" inputmode="numeric" pattern="[0-9]" maxlength="1" name="otp3" id="otp3" data-pm-uid="">
<input class="field__input" aria-label="验证码第 4 位" autocomplete="off" inputmode="numeric" pattern="[0-9]" maxlength="1" name="otp4" id="otp4" data-pm-uid="">
<input class="field__input" aria-label="验证码第 5 位" autocomplete="off" inputmode="numeric" pattern="[0-9]" maxlength="1" name="otp5" id="otp5" data-pm-uid="">
<input class="field__input" aria-label="验证码第 6 位" autocomplete="off" inputmode="numeric" pattern="[0-9]" maxlength="1" name="otp6" id="otp6" data-pm-uid="">
</div>
<p class="field__msg" data-split-msg>逐格输入自动跳下一格 · 粘贴/整码写入会自动分发</p>
</div>`,
    script: `/* 分格跳格 / 整码分发在 assets/site.js 里统一处理 */
if (window.OTPCredential && navigator.credentials) {
  navigator.credentials.get({ otp: { supported: ['sms'] }, signal: (window.AbortSignal && AbortSignal.timeout) ? AbortSignal.timeout(12000) : undefined })
   .then(function (c) { if (c && c.code) { PM.log('fill','WebOTP 收到短信码 → ' + c.code, null); document.querySelector('#f-code').value = c.code; } })
   .catch(function (err) { PM.log('info','WebOTP 未触发: ' + (err && err.name), null); });
}`
  },

  /* ============================ C. 地址 / 支付 ============================ */
  {
    num: '12',
    slug: 'billing-address',
    group: 'billing',
    short: '账单地址',
    title: '账单地址 · CN / US / JP 语义切换',
    lede: '地址自动填充靠的是 <strong>street-address / address-level1-3 / postal-code / country-name</strong> 这套语义。不同国家字段数不同，这里用分段控件切换三种布局。',
    tags: ['address-autofill', 'locale'],
    expected: {
      name: FX.us.name,
      organization: FX.us.company,
      email: FX.us.email,
      tel: FX.us.tel,
      country: 'US',
      'address-level1': 'CA',
      'address-level2': FX.us.city,
      'address-line1': FX.us.street,
      'address-line2': FX.us.street2,
      'postal-code': FX.us.postal
    },
    issues: [
      '<strong>address-level1/2/3</strong> 的含义按国家不同：美国 level1=州、level2=城市；中国 level1=省、level2=市、level3=区。管理器按 <strong>country 值</strong>决定映射，国家字段填错→地址错乱。',
      '<strong>tel 与 email</strong> 属于身份类，很多管理器与地址分属两个"填充集"，需要分别授权。',
      '<strong>postal-code 与 region</strong> 的联动校验（邮编 vs 省下拉选项）常导致填充后表单报错。'
    ],
    form: {
      id: 'f-addr',
      fields: [
        { key: 'name', label: 'FULL NAME', type: 'text', name: 'name', ac: 'name', req: true, w: 6 },
        { key: 'organization', label: 'COMPANY (OPTIONAL)', type: 'text', name: 'organization', ac: 'organization', w: 6 },
        { key: 'email', label: 'EMAIL', type: 'email', name: 'email', ac: 'email', req: true, w: 6 },
        { key: 'tel', label: 'PHONE', type: 'tel', name: 'tel', ac: 'tel-national', req: true, w: 6, ph: '+86 138 0013 8000' },
        { key: 'country', label: 'COUNTRY / REGION', type: 'select', name: 'country', ac: 'country-name', req: true, w: 4, options: [['CN', '中国'], ['US', 'United States'], ['JP', '日本']], hint: '切换后下方字段布局改变' },
        { key: 'address-level1', label: 'STATE / PROVINCE', type: 'text', name: 'address-level1', ac: 'address-level1', req: true, w: 4 },
        { key: 'address-level2', label: 'CITY', type: 'text', name: 'address-level2', ac: 'address-level2', req: true, w: 4 },
        { key: 'address-level3', label: 'DISTRICT', type: 'text', name: 'address-level3', ac: 'address-level3', w: 6 },
        { key: 'address-line1', label: 'STREET ADDRESS', type: 'text', name: 'address-line1', ac: 'address-line1', req: true, w: 8 },
        { key: 'address-line2', label: 'APT / SUITE', type: 'text', name: 'address-line2', ac: 'address-line2', w: 4 },
        { key: 'postal-code', label: 'POSTAL CODE', type: 'text', name: 'postal-code', ac: 'postal-code', req: true, w: 4 }
      ],
      submit: 'SAVE ADDRESS'
    },
    before: `<div class="row row--between" style="margin-bottom:var(--s-md)">
<span class="label">地址布局</span>
<span class="segctrl" data-locale-ctrl>
<button type="button" data-locale="CN" aria-pressed="false">CN</button>
<button type="button" data-locale="US" aria-pressed="true">US</button>
<button type="button" data-locale="JP" aria-pressed="false">JP</button>
</span></div>`,
    script: `var LOCALES = {
  US: { fields: [['name','MONICA JOYIN'],['organization',''],['email','pm.address@example.com'],['tel','+14155550102'],['country','US'],['address-level1','CA'],['address-level2','San Francisco'],['address-level3',''],['address-line1','123 Nothing Lane'],['address-line2','Apt 4B'],['postal-code','94107']], hide: [] },
  CN: { fields: [['name','莫妮卡'],['organization','无实验室（测试）'],['email','pm.address@example.com'],['tel','13800138000'],['country','CN'],['address-level1','北京市'],['address-level2','北京市'],['address-level3','朝阳区'],['address-line1','建国路 88 号 测试大厦 4 层'],['address-line2',''],['postal-code','100022']], hide: [] },
  JP: { fields: [['name','モニカ ジョイイン'],['organization',''],['email','pm.address@example.com'],['tel',''],['country','JP'],['address-level1','東京都'],['address-level2','渋谷区'],['address-level3',''],['address-line1','宇田川町 1-2 テストビル 4F'],['address-line2',''],['postal-code','150-0041']], hide: ['address-level3'] }
};
function applyLocale(code) {
  var L = LOCALES[code];
  var map = {}; L.fields.forEach(function (p) { map[p[0]] = p[1]; });
  document.querySelectorAll('#f-addr .field').forEach(function (f) {
    var input = f.querySelector('input,select'); if (!input) return;
    var want = map[input.name];
    var lab = f.querySelector('.field__label');
    if (want !== undefined && lab) {} 
    var hint = f.querySelector('.field__msg');
    if (hint && want) hint.textContent = '期望 · ' + (code) + ': ' + want;
    f.style.display = (L.hide.indexOf(input.name) >= 0) ? 'none' : '';
  });
  var sel = document.querySelector('#f-country'); if (sel && sel.tagName === 'SELECT') sel.value = code;
  PM.log('info', '地址布局 → ' + code + '（字段数 ' + L.hide.length + ' 隐藏）', null);
  var node = document.querySelector('[data-pm-expected]');
  var obj = {}; L.fields.forEach(function (p) { if (p[1]) obj[p[0]] = p[1]; });
  node.textContent = JSON.stringify(obj);
}
document.querySelector('[data-locale-ctrl]').addEventListener('click', function (e) {
  var b = e.target.closest('[data-locale]'); if (!b) return;
  document.querySelectorAll('[data-locale]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
  applyLocale(b.getAttribute('data-locale'));
});
applyLocale('US');`
  },
  {
    num: '13',
    slug: 'payment-card',
    group: 'billing',
    short: '支付卡',
    title: '支付卡 · cc-* 语义与格式化',
    lede: '<strong>cc-name / cc-number / cc-exp-month / cc-exp-year / cc-csc</strong>。卡的自动填充受三重限制：<strong>安全上下文、HTTPS、站点是否被识别为"可支付"</strong>。',
    tags: ['payment', 'cc-autofill'],
    expected: {
      'cc-name': FX.card.ccName,
      'cc-number': FX.card.ccNumber,
      'cc-exp-month': FX.card.expMonth,
      'cc-exp-year': FX.card.expYear,
      'cc-csc': FX.card.csc
    },
    issues: [
      '卡号字段必须<strong>type=text + inputmode=numeric + autocomplete=cc-number</strong>。用 type=number 会让管理器放弃填充。',
      '把 <strong>cc-exp</strong> 拆成 month/year 两个 select 是最常见布局，也是填充失败最多的地方：<strong>期望 cc-exp-month="3"，而 UI 显示 "03"</strong>。',
      '浏览器保存的卡<strong>默认不弹 CSC</strong>：出于合规，安全码几乎从不自填。这一格保持空是正常的，不是 bug。',
      '格式化脚本（每 4 位加空格）会在填充后触发<strong>二次 input</strong>，诊断日志里会出现 SCRIPT 事件——注意区分。'
    ],
    form: {
      id: 'f-card',
      fields: [
        { key: 'cc-name', label: 'NAME ON CARD', type: 'text', name: 'cc-name', ac: 'cc-name', req: true, w: 8 },
        { key: 'postal-code', label: 'BILLING POSTAL', type: 'text', name: 'postal-code', ac: 'postal-code', req: true, w: 4 },
        { key: 'cc-number', label: 'CARD NUMBER', type: 'text', name: 'cc-number', ac: 'cc-number', req: true, inputmode: 'numeric', hint: '4242 4242 4242 4242（VISA 测试号）', w: 12 },
        { key: 'cc-exp-month', label: 'EXP MONTH', type: 'select', name: 'cc-exp-month', ac: 'cc-exp-month', req: true, w: 4, options: [[ '', 'MM' ]].concat(range(1, 12)) },
        { key: 'cc-exp-year', label: 'EXP YEAR', type: 'select', name: 'cc-exp-year', ac: 'cc-exp-year', req: true, w: 4, options: [['', 'YYYY']].concat(range(2026, 2040)) },
        { key: 'cc-csc', label: 'CSC / CVV', type: 'text', name: 'cc-csc', ac: 'cc-csc', req: true, inputmode: 'numeric', w: 4, hint: '737' }
      ],
      submit: 'PAY $42.00'
    },
    after: `<div class="row row--between" style="margin-top:var(--s-md)">
<span class="caption">LUHN <span data-luhn>—</span> · BRAND <span data-brand>—</span></span>
<span class="caption">填充后由格式化脚本重新分格，观察是否出现 SCRIPT 事件</span>
</div>`,
    script: `var num = document.querySelector('#f-cc-number');
function brandOf(v) { v = v.replace(/\\D/g,''); if (/^4/.test(v)) return 'VISA'; if (/^5[1-5]/.test(v)) return 'MASTERCARD'; if (/^3[47]/.test(v)) return 'AMEX'; if (/^6/.test(v)) return 'DISCOVER/UnionPay'; return v ? 'UNKNOWN' : '—'; }
function luhn(v) { v = v.replace(/\\D/g,''); if (!v) return '—'; var s = 0, alt = false; for (var i = v.length - 1; i >= 0; i--) { var n = +v[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; } return s % 10 === 0 ? 'VALID' : 'INVALID'; }
num.addEventListener('input', function () { var d = num.value.replace(/\\D/g,'').slice(0,19); num.value = d.replace(/(.{4})/g,'$1 ').trim(); document.querySelector('[data-luhn]').textContent = luhn(d); document.querySelector('[data-brand]').textContent = brandOf(d); });`
  }
];

function range(a, b) {
  var out = [];
  for (let i = a; i <= b; i++) out.push([i < 10 ? String(i).padStart(2, '0') : String(i), String(i)]);
  return out;
}
