/*
        （源里逐字有 / 声明差异逆回去 == 源切片 / 自由变量审计）。
   —— 各块来源 ——
   · A 16-script show()：行 127–134（**声明差异 1 处**：不写 #right 的 DOM）
   · B 26-script show 包装：行 305–329（**声明差异 1 处**：`#askBox` 的插入锚点——源里插在结果区 `.bar` 之后
     让它自成一条、不被框在断辞卡片里面。`XWRAP`（三宫具象）仍留在卡片内）
   · C ASKBOX_HTML：行 284–294（**声明差异 1 处**：逐字「最后我要的就是单纯一个对话框+接着问的按钮」
     ⇒ 去掉源里那行 `.ask-h`（「接着问 同一卦里继续问、不另起卦——…」标题/副标题），只留：问答列表 +
     输入框 + 「接着问」按钮 + 消息槽）
   · D XWRAP_HTML：行 295–301（零差异）
   · _show0      ⇒ 本文件的 A（源里 `_show0 = show`，即 16-script 那份）
   · bindResult  ⇒ 转发 window.bindResult（**已是本仓**：resultCore.js，load 时换掉）
   · playWalk    ⇒ 转发 window.playWalk（**已是本仓**：walkCore.js，load 时换掉）
   —— 接管手法（装配，见 shell/main.jsx 的 mountMain()）——
   · 外壳把最外层 `window.show` 装成本仓这份：先 `flushSync` 渲染 React（DOM 归 React），再调本文件这份。
   · 一键回退：VITE_S2_MAIN=0 / VITE_BISECT=noreact ⇒ 不装（回到 legacy 全权）。
*/
/* eslint-disable */

/* ===== 自由变量绑定 ===== */
function _show0(c, B) { return show16(c, B); }
function bindResult() { return window.bindResult.apply(null, arguments); }
function playWalk(c) { return window.playWalk.apply(null, arguments); }
function updateSetDot() { return window.updateSetDot.apply(null, arguments); }
function addCase() { return window.addCase.apply(null, arguments); }

/* ===== A：16-script show()（**声明差异 1 处**：不写 #right 的 DOM） ===== */
var show16 = function show(c, B) {
  /* ★ 声明差异①（见文件头）：#right 的子树**归 React**（RightPane.jsx 渲染同一份结构），
     外壳那条「把 innerHTML 写入口改成 no-op」的封条就是为它设的 ⇒ 本仓这份**不该**再写 DOM。
     原句两行（逆回去可逐字节验）：
       var right = document.getElementById('right');
       right.innerHTML = renderGua(c) + renderLLMPane(c) + renderEvidence(B); */
  window.__ctx = c; window.__blocks = B; window.__md = '';
  bindResult();
  playWalk(c);
  updateSetDot();
};

/* ===== C / D：26-script 那两份 HTML 常量（零差异） ===== */
var ASKBOX_HTML =
  '<div class="askbox pane off" id="askBox">' +
    '<div class="ask-list" id="askList"></div>' +
    '<div class="ask-line">' +
      '<input type="text" id="askQ" autocomplete="off" placeholder="在这个卦里，〔谁／什么事〕怎么样？">' +
      '<button class="btn pri" type="button" id="btnAskMore">接着问</button>' +
    '</div>' +
    '<div class="ask-note" id="askNote"></div>' +
  '</div>';


var XWRAP_HTML =
  '<div class="xwrap" id="xwrap" hidden>' +
    '<div class="ask-h"><b>三宫具象</b></div>' +
    '<div class="doc" id="xdoc"></div>' +
    '<div class="ask-note" id="xnote"></div>' +
  '</div>';



/* ===== B：26-script 那层包装（**声明差异 2 处**，见文件头） ===== */
var showWrap = show = function (c, B) {
    _show0(c, B);
    window.__thread = [];
    window.__recId = '';
    window.__mdX = '';
    try { addCase(); } catch (e) { }   /* ★ 每起一卦自动记入记录（不弹侧栏、不打扰） */
    /*
       要**独立成一条**贴在卡片下方（他的图二红框：卡片底边到这条之间有 ~20–30px 空隙）。
       ⇒ `#askBox` 的锚点由 `.llm-body`（卡片内）换成 `#llmPane`（卡片本身）⇒ 它变成卡片的
         **兄弟节点**，落在「断辞卡片」与「断卦依据」之间，自成一条。
       `XWRAP`（三宫具象）与断辞同属一块内容 ⇒ 仍留在卡片内，不跟着外移（各自独立判重）。 */
    var wrap = document.querySelector('#llmPane .llm-body');
    if (wrap && wrap.insertAdjacentHTML && c && c.withXiang && !document.getElementById('xwrap')) {
      wrap.insertAdjacentHTML('afterend', XWRAP_HTML);
    }
    var card = document.querySelector('#llmPane');
    if (card && card.insertAdjacentHTML && !document.getElementById('askBox')) {
      card.insertAdjacentHTML('afterend', ASKBOX_HTML);
    }
    var n = document.getElementById('askNote');
    if (n) n.textContent = '';
    var xn = document.getElementById('xnote');
    if (xn) xn.textContent = '';
    var xd = document.getElementById('xdoc');
    if (xd) xd.innerHTML = '';
    /* 「解三宫具象」按钮：靠在「让模型解卦」旁边（手动点击才出解读） */
    if (c && c.withXiang) {
      var ba = document.getElementById('btnSolve');
      if (ba && !document.getElementById('btnXiang')) {
        ba.insertAdjacentHTML('afterend',
          '<button class="btn" type="button" id="btnXiang" title="在原卦范围内，把三盘读成这一卦的细节，再汇总">解三宫具象</button>');
      }
    }
  };

/* */
let hits = 0, last = null;
export function show(c, B) {
  hits += 1;
  /*
     而**首跑实测它读到 0**（renders 涨、态也确实被写了）—— 为了不再猜，这里把同一份证据
     挂到 window 上（与模块作用域无关，页面上直接可读、可对比）。
     */
  try { window.__xlrShowHits = (window.__xlrShowHits || 0) + 1; } catch (e0) { }
  try {
    var r = showWrap(c, B);
    last = {
      ctx: (typeof window.__ctx === 'object' && window.__ctx !== null),
      blocks: (typeof window.__blocks === 'object' && window.__blocks !== null),
      mdReset: (window.__md === ''),
      threadReset: Array.isArray(window.__thread) && window.__thread.length === 0,
      askBox: !!document.getElementById('askBox'),
    };
    try { window.__xlrShowLast = last; } catch (e1) { }
    return r;
  } catch (e) {
    last = { error: String((e && e.message) || e) };
    try { window.__xlrShowLast = last; } catch (e2) { }
    throw e;
  }
}

export const ShowCore = {
  show: show,
  show16: show16,
  /* */
  state: function () { return { hits: hits, last: last }; },
  html: { ASKBOX_HTML: ASKBOX_HTML, XWRAP_HTML: XWRAP_HTML },
};
