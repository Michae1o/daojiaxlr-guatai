/*
        （源里逐字有 / 声明差异逆回去 == 源切片 / 自由变量审计）。
   —— 各块来源（源文件行号）——
   · ① 状态：行 304–308
   · ② 判据：行 387–390
   · ③ 骨架 buildStepper：行 392–486
   · ④a placePill：行 490–507
   · ④b resize 监听：行 508–512
   · ④c placeSpill：行 515–526
   · ⑤ syncStep：行 686–744
   · ⑤ pillSplit：行 755–811
   · ⑤ pillBusy：行 812–814
   · ⑤ revealBtn：行 818–834
   · ⑤ animateIn：行 836–848
   · ⑤ narrowPhone：行 864–864
   · ⑥ VISITED/markVisited：行 1144–1145
   · ⑥ goStep：行 653–659
   · ⑥ setStep：行 1150–1198
   **正文零声明差异**（与 globals.js 同族）。
   —— 自由变量绑定（源里是 38-script 那个大 IIFE 的**私有**函数 ⇒ 搬过来必须给）——
   · phoneStepSettle    ⇒ 绑 `return false`。源里首行 `if (!bar || !narrowPhone()) return false;` ⇒ 桌面直接返回 false。
   · quickReadRun       ⇒ **惰性转发** window.quickReadRun（26-script 的全局函数）。
                          ⇒ 源里 `typeof quickReadRun === 'function'` 永远为假 ⇒ 进「断卦」步的「自动本机速断」**静默消失**。
   · placeSpill         ⇒ 切自己的那份（签名为 (seg, animate)、且遍历所有 .seg；外壳那份签名/守卫都不同 ⇒ 不绑）。
   —— 接管手法（装配，见 shell/main.jsx 的 mountStepper()）——
   · 幂等闸 ＝ **共用节点判定**（源里 buildStepper 首两行 `if (!wrap || document.querySelector('.vstep')) return;`）
     ⇒ 本仓在**模块顶层**先建，早期实现 ready()/看门狗那两次 buildStepper() 自己早退（与 #xlrAura / .mfoot / #onbLayer 同族，**不需要改名**）。
   · ⚠ **最大的时序坑**：早期实现 ready()（L2007–2013，DCL）会把 `window.__xlrSetStep` 指向**它自己那份**，
     而它在 DCL 执行、晚于本模块顶层 ⇒ 外壳必须在 **load 之后**重指回本仓这份，否则 walkCore / GuaCard 永远打到早期实现那份
     （「本仓接管」名存实亡，而判据只看行为时会**误判通过**）。
   · ⚠ 早期实现 ready() L1989 那击 `buildStepper(); setStep('q')` 里 `buildStepper` 被上面那条闸挡住，
     但 `setStep('q')` **挡不住**（同一 try 行切不开）⇒ 依赖源里那条既有语义（同一步只做状态同步、不重播入场）
     ⇒ 判据必须实测「两次调用后 .vstep 子树逐属性一致」。
   · 一键回退：VITE_BISECT=noreact ⇒ 不装（回到 legacy 全权）。
*/
/* eslint-disable */
/*
   本文件过去把 `quickReadRun` 绑成「惰性转发 window.quickReadRun」——那只在**早期实现全局还在**时成立。
    砍段后 `window.quickReadRun` 不存在 ⇒ 进「叁 断卦」那句 `typeof quickReadRun === 'function'`
   ⇒ 现在直接调本仓模块（`quickReadCore` 的正文是上游 L2585–2633 的**逐字**切片；
     落笔用的 `renderDoc` 与「补断辞进记录」都走本仓唯一一份实现），不再经 `window`。 */
import { IS_PHONE } from '../platform.js';
import { quickRead } from './quickReadCore.js';
import { renderDoc } from './docRender.js';
import { RecordsStore } from './recordsStore.js';

/* ===== 自由变量绑定 ===== */
/* syncPhoneStep / phoneStepSettle：源里两支桌面首行即早退（见文件头）⇒ 桌面等价空实现 */
function syncPhoneStep() { return; }
function phoneStepSettle() { return false; }
/* quickReadRun：**本仓实现**（上游 `现代版-预览.html` L2635–2646 的逐字搬运）
   —— 落笔三件都走本仓唯一一份：`renderDoc`（docRender.js）· `RecordsStore.updateCaseDuanci`（记录侧）·
   */
function quickReadRun() {
  var c = window.__ctx;
  var doc = document.getElementById('doc'), stat = document.getElementById('stat');
  if (!c || !doc) return;
  var text = quickRead(c, window.__blocks || []);
  window.__md = text;
  doc.innerHTML = renderDoc(text);
  if (stat) stat.textContent = '本机速断 · 未用模型';
  try { RecordsStore.updateCaseDuanci(); } catch (e) { }   /* ★ 自动记录的那一卦：补上断辞 */
}

  var STEPS = [['q', '问卦', '壹'], ['gua', '起卦', '贰'], ['jie', '断卦', '叁']];
  var autoTimer = null, watchTimer = null;
  /*
     revealMax = 已露面的最后一步；-1 = 还没初始化（首次直接到位，不播动画）。只增不减。 */
  var revealMax = -1;

  function currentStep() {
    return document.documentElement.getAttribute('data-step') || 'q';
  }
  function hasCtx() { return !!window.__ctx; }


/* ===== ③ 骨架 buildStepper（含内层 probeSizes/pickProbe/syncPill ＋ 四个封条） ===== */
function buildStepper() {
    var wrap = document.querySelector('.wrap');
    if (!wrap || document.querySelector('.vstep')) return;
    var bar = document.createElement('div');
    bar.className = 'vstep';
    var h = '';
    for (var i = 0; i < STEPS.length; i++) {
      if (i) h += '<i class="ln"></i>';
      h += '<button type="button" data-k="' + STEPS[i][0] + '" aria-label="' + STEPS[i][2] + ' · ' + STEPS[i][1] + '">' +
        '<i>' + STEPS[i][2] + '</i><span class="vsl">' + STEPS[i][1] + '</span></button>';
    }
    /* ★ 液滴三件套：颈（.vneck，连接两团的那根丝）、源（.vsrc，留在旧圆上的那团）、
       头（.vpill，落到新圆上的那滴）。DOM 顺序＝绘制顺序，头写在最后＝压在最上面。 */
    h += '<span class="vneck" aria-hidden="true"></span><span class="vsrc" aria-hidden="true"></span>';
    h += '<span class="vpill" aria-hidden="true"></span>';
    bar.innerHTML = h;
    bar.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('button[data-k]') : null;
      if (b && b.getAttribute('data-st') !== 'lock') setStep(b.getAttribute('data-k'));
    });
    wrap.insertBefore(bar, wrap.firstChild);
    requestAnimationFrame(function () { placePill(false); });
    /*
       药丸的伸缩不再「每帧量宽」（那套既会冻住——早前的版本的铁 bug——逐帧写宽度也会让边缘发丝级抖），
       然后用纯几何公式算出目标位置：
         静止时按钮 i 的左沿 = (行宽 - 总宽)/2 + i*(收起宽+间距)      ← 行是 justify-content:center
         悬停某个按钮（它变宽 δ）⇒ 起点整体左移 δ/2，它右边的按钮各自再 +δ
       全程只读一次 DOM，剩下交给 CSS 过渡；药丸与标签用**同曲线同时长**（.44s / --m-damp），
       所以两者天然贴合、边缘不错位。
       ⚠ 两个已踩的坑：① 别在建的时候量（中文字体度量还没稳，展开宽会小 10px）；
                      */
    var hoverIdx = -1, SIZES = null;
    function probeSizes(probeIdx) {
      var bs = bar.querySelectorAll('button');
      if (!bs.length || probeIdx < 0) return null;
      var b = bs[probeIdx] || bs[0], sl = b.querySelector('.vsl');
      b.style.transition = 'none';
      if (sl) sl.style.transition = 'none';
      b.classList.add('vopen');
      var w1 = b.offsetWidth;
      b.classList.remove('vopen');
      void b.offsetWidth;
      var w0 = b.offsetWidth;
      b.style.transition = '';
      if (sl) sl.style.transition = '';
      var cs = window.getComputedStyle(bar);
      var gap = parseFloat(cs.columnGap || cs.gap) || 0;
      return { w0: w0, d: w1 - w0, gap: gap };
    }
    function pickProbe(a) {
      var bs = bar.querySelectorAll('button'), n = bs.length, p = -1;
      /* */
      for (var i = 0; i < n; i++) if (i !== a && i !== hoverIdx && bs[i].offsetWidth > 0) { p = i; break; }
      if (p < 0) p = a;
      return p;
    }
    function syncPill(hi, open) {
      if (pillBusy(bar)) return;        /* 药丸正在拉长/分离，悬停先别抢 */
      var all = bar.querySelectorAll('button'), vs = [], v = 0;
      for (v = 0; v < all.length; v++) if (all[v].offsetWidth > 0) vs.push(all[v]);
      var on = bar.querySelector('button[data-st="on"]'), pill = bar.querySelector('.vpill');
      if (!on || !pill || !vs.length) return;
      var n = vs.length, a = 0, hiV = -1;
      for (v = 0; v < n; v++) {
        if (vs[v] === on) a = v;
        if (hi >= 0 && all[hi] === vs[v]) hiV = v;
      }
      if (!SIZES) SIZES = probeSizes(pickProbe(a));
      if (!SIZES) return;
      var total = n * SIZES.w0 + (n - 1) * SIZES.gap;
      var left = (bar.clientWidth - total) / 2 + a * (SIZES.w0 + SIZES.gap);
      var width = SIZES.w0;
      if (open && hiV >= 0) {
        left += (a > hiV ? SIZES.d : 0) - SIZES.d / 2;
        if (a === hiV) width = SIZES.w0 + SIZES.d;
      }
      pill.style.left = left + 'px';
      pill.style.width = width + 'px';
    }
    var hoverBtn = bar.querySelectorAll('button');
    for (var bi = 0; bi < hoverBtn.length; bi++) {
      (function (b, idx) {
        b.addEventListener('mouseenter', function () { hoverIdx = idx; syncPill(idx, true); });
        b.addEventListener('mouseleave', function () { if (hoverIdx === idx) hoverIdx = -1; syncPill(hoverIdx, hoverIdx >= 0); });
        b.addEventListener('focus', function () { hoverIdx = idx; syncPill(idx, true); });
        b.addEventListener('blur', function () { if (hoverIdx === idx) hoverIdx = -1; syncPill(hoverIdx, hoverIdx >= 0); });
      })(hoverBtn[bi], bi);
    }
    bar.addEventListener('mouseleave', function () { hoverIdx = -1; syncPill(-1, false); });
    bar.__syncPill = syncPill;
    bar.__hoverIdx = function () { return hoverIdx; };
    bar.__resetSizes = function () { SIZES = null; };
    window.addEventListener('resize', function () { SIZES = null; syncPill(hoverIdx, hoverIdx >= 0); });
  }

/* ===== ④a 药丸摆位 ===== */
function placePill(animate) {
    var bar = document.querySelector('.vstep');
    if (!bar) return;
    if (pillBusy(bar)) return;          /* 药丸正在「拉长→分离」，这段时间谁都别去写它 */
    var on = bar.querySelector('button[data-st="on"]');
    var pill = bar.querySelector('.vpill');
    if (!on || !pill) return;
    var instant = !animate || !pill.__placed;
    if (instant) pill.style.transition = 'none';
    pill.style.left = on.offsetLeft + 'px';
    /* 药丸的常态宽＝「圆」的宽；悬停展开那一下由 syncPill 接管 */
    pill.style.width = on.offsetWidth + 'px';
    if (instant) {
      void pill.offsetWidth;
      pill.style.transition = '';
      pill.__placed = true;
    }
  }

/* ===== ④b IIFE 顶层 resize 监听（源里是顶层裸语句 ⇒ 这里包一层 wireResize()，一键回退才不装） ===== */
function wireResize() {
window.addEventListener('resize', function () {
    placePill(false);
    var segs = document.querySelectorAll('.seg');
    for (var i = 0; i < segs.length; i++) placeSpill(segs[i], false);
  });
}

/* ===== ④c 分段控件滑动药丸（与步进条不同族，④b 那条监听要用它） ===== */
function placeSpill(seg, animate) {
    if (!seg) seg = document.querySelector('.cbar .seg');
    if (!seg) return;
    var on = seg.querySelector('button[aria-pressed="true"]');
    var sp = seg.querySelector('.spill');
    if (!on || !sp) return;
    var instant = !animate || !sp.__placed;
    if (instant) sp.style.transition = 'none';
    sp.style.left = on.offsetLeft + 'px';
    sp.style.width = on.offsetWidth + 'px';
    if (instant) { void sp.offsetWidth; sp.style.transition = ''; sp.__placed = true; }
  }

/* ===== ⑤ 步态同步 ＋ 液滴 ＋ 显隐 ＋ 入场 ===== */
function syncStep() {
    var cur = currentStep(), ctx = hasCtx();
    var order = { q: 0, gua: 1, jie: 2 };
    var ci = order[cur] === undefined ? 0 : order[cur];
    var instant = revealMax < 0;                 /* 首次挂载：直接到位 */
    if (ci > revealMax) revealMax = ci;
    var bar = document.querySelector('.vstep');
    var prevOn = bar ? bar.querySelector('button[data-st="on"]') : null;   /* 换步前的当前步 */
    var bs = document.querySelectorAll('.vstep button');
    /* ★ 多一个圆 ⇒ 整行会重新居中（瞬时位移）⇒ 视觉上「啪」地跳一下。
       先记下整行最左那个圆的位置，露完之后用反向 transform 抵掉、再放掉 ⇒ 丝滑滑过去。 */
    var anchor = null;
    for (var a0 = 0; a0 < bs.length; a0++) if (bs[a0].offsetWidth > 0) { anchor = bs[a0]; break; }
    var leftBefore = anchor ? anchor.offsetLeft : 0;
    var grew = false;
    for (var i = 0; i < bs.length; i++) {
      var k = bs[i].getAttribute('data-k');
      var ki = order[k] === undefined ? 1 : order[k];
      var st = '';
      if (k === cur) st = 'on';
      else if (ki < ci) st = 'done';          /* 走过的步 = 已完成 */
      else if (!ctx) st = 'lock';             /* 没起卦前，后面的步不可点 */
      bs[i].setAttribute('data-st', st);
      if (revealBtn(bs[i], ki <= revealMax, instant)) grew = true;
    }
    var leftAfter = anchor && anchor.offsetWidth > 0 ? anchor.offsetLeft : leftBefore;
    var shift = leftAfter - leftBefore;
    var nowOn = bar ? bar.querySelector('button[data-st="on"]') : null;
    if (grew && bar && !instant && nowOn) {
      if (shift) {
        /* ★ 反向抵消：整行因多一个圆而重新居中 ⇒ 最左那个圆的 offsetLeft 变了 shift，
           此刻先把它**抵回去**（-shift），下一帧再放掉 ⇒ 视觉上零位移起步、丝滑滑到新位置。
           （写成 +shift 会变成加倍位移 —— 第一版就是这么错的，看着就是「啪」地往左跳一下。） */
        bar.style.transition = 'none';
        bar.style.transform = 'translateX(' + (-shift) + 'px)';
        void bar.offsetWidth;
        bar.style.transition = 'transform .52s var(--m-glide)';
        bar.style.transform = '';
      }
      pillSplit(bar, prevOn, nowOn);
      return;
    }
    /* ★★ 治「点一步会跳一下」：换页面时 .wrap 的内距不同（问卦页比其他页窄 14px），
       工具条的坐标系会整体平移几像素 —— 按钮因为居中看不出来，但药丸的 left 是相对工具条的绝对值，
       不补偿就会先"跳"那几像素再开始滑。做法＝FLIP：先按**上一个当前步**在新坐标系里的位置
       静默放一次（此时屏幕位置不变 ⇒ 看不出任何动静），再交给 placePill 过渡到新目标。 */
    requestAnimationFrame(function () {
      var p = bar ? bar.querySelector('.vpill') : null;
      var pb = (prevOn && prevOn.offsetWidth > 0) ? prevOn : null;
      if (p && pb) {
        p.style.transition = 'none';
        p.style.left = pb.offsetLeft + 'px';
        p.style.width = pb.offsetWidth + 'px';
        void p.offsetWidth;                 /* 强制提交，别让两步被合并成一帧 */
        p.style.transition = '';
      }
      placePill(true);
    });
  }

function pillSplit(bar, prevOn, on) {
    var pill = bar.querySelector('.vpill');
    var neck = bar.querySelector('.vneck');
    var src = bar.querySelector('.vsrc');
    if (!pill || !on || !prevOn) { try { placePill(true); } catch (e) { } return; }
    var S = prevOn.offsetLeft, SW = prevOn.offsetWidth;         /* 源：旧圆 */
    var T = on.offsetLeft, TW = on.offsetWidth;                 /* 目标：新圆 */
    var sc = S + SW / 2, tc = T + TW / 2;                       /* 各自的圆心 */
    bar.__pillBusy = Date.now() + 1350;
    /* 0) 起步：头与源都叠在旧圆上，颈隐藏（宽度 0） */
    pill.style.transition = 'none';
    pill.style.left = S + 'px'; pill.style.width = SW + 'px';
    if (src) {
      src.style.transition = 'none';
      src.style.left = S + 'px'; src.style.width = SW + 'px'; src.style.height = SW + 'px';
      src.style.opacity = '1';
    }
    if (neck) {
      neck.style.transition = 'none';
      neck.style.left = sc + 'px'; neck.style.width = '0px'; neck.style.height = SW + 'px';
      neck.style.opacity = '0';
    }
    void pill.offsetWidth;
    pill.style.transition = '';
    if (src) src.style.transition = '';
    if (neck) neck.style.transition = '';
    requestAnimationFrame(function () {
      /* ① 头往新圆去；颈同时「成形＋变细」：宽度 0→跨度、高度 34→5（一条连续的收细，
         不再分成 34→17→5 两段 —— 反馈那样不够丝滑）。这就是两滴粘液被慢慢拉开的样子。 */
      pill.style.left = T + 'px'; pill.style.width = TW + 'px';
      if (neck) {
        neck.style.opacity = '1';
        neck.style.left = Math.min(S, T) + 'px';
        neck.style.width = (Math.max(S + SW, T + TW) - Math.min(S, T)) + 'px';
        neck.style.height = '5px';
      }
    });
    /* ② 断：只剩最后一丝时（此时颈高已经收到 5px），让它快速抽回新圆的圆心、源缩没。
       这一段刻意用**更快的**曲线 —— 分离本身就该是「啪」的一下，慢吞吞反而不像液体。 */
    setTimeout(function () {
      var quick = 'left .2s var(--m-damp2),width .2s var(--m-damp2),height .2s var(--m-damp2),opacity .2s linear';
      if (neck) {
        neck.style.transition = quick;
        neck.style.left = tc + 'px'; neck.style.width = '0px'; neck.style.opacity = '0';
      }
      if (src) {
        src.style.transition = quick;
        src.style.left = sc + 'px'; src.style.width = '0px'; src.style.height = '0px';
        src.style.opacity = '0';
      }
    }, 560);
    setTimeout(function () {
      bar.__pillBusy = 0;
      if (bar.__resetSizes) bar.__resetSizes();
      try { placePill(true); } catch (eP) { }
    }, 1150);
  }

function pillBusy(bar) {
    return !!(bar && bar.__pillBusy && Date.now() < bar.__pillBusy);
  }

function revealBtn(b, show, instant) {
    var now = show ? '1' : '0';
    if (b.getAttribute('data-vshow') === now) return false;
    var wasHidden = b.getAttribute('data-vshow') === '0';
    b.setAttribute('data-vshow', now);
    var pv = b.previousElementSibling;
    var ln = (pv && pv.className === 'ln') ? pv : null;
    if (ln) { ln.style.display = show ? '' : 'none'; ln.setAttribute('data-vshow', now); }
    if (!show) { b.style.display = 'none'; return false; }
    b.style.display = '';
    if (instant || !wasHidden) return false;
    var bar = b.parentNode;
    if (bar && bar.__resetSizes) bar.__resetSizes();   /* 可见数变了，探针尺寸要重新量 */
    b.classList.remove('vdrop'); void b.offsetWidth; b.classList.add('vdrop');
    setTimeout(function () { b.classList.remove('vdrop'); }, 700);
    return true;                                       /* 告诉 syncStep：这次是「长出来」的 */
  }

function animateIn() {
    var cur = currentStep();
    var els = cur === 'q' ? [document.querySelector('.left')]
      : cur === 'gua' ? [document.querySelector('.pane.gua')]
        : [document.querySelector('.pane.llm'), document.querySelector('.right > .pane:not(.gua):not(.llm)')];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el) continue;
      el.classList.remove('v-in');
      void el.offsetWidth;              /* 强制重排，动画才能重放 */
      el.classList.add('v-in');
    }
  }

function narrowPhone() { return IS_PHONE; }   /* ★ 平台只看产物（构建期常量），不看屏幕宽度 */

/* ===== ⑥ 换步 ===== */
  var VISITED = {};
  function markVisited(k) { if (k) VISITED[k] = 1; }

function goStep(k) {
    if (!k || k === currentStep()) return false;
    if (k !== 'q' && k !== 'gua' && k !== 'jie') return false;
    document.documentElement.setAttribute('data-step', k);
    try { syncStep(); } catch (e) { }
    return true;
  }

function setStep(k) {
    if ((k === 'gua' || k === 'jie') && !hasCtx()) return;
    var prevK = currentStep();
    /*
       真因：buildStepper 给每个按钮挂了"点了就 setStep"，点当前那个字也会再走一遍
       ⇒ 下面 animateIn() 会把当前页的入场动画重播一次（看着就是刷新）。
       ⇒ 只有**真的换页**才重播入场；同一步的调用（点序号、看门狗补建）只做状态同步。 */
    var sameStep = (k === prevK);
    document.documentElement.setAttribute('data-step', k);
    markVisited(k);
    /* ★ 手机版：先换字（syncPhoneStep 把当前那个按钮显出来、字号归位），
       再由 phoneStepSettle 展开标题 3 秒后收起。旧的"横着飞 + 途中闪八卦"已推翻。 */
    try { syncPhoneStep(); } catch (eS) { }
    try { if (prevK !== k) phoneStepSettle(k); } catch (eF) { }
    /*
       手机端**不再重播整页入场**（animateIn 那套是给桌面/开屏落位用的）。
       手机上的换页动效交给"滑动切页"那套（拖动跟手 + 方向滑入），不再叠一层整页淡入。 */
    if (!sameStep && !narrowPhone()) { try { animateIn(); } catch (eA) { } }
    syncStep();
    /* 换步后指针若正好停在按钮上，药丸要跟着摆到位（否则标签会露在圆外面） */
    try {
      var sb = document.querySelector('.vstep');
      if (sb && sb.__hoverIdx && sb.__syncPill) {
        var hx = sb.__hoverIdx();
        if (hx >= 0) sb.__syncPill(hx, true);
      }
    } catch (eH) { }
    /* 当前步的圆圈换位时「长」出来（只有放大，没有回弹）。挂类 → 强制重排 → 才能重放。 */
    try {
      var pb = document.querySelector('.vstep button[data-st="on"] i');
      if (pb) {
        pb.classList.remove('vpop');
        void pb.offsetWidth;
        pb.classList.add('vpop');
        setTimeout(function () { pb.classList.remove('vpop'); }, 560);
      }
    } catch (eP) { }
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    if (k === 'q') {
      var q = document.getElementById('q');
      if (q && !q.value) { try { q.focus({ preventScroll: true }); } catch (e2) { } }
    }
    if (k === 'jie' && autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    /*
       已经解过/速断过（__md 有内容）就不覆盖。 */
    if (k === 'jie' && !window.__md && typeof quickReadRun === 'function') {
      try { quickReadRun(); } catch (e10) { }
    }
  }

/* ===== 手写装配（最小：只做「建 + 摊平外部口子」；load 之后的重指在外壳里）===== */
export function mount() {
  if (window.__xlrStepperMounted) return false;
  window.__xlrStepperMounted = 1;
  buildStepper();          /* 共用节点闸（见文件头）：早期实现那两次因此早退 */
  setStep('q');            /* 等价早期实现 ready() L1989 那一击；同一步的第二次调用只做状态同步 */
  wireResize();            /* 块④b：页面 resize 时药丸归位（早期实现那条匿名监听仍在，同值双写，判据证明） */
  try { window.__xlrGoStep = goStep; } catch (eGO) { }
  return true;
}

export const StepCore = {
  mount,
  build: buildStepper,
  setStep,
  goStep,
  placePill,
  placeSpill,
  wireResize,
  currentStep,
  hasCtx,
  STEPS,
  /* */
  state: function () { return { revealMax: revealMax, visited: { q: !!VISITED.q, gua: !!VISITED.gua, jie: !!VISITED.jie } }; },
};
