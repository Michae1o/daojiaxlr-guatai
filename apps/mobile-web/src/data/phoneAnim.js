/* phoneAnim.js —— 手机端的**序号三件 + 滑动换页 + 边缘滑开抽屉**（早期实现那一整套动画/手势）
 *
 * 来源（只读，逐字基准）：`(upstream)`
 *   · alignStepBar      L1303–L1314
 *   · syncPhoneStep     L1316–L1334
 *   · stepSetGlyph      L1339–L1342
 *   · phoneStepSettle   L1343–L1360        （展开标题 → 停 3 秒 → 收起；点序号那种给 2 秒）
 *   · stepSwipeBlocked  L1369–L1377
 *   · stepCollapseAll   L1382–L1387
 *   · stepPageEls       L1390–L1395
 *   · stepTapWire       L1402–L1411
 *   · stepBarScrollFade L1416–L1423        （滚动前 72px 内 1→0、上移 14px；口径：「往下拉逐渐淡出」）
 *   · stepScrollWire    L1424–L1435
 *   · initStepSwipe     L1437–L1572        （跟手位移 · 八卦跳字 · 松手定格 · data-swipedir 滑切）
 *   · initEdgeSwipe     L11014–L11069      （左边缘 30px 划出抽屉；点面板外收起 —— 现象：的「缩不回去」就是这条）
 *   · 未起卦手势吞掉     `__xlrSwipeBlock`（早期产物 L11423–L11450）
 *   · 未起卦拨回         `__xlrGateGuard` （早期产物 L11398–L11414）
 *   · 触摸点序号兜底      `__xlrStepTapTouch`（早期产物 L11366–L11392）
 *
 * 上游当初挂在哪（`modern.js` L10996–L11006，ready 里那一串）：
 *   `initEdgeSwipe(); initStepSwipe(); stepTapWire(); stepScrollWire();` ＋ 四个调试钩子
 *   `window.__xlrSetStep / __xlrPhoneStepSettle / __xlrSyncPhone / __xlrAlignStepBar`。
 * 而 `syncPhoneStep / phoneStepSettle` 的**调用点**在源里的 `setStep()` 尾部
 *   （`syncPhoneStep(); if (prevK !== k) phoneStepSettle(k);`，见 `src/data/stepCore.js` L402–405 的注释）。
 *
 * 与源的**有意偏离**（都在 phone 侧，可观测行为一致）：
 *   ① `narrowPhone()` ⇒ 常量 true。上游构建手机产物时把 `matchMedia` 固化成 `({matches:true})`，
 *      宽屏那一支在手机上永不执行 ⇒ 不搬。
 *   ② 第 ① 条的连带：源里 `stepSwipeBlocked()` 的「非窄屏 ⇒ 拦」在手机端恒为 false ⇒ 只留后面三条判定。
 *   ③ `syncPhoneStep()` 里那记 `markVisited(cur)` **不搬** —— 本仓 `StepCore.setStep()` 已自己 mark（L401）。
 *   ④ 调用点改挂 **MutationObserver(html[data-step])**：本仓 `setStep` 在生成物 `stepCore.js` 里、
 *      它内部把 `syncPhoneStep/phoneStepSettle` 绑成了**桌面空实现**（L54–56，那个文件改动后重新构建）
 *      ⇒ 等价做法＝在外面盯 `data-step`，变化时补这两拍（源里那条自愈观察者本来就是这么干的，见 L1568–L1571）。
 *   ⑤ `#sdb` 的开合走 `window.sdbOpen/sdbClose`（源里就是），本仓若没挂这两个全局则整段 inert（try/catch 保住）。
 *
 * 为什么写本文件：手机端口径只落 `apps/mobile-web/src/`（同 `tailwind.css` / `phoneShims.js` 的规矩）；
 *   `styles/legacy.css` 被 manifest 记整份 sha16 ⇒ 改它链会拒装。
 * ⛔ 不含任何判据算式（R4）。判据算式不在这些函数里（它们只做 DOM/手势）。
 */
/* eslint-disable */
import { StepCore } from './stepCore.js';

/* ===== 小工具（源 L1293–L1314，窄屏支）===== */
function stepGlyph(k) {
  var S = StepCore.STEPS || [];
  for (var i = 0; i < S.length; i++) if (S[i][0] === k) return S[i][2];
  return '';
}
function stepBar() { return document.querySelector('.vstep'); }
function stepBtn(k) { var b = stepBar(); return b ? b.querySelector('button[data-k="' + k + '"]') : null; }

/* ★ 与左上/右上按钮**同高**：拿顶栏第一枚看得见的按钮的实测 top/height 写到条上。 */
function alignStepBar() {
  var bar = stepBar();
  if (!bar) return;
  var bs = document.querySelectorAll('#top button'), ref = null;
  for (var i = 0; i < bs.length; i++) {
    if (bs[i].offsetWidth > 8 && bs[i].offsetHeight > 8) { ref = bs[i]; break; }
  }
  if (!ref) return;
  /* ★★ 改（现象：「步进条有时候不显示，有时候位置不一样」）：
     原来是 `getBoundingClientRect()` —— 那是**含 transform 的绘制位**。开屏收尾 / 切页那一拍
     顶栏有 `translateY` 的入场过渡（0.35s），在这段里量到的是「上移 6px」的位置
     ⇒ 把错的 top 钉在 `position:fixed` 的 .vstep 上，而且之后再没人纠正（实测：壹页钉成 40，
     顶栏归位后是 46 ⇒ 条比按钮高 6px；其它页因为量的时候已经稳定，是 46）。
     ⇒ 改用 offsetTop / offsetHeight 那条链：**静态布局值，不吃 transform**，
       所以在过渡中量也是同一个数（壹页/贰/叁 都为 46）。 */
  var y = 0;
  for (var n = ref; n && n !== document.body && n !== document.documentElement; n = n.offsetParent) {
    if (!n.offsetTop) continue;
    y += n.offsetTop;
  }
  bar.style.top = Math.round(y) + 'px';
  bar.style.height = Math.round(ref.offsetHeight) + 'px';
}

function syncPhoneStep() {
  var bar = stepBar();
  if (!bar) return;
  try { bar.style.removeProperty('bottom'); } catch (eB) { }
  try { alignStepBar(); } catch (eA) { }
  var cur = StepCore.currentStep();
  [].forEach.call(bar.querySelectorAll('button[data-k]'), function (b) {
    var k = b.getAttribute('data-k');
    if (k !== cur) { b.style.display = 'none'; return; }
    b.style.removeProperty('display');
    b.style.setProperty('--vx', '0px');
    var it = b.querySelector('i');
    if (it) it.textContent = stepGlyph(k);
  });
}

/* ===== 落位这一拍（源 L1339–L1360）===== */
var VFULL_MS = 3000;
function stepSetGlyph(k, text) {
  var it = stepBtn(k) ? stepBtn(k).querySelector('i') : null;
  if (it && text) it.textContent = text;
}
function phoneStepSettle(toK, holdMs) {
  var bar = stepBar();
  if (!bar) return false;
  var b = stepBtn(toK);
  if (!b) return false;
  try { syncPhoneStep(); } catch (e0) { }
  stepSetGlyph(toK, stepGlyph(toK));
  [].forEach.call(bar.querySelectorAll('button[data-k]'), function (x) {
    if (x !== b) x.classList.remove('vfull');
  });
  b.classList.add('vfull');
  if (phoneStepSettle.__t) clearTimeout(phoneStepSettle.__t);
  var ms = (typeof holdMs === 'number' && holdMs > 0) ? holdMs : VFULL_MS;
  phoneStepSettle.__t = setTimeout(function () { b.classList.remove('vfull'); }, ms);
  return true;
}
function stepCollapseAll() {
  var bar = stepBar();
  if (!bar) return;
  if (phoneStepSettle.__t) { clearTimeout(phoneStepSettle.__t); phoneStepSettle.__t = 0; }
  [].forEach.call(bar.querySelectorAll('button[data-k]'), function (b) { b.classList.remove('vfull'); });
}
function stepPageEls(k) {
  if (k === 'q') return [document.querySelector('.left')].filter(Boolean);
  if (k === 'gua') return [document.querySelector('.pane.gua')].filter(Boolean);
  return [document.querySelector('.pane.llm'),
          document.querySelector('.right > .pane:not(.gua):not(.llm)')].filter(Boolean);
}

/* ===== 点序号：原位展开完整标题，2 秒后收回（源 L1401–L1411）===== */
var STEP_TAP_MS = 2000;
function stepTapWire() {
  var bar = stepBar();
  if (!bar || bar.__tapWired) return;
  bar.__tapWired = 1;
  bar.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('button[data-k]') : null;
    if (!b) return;
    try { phoneStepSettle(StepCore.currentStep(), STEP_TAP_MS); } catch (e2) { }
  });
}

/* ===== 滚动渐隐（源 L1413–L1435）===== */
function stepBarScrollFade(st) {
  var bar = stepBar();
  if (!bar) return;
  var p = Math.max(0, Math.min(1, st / 72));
  bar.style.opacity = String(1 - p);
  bar.style.transform = 'translateY(' + (-14 * p).toFixed(1) + 'px)';
  bar.style.pointerEvents = (p > .5) ? 'none' : '';
}
/* ★★ 新增（现象：「步进条有时候不显示」）：
   旧口径是「任何 scroll 都按它的 scrollTop 淡出」——可手机端有一堆**不是页面**的滚动容器：
   背景光晕 `#xlrAura`（它自己就能滚 200px）、记录抽屉、设置页、皮肤菜单、引导层、九数面板。
   只要其中一个滚过 72px，步进条就被淡成 0；而复位只认「滚回顶部」那一拍，主页面没滚
   ⇒ 条一直不回来（实测：把 #xlrAura 的 scrollTop 设成 200 ⇒ .vstep opacity 0 + translateY(-14px)）。
   ⇒ 只认**页面级**容器；浮层/背景层内部滚动一律不算。 */
function isChromeScroll(el) {
  if (!el) return true;
  if (el.id === 'xlrAura') return true;
  if (!el.closest) return false;
  return !!(el.closest('#sdb') || el.closest('.setscreen') || el.closest('.skinmenu') ||
            el.closest('.onb') || el.closest('.gzoom') || el.closest('#castPanel') ||
            el.closest('.mgbar') || el.closest('#xlrSplash'));
}
/* 当前步的页面级滚动量（切页后用它把淡出状态复位） */
function mainScrollTop() {
  var k = StepCore.currentStep();
  var els = stepPageEls(k);
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (el && el.scrollTop) return el.scrollTop;
  }
  var se = document.scrollingElement || document.documentElement;
  return (window.pageYOffset || (se && se.scrollTop) || 0);
}
function stepScrollWire() {
  if (stepScrollWire.__done) return;
  stepScrollWire.__done = 1;
  document.addEventListener('scroll', function (e) {
    var t = e.target, st = 0, el = null;
    if (!t || t === document || t === document.documentElement || t === document.body) {
      el = document.scrollingElement || document.documentElement;
      st = (window.pageYOffset || el.scrollTop || 0);
    } else { el = t; st = t.scrollTop || 0; }
    if (isChromeScroll(el)) return;          /* ★ 浮层/背景层的滚动不参与淡出 */
    if (document.documentElement.classList.contains('sdb-lock')) return;   /* 抽屉开着时冻结 */
    try { stepBarScrollFade(st); } catch (e2) { }
  }, { passive: true, capture: true });
}

/* ===== 手势闸（源 L1369–L1377，去掉「非窄屏」那条）===== */
function stepSwipeBlocked() {
  if (document.documentElement.classList.contains('sdb-lock')) return true;
  var se = document.getElementById('setScreen');
  if (se && se.offsetParent !== null) return true;
  var sk = document.querySelector('.skinmenu');
  if (sk && sk.offsetParent !== null) return true;
  return false;
}

/* ===== 滑动换页（源 L1437–L1572）===== */
var STEP_ORDER = ['q', 'gua', 'jie'];
function initStepSwipe() {
  if (initStepSwipe.__done) return;
  initStepSwipe.__done = 1;
  var x0 = 0, y0 = 0, armed = false, dragging = false, dir = 0, prog = 0, tgt = null, cur = null, gentle = false, wd = 0;
  var SWIPE_MIN = 110;
  var DRAW = 4;
  /* ★★ （口径：「更细腻、更跟手、更非线性」）三处：
     ① 跟手系数 0.5 → **0.86**：旧值手指走 100px 页面只跟 50px，松手那一跳特别明显；
     ② 到头（壹页右滑 / 叁页左滑）不再「完全不接管」，改成**阻尼跟随** EDGE_MAX px + 松手回弹
        —— 有反馈、划不过去，也不会顺手把别的东西打开；
     ③ 回弹时长按拖动进度伸缩（划得多回得快），曲线换成带一点过冲的弹簧（见 .swipe-back）。 */
  var FOLLOW = 0.86;
  var EDGE_MAX = 54;
  function targetOf(fromK, d) {
    var i = STEP_ORDER.indexOf(fromK);
    if (i < 0) return null;
    var j = i + d;
    return (j < 0 || j >= STEP_ORDER.length) ? null : STEP_ORDER[j];
  }
  var BAGUA_ALL = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
  var grp = null, pageEls = [];
  function drawBagua() {
    var pool = BAGUA_ALL.slice(), out = [];
    for (var i = 0; i < DRAW && pool.length; i++) {
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
  }
  function follow(dx) {
    var out = gentle ? damp(dx) : dx * FOLLOW;
    var p = Math.min(1, Math.abs(dx) / SWIPE_MIN);
    /* 跟手同时等比缩小：走到阈值时缩到 .94（用户要的「当前页慢慢等比缩小」） */
    var sc = gentle ? (1 - .04 * Math.min(1, Math.abs(out) / EDGE_MAX)) : (1 - .06 * p);
    if (wd) clearTimeout(wd);
    /* 看门狗：手指还在卡片却收不到新事件（浏览器把手势吃掉 / 事件丢失）时，
       1.2 秒后自己收尾复位 —— 宁可少跟一帧，也不许把卡片停在半路。 */
    wd = setTimeout(function () { wd = 0; try { swipeEnd(); } catch (eW) { } }, 1200);
    for (var i = 0; i < pageEls.length; i++) {
      pageEls[i].classList.add('swipe-follow');
      pageEls[i].style.setProperty('--swx', out.toFixed(1) + 'px');
      pageEls[i].style.setProperty('--sws', sc.toFixed(3));
      pageEls[i].style.setProperty('--swo', String(1 - Math.min(.42, Math.abs(out) / 320)));
    }
  }
  /* 到头那一侧的阻尼位移：越推越沉，最多让出 EDGE_MAX px（不会空拖） */
  function damp(dx) {
    var s = dx < 0 ? -1 : 1;
    return s * EDGE_MAX * (1 - 1 / (1 + Math.abs(dx) / 150));
  }
  function followClear(animate, p) {
    var sec = animate ? Math.max(.2, .4 - .18 * (p || 0)) : .26;
    for (var i = 0; i < pageEls.length; i++) {
      (function (el) {
        if (animate) {
          el.classList.remove('swipe-follow');
          el.style.setProperty('--swback', sec.toFixed(2) + 's');
          el.classList.add('swipe-back');
          el.style.removeProperty('--swx'); el.style.removeProperty('--swo'); el.style.removeProperty('--sws');
          setTimeout(function () { el.classList.remove('swipe-back'); el.style.removeProperty('--swback'); }, sec * 1000 + 80);
        } else {
          el.classList.remove('swipe-follow', 'swipe-back');
          el.style.removeProperty('--swx'); el.style.removeProperty('--swo'); el.style.removeProperty('--sws'); el.style.removeProperty('--swback');
        }
      })(pageEls[i]);
    }
    pageEls = [];
  }
  /* ===== 换页交叉转场：旧页冻成「照片」等比缩小淡出 · 新页从 .92 放大到 1 =====
     为什么要冻结：三页是 display 切换的兄弟块，setStep 一跑旧页立刻 hidden，
     想让它「慢慢缩小」就必须先把它抠出来钉在原位（fixed + 冻结 rect），再让 setStep 去切。 */
  function freezeGhost(el) {
    if (!el || !el.getClientRects || !el.getClientRects().length) return null;
    /* ★ 冻结要保住「手指离开那一刻的样子」：先把跟手的 transform 摘掉量出**布局位置**，
       再把 transform 还原 —— 否则 fixed 到「拖动后」的 rect 上、transform 归零，
       旧页会先「跳回原位」再缩小（实测就是这一下显得生硬）。 */
    var cs0 = getComputedStyle(el);
    var tf0 = cs0.transform;
    el.style.transform = 'none';
    var r = el.getBoundingClientRect();
    el.style.transform = (tf0 && tf0 !== 'none') ? tf0 : '';
    if (r.width < 8 || r.height < 8) return null;
    var saved = el.getAttribute('style');
    el.style.position = 'fixed';
    el.style.left = r.left + 'px';
    el.style.top = r.top + 'px';
    el.style.width = r.width + 'px';
    el.style.height = r.height + 'px';
    el.style.margin = '0';
    el.style.zIndex = '3';
    el.style.overflow = 'hidden';
    el.style.pointerEvents = 'none';
    el.style.display = 'block';
    el.style.opacity = '1';
    el.classList.remove('swipe-follow');
    el.classList.add('swipe-ghost');
    return { el: el, saved: saved };
  }
  function releaseGhost(g) {
    var el = g.el;
    /* 只拆我们自己加的那些，**别整体还原 saved**：saved 里还留着跟手时的 transform
       （matrix(-206px)）和 --swx 等变量，整份还原会让旧页以后一旦显示就偏在屏幕外。 */
    el.classList.remove('swipe-ghost');
    ['position', 'left', 'top', 'width', 'height', 'margin', 'z-index', 'overflow',
      'pointer-events', 'display', 'transform', 'opacity', 'will-change'].forEach(function (p) {
        el.style.removeProperty(p);
      });
    el.style.removeProperty('--swx');
    el.style.removeProperty('--sws');
    el.style.removeProperty('--swo');
  }
  function crossTransit(fromK, toK, d) {
    var outs = [], src = stepPageEls(fromK), i;
    for (i = 0; i < src.length; i++) { var g = freezeGhost(src[i]); if (g) outs.push(g); }
    /* 冻结之后才清跟手状态（顺序反了旧页会先瞬回原位） */
    if (pageEls.length) { try { followClear(false, 0); } catch (eFC) { } }
    var W = window.innerWidth || 390;
    var fly = (d > 0) ? -1 : 1;                 /* 旧页飞出的方向（d>0 = 左滑 = 下一页） */
    var inFrom = -fly * Math.round(W * 0.24);   /* 新页起手的位置（反方向） */
    var EASE = 'transform .34s cubic-bezier(.22,1,.36,1), opacity .3s ease';

    /* ① 先让旧页起飞：**不等 setStep**。
       实测首次进叁页 `setStep` 本身要 ~100ms（首次布局 + 毛玻璃重绘），
       要是等它做完再动，表现就是「松手后停一下才开始动」。 */
    requestAnimationFrame(function () {
      for (var m = 0; m < outs.length; m++) {
        outs[m].el.style.transform = 'translateX(' + Math.round(fly * W * 0.45) + 'px) scale(.8)';
        outs[m].el.style.opacity = '0';
      }
      /* ② 下一帧再切页：这时旧页已经在飞了，新页在它后面接上 */
      requestAnimationFrame(function () {
        try { StepCore.setStep(toK); } catch (eC) { }
        var ins = stepPageEls(toK);
        for (var j = 0; j < ins.length; j++) {
          var el = ins[j];
          if (!el) continue;
          /* 起点必须先落地（关过渡 → 写起点 → 强制重排 → 开过渡），否则浏览器并成一次计算 ⇒ 没有过渡。
             ⚠ 起点 opacity 不能是 0：旧页已经飞走一半，两边全透会闪出一帧空白（实测过）。 */
          el.style.transition = 'none';
          el.style.transformOrigin = '50% 42%';
          el.style.transform = 'translateX(' + inFrom + 'px) scale(.9)';
          el.style.opacity = '.55';
          void el.offsetWidth;
          el.style.transition = EASE;
          el.style.willChange = 'transform,opacity';
        }
        requestAnimationFrame(function () {
          for (var k = 0; k < ins.length; k++) {
            if (!ins[k]) continue;
            ins[k].style.transform = 'translateX(0) scale(1)';
            ins[k].style.opacity = '1';
          }
        });
        setTimeout(function () {
          for (var k2 = 0; k2 < ins.length; k2++) {
            var e2 = ins[k2];
            if (!e2) continue;
            e2.style.transition = '';
            e2.style.transform = '';
            e2.style.opacity = '';
            e2.style.transformOrigin = '';
            e2.style.willChange = '';
          }
          for (var m2 = 0; m2 < outs.length; m2++) releaseGhost(outs[m2]);
        }, 400);
      });
    });
  }
  function swipeStart(x, y, tag) {
    /* ★ 开手势前先把上一把可能残留的跟手状态清干净（被打断/事件丢失时留下的） */
    if (wd) { clearTimeout(wd); wd = 0; }
    if (pageEls.length) { try { followClear(false, 0); } catch (eSC) { } }
    armed = false; dragging = false; dir = 0; prog = 0; tgt = null; cur = null; grp = null;
    if (stepSwipeBlocked()) return;
    if (!window.__ctx) return;
    if (x <= 30) return;
    if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
    x0 = x; y0 = y; armed = true;
  }
  function swipeMove(x, y) {
    if (!armed) return false;
    var dx = x - x0, dy = y - y0;
    if (!dir) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return false;
      if (Math.abs(dy) > Math.abs(dx)) { armed = false; return false; }
      cur = StepCore.currentStep();
      dir = dx < 0 ? 1 : -1;
      tgt = targetOf(cur, dir);
      /* ★ 到头不放弃手势，改走「阻尼跟手 + 松手回弹」（gentle） */
      gentle = !tgt;
      dragging = true;
      pageEls = stepPageEls(cur);
      if (!gentle) { stepCollapseAll(); grp = drawBagua(); }
    }
    prog = Math.min(1, Math.abs(dx) / SWIPE_MIN);
    if (!gentle) {
      if (!grp) grp = drawBagua();
      var idx = Math.max(0, Math.min(grp.length - 1, Math.floor(prog * DRAW)));
      stepSetGlyph(cur, grp[idx]);
    }
    follow(dx);
    return true;
  }
  function swipeEnd() {
    /* ★★ （现象：「叁页右划后页面卡住」）：原来这里第一句是 `if (!armed) return;` ——
       手指还在拖、卡片已经跟手移出去了，可这时 `armed` 可能已经被打断清掉
       （touchcancel / 浏览器接管 / 事件丢失），于是这一句直接 return：
       `.swipe-follow` 与 `--swx` 就永远挂在卡片上 ⇒ 卡片停在半路＝他看到的「卡住」。
       现在改成：只要还留着跟手状态（pageEls 非空）就一定要走完收尾。 */
    if (!armed && !pageEls.length) { if (wd) { clearTimeout(wd); wd = 0; } return; }
    if (wd) { clearTimeout(wd); wd = 0; }
    armed = false; dragging = false;
    var g = gentle; gentle = false;
    var commit = (!g && prog >= 1);
    var p = prog;
    var fromK = cur, toK = tgt, d = dir;
    prog = 0; cur = null; tgt = null; dir = 0; grp = null;
    if (!fromK) { pageEls = []; return; }
    if (!toK) {                                  /* 到头：只回弹 */
      followClear(true, p);
      stepSetGlyph(fromK, stepGlyph(fromK));
      try { syncPhoneStep(); } catch (eB0) { }
      return;
    }
    if (commit) {
      /* ★★★ （口径：：「滑到一半下一页会直接毫无预兆地出现，没有任何过渡…理应是当前页
         慢慢等比缩小，然后下一页从等比缩小的状态逐渐变大，丝滑无比」）
         ⇒ 换页走 `crossTransit()`：旧页冻成「照片」缩放淡出，新页从 .92 放大到 1，两页交叉 340ms。
         ⚠ 这里**不能先 followClear**：那会先把跟手的 transform 抹掉，旧页瞬回原位再缩小＝还是生硬。
           清跟手状态的事挪进 crossTransit（冻结之后再做）。
         ⛔ 也不要再调 `animateIn()`，或靠 data-swipedir 压动画 —— 属性一摘，CSS 动画会当场重开播。 */
      crossTransit(fromK, toK, d);
      try { if (StepCore.currentStep() === toK) phoneStepSettle(toK); } catch (eD) { }
    } else {
      followClear(true, p);
      stepSetGlyph(fromK, stepGlyph(fromK));
      try { syncPhoneStep(); } catch (eB) { }
    }
  }
  document.addEventListener('touchstart', function (e) {
    if (!e.touches || e.touches.length !== 1) { armed = false; return; }
    var t = e.touches[0];
    swipeStart(t.clientX, t.clientY, (e.target && e.target.tagName) || '');
  }, { passive: true });
  /* ★★ （现象：「叁页划不动 / 页面被放大」）：这条原来是 passive:true ⇒
     我们认了「横向滑动」之后浏览器仍然会去抢这个手势（横向平移整页、双指放大），
     JS 那边随后就只收到一帧 move（实测：拖 200px 只进来 1 帧）⇒ 看起来就是「划不动」。
     改成 passive:false：一旦判定为横向跟手，立刻 preventDefault 把手指收回来，
     竖向（滚动）与左边缘 30px（抽屉）在 swipeMove 里本来就不返回 true，不受影响。 */
  document.addEventListener('touchmove', function (e) {
    var t = e.touches && e.touches[0];
    if (!t) return;
    if (swipeMove(t.clientX, t.clientY)) {
      if (e.cancelable) { try { e.preventDefault(); } catch (eP0) { } }
    }
  }, { passive: false });
  document.addEventListener('touchend', function () { swipeEnd(); }, { passive: true });
  /* 被浏览器打断时也要走一遍完整收尾（原来只清 armed ⇒ 卡片留在半路） */
  document.addEventListener('touchcancel', function () { try { swipeEnd(); } catch (eC0) { } }, { passive: true });
  document.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    swipeStart(e.clientX, e.clientY, (e.target && e.target.tagName) || '');
  });
  document.addEventListener('mousemove', function (e) {
    if (!armed) return;
    if (swipeMove(e.clientX, e.clientY) && dragging) {
      try { e.preventDefault(); } catch (eP) { }
    }
  });
  document.addEventListener('mouseup', function () { swipeEnd(); });
}
/* ===== 未起卦拨回（早期产物 L11398–L11414，`__xlrGateGuard`）===== */
function installGateGuard() {
  if (window.__xlrGateGuard) return;
  window.__xlrGateGuard = 1;
  var last = document.documentElement.getAttribute('data-step') || 'q';
  setInterval(function () {
    var k = document.documentElement.getAttribute('data-step') || 'q';
    if (k === last) return;
    if (!window.__ctx) {
      try {
        if (window.__xlrSetStep) window.__xlrSetStep('q');
        else document.documentElement.setAttribute('data-step', 'q');
      } catch (e) { }
      k = 'q';
    }
    last = k;
  }, 120);
}

/* ===== 未起卦手势吞掉（早期产物 L11423–L11450，`__xlrSwipeBlock`）===== */
function installSwipeBlock() {
  if (window.__xlrSwipeBlock) return;
  window.__xlrSwipeBlock = 1;
  var sx = 0, sy = 0, active = false, blocking = false;
  document.addEventListener('touchstart', function (e) {
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    sx = t.clientX; sy = t.clientY;
    active = (sx > 30);                       /* 左边缘留给抽屉 */
    blocking = false;
  }, true);
  document.addEventListener('touchmove', function (e) {
    if (!active) return;
    if (window.__ctx) { active = false; return; }
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    var dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
      blocking = true;
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }
  }, { capture: true, passive: false });
  document.addEventListener('touchend', function (e) {
    if (blocking) { e.stopPropagation(); }
    active = false; blocking = false;
  }, true);
}

/* ===== 触摸点序号兜底（早期产物 L11366–L11392，`__xlrStepTapTouch`）===== */
function installStepTapTouch() {
  if (window.__xlrStepTapTouch) return;
  window.__xlrStepTapTouch = 1;
  var _ts = null;
  document.addEventListener('touchstart', function (e) {
    var t = e.changedTouches && e.changedTouches[0];
    _ts = t ? { x: t.clientX, y: t.clientY } : null;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    var t = e.changedTouches && e.changedTouches[0];
    if (!t || !_ts) return;
    if (Math.abs(t.clientX - _ts.x) > 12 || Math.abs(t.clientY - _ts.y) > 12) return;
    var bar = document.querySelector('.vstep');
    if (!bar) return;
    var bs = bar.querySelectorAll('button[data-k]');
    for (var i = 0; i < bs.length; i++) {
      var r = bs[i].getBoundingClientRect();
      if (r.width === 0) continue;
      if (t.clientX < r.left || t.clientX > r.right || t.clientY < r.top || t.clientY > r.bottom) continue;
      for (var j = 0; j < bs.length; j++) { if (bs[j] !== bs[i]) bs[j].classList.remove('vfull'); }
      bs[i].classList.add('vfull');
      if (bar.__tapT) clearTimeout(bar.__tapT);
      bar.__tapT = setTimeout(function (el) { return function () { el.classList.remove('vfull'); }; }(bs[i]), 2000);
      return;
    }
  }, { passive: true });
}

/* ===== 左边缘划出抽屉 + 点面板外收起（源 L11014–L11069；现象：的「点空白缩不回去」就是这段）===== */
function initEdgeSwipe() {
  if (initEdgeSwipe.__done) return;
  initEdgeSwipe.__done = 1;
  var x0 = 0, y0 = 0, armed = false;
  var isOpen = function () { return document.documentElement.classList.contains('sdb-lock'); };
  document.addEventListener('touchstart', function (e) {
    armed = false;
    if (!e.touches || e.touches.length !== 1) return;
    var t = e.touches[0];
    x0 = t.clientX; y0 = t.clientY;
    /* ★★ 回归（口径：「我说的是在壹页右滑时，**要能**打开记录页」）：
       上一版我把「左边缘右滑开记录抽屉」当成 bug 摘掉了 —— 方向听反了，这里按原口径恢复：
       ① 抽屉开着 ⇒ 哪儿起手都能划回去收起；
       ② 关着 ⇒ **贴左边缘 30px 起手向右划**打开记录页。
       （`initStepSwipe` 里 `if (x <= 30) return;` 本来就把左边缘排除在切页手势外
         ⇒ 两个手势不会抢同一根手指。） */
    armed = isOpen() || x0 <= 30;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!armed) return;
    armed = false;
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    var dx = t.clientX - x0, dy = t.clientY - y0;
    if (Math.abs(dx) < 36 || Math.abs(dy) > Math.abs(dx)) return;
    if (!isOpen() && dx > 0) { try { window.sdbOpen('cases'); } catch (err) { } }
    else if (isOpen() && dx < 0) { try { window.sdbClose(); } catch (err) { } }
  }, { passive: true });
  document.addEventListener('click', function (e) {
    if (!isOpen()) return;
    var t = e.target;
    while (t && t !== document) {
      if (t.id === 'btnSum') { e.preventDefault(); e.stopPropagation(); try { window.sdbClose(); } catch (err) { } return; }
      t = t.parentNode;
    }
  }, true);
  document.addEventListener('click', function (e) {
    if (!isOpen()) return;
    var n = e.target;
    while (n && n !== document) {
      if (n.id === 'btnSum' || n.id === 'btnCases' || n.id === 'btnSdb') return;
      n = n.parentNode;
    }
    var pan = document.querySelector('#sdbCases') || document.querySelector('#sdb');
    if (pan) {
      var r = pan.getBoundingClientRect();
      if (e.clientX >= r.left - 6 && e.clientX <= r.right + 6 &&
          e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6) return;
    }
    try { window.sdbClose(); } catch (err) { }
  }, true);
}

/* ===== 进场（源 `modern.js` L1269–L1281）=====
 * 早期版本是**全局** `animateIn`：开屏收掉那一下由早期实现内联脚本 `try{ animateIn() }catch{ }` 调它
 * ⇒ `.left` 拿到 `.v-in`，播 `vIn`（0.42s 淡入上移）。
 * 本仓 变更记录 删段后那个全局没了，只剩那个 `try{...}catch{}` 的调用点 ⇒ **静默失败**
 * （实测：旧 `.left class="left v-in"` / `anim=vIn`；新 `.left class="left"` / `anim=none`）。
 * ⇒ 这里逐字搬回来，并在 install() 里挂回同名全局，让那个既有调用点重新起作用。 */
function animateIn() {
  var cur = StepCore.currentStep();
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

/* ===== 首启配置引导：等开屏真退场后再补一次 =====
   来源：旧 `apps/mobile-web/src/mobile-extra.html` L223–L238（**整段照抄**，旧注释原文：
   「★ 手机端应用本体：首启自动弹一次配置引导。应用自身在「开屏还在」时会跳过
     自动引导，这里等开屏真正退场后再补一次。」）
   ⚠ 为什么必须有：本仓 `Guide.maybeWelcome()` 只在 DCL+260ms 跑一次，那一刻开屏在场 ⇒
     守卫（`window.__xlrSplashOn || document.getElementById('xlrSplash')`）当场早退；
     **这条 300ms 轮询才是早期产物真正把引导弹出来的那条路**。不搬的后果（2026-10-15 实测）：
     用户点「进入」→ 开屏文字淡出 → 底下那层浅白引导面板（`#onbLayer.onb.guide.on`，bg
     rgb(244,244,245)）永不出现 ⇒ 就是「开屏页的文字和壹页的背景之间都没过渡」。
   逐字差异：无（变量名、300ms、tries>60 兜底都照旧）。 */
function installGuideRetry() {
  if (window.__xlrGuideRetry) return;
  window.__xlrGuideRetry = 1;
  var tries = 0;
  /* ★ 加固（2026-10-15 **非早期版本原样，已标注**）——早期版本这条闸只认「此刻有没有 #xlrSplash」，
     慢机上会踩空窗：实测（CPU 节流 6×）新载荷 t=797ms 时开屏**尚未建出**（页面上只有加密壳的
     `.boot.out`），t=1329ms 才建出 ⇒ 撞进 797–1329ms 这一拍就判定「开屏已退场」⇒ 抢先把引导层
     弹出来盖住开屏（用户真机报「开屏被自动跳过」）。
     加固①：**必须见过开屏**（出现过一次再等它消失）才允许弹引导。
     加固②（2026-10-17 更正）：**取消**。原来这里对
             「系统开了减弱动效 ⇒ legacy 不建开屏」的机器例外放行，结果是引导 300ms 后直接
             盖上来 —— 口径报「开屏动画不见了 + 还tm给我自动跳过开屏」。
             现在 `splashCore.buildSplash()` 在 reduce 下**照建开屏**（只是不播动画），
             所以「必须见过开屏」这条对 reduce 机器同样成立，不再需要例外。 */
  var seen = false;
  var iv = setInterval(function () {
    tries++;
    if (document.getElementById('xlrSplash')) { seen = true; return; }   /* 开屏还在 ⇒ 继续等 */
    if (!seen) return;                                                   /* ★ 加固：没见过开屏就别抢 */
    var seen2 = null;
    try { seen2 = localStorage.getItem('xlr-onboarded-2'); } catch (e) { }
    if (seen2) { clearInterval(iv); return; }                         /* 看过了 */
    var d = document.getElementById('onbLayer');
    if (window.__xlrGuideShow) { try { window.__xlrGuideShow(); } catch (e1) { } clearInterval(iv); return; }
    if (d) { d.classList.add('on'); document.documentElement.style.overflow = 'hidden'; clearInterval(iv); return; }
    if (tries > 60) { clearInterval(iv); }                           /* 兜底：约 18 秒后收手 */
  }, 300);
  return iv;
}

/* ===== 引导便利性：大图层补 ✕、引导卡底部补【我已知晓，跳过】 =====
   来源：旧 `apps/mobile-web/src/mobile-extra.html` L354–L379（**整段照抄**，旧注释原文：
   「★ 引导便利性：①大图层补 ✕ 关闭键 ②引导卡底部补【我已知晓，跳过】」）
   ⚠ 为什么必须有：新仓的引导卡是从**桌面端**那份 legacy（`36-script.txt`）提取的 ⇒ 少了手机端
     这两件便利件 ⇒ 实测引导卡比早期产物矮 61px（旧 `.card` 495px / 新 434px，缺 `.xlr-onb-done[47]`），
     相位锚点比对在卡下方两点上留着 18~21 的色差。CSS（`.onb .xlr-onb-done` / `.gzoom .xlr-zoom-x`）
     已在 legacy.css（块6）里，缺的只是这段 JS。
   逐字差异：无（400ms 轮询、文本、点击走"跳过"的逻辑都照旧）。 */
function installOnbExtras() {
  if (window.__xlrOnbExtras) return;
  window.__xlrOnbExtras = 1;
  setInterval(function () {
    var z = document.querySelector('.gzoom');
    if (z && !z.querySelector('.xlr-zoom-x')) {
      var x = document.createElement('button');
      x.type = 'button'; x.className = 'xlr-zoom-x';
      x.setAttribute('aria-label', '关闭');
      x.textContent = '✕';
      z.appendChild(x);                     /* 点它会冒泡到 .gzoom ⇒ 走应用自己的"点任意处关闭" */
    }
    var card = document.querySelector('.onb .card');
    if (card && (card.className.indexOf('on') !== -1 || document.querySelector('.onb.on')) && !card.querySelector('.xlr-onb-done')) {
      var d = document.createElement('button');
      d.type = 'button'; d.className = 'xlr-onb-done';
      d.textContent = '我已知晓，跳过';
      d.addEventListener('click', function () {
        var bs = document.querySelectorAll('.onb button'), i;
        for (i = 0; i < bs.length; i++) {
          if ((bs[i].textContent || '').trim() === '跳过') { bs[i].click(); return; }
        }
        var L = document.querySelector('#onbLayer,.onb');
        if (L) { L.classList.remove('on'); document.documentElement.style.overflow = ''; }
      });
      card.appendChild(d);
    }
  }, 400);
}

/* ===== 序号展开守卫（旧 `mobile-extra.html` L240–L262，**整段照抄**）=====
   旧注释原文：「★ 序号展开守卫（口径：「壹贰叁不支持点击展开完整标题了」）：
     样式表里的 !important 也压不住应用写在该元素上的行内样式，所以在 JS 层直接写值。
     只在 vfull 期间写、摘掉时清空，不影响正常状态。」
   ⚠ 不搬的后果：早期实现靠它把 `.vsl`（序号后的完整标题）在展开期间**按行内样式**顶开；
     新仓 `phoneStepSettle()` 会给按钮加 `.vfull`（同源），但没有这条写值 ⇒ 展开时
     标题可能仍被应用写的行内 `max-width:0` 压住。 */
function installStepVslGuard() {
  if (window.__xlrStepVslGuard) return;
  window.__xlrStepVslGuard = 1;
  setInterval(function () {
    var bar = document.querySelector('.vstep');
    if (!bar) return;
    var bs = bar.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) {
      var vsl = bs[i].querySelector('.vsl');
      if (!vsl) continue;
      if (bs[i].classList.contains('vfull')) {
        vsl.style.setProperty('max-width', '6em', 'important');
        vsl.style.setProperty('opacity', '1', 'important');
        vsl.style.setProperty('margin-left', '7px', 'important');
        vsl.style.setProperty('transform', 'none', 'important');
      } else if (vsl.style.getPropertyValue('max-width') === '6em') {
        vsl.style.removeProperty('max-width');
        vsl.style.removeProperty('opacity');
        vsl.style.removeProperty('margin-left');
        vsl.style.removeProperty('transform');
      }
    }
  }, 150);
}

/* ===== 自绘滚动条（2026-10-26 口径：：「侧边的滚动条，需要适配每个主题，并且有整体 UI 的设计风格，
   而不是默认条」）=====
   为什么必须自绘：安卓 WebView 的滚动条是 overlay（合成层）那条，`::-webkit-scrollbar` 在安卓上
   根本不吃样式 ⇒ 想让它跟皮肤/玻璃语言一致，只能把原生条藏掉、自己画一条。
   画法：一条 3px 圆角「墨条」，颜色取 `--ink`（九套皮肤各有各的墨色，**不用逐皮肤写死**），
   宽度/圆角对齐应用里的发丝线与玻璃胶囊口径；滚动时亮出来，停手 0.9 秒淡回去。
   容器清单按「真会滚的那几个」：叁页断辞卡 / 记录抽屉 / 设置页正文。 */
function initScrollHint() {
  if (window.__xlrScrollHint) return;
  window.__xlrScrollHint = 1;
  var HOSTS = ['#llmPane .llm-main', '.sdb-b', '.setbody'];
  var bar = document.createElement('div');
  bar.className = 'xlr-sb';
  bar.innerHTML = '<i class="xlr-sb-t"></i>';
  var thumb = bar.firstChild;
  try { document.body.appendChild(bar); } catch (eB) { return; }
  var host = null, hideT = 0, raf = 0;

  function visible(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 8) return false;
    /* ★ 必须真的在视口里：关着的抽屉/设置页 rect 仍在（只是移到屏幕外），
       只判 width/height 会把它们当成"可见" ⇒ 条跑到屏幕外、真正在滚的那个反而不显示。 */
    if (r.bottom <= 4 || r.top >= innerHeight - 4 || r.right <= 4 || r.left >= innerWidth - 4) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }
  function pick() {
    for (var i = 0; i < HOSTS.length; i++) {
      var el = document.querySelector(HOSTS[i]);
      if (visible(el) && el.scrollHeight - el.clientHeight > 4) return el;
    }
    return null;
  }
  function paint() {
    raf = 0;
    if (!visible(host)) { host = pick(); if (!host) { bar.style.opacity = '0'; return; } }
    var r = host.getBoundingClientRect();
    var pad = 4;
    var track = Math.max(24, r.height - pad * 2);
    var ratio = host.clientHeight / Math.max(1, host.scrollHeight);
    var th = Math.max(26, Math.round(track * ratio));
    var max = host.scrollHeight - host.clientHeight;
    var p = max > 0 ? host.scrollTop / max : 0;
    var top = r.top + pad + (track - th) * p;
    thumb.style.height = th + 'px';
    bar.style.transform = 'translate3d(' + Math.round(r.right - 5) + 'px,' + Math.round(top) + 'px,0)';
    bar.style.opacity = '1';
  }
  function show(el) {
    if (el) host = el;
    if (!host) host = pick();
    if (!host) return;
    if (!raf) raf = requestAnimationFrame(paint);
    clearTimeout(hideT);
    hideT = setTimeout(function () { bar.style.opacity = '0'; host = null; }, 900);
  }
  document.addEventListener('scroll', function (e) {
    var t = e.target;
    if (!t || t === document || t === document.documentElement || t === document.body) return;
    for (var i = 0; i < HOSTS.length; i++) { if (t.matches && t.matches(HOSTS[i])) { show(t); return; } }
  }, { passive: true, capture: true });
  /* 断辞是流式写进 #doc 的：内容一变、长度就变，正在显示时跟着重画 */
  try {
    new MutationObserver(function () { if (bar.style.opacity === '1') { host = pick(); if (host) show(host); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  } catch (eM) { }
  /* 换页 / 抽屉收起 / 设置页关掉：容器被藏了就重新挑 */
  setInterval(function () { if (bar.style.opacity === '1' && !visible(host)) { host = pick(); if (host) show(host); else bar.style.opacity = '0'; } }, 500);
  window.__xlrScrollHintPaint = function () { var h = pick(); if (h) show(h); };
}

/* ===== 窗口自适应（2026-10-26 口径：：「你说的自适应任何窗口吗」）=====
   叁页那张卡的高度**不能写死**。以前是 `calc(100dvh - 214px)` —— 214 是照 390×844 这台机器
   量出来的（顶栏 115 + 卡下依据条 56 + 呼吸 43），换个窗口尺寸/换台机器就对不上：
   要么卡太大把按钮顶下去，要么留一大块空白。
   ⇒ 这里实测「卡片顶边 + 卡下那条断卦依据的实际高度」，把可用高写进 `--xlr-jie-h`，
     换页、窗口 resize、地址栏收放都会重算。 */
function layoutJie() {
  var pane = document.getElementById('llmPane');
  if (!pane || !pane.getClientRects || !pane.getClientRects().length) return;
  var top = pane.getBoundingClientRect().top;
  var evi = document.querySelector('.right > .pane:not(.gua):not(.llm)');
  var eviH = 0;
  if (evi && evi.getClientRects().length) eviH = evi.getBoundingClientRect().height + 8;
  var avail = Math.round(window.innerHeight - top - eviH - 10);
  if (!(avail > 180) || avail > window.innerHeight) avail = Math.round(window.innerHeight * 0.62);
  document.documentElement.style.setProperty('--xlr-jie-h', avail + 'px');
}

/* ===== 一次性入场（2026-10-26 口径：：「滑到壹页之后整个页面都会刷新一下 / 叁页往右滑松手也刷新一下」）=====
   现象的两个来源（都在「同一块内容第二次显示」时重播）：
     ① `.pane.gua / .pane.llm` 的 `animation:xaFocus`（opacity .35 + blur 7px → 清）—— display:none→block 就重播；
     ② 贰页掌诀盘 `#walk.ring` 的 `ringIn`（scale .94 → 1）—— 这就是「好像还会放大」。
   ⛔ 不在 CSS 里按 `html[data-swipedir]` 压：属性摘掉后动画会当场重开播（实测 800ms 又变回 xaFocus）。
   ✅ 改成 JS：**每个元素第一次显示照播（起卦进入贰/叁的那一下保留），播完就把行内 animation 封成 none**
      ⇒ 之后无论点是滑进、都是直接落位，不再闪、不再放大。 */
function animPlayOnce() {
  /* 用 rAF 推到下一帧再量：MutationObserver 回调那一刻样式还没重算，
     getAnimations() 会返回空数组 ⇒ 会把「第一次该播的入场」也一起封死（实测就是这样）。 */
  requestAnimationFrame(function () {
    /* ⚠ 这张名单要覆盖**所有会随 display 重播动画**的块，漏一个就还抖：
       · `.left > .pane`（壹页的起卦卡）——  `.left>.pane,.right>.pane{animation:mRise}`，
         `mRise` 带 `translateY(10px)→0` ⇒ 现象：的「整页上下抖一下」就是这 10px（实测逐帧 10.0px）；
       · `.right > .pane`（贰/叁页，含 xaFocus 模糊转清）；
       · `#walk`（贰页掌诀盘 ringIn：scale(.94)→1，＝「好像还会放大」）。 */
    var list = [].slice.call(document.querySelectorAll('.left > .pane, .right > .pane, #walk'));
    for (var i = 0; i < list.length; i++) {
      (function (el) {
        if (!el || el.__xlrAnimLocked) return;
        if (!el.getClientRects().length) return;          /* 这一页现在没显示 ⇒ 下次真显示时再判 */
        if (el.__xlrAnimSeen) { el.style.animation = 'none'; el.__xlrAnimLocked = 1; return; }
        el.__xlrAnimSeen = 1;
        var anims = (el.getAnimations ? el.getAnimations() : []) || [];
        if (!anims.length) { el.style.animation = 'none'; el.__xlrAnimLocked = 1; return; }
        var left = anims.length;
        anims.forEach(function (a) {
          a.finished.then(function () { }, function () { }).then(function () {
            left--;
            if (left <= 0) { el.style.animation = 'none'; el.__xlrAnimLocked = 1; }
          });
        });
      })(list[i]);
    }
  });
}

/* ===== 装配（早期实现 ready() L10996–L11006 那一串的等价物）===== */
export const PhoneAnim = {
  syncPhoneStep: syncPhoneStep,
  phoneStepSettle: phoneStepSettle,
  stepCollapseAll: stepCollapseAll,
  alignStepBar: alignStepBar,
  initStepSwipe: initStepSwipe,
  initEdgeSwipe: initEdgeSwipe,
  initScrollHint: initScrollHint,
  layoutJie: layoutJie,
  animateIn: animateIn,
  installGuideRetry: installGuideRetry,

  install: function () {
    var ev = { bar: !!stepBar(), wired: [], hooks: [], error: null };
    try { initEdgeSwipe(); ev.wired.push('edgeSwipe'); } catch (e1) { ev.error = String((e1 && e1.message) || e1); }
    try { initStepSwipe(); ev.wired.push('stepSwipe'); } catch (e2) { if (!ev.error) ev.error = String((e2 && e2.message) || e2); }
    try { stepTapWire(); ev.wired.push('tap'); } catch (e3) { }
    try { stepScrollWire(); ev.wired.push('scrollFade'); } catch (e4) { }
    try { installGateGuard(); ev.wired.push('gateGuard'); } catch (e5) { }
    try { installSwipeBlock(); ev.wired.push('swipeBlock'); } catch (e6) { }
    try { installStepTapTouch(); ev.wired.push('tapTouch'); } catch (e7) { }
    /* ★ 首启引导的"等开屏退场后再补一次"（早期 mobile-extra.html L223–238 整段照抄） */
    try { installGuideRetry(); ev.wired.push('guideRetry'); } catch (e11) { }
    /* ★ 序号展开守卫（早期 mobile-extra.html L240–262 整段照抄 —— `.vsl` 行内写值） */
    try { installStepVslGuard(); ev.wired.push('stepVslGuard'); } catch (e13) { }
    /* ★ 自绘滚动条（原生条在安卓上没法上样式 ⇒ 藏掉原生、自己画一条跟皮肤的） */
    try { initScrollHint(); ev.wired.push('scrollHint'); } catch (e14) { }
    /* ★ 引导便利件（✕ / 我已知晓，跳过；早期 mobile-extra.html L354–L379 整段照抄） */
    try { installOnbExtras(); ev.wired.push('onbExtras'); } catch (e12) { }
    /* 换步那一拍（源在 setStep 尾部；本仓 setStep 在生成物里、那两处是空实现 ⇒ 这里等价补上） */
    try {
      var last = document.documentElement.getAttribute('data-step') || 'q';
      new MutationObserver(function () {
        var k = document.documentElement.getAttribute('data-step') || 'q';
        try { syncPhoneStep(); } catch (eA) { }
        try { if (k !== last) phoneStepSettle(k); } catch (eB) { }
        /* ★★ 切页后按**新页的真实滚动位置**把滚动渐隐复位。
           否则：在贰页往下读（条淡成 0）→ 切回壹页（壹页本来就滚不动）⇒ 没人再发 scroll
           ⇒ 条永远不回来（现象：的「有时候不显示」有这一条）。 */
        try { stepBarScrollFade(mainScrollTop()); } catch (eC2) { }
        /* ★ 换页不重播 xaFocus / 掌诀盘放大（同一页第一次出现照播，之后封死） */
        try { animPlayOnce(); } catch (eA3) { }
        /* ★ 换页后让自绘滚动条亮一下（0.9s 后自己淡）——
           否则断辞卡刚出现、手指还没动，用户会以为「没有滚动条」。 */
        try { window.__xlrScrollHintPaint && window.__xlrScrollHintPaint(); } catch (eH0) { }
        /* ★ 叁页卡高按实际窗口算（不写死魔法数） */
        try { requestAnimationFrame(layoutJie); } catch (eL0) { }
        last = k;
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-step'] });
      ev.wired.push('stepObserver');
    } catch (e8) { }
    try { syncPhoneStep(); } catch (e9) { }
    /* ★ 开屏底下第一次显示的那一页也要封（否则「起卦后第一次滑回壹页」还会抖一次） */
    setTimeout(function () { try { animPlayOnce(); } catch (eA4) { } }, 800);
    setTimeout(function () { try { animPlayOnce(); } catch (eA5) { } }, 2000);
    /* ★ 窗口尺寸变了就重算叁页卡高（resize / 手机地址栏收放 / 分屏） */
    try {
      var reLay = function () { try { layoutJie(); } catch (eL1) { } };
      window.addEventListener('resize', reLay, { passive: true });
      if (window.visualViewport) window.visualViewport.addEventListener('resize', reLay, { passive: true });
      setTimeout(reLay, 600);
      ev.wired.push('layoutJie');
    } catch (eL2) { }
    /* 调试钩子（早期实现同名，验收脚本要读） */
    try {
      window.__xlrSetStep = StepCore.setStep;
      window.__xlrPhoneStepSettle = phoneStepSettle;
      window.__xlrSyncPhone = syncPhoneStep;
      window.__xlrAlignStepBar = alignStepBar;
      /* ★ `animateIn` 也挂回**同名全局** —— 开屏收掉那一下的既有调用
         （splash 内联脚本里的 `try{ animateIn() }catch{ }`）读的就是这个名字；
         不挂回 ⇒ 它静默失败 ⇒ 主界面不播 `vIn` 进场（用户看到的「动画不一致」）。 */
      window.animateIn = animateIn;
      ev.hooks = ['__xlrSetStep', '__xlrPhoneStepSettle', '__xlrSyncPhone', '__xlrAlignStepBar', 'animateIn'];
    } catch (e10) { }
    return ev;
  },

  /** 只读快照，供判据取证 */
  state: function () {
    var bar = stepBar();
    var vis = [];
    if (bar) [].forEach.call(bar.querySelectorAll('button[data-k]'), function (b) {
      var r = b.getBoundingClientRect();
      vis.push({ k: b.getAttribute('data-k'), display: getComputedStyle(b).display, vfull: b.classList.contains('vfull'),
                 glyph: (b.querySelector('i') || {}).textContent || null, box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] });
    });
    return {
      step: StepCore.currentStep ? StepCore.currentStep() : null,
      swipeDir: document.documentElement.getAttribute('data-swipedir'),
      barOpacity: bar ? bar.style.opacity : null,
      barTransform: bar ? bar.style.transform : null,
      btns: vis,
      flags: { gateGuard: !!window.__xlrGateGuard, swipeBlock: !!window.__xlrSwipeBlock, tapTouch: !!window.__xlrStepTapTouch },
    };
  },
};
