/* askCore.js —— 由脚本生成（S3b/批 A）
   来源：apps/desktop-web/src/legacy/parts/18-script.txt（「壹·问卦页」那一段）
   生成：node tools/extract-ask-core.mjs
   规矩：**原样搬运** —— 下面每一段都是从源文件**逐字节搬运**搬过来的原文；工具每次运行都会
        逐字核对「产物文本 == 源切片」。改行为要改 legacy 源再重跑本工具（S3b 删段后本文件升为真源）。
   ⛔ 判据域函数（clockNums / numVals 的算式 / numsFilled）**不在这里**：一律 import 自 @xlr/shared-judgment
      （内部约定 原记录 + 链第 1 步 R4 守门人）；本文件只给 DOM 取值的薄包装。
   ⚠ 提取出来的正文引用 `h1/h2/mNum/mTime/mClock` 这几个自由变量（源里是全局）⇒ 由 bind() 注入。
   
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

/* 薄包装：源里是 numVals()（读 DOM）；算式本体在判据包 normalizeNums（R4 不许复制） */
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

/* 问候语（2026-11-02 从安卓端 YiPage.kt 移植）：
   安卓那一版按「十二时辰」抽本名/别名造句，副句从 GREET_Z2 里抽；一次进程只抽一次
   （重组/翻页回来不换句）。这里逐字搬过来，只把「按逗号断成两行」改回单行 ——
   PC 的问卦列够宽（28px × 9~13 字放得下），断行会把输入卡整体下推、破坏原有构图。 */
var SHICHEN = [
  { n: '夜半', a: ['子夜', '夜分', '中夜', '未旦', '宵分'] },                                     // 子 23–01
  { n: '鸡鸣', a: ['荒鸡'] },                                                                     // 丑 01–03
  { n: '平旦', a: ['平明', '旦明', '黎明', '早旦', '日旦', '昧旦', '早晨', '早朝', '昧爽', '旦日', '旦时'] }, // 寅 03–05
  { n: '日出', a: ['日上', '日生', '日始', '日晞', '旭日', '破晓'] },                              // 卯 05–07
  { n: '食时', a: ['早食', '宴食', '蚤食'] },                                                     // 辰 07–09
  { n: '隅中', a: ['日禺', '禺中'] },                                                             // 巳 09–11
  { n: '日中', a: ['日正', '日午', '日高', '正午', '亭午', '日当午'] },                           // 午 11–13
  { n: '日昳', a: ['日昃', '日仄', '日侧', '日跌', '日斜'] },                                     // 未 13–15
  { n: '晡时', a: ['馎时', '日馎', '日稷', '夕食'] },                                             // 申 15–17
  { n: '日入', a: ['日没', '日沉', '日西', '日落', '日逝', '日晏', '日旰', '日晦', '傍晚'] },       // 酉 17–19
  { n: '黄昏', a: ['日夕', '日末', '日暮', '日晚', '日闇', '日堕', '日曛', '曛黄'] },              // 戌 19–21
  { n: '人定', a: ['定昏', '夤夜'] },                                                             // 亥 21–23
];
/* 当前小时落在哪个时辰（子=23~1 起算，每两小时一个） */
function zcOf(hour) { return SHICHEN[(Math.floor((hour + 1) / 2)) % 12]; }

var GREET_TPL = [
  '{w}时分，想问什么？',
  '此刻正是{w}，问一句吧。',
  '{w}，心里那件事说清楚。',
  '{w}，一事一卦，心诚则灵。',
  '{w}未过，正好问一句。',
  '{w}，把疑问写下来。',
  '正是{w}，想求个准话？',
];
/* 本名与所有别名里随机取一个，套随机模板 ⇒ 同一个时辰每次进 app 也不同 */
function greetLine(hour) {
  var z = zcOf(hour);
  var pool = [z.n].concat(z.a);
  var w = pool[Math.floor(Math.random() * pool.length)];
  var tpl = GREET_TPL[Math.floor(Math.random() * GREET_TPL.length)];
  return tpl.replace('{w}', w);
}
var GREET_Z2 = ['卦可通神，请讲。', '一事一卦，心诚则灵。', '心动即卦——你要问什么？',
  '六宫在侧，静候一问。', '把疑问写下来，卦台替你问。', '嘘——六宫已列，说吧。'];
/* 一次进程只抽一次（与安卓端 GREET_ONCE 同口径） */
var GREET_ONCE = null;
function greet() {
  if (GREET_ONCE) return GREET_ONCE;
  var sub = GREET_Z2[Math.floor(Math.random() * GREET_Z2.length)];
  GREET_ONCE = { main: greetLine((new Date()).getHours()), sub: sub };
  return GREET_ONCE;
}
function renderGreet() {
  var g = greet();
  var a = document.getElementById('greet'), b = document.getElementById('greetSub');
  if (a) a.textContent = g.main;
  if (b) b.textContent = g.sub;
  return g;
}
function refreshClock() {
  var t = clockNums(), p = function (x) { return (x < 10 ? '0' : '') + x; };
  /* 手改过就不再被时钟覆盖（收起九数、或换起卦方式即恢复自动） */
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
  /* 口径：（2026-10-09）：「一切动画结束、其他元素浮现完毕之后，方框内还是会闪一下变成空再恢复」。
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
  /* （口径：·详情位置要固定）：数字那一块被覆盖层搬到了「框下面」的
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
  /* 离开「时间取数」就清掉手改标记；九数默认撑开状态跟着方式走
     （时间取数是自动取数 ⇒ 默认收起；报数 / 月日时必须填 ⇒ 默认展开）。 */
  if (m !== 'clock') window.__numManual = false;
  /* 「起卦方式点到月日时，不用自动跳出来详情，到报数才用」。
     （口径：）：「一旦点开详情，除非手动再点详情，就不要再自动收回 —— 哪怕切换取数方式」
     ⇒ 只在切到「报数」时自动展开；切到时间取数 / 月日时**不动**。 */
  if (m === 'num') setCastOpen(true);
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
  SHICHEN, GREET_TPL, GREET_Z2, greetLine, greet, renderGreet,
  refreshClock, castOpen, setCastOpen, syncCastLabel, stashNum, restoreNum, setMode, showErr, clearErr,
};
