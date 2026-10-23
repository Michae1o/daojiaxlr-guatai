/* cast.js —— 起卦（三路分支）纯函数化
   逐字来自 blk4.js:49-61（clockNums / numVals）与 blk4.js:234-284（#btnGo handler 的三路分支）。
   **唯一改动：把 DOM 取值提成参数、把 new Date() 提成参数 d** —— 算式一字未改。 */
import { advance, lunarOf, zhi, GONG } from './judgment.js';

/* blk4.js:49-54 逐字（`var n = new Date()` ⇒ `var n = d || new Date()`） */
export function clockNums(d) {
  var n = d || new Date();
  var hh = n.getHours(), mm = n.getMinutes();
  var raw = [hh, Math.floor(mm / 10), mm % 10];
  return { hh: hh, mm: mm, raw: raw, nums: raw.map(function (v) { return v === 0 ? 10 : v; }), zi: ((hh + 1) >> 1) % 12 + 1 };
}

/* blk4.js:56-61 numVals 逐字（去掉 document.getElementById 取值） */
export function normalizeNums(vals) {
  return [0, 1, 2].map(function (i) {
    var x = Math.abs(parseInt(vals[i], 10)) || 0;
    return x === 0 ? 10 : x;
  });
}

/* blk4.js:57-58 numsFilled 的纯版：三个数都非空 */
export function numsFilled(vals) {
  for (var i = 0; i < 3; i++) { if (vals[i] === '' || vals[i] === null || vals[i] === undefined) return false; }
  return true;
}

/* blk4.js:257 / 262 / 274 三处同一个出口算式 */
function finish(steps, zi) {
  var g1 = advance(0, steps[0]), g2 = advance(g1, steps[1]), g3 = advance(g2, steps[2]);
  return { steps: steps.slice(), zi: zi, gi: [g1, g2, g3], g: [GONG[g1], GONG[g2], GONG[g3]], ziName: zhi[zi - 1] };
}

/** 分支 A：时间取数。manualNums 传了且三个都填了 ⇒ 走「手改」那一路（blk4.js:248-255） */
export function castByClock(d, manualNums) {
  var t = clockNums(d);
  var manual = !!(manualNums && numsFilled(manualNums));
  var steps = manual ? normalizeNums(manualNums) : t.nums.slice();
  var r = finish(steps, t.zi);
  r.mode = manual ? 'clock-manual' : 'clock-auto';
  r.clock = t;
  r.src = manual
    ? '时间取数·手改 ' + steps.join(' / ') + '，' + zhi[t.zi - 1] + '时'
    : '时间取数 ' + t.hh + ':' + (t.mm < 10 ? '0' : '') + t.mm + ' ⇒ ' + steps.join(' / ') + '，' + zhi[t.zi - 1] + '时';
  return r;
}

/** 分支 B：报数（blk4.js:258-265）。zi 不传 ⇒ 按当前钟点 */
export function castByNums(rawNums, zi, d) {
  var nn = normalizeNums(rawNums);
  var z = zi || ((((d || new Date()).getHours() + 1) >> 1) % 12 + 1);
  var r = finish(nn, z);
  r.mode = 'num';
  var rawJoined = [rawNums[0], rawNums[1], rawNums[2]].map(function (x) { return Math.abs(parseInt(x, 10)) || 0; }).join();
  r.src = '报数 ' + rawNums[0] + ' / ' + rawNums[1] + ' / ' + rawNums[2] +
    (nn.join() !== rawJoined ? '（0 按 10 取）' : '') + '，' + zhi[z - 1] + '时';
  return r;
}

/** 分支 C：公历日期 → 农历月日时（blk4.js:266-275）。越界返回 null（原样返回 null，不抛） */
export function castByDate(dateStr, zi, d) {
  var p = String(dateStr).split('-');
  var lu = lunarOf(+p[0], +p[1], +p[2]);
  if (!lu) return null;
  var z = zi || ((((d || new Date()).getHours() + 1) >> 1) % 12 + 1);
  var steps = [lu.m, lu.d, z];
  var r = finish(steps, z);
  r.mode = 'date';
  r.lunar = lu;
  r.src = '公历 ' + dateStr + ' ⇒ 农历 ' + lu.y + ' 年' + (lu.leap ? '闰' : '') + lu.m + ' 月' + lu.d + ' 日，' + zhi[z - 1] + '时';
  return r;
}
