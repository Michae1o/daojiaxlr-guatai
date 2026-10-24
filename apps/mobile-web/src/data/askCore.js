/*
   规矩：**提取不重写** —— 下面每一段都是从源文件**逐字节切片**搬过来的原文；工具每次运行都会
      ；本文件只给 DOM 取值的薄包装。
   ⚠ 提取出来的正文引用 `h1/h2/mNum/mTime/mClock` 这几个自由变量（源里是全局）⇒ 由 bind() 注入。
   源 sha16 = 601f0a75442e2beb
*/
/* eslint-disable */
import { zhi, clockNums, normalizeNums, numsFilled } from '@xlr/shared-judgment';

/* 自由变量（源里是 18-script 的顶层 var ⇒ 全局；这里由组件通过 bind() 注入自己的节点）：
   h1/h2 = 两个起卦时辰 <select>；mNum/mTime/mClock = 三个方式按钮。 */
let h1 = null, h2 = null, mNum = null, mTime = null, mClock = null;
export function bind(nodes) {
  h1 = nodes.h1 || null; h2 = nodes.h2 || null;
  mNum = nodes.mNum || null; mTime = nodes.mTime || null; mClock = nodes.mClock || null;
}

/* */
export function numVals() {
  return normalizeNums([1, 2, 3].map(function (i) {
    const el = document.getElementById('n' + i);
    return el ? el.value : '';
  }));
}
/* 同族：源里 numsFilled() 读 DOM；判据包里是 numsFilled(vals) */
export function numsFilledDom() {
  return numsFilled([1, 2, 3].map(function (i) {
    const el = document.getElementById('n' + i);
    return el ? el.value : '';
  }));
}

var GREET_TIME = {
  morn: ['早上好，有什么疑问？', '一日之始，想问什么？'],
  noon: ['午后无事，问点什么？', '这会儿来问卦，正是时候。'],
  eve: ['入夜了，想问什么？', '夜色已深，把疑问交给卦台。'],
  night: ['夜里还没睡？那就问吧。', '深夜一问，卦台在听。']
};
var GREET_Z2 = ['卦可通神，请讲。', '一事一卦，心诚则灵。', '心动即卦——你要问什么？',
  '六宫在侧，静候一问。', '把疑问写下来，卦台替你问。', '嘘——六宫已列，说吧。'];
function greetSeg(h) {
  return h < 5 ? 'night' : h < 11 ? 'morn' : h < 17 ? 'noon' : h < 23 ? 'eve' : 'night';
}
function pickGreet(h, r1, r2) {
  var seg = greetSeg(typeof h === 'number' ? h : (new Date()).getHours());
  var t = GREET_TIME[seg];
  var i1 = typeof r1 === 'number' ? r1 : Math.random();
  var i2 = typeof r2 === 'number' ? r2 : Math.random();
  var main = t[Math.min(t.length - 1, Math.floor(i1 * t.length))];
  var sub = GREET_Z2[Math.min(GREET_Z2.length - 1, Math.floor(i2 * GREET_Z2.length))];
  if (sub === main) sub = GREET_Z2[(GREET_Z2.indexOf(sub) + 1) % GREET_Z2.length];
  return { main: main, sub: sub };
}
function renderGreet() {
  var g = pickGreet();
  var a = document.getElementById('greet'), b = document.getElementById('greetSub');
  if (a) a.textContent = g.main;
  if (b) b.textContent = g.sub;
  return g;
}
function refreshClock() {
  var t = clockNums(), p = function (x) { return (x < 10 ? '0' : '') + x; };
  /* ★ 手改过就不再被时钟覆盖（收起九数、或换起卦方式即恢复自动） */
  if (!window.__numManual) {
    for (var i = 1; i <= 3; i++) { document.getElementById('n' + i).value = String(t.nums[i - 1]); }
  }
  var cfAuto = document.getElementById('castFields');
  if (cfAuto) cfAuto.classList.toggle('auto', !window.__numManual);
  var mini = document.getElementById('castMini');
  if (!mini) return;
  var preT = window.__numManual ? '手动取数：按 ' : '时间取数：现在是 ';
  var midT = window.__numManual ? numVals().join(' / ') : (t.hh + ':' + p(t.mm));
  var postT = window.__numManual
    ? ' 起卦 · ' + zhi[t.zi - 1] + '时（收起九数就回到自动）'
    : ' ⇒ 按 ' + t.nums.join(' / ') + ' 起卦 · ' + zhi[t.zi - 1] + '时（软件自动读取，起卦以当时为准）';
  /*
     真因就是这两行老代码——每次刷新都用 innerHTML **整块重写**，里面的 <b>（时刻）被销毁重建，
     所以每 2 秒就闪一次。改成**原地更新文本节点**：结构只建一次，之后只改 nodeValue/textContent。 */
  var kn = mini.childNodes, n1 = kn[0], nb = kn[1], n3 = kn[2];
  if (!n1 || n1.nodeType !== 3 || !nb || nb.nodeName !== 'B' || !n3 || n3.nodeType !== 3) {
    mini.innerHTML = '';
    mini.appendChild(document.createTextNode(preT));
    nb = document.createElement('b'); mini.appendChild(nb);
    mini.appendChild(document.createTextNode(postT));
  } else {
    if (n1.nodeValue !== preT) n1.nodeValue = preT;
    if (n3.nodeValue !== postT) n3.nodeValue = postT;
  }
  if (nb.textContent !== midT) nb.textContent = midT;
  syncCastLabel();
}
function castOpen() {
  var f = document.getElementById('castFields');
  return !!(f && !f.classList.contains('off'));
}
function setCastOpen(v) {
  var f = document.getElementById('castFields'), b = document.getElementById('castToggle');
  if (!f) return;
  if (v) f.classList.remove('off'); else f.classList.add('off');
  /*
     #castPanel（modern.js 的 buildCastPanel），开关要一并带上它。 */
  var p = document.getElementById('castPanel');
  if (p) { if (v) p.classList.remove('off'); else p.classList.add('off'); }
  if (b) b.setAttribute('aria-expanded', v ? 'true' : 'false');
  if (!v && (window.__mode || 'clock') === 'clock') { window.__numManual = false; refreshClock(); }
  syncCastLabel();
}
function syncCastLabel() {
  var b = document.getElementById('castToggle');
  if (!b) return;
  var auto = !window.__numManual && (window.__mode || 'clock') === 'clock';
  b.textContent = '详情';
}
function stashNum() {
  window.__numStash = [document.getElementById('n1').value, document.getElementById('n2').value, document.getElementById('n3').value];
}
function restoreNum() {
  var s = window.__numStash;
  for (var i = 1; i <= 3; i++) { var el = document.getElementById('n' + i); el.readOnly = false; el.value = s ? s[i - 1] : ''; }
}
function setMode(m) {
  var prev = window.__mode || 'clock';
  if (prev === 'num' && m !== 'num') stashNum();
  if (prev !== 'num' && m === 'num') restoreNum();
  window.__mode = m;
  mNum.setAttribute('aria-pressed', m === 'num' ? 'true' : 'false');
  mTime.setAttribute('aria-pressed', m === 'time' ? 'true' : 'false');
  mClock.setAttribute('aria-pressed', m === 'clock' ? 'true' : 'false');
  document.getElementById('rowNum').hidden = m === 'time';
  document.getElementById('rowTime').hidden = m !== 'time';
  document.getElementById('h2').hidden = m !== 'num';
  document.getElementById('h1').hidden = m !== 'time';
  document.querySelector('.rowh').hidden = (m === 'clock');
  var lb = document.getElementById('castLb'), mini = document.getElementById('castMini');
  if (m === 'num') {
    lb.setAttribute('for', 'n1'); lb.textContent = '随口报三个数（1–9，可重复）· 起卦时辰';
    mini.innerHTML = '<b>报完不要改</b>；报了 0 当 10 取，报了两位数也不重报。记得选起卦时辰。';
  } else if (m === 'time') {
    lb.setAttribute('for', 'dt'); lb.textContent = '日期（公历，自动换算农历）· 起卦时辰';
    mini.innerHTML = '测比赛、考试、事故等<b>有明确官方时间</b>的事，把日期填成事件发生的时间再起卦。';
  } else {
    lb.setAttribute('for', 'n1'); lb.textContent = '当前时间自动取数（时 · 分十位 · 分个位）';
    refreshClock();
  }
  document.getElementById('modeHint').textContent = m === 'num' ? '报数' : (m === 'time' ? '月日时' : '时间取数');
  /* ★ 离开「时间取数」就清掉手改标记；九数默认撑开状态跟着方式走
     （时间取数是自动取数 ⇒ 默认收起；报数 / 月日时必须填 ⇒ 默认展开）。 */
  if (m !== 'clock') window.__numManual = false;
  /* */
  setCastOpen(m === 'num');
  var cfM = document.getElementById('castFields');
  if (cfM) cfM.classList.toggle('auto', m === 'clock' && !window.__numManual);
}
function showErr(m) {
  var e = document.getElementById('err');
  e.textContent = m; e.className = 'err on';
}
function clearErr() { document.getElementById('err').className = 'err'; }

export const AskCore = {
  bind, numVals, numsFilledDom,
  GREET_TIME, GREET_Z2, greetSeg, pickGreet, renderGreet,
  refreshClock, castOpen, setCastOpen, syncCastLabel, stashNum, restoreNum, setMode, showErr, clearErr,
};
