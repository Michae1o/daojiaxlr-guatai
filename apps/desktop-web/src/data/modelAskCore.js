/* modelAskCore.js —— 「让模型解卦」那条链唯一一份：设置读取 · 请求 · 流式读取 · 落笔 · 补进记录。
 *
 * 来源（**逐字**）：上游 `(upstream)`，sha256[:16] = 56c9970ea6be9bfa
 *   loadSet L2063–2068 · apiURL L2253–2257 · hdr L2258–2262 · payloadOf L2263–2267 ·
 *   needsKey L2268–2272 · readSSE L2274–2300 · askModel L2319–2370 · recAskHtml L2833–2843
 *
 *   ⇒ 产物里 `window.askModel` 不存在 ⇒ DivinationPane 的守卫式调用静默什么都不做（不报错）。
 *   `recAskHtml` 同一批丢的 ⇒ 记录行里那块「接着问」区（`r.ans === 'model'` 时）渲染成空。
 * 自由变量现在**全部走本仓/包内**（不再经 window）：
 *   plainAll + SYS → 包 `@xlr/shared-judgment`（plainAll 在 plain-text.js；SYS 在 prompt.js）
 *   DEF → settingsCore.js · renderDoc/esc → docRender.js
 *   updateCaseDuanci/markModelAnswered → recordsStore.js
 */
import { plainAll, SYS, buildBlocks as pkgBuildBlocks } from '@xlr/shared-judgment';
/* 你点名：「问着…」不要文字，换成**开屏那款液态太极**（含从按钮到太极的过渡）。
   markup 当时直接 import 复用开屏那一份（`splashMarkup.js`，零复制）。
   ⇒ 桌面端也换成**手机端同款位图徽章**（`askTaijiImg.js`，两端各存一份逐字节相同的 PNG ——
     **开屏那份画稿一字未动**（ 的纯黑白说法照旧）。 */
import { ASK_TAIJI_IMG_MARKUP } from '../components/askTaijiImg.js';
import { SettingsCore } from './settingsCore.js';
/* 地址换算 / 请求头 / 正文形状 / 流式增量 / 非流式正文，全走 llmEndpoint 一处
   （智谱官方地址在网页版与安卓上要换成本站中转；Anthropic 协议地址要换形状）。 */
import { endpoint as epOf, headers as hdrsOf, payload as pyOf, deltaOf, textOf, IS_TAURI } from './llmEndpoint.js';
/* 真正发请求那一下住 src/llm/（`src/data/**` 不许出现网络原语，见该文件头） */
import { fetchLLM } from '../llm/llmFetch.js';
import { renderDoc, htmlEsc as esc } from './docRender.js';
import { RecordsStore } from './recordsStore.js';
import { ReviewCore } from '../review/reviewCore.js';   /* ruleBlock / reviewBlock：源里那两条钩子 */

var DEF = SettingsCore.DEF;   /* loadSet() 的兜底默认值——与设置界面同一份（一处定义） */
var updateCaseDuanci = RecordsStore.updateCaseDuanci, markModelAnswered = RecordsStore.markModelAnswered;

/* 声明差异（唯一 1 处，2026-10-15 实测三次）：源里那个 `plainAll` 调用 **不带参**、内部自己读
   `window.__ctx` / `window.__blocks`；包内那份（`@xlr/shared-judgment` 的 plain-text.js）是
   **三参纯函数** `plainAll(c, B, hooks)`，其中：
     · `B` 要的是「块」形状 `{n, t, items:[{lb,tx}]}`（第 23–29 行按 `b.items.forEach` 读）
     · `hooks` 取 `ruleBlock()` / `reviewBlock()`（第 30–37 行，**可省**但不是可有可无：准则那一块
   ⇒ 这里按包内签名喂上：`B` 用 `window.__blocks`，形状不对就现搭（`buildBlocks`）；钩子走 `ReviewCore`。
   注意：别再往这里塞第二份 plainAll 实现（那是 R4 要防的「判据副本」，实测会被链拦下）。 */
function plainAllOf() {
  var c = window.__ctx, B = window.__blocks;
  if (!Array.isArray(B) || !B.length || !B[0] || !Array.isArray(B[0].items)) B = pkgBuildBlocks(c);
  return plainAll(c, B, { ruleBlock: ReviewCore.ruleBlock, reviewBlock: ReviewCore.reviewBlock });
}

function loadSet() {
  var s = {};
  try { s = JSON.parse(localStorage.getItem('xlr-llm') || '{}') || {}; } catch (e) { s = {}; }
  for (var k in DEF) if (s[k] === undefined) s[k] = DEF[k];
  return s;
}

/* 这三支改成薄壳、转发给 llmEndpoint（行为比以前多两件事：
   ① 非 Tauri（网页版 / 安卓）里智谱官方地址换成本站中转；② 带 /anthropic 的地址走 Anthropic 形状）。
   签名里 `proxy` 那一参换成 `ep`（endpoint() 的返回值），调用点已同步。 */
function apiURL() { return epOf(loadSet()); }

function hdr(s, ep) { return hdrsOf(s, ep); }

function payloadOf(s, msgs, stream, maxTokens) { return pyOf(s, msgs, stream, maxTokens); }

function needsKey(s) {
  if (!s.model || !s.base) return '还没配模型。点右上角「设置」。';
  if (s.wire === 'direct' && !s.key && !/localhost|127\.0\.0\.1/.test(s.base)) return '直连需要 API Key，请在「设置」里填。';
  return '';
}

function readSSE(resp, onDelta) {
  return new Promise(function (resolve, reject) {
    var reader = resp.body.getReader(), dec = new TextDecoder(), buf = '';
    (function pump() {
      reader.read().then(function (r) {
        if (r.done) { resolve(); return; }
        buf += dec.decode(r.value, { stream: true });
        var i;
        while ((i = buf.indexOf('\n')) >= 0) {
          var line = buf.slice(0, i).replace(/\r$/, '').trim();
          buf = buf.slice(i + 1);
          if (!line || line.charAt(0) === ':') continue;
          if (line.indexOf('data:') === 0) {
            var d = line.slice(5).trim();
            if (d === '[DONE]') { resolve(); return; }
            try {
              var j = JSON.parse(d);
              var t = deltaOf(j);          /* OpenAI 与 Anthropic 两种流式事件都认 */
              if (t) onDelta(t);
            } catch (e) { }
          }
        }
        pump();
      }, reject);
    })();
  });
}

function askModel() {
  var c = window.__ctx;
  if (!c) return;
  var s = loadSet();
  var doc = document.getElementById('doc'), stat = document.getElementById('stat'), btn = document.getElementById('btnSolve');   /* 声明差异：源里是早期实现的 `btnAsk`；本仓 React 版这颗按钮 id = `btnSolve`（实测产物里只有它） */
  var bad = needsKey(s);
  if (bad) { doc.innerHTML = '<span style="color:var(--bad)">' + esc(bad) + '</span>'; return; }

  var sysC = SYS, usrC = '请按格式解这一卦：\n\n' + plainAllOf();
  /* 你点名：结果部分要能解三宫具象——勾了三宫具象时，
     断辞里要把三盘读出来再合回落宫（不显示依据，但解读要有它）。 */
  if (c.withXiang) usrC += '\n\n【附】这一卦带三宫具象：请在断辞里把三盘读出来（前因 → 中段 → 后果），再合回落宫；只读象、不越出这一卦。';
  var ep = apiURL();
  btn.disabled = true; btn.textContent = '解卦中…';
  doc.innerHTML = '<span class="cur"></span>'; stat.textContent = '';
  window.__md = '';
  var t0 = Date.now();

  fetchLLM(s, [{ role: 'system', content: sysC }, { role: 'user', content: usrC }], true, 8192)
    .then(function (resp) {
      if (!resp.ok) return resp.text().then(function (t) { throw new Error('HTTP ' + resp.status + ' ' + String(t).slice(0, 260)); });
      if (!resp.body || !resp.body.getReader) {
        return resp.json().then(function (j) {
          window.__md = textOf(j) || '(空响应)';
          doc.innerHTML = renderDoc(window.__md);
        });
      }
      return readSSE(resp, function (d) {
        window.__md += d;
        doc.innerHTML = renderDoc(window.__md) + '<span class="cur"></span>';
      }).then(function () { doc.innerHTML = renderDoc(window.__md); });
    })
    .then(function () {
      var sec = ((Date.now() - t0) / 1000).toFixed(1);
      stat.textContent = '模型 ' + s.model + ' · 用时 ' + sec + ' 秒 · 连接方式：' + (ep.proxy ? '本地中转' : '浏览器直连');
      var ab = document.getElementById('askBox');
      if (ab) ab.classList.remove('off');   /* 解过卦之后，「接着问」才出现 */
      updateCaseDuanci();                    /* 自动记录的那一卦：补上断辞 */
      markModelAnswered();                   /* 记录标记：模型解过（记录页「接着问」门槛） */
    })
    .catch(function (e) {
      var m = String(e && e.message || e);
      /* （你定的说法）：「无法连接。请检查网络设置，或更换供应商。
         」—— 网络层失败不甩 Failed to fetch，
         HTTP 错误（Key 错 / 余额不足）保留服务商原话。
         设置里「联系」并入「关于」、那一栏已删 ⇒ 文案改指【关于】。 */
      var netFail = !ep.proxy && /Failed to fetch|NetworkError|Load failed|网络/i.test(m);
      doc.innerHTML = '<span style="color:var(--bad)">' + (netFail ? '无法连接。' : '调用失败：' + esc(m)) + '</span>' +
        '<div class="warn" style="margin-top:10px">请检查网络设置，或更换供应商。</div>';
    })
    .then(function () { btn.disabled = false; btn.textContent = '让模型解卦'; });
}

function recAskHtml(r) {
  var h = '';
  (r.thread || []).forEach(function (it) {
    h += '<div class="ask-item"><div class="ask-q">' + esc(it.q) + '</div><div class="ask-a">' + renderDoc(it.a || '') + '</div></div>';
  });
  h += '<div class="ask-line">' +
       '<input type="text" data-askq="' + r.id + '" autocomplete="off" placeholder="在这个卦里，〔谁／什么事〕怎么样？">' +
       '<button class="btn sm pri" type="button" data-askgo="' + r.id + '">问</button></div>' +
       '<div class="ask-note" data-asknote="' + r.id + '"></div>';
  return h;
}

/* ============================================================================
 *
 * 来源（**逐字**）：上游 `apps/mobile-web/chunks/a10.html`（**进产物的那份**）
 *   plainCore L333–337 · followupUser L339–360 · streamAsk L362–387 · runFollowup L389–393 ·
 *   noModelAskHint L610–613 · threadMerge L616–624 · persistThread L626–635 · askMore L638–662 ·
 *   事件委托（click L755–769 / keydown L770–776）
 *
 *   实测本仓只有 `showCore.js` 里那段 HTML（`#askBox`/`#askQ`/`#btnAskMore` 都在），
 *   **没有任何人在听这两个事件**（早期版本靠 a10.html 末尾那两条 document 委托）。
 *
 * 声明差异（3 处，逐条注明）：
 *   ① 委托里 `btnNew → newCast()` 那条**不搬** —— 本仓已由 `DivinationPane.jsx` 的 React `onClick` 接；
 *      再搬一份会让同一个动作跑两遍。
 *      锚点保留、用 `typeof … === 'function'` 守卫（未接时静默跳过，不抛错）。
 *   ③ `loadCases/saveCases` 从 `RecordsStore` 取（本模块已 import 它）；取不到时退化为空操作
 *      —— 早期版本读的是 legacy 全局，本仓没有那套全局。
 * ========================================================================== */

/* L333–337 逐字 */
function plainCore(c, B) {
  var oc = window.__ctx, ob = window.__blocks;
  window.__ctx = c; window.__blocks = B;
  try { return plainAllOf(); } finally { window.__ctx = oc; window.__blocks = ob; }   /* 声明差异 ④（2026-10-15 修）：早期版本这里是**零参** `plainAll()`（早期实现的全局版，从 window 读卦）；本仓 `plainAll` 是包内**三参纯函数** `plainAll(c,B,hooks)` —— 照旧搬会传进 undefined、它去读 `c.q` 就抛「Cannot read properties of undefined (reading 'q')」。⇒ 走本模块已有的三参适配器 `plainAllOf()`（它读 window.__ctx/__blocks，并在形状不对时现搭 buildBlocks）。 */
}

/* L339–360 逐字 */
function followupUser(c, B, thread, q) {
  var L = ['请接着这一卦继续答（接前卦：同一卦内追问，不另起卦）。', ''];
  L.push(plainCore(c, B));
  L.push('【这一卦已经答过的】');
  if (!thread || !thread.length) L.push('（这是第一次追问）');
  (thread || []).forEach(function (it, i) {
    L.push('问' + (i + 1) + '：' + it.q);
    L.push('答' + (i + 1) + '：' + String(it.a || '').replace(/<[^>]+>/g, ''));
  });
  L.push('');
  L.push('【这次要问的】');
  L.push(q);
  L.push('');
  L.push('【续问规矩】');
  L.push('① 只用这一卦：不另起、不重起，答案要从这一卦里得出；');
  L.push('② 落宫为主：先看这一问在这卦里对应到哪座宫、什么关系，再答（问什么，是什么）；');
  L.push('③ 每处判断括注依据（哪宫／哪关系／哪条判据）；');
  L.push('④ 这一问若不在这一卦里（问的是旁人别的事、或无端之问），直接说「这不在这一卦里」并讲清原因，不要硬答；');
  L.push('⑤ 不要主动再问、不要邀着继续问、不展开没问到的东西；');
  L.push('⑥ 格式同主断辞（【结论】【断辞】…），宁短勿长、够用即止。');
  return L.join('\n');
}

/* L362–387 逐字 */
function streamAsk(userText, elA, onDone) {
  var s = loadSet(), ep = apiURL(), answer = '';
  elA.innerHTML = '<span class="cur"></span>';
  fetchLLM(s, [
    { role: 'system', content: SYS },
    { role: 'user', content: userText }
  ], true, 4096)
    .then(function (resp) {
      if (!resp.ok) return resp.text().then(function (t) { throw new Error('HTTP ' + resp.status + ' ' + String(t).slice(0, 240)); });
      if (!resp.body || !resp.body.getReader) {
        return resp.json().then(function (j) {
          answer = textOf(j) || '(空响应)';
          elA.innerHTML = renderDoc(answer);
        });
      }
      return readSSE(resp, function (d) {
        answer += d;
        elA.innerHTML = renderDoc(answer) + '<span class="cur"></span>';
      }).then(function () { elA.innerHTML = renderDoc(answer); });
    })
    .then(function () { onDone(null, answer); })
    .catch(function (e) { onDone(String(e && e.message || e), null); });
}

/* L389–393 逐字 */
function runFollowup(c, B, thread, q, elA, onDone) {
  var bad = needsKey(loadSet());
  if (bad) { onDone(bad, null); return; }
  streamAsk(followupUser(c, B, thread, q), elA, onDone);
}

/* L610–613 逐字 */
function noModelAskHint(el) {
  if (window.__askHooks && window.__askHooks.noModel) { window.__askHooks.noModel(el); return; }
  if (el) el.innerHTML = '还没配模型。点「设置」配一个再来；或先看上面那份速断结果。';
}

/* L616–624 逐字 */
function threadMerge(x, y) {
  var out = [], seen = {};
  (x || []).concat(y || []).forEach(function (it) {
    if (!it) return;
    var k = String(it.q) + '\u0000' + String(it.a || '');
    if (!seen[k]) { seen[k] = 1; out.push(it); }
  });
  return out;
}

/* 声明差异 ③：早期版本读 legacy 全局 loadCases/saveCases；本仓取 RecordsStore 的导出，取不到则退化为空操作 */
var RC_loadCases = (RecordsStore && typeof RecordsStore.loadCases === 'function') ? RecordsStore.loadCases : function () { return []; };
var RC_saveCases = (RecordsStore && typeof RecordsStore.saveCases === 'function') ? RecordsStore.saveCases : function () { };

/* L626–635 逐字（只把 loadCases/saveCases 换成上面两份） */
function persistThread() {
  if (!window.__recId) return;
  var a = RC_loadCases();
  for (var i = 0; i < a.length; i++) if (a[i].id === window.__recId) {
    var out = threadMerge(a[i].thread, window.__thread);
    a[i].thread = out;
    window.__thread = out.slice();
  }
  RC_saveCases(a);
}

/* （本批）：这个函数按你两条新说法改了三处（其余仍与早期版本逐字一致）——
   ① 按钮**不再写「问着…」文字**，改走 `asking` 类 ⇒ 按钮形变成开屏那款液态太极；
   ③ 太极 markup 从 `splashMarkup.js` import（零复制）。
   ⚠ 提交即清 ⇒ 失败时输入的字不在框里了；但那条问题已被写进问答项（`.ask-q`）、错误也显示在同一项里，
     要重试可从问答项复制 —— 与「不留字」的说法一致。 */
function askTaijiOn(btn) {
  if (!btn) return;
  var lbl = btn.querySelector('.lbl');
  if (!lbl) {                     /* 首次：把原来的文字包进 .lbl（不改 HTML 源，那份是生成物） */
    lbl = document.createElement('span'); lbl.className = 'lbl';
    lbl.textContent = (btn.textContent || '').trim();
    btn.textContent = ''; btn.appendChild(lbl);
  }
  if (!btn.querySelector('.sl-orb')) {
    var tpl = document.createElement('div');
    tpl.innerHTML = ASK_TAIJI_IMG_MARKUP;
    var orb = tpl.querySelector('.sl-orb');
    if (orb) { orb.setAttribute('aria-hidden', 'true'); btn.appendChild(orb); }
  }
  btn.classList.add('asking');
  btn.style.pointerEvents = 'none';   /* 不用 disabled：那会把太极也变灰 */
}
function askTaijiOff(btn) {
  if (!btn) return;
  btn.classList.remove('asking');
  btn.style.pointerEvents = '';
}

/* L638–662（改动见上方说明） */
export function askMore() {
  var c = window.__ctx, inp = document.getElementById('askQ'), list = document.getElementById('askList');
  if (!c || !inp || !list) return;
  var q = (inp.value || '').trim();
  if (!q) { inp.focus(); return; }
  if (needsKey(loadSet())) { noModelAskHint(document.getElementById('askNote')); return; }
  inp.value = '';                                          /* ② 提交即清 */
  var note = document.getElementById('askNote');
  if (note) note.textContent = '';
  var item = document.createElement('div');
  item.className = 'ask-item';
  item.innerHTML = '<div class="ask-q"></div><div class="ask-a"><span class="cur"></span></div>';
  item.querySelector('.ask-q').textContent = q;
  list.appendChild(item);
  var elA = item.querySelector('.ask-a');
  var btn = document.getElementById('btnAskMore');
  if (btn) askTaijiOn(btn);                                /* ① 太极接棒 */
  /* 记下「这是第几卦」。你这一问还在路上时又起了一卦 ⇒ 既不该往新的记录条里塞，
     也不该把答案画到已经被清空的列表上（resetAskBox 会 +1）。 */
  var askSeq = window.__askSeq | 0;
  runFollowup(c, window.__blocks, window.__thread, q, elA, function (err, ans) {
    askTaijiOff(btn);
    if ((window.__askSeq | 0) !== askSeq) return;           /* 已经换卦：这一问不算这一卦的 */
    if (err) { elA.innerHTML = '<span style="color:var(--bad)">' + esc(err) + '</span>'; return; }
    window.__thread.push({ q: q, a: ans });
    persistThread();
    if (note) note.textContent = '已答。要接着问就继续——够用即止。';
  });
}

/* ===== 事件委托（L755–769 / L770–776 逐字；声明差异 ①② = btnNew 不搬、未搬的三条加 typeof 守卫）===== */
document.addEventListener('click', function (ev) {
  var t = ev.target;
  while (t && t !== document) {
    if (t.id === 'btnAskMore') { askMore(); return; }
    if (t.id === 'btnXiang') { if (typeof askXiang === 'function') askXiang(); return; }
    /* ① 早期版本这里还有一条 `if (t.id === 'btnNew') { newCast(); return; }` —— 本仓由 DivinationPane 的 React onClick 接，不重复 */
    if (t.getAttribute) {
      var a1 = t.getAttribute('data-ask');
      if (a1) { if (typeof openRecAsk === 'function') openRecAsk(a1); return; }
      var a2 = t.getAttribute('data-askgo');
      if (a2) { if (typeof recAskGo === 'function') recAskGo(a2); return; }
    }
    t = t.parentNode;
  }
});
document.addEventListener('keydown', function (ev) {
  if (ev.key !== 'Enter') return;
  var t = ev.target;
  if (!t || !t.getAttribute) return;
  if (t.id === 'askQ') { askMore(); }
  else { var aq = t.getAttribute('data-askq'); if (aq && typeof recAskGo === 'function') recAskGo(aq); }
});

/* 把出口那四个**旧全局**重指到本仓这份 —— 复盘（src/review/reviewCore.js 经 window 转发）
   以及任何还走旧全局的路径，因此也跟着走「智谱中转 / Anthropic 形状」，不会一半能连一半不能。
   ⚠ 旧签名是 `hdr(s, proxy)` / `payloadOf(s, proxy, msgs, stream)` ⇒ 各加一层薄适配再挂，别直接换。 */
function hdrLegacy(s, proxy) { return hdrsOf(s, { proxy: !!proxy }); }
function payloadOfLegacy(s, proxy, msgs, stream) { return pyOf(s, msgs, stream, 8192); }
try {
  window.apiURL = apiURL;
  window.hdr = hdrLegacy;
  window.payloadOf = payloadOfLegacy;
  window.readSSE = readSSE;
} catch (e) { }

export { SYS, plainAll, readSSE, askModel, recAskHtml };   /* ← 唯一的出口，调用点直接 import */
