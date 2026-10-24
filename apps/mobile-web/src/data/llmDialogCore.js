/* llmDialogCore.js —— （砍段前置：旧「设置对话框」两块列表的填充）
   为什么需要它：早期实现这两个 IIFE 在**解析期**就跑（把 `#presets` 的 10 个预设按钮、`#modelMenu` 的 7 条模型填好）；
      砍段后早期实现整类消失 ⇒ 没人填 ⇒ `结构检查` 第 5 项结构核对会**少 31 个节点**（实测）。
   ⚠ 那个对话框（`#mask > .dlg`）在新版**已不再打开**（顶栏「设置」由外壳的 React 设置页接管，见 src/shell/main.jsx）；
   声明差异（唯一 1 处）：整段只在「两块列表还没人填过」时执行（幂等闸）——
     源里它是解析期一次性脚本；本模块在 bisect 臂（VITE_BISECT=noreact ⇒ 早期实现还在跑）里会与早期实现**重复填充**。
*/
/* eslint-disable */

/* ---- ① esc（源 16-script L3–L7）---- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m];
  });
}

/* ★ 幂等闸（声明差异唯一 1 处）：两块列表都已有内容就整段不跑（bisect 臂里早期实现也在跑） */
(function () {
  var __p = document.getElementById('presets'), __m = document.getElementById('modelMenu');
  if (!__p || !__m || __p.children.length || __m.children.length) return;

/* */
var PRESETS = [
  { n: 'DeepSeek', base: 'https://api.deepseek.com', model: 'deepseek-chat', cors: 1 },
  { n: '智谱 GLM', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus', cors: 1 },
  { n: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { n: '硅基流动', base: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  { n: '月之暗面', base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { n: '阿里百炼', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { n: '火山方舟', base: 'https://ark.cn-beijing.volces.com/api/v3', model: '' },
  { n: 'Ollama 本地', base: 'http://localhost:11434/v1', model: 'qwen2.5:7b', local: 1 },
  { n: 'LM Studio 本地', base: 'http://localhost:1234/v1', model: '', local: 1 },
  { n: '自定义', base: '', model: '' }
];
var DEF = { wire: 'direct', base: 'https://api.deepseek.com', model: 'deepseek-chat', key: '', temp: 0.5, proxy: 'http://127.0.0.1:8080' };
function loadSet() {
  var s = {};
  try { s = JSON.parse(localStorage.getItem('xlr-llm') || '{}') || {}; } catch (e) { s = {}; }
  for (var k in DEF) if (s[k] === undefined) s[k] = DEF[k];
  return s;
}
function saveSet(s) { try { localStorage.setItem('xlr-llm', JSON.stringify(s)); } catch (e) { } }

var elBase = document.getElementById('base'), elModel = document.getElementById('model'),
    elKey = document.getElementById('key'), elTemp = document.getElementById('temp'),
    elProxy = null,
    elTest = document.getElementById('testOut'), elMask = document.getElementById('mask');
var wire = 'direct';

function updateSetDot() {
  var s = loadSet();
  var ready = s.model && s.base && (s.wire === 'proxy' || s.key || /localhost|127\.0\.0\.1/.test(s.base));
  document.getElementById('setDot').className = 'dot' + (ready ? ' on' : '');
  if (typeof refreshLLMWho === 'function') refreshLLMWho();
}

/* ---- ③ 预设按钮：填 `#presets`（源 24-script L37–L53）---- */
/* 预设按钮 */
(function () {
  var box = document.getElementById('presets');
  PRESETS.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = p.n;
    b.addEventListener('click', function () {
      elBase.value = p.base; elModel.value = p.model;
      Array.prototype.forEach.call(box.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
      if (!p.local && p.base) setWire('direct');
      if (p.local) setWire('proxy');
      renderWireHint(p);
    });
    box.appendChild(b);
  });
})();

/* ---- ④ 模型名下拉：填 `#modelMenu`（源 24-script L55–L100）---- */
/* 模型名下拉
   ★ 原来用的是原生 <datalist>：它会**按输入框里已有的内容过滤**——预设一点，
     框里就填好了 deepseek-chat，再点开只剩这一项，看起来就是「选不了」。
     改成显式列表：列出所有预设模型，点一下即填入；也照样能自己敲任意模型名。 */
(function () {
  var m = elModel, btn = document.getElementById('modelDd'), menu = document.getElementById('modelMenu');
  if (!m || !btn || !menu) return;
  var seen = {};
  function add(model, tag) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-m', model);
    b.innerHTML = '<span>' + esc(model) + '</span><span class="mm-n">' + esc(tag) + '</span>';
    b.addEventListener('click', function () { m.value = model; hide(); });
    menu.appendChild(b);
  }
  function mark() {
    Array.prototype.forEach.call(menu.children, function (x) {
      if (x.getAttribute('data-m') === m.value) x.setAttribute('aria-current', 'true');
      else x.removeAttribute('aria-current');
    });
  }
  PRESETS.forEach(function (p) {
    if (!p.model || seen[p.model]) return;
    seen[p.model] = 1;
    add(p.model, p.n);
  });
  var cur = loadSet().model;
  if (cur && !seen[cur]) add(cur, '当前');
  function hide() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  function show() {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    mark();
    /* 弹层中间是滚动区，展开后把它带进视野 */
    try { menu.scrollIntoView({ block: 'nearest' }); } catch (e) { }
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (menu.hidden) show(); else hide();
  });
  m.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  document.addEventListener('click', function (e) {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) hide();
  });
})();

/* ---- ⑤ setWire / renderWireHint（源 24-script L102–L120）---- */
function setWire(w) {
  wire = w;
  document.getElementById('wDirect').setAttribute('aria-pressed', w === 'direct' ? 'true' : 'false');
  document.getElementById('wProxy').setAttribute('aria-pressed', w === 'proxy' ? 'true' : 'false');
  renderWireHint(null);
}
function renderWireHint(p) {
  var h = document.getElementById('wHint');
  var localish = p && p.local;
  if (wire === 'direct') {
    h.innerHTML = '浏览器直接请求服务商。有的服务商不让网页调它——那几家在网页版里会连不上（换桌面版就行）。' +
      (localish ? '<br>本地模型想让浏览器直连，要放开 CORS：Ollama 设环境变量 <code>OLLAMA_ORIGINS=*</code> 后重启；LM Studio 在 Server 设置里打开 CORS。' : '');
  } else {
    h.innerHTML = '先双击运行配套的 <code>启动中转.bat</code>，浏览器把请求发给本机中转，中转再转发给服务商。<b>这样任何服务商都能用</b>（含不支持跨域的、以及本地模型）。中转只监听本机。' +
      '<br>中转地址：<input type="text" id="proxyUrl" spellcheck="false" style="width:230px;margin-top:6px" value="' + esc(loadSet().proxy) + '">';
    var ip = document.getElementById('proxyUrl');
    if (ip) ip.addEventListener('input', function () { var s = loadSet(); s.proxy = ip.value.trim(); saveSet(s); });
  }
}
})();
