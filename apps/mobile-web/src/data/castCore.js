/*
        唯一例外逐条列在本工具 `PATCHES`（当前 1 条，见控制台「有意改动」）。
      buildBlocks / GONG / zhi）**一律 import 自 @xlr/shared-judgment**。
   ⚠ 提取出来的正文引用 `mClock / mNum` 两个节点（源里是全局）⇒ 由 bindCast() 注入；`show` 转发到 window.show。
   源 sha16 = 601f0a75442e2beb
*/
/* eslint-disable */
import { clockNums, zhi, lunarOf, advance, GONG, autoCat, buildContext, buildBlocks } from '@xlr/shared-judgment';
import { AskCore, numVals, numsFilledDom as numsFilled } from './askCore.js';
/* 源里 `clearErr / showErr` 是 18-script 自己定义的全局函数 ⇒ 复用 askCore.js 里那份**同一份切片**
   （它们是 AskCore 的成员，不在具名导出里），不另抄一份。 */
const clearErr = AskCore.clearErr, showErr = AskCore.showErr;

/* 自由变量（源里是 18-script 的顶层 var / 全局函数）：
   mClock / mNum = 两个方式按钮（判断当前是哪一路）；show = 结果渲染链，源里是 26-script 装的全局，
   */
let mClock = null, mNum = null;
export function bindCast(nodes) {
  mClock = nodes.mClock || null; mNum = nodes.mNum || null;
}
/* 源里 `show(c, B)` 直接调全局 ⇒ 这里转发到 window.show，**不改切片正文** */
function show(c, B) { return window.show(c, B); }

export function goCast() {
  clearErr();
  var q = document.getElementById('q').value.trim();
  var bg = document.getElementById('bg').value.trim();
  if (!q) return showErr('先写清楚你要问的事。');
  if (q.length < 4) return showErr('问题太短了——「问什么，卦就答什么」，请写具体一点。');

  var catSel = document.getElementById('cat').value;
  var catKey = catSel === 'auto' ? autoCat(q + ' ' + bg) : catSel;
  var withXiang = window.XLR_XIANG ? document.getElementById('optXiang').checked : false;  /* 三宫具象已下架：总闸关着恒 false */
  var zi, g1, g2, g3, src, steps;

  if (mClock.getAttribute('aria-pressed') === 'true') {
    var t0c = clockNums();
    if (window.__numManual && numsFilled()) {
      /* ★ 手改过：按框里的数起卦（收起九数、或换方式即回到自动） */
      steps = numVals();
      src = '时间取数·手改 ' + steps.join(' / ') + '，' + zhi[t0c.zi - 1] + '时';
    } else {
      steps = t0c.nums.slice();
      /*
         时间取数是软件自己读的表，把读到的数字再摆一遍纯属噪音；
         而报数那行是他自己敲的数、月日时那行是他选的日期，都要留着。 */
      src = '时间取数，' + zhi[t0c.zi - 1] + '时';
    }
    /* ★ 变更记录：时间取数也能手选时辰 —— 改过就用他选的（与报数 / 月日时同一规矩）。
       点「详情」才看得到那个下拉（它和另外两个时辰下拉同装在 `.rowh` 里）。 */
    zi = window.__ziTouchH2 ? +document.getElementById('h2').value : t0c.zi;
    g1 = advance(0, steps[0]); g2 = advance(g1, steps[1]); g3 = advance(g2, steps[2]);
  } else if (mNum.getAttribute('aria-pressed') === 'true') {
    var a = document.getElementById('n1').value, b = document.getElementById('n2').value, d = document.getElementById('n3').value;
    if (a === '' || b === '' || d === '') return showErr('三个数都要报。');
    var nn = [a, b, d].map(function (x) { var v = Math.abs(parseInt(x, 10)) || 0; return v === 0 ? 10 : v; });
    g1 = advance(0, nn[0]); g2 = advance(g1, nn[1]); g3 = advance(g2, nn[2]);
    zi = window.__ziTouchH2 ? +h2.value : (((new Date().getHours() + 1) >> 1) % 12 + 1);
    steps = nn;
    src = '报数 ' + a + ' / ' + b + ' / ' + d + (nn.join() !== [a, b, d].map(function (x) { return Math.abs(parseInt(x, 10)) || 0; }).join() ? '（0 按 10 取）' : '') + '，' + zhi[zi - 1] + '时';
  } else {
    var v = document.getElementById('dt').value;
    if (!v) return showErr('选一个日期。');
    var p = v.split('-');
    var lu = lunarOf(+p[0], +p[1], +p[2]);
    if (!lu) return showErr('超出内置农历表范围（2020–2040）。改用报数，或手工把农历月日填进报数。');
    zi = window.__ziTouchH1 ? +h1.value : (((new Date().getHours() + 1) >> 1) % 12 + 1);
    steps = [lu.m, lu.d, zi];
    g1 = advance(0, lu.m); g2 = advance(g1, lu.d); g3 = advance(g2, zi);
    src = '公历 ' + v + ' ⇒ 农历 ' + lu.y + ' 年' + (lu.leap ? '闰' : '') + lu.m + ' 月' + lu.d + ' 日，' + zhi[zi - 1] + '时';
  }

  var c = buildContext({ q: q, bg: bg, catKey: catKey, zi: zi, g1: GONG[g1], g2: GONG[g2], g3: GONG[g3], src: src });
  c.withXiang = withXiang;
  c.n1 = steps[0]; c.n2 = steps[1]; c.n3 = steps[2];
  var B = buildBlocks(c);
  show(c, B);
  document.getElementById('right').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

export const CastCore = { bindCast, goCast };
