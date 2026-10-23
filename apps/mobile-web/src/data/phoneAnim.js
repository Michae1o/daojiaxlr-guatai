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
 *   ① `narrowPhone()` ⇒ 常量 true。上游构建手机产物时把 `matchMedia` 固化成 `({matches:true})`，
 *      宽屏那一支在手机上永不执行 ⇒ 不搬。
 *   ② 第 ① 条的连带：源里 `stepSwipeBlocked()` 的「非窄屏 ⇒ 拦」在手机端恒为 false ⇒ 只留后面三条判定。
 *   ③ `syncPhoneStep()` 里那记 `markVisited(cur)` **不搬** —— 本仓 `StepCore.setStep()` 已自己 mark（L401）。
 *   ④ 调用点改挂 **MutationObserver(html[data-step])**：本仓 `setStep` 在生成物 `stepCore.js` 里、
 *      它内部把 `syncPhoneStep/phoneStepSettle` 绑成了**桌面空实现**（L54–56，那个文件由工具生成，不要手改）
 *      ⇒ 等价做法＝在外面盯 `data-step`，变化时补这两拍（源里那条自愈观察者本来就是这么干的，见 L1568–L1571）。
 *   ⑤ `#sdb` 的开合走 `window.sdbOpen/sdbClose`（源里就是），本仓若没挂这两个全局则整段 inert（try/catch 保住）。
 *
 *   `styles/legacy.css` 被 manifest 记整份 sha16 ⇒ 改它链会拒装。
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
  /* ★★ 2026-10-17 改（现象：「步进条有时候不显示，有时候位置不一样」）：
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
/* ★★ 2026-10-17 新增（现象：「步进条有时候不显示」）：
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
  var x0 = 0, y0 = 0, armed = false, dragging = false, dir = 0, prog = 0, tgt = null, cur = null, gentle = false;
  var SWIPE_MIN = 110;
  var DRAW = 4;
  /*
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
    for (var i = 0; i < pageEls.length; i++) {
      pageEls[i].classList.add('swipe-follow');
      pageEls[i].style.setProperty('--swx', out.toFixed(1) + 'px');
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
          el.style.removeProperty('--swx'); el.style.removeProperty('--swo');
          setTimeout(function () { el.classList.remove('swipe-back'); el.style.removeProperty('--swback'); }, sec * 1000 + 80);
        } else {
          el.classList.remove('swipe-follow', 'swipe-back');
          el.style.removeProperty('--swx'); el.style.removeProperty('--swo'); el.style.removeProperty('--swback');
        }
      })(pageEls[i]);
    }
    pageEls = [];
  }
  function swipeStart(x, y, tag) {
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
      /* ★ 2026-10-17：到头不放弃手势，改走「阻尼跟手 + 松手回弹」（gentle） */
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
    if (!armed) return;
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
    followClear(!commit, p);
    if (commit) {
      try { document.documentElement.setAttribute('data-swipedir', d > 0 ? 'l' : 'r'); } catch (e0) { }
      try { StepCore.setStep(toK); } catch (eC) { }
      /*
         滑切的「新页从滑动方向滑进来」是靠 `html[data-swipedir] .v-in` 挑的 ——
         而 `.v-in` 只在 `animateIn()` 里加（源里挂在 setStep 尾部；本仓 setStep 在生成物里、
         那两处是空实现）⇒ 之前滑动提交其实**从未**进过这条动画（实测新页 animation 是 xaFocus）。
         这里补上：先 setStep 再 animateIn，data-swipedir 在场 ⇒ 走 xlrSlideInL/R。 */
      try { animateIn(); } catch (eA2) { }
      try { if (StepCore.currentStep() === toK) phoneStepSettle(toK); } catch (eD) { }
      setTimeout(function () {
        try { document.documentElement.removeAttribute('data-swipedir'); } catch (e1) { }
      }, 700);
    } else {
      stepSetGlyph(fromK, stepGlyph(fromK));
      try { syncPhoneStep(); } catch (eB) { }
    }
  }
  document.addEventListener('touchstart', function (e) {
    if (!e.touches || e.touches.length !== 1) { armed = false; return; }
    var t = e.touches[0];
    swipeStart(t.clientX, t.clientY, (e.target && e.target.tagName) || '');
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    var t = e.touches && e.touches[0];
    if (t) swipeMove(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchend', function () { swipeEnd(); }, { passive: true });
  document.addEventListener('touchcancel', function () { armed = false; }, { passive: true });
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
    /* ★★ 2026-10-17 回归（用户逐字：「我说的是在壹页右滑时，**要能**打开记录页」）：
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
 * 早前的版本是**全局** `animateIn`：开屏收掉那一下由早期实现内联脚本 `try{ animateIn() }catch{ }` 调它
 * ⇒ `.left` 拿到 `.v-in`，播 `vIn`（0.42s 淡入上移）。
 * 本仓  删段后那个全局没了，只剩那个 `try{...}catch{}` 的调用点 ⇒ **静默失败**
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
   「★ 2026-10-10 手机端应用本体：首启自动弹一次配置引导。应用自身在「开屏还在」时会跳过
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
  /* ★ 加固（2026-10-15 **非早前的版本原样，已标注**）——早前的版本这条闸只认「此刻有没有 #xlrSplash」，
     慢机上会踩空窗：实测（CPU 节流 6×）新载荷 t=797ms 时开屏**尚未建出**（页面上只有加密壳的
     `.boot.out`），t=1329ms 才建出 ⇒ 撞进 797–1329ms 这一拍就判定「开屏已退场」⇒ 抢先把引导层
     弹出来盖住开屏（用户真机报「开屏被自动跳过」）。
     加固①：**必须见过开屏**（出现过一次再等它消失）才允许弹引导。
     加固②（2026-10-17 更正）：**取消**。原来这里对
             「系统开了减弱动效 ⇒ legacy 不建开屏」的机器例外放行，结果是引导 300ms 后直接
             盖上来 —— 用户逐字报「开屏动画不见了 + 还tm给我自动跳过开屏」。
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
   「★ 2026-10-10 引导便利性：①大图层补 ✕ 关闭键 ②引导卡底部补【我已知晓，跳过】」）
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

/* ===== 装配（早期实现 ready() L10996–L11006 那一串的等价物）===== */
export const PhoneAnim = {
  syncPhoneStep: syncPhoneStep,
  phoneStepSettle: phoneStepSettle,
  stepCollapseAll: stepCollapseAll,
  alignStepBar: alignStepBar,
  initStepSwipe: initStepSwipe,
  initEdgeSwipe: initEdgeSwipe,
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
    /* ★ 2026-10-15：首启引导的"等开屏退场后再补一次"（早期 mobile-extra.html L223–238 整段照抄） */
    try { installGuideRetry(); ev.wired.push('guideRetry'); } catch (e11) { }
    /* ★ 2026-10-16：序号展开守卫（早期 mobile-extra.html L240–262 整段照抄 —— `.vsl` 行内写值） */
    try { installStepVslGuard(); ev.wired.push('stepVslGuard'); } catch (e13) { }
    /* ★ 2026-10-15：引导便利件（✕ / 我已知晓，跳过；早期 mobile-extra.html L354–L379 整段照抄） */
    try { installOnbExtras(); ev.wired.push('onbExtras'); } catch (e12) { }
    /* 换步那一拍（源在 setStep 尾部；本仓 setStep 在生成物里、那两处是空实现 ⇒ 这里等价补上） */
    try {
      var last = document.documentElement.getAttribute('data-step') || 'q';
      new MutationObserver(function () {
        var k = document.documentElement.getAttribute('data-step') || 'q';
        try { syncPhoneStep(); } catch (eA) { }
        try { if (k !== last) phoneStepSettle(k); } catch (eB) { }
        /* ★★ 2026-10-17：切页后按**新页的真实滚动位置**把滚动渐隐复位。
           否则：在贰页往下读（条淡成 0）→ 切回壹页（壹页本来就滚不动）⇒ 没人再发 scroll
           ⇒ 条永远不回来（现象：的「有时候不显示」有这一条）。 */
        try { stepBarScrollFade(mainScrollTop()); } catch (eC2) { }
        last = k;
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-step'] });
      ev.wired.push('stepObserver');
    } catch (e8) { }
    try { syncPhoneStep(); } catch (e9) { }
    /* */
    try {
      window.__xlrSetStep = StepCore.setStep;
      window.__xlrPhoneStepSettle = phoneStepSettle;
      window.__xlrSyncPhone = syncPhoneStep;
      window.__xlrAlignStepBar = alignStepBar;
      /* ★ 2026-10-15：`animateIn` 也挂回**同名全局** —— 开屏收掉那一下的既有调用
         （splash 内联脚本里的 `try{ animateIn() }catch{ }`）读的就是这个名字；
         不挂回 ⇒ 它静默失败 ⇒ 主界面不播 `vIn` 进场（用户看到的「动画不一致」）。 */
      window.animateIn = animateIn;
      ev.hooks = ['__xlrSetStep', '__xlrPhoneStepSettle', '__xlrSyncPhone', '__xlrAlignStepBar', 'animateIn'];
    } catch (e10) { }
    return ev;
  },

  /* */
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
