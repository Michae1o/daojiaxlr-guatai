/* plain-text.js —— 断辞纯文本（原 blk4.js:287-321 的 plainAll）
   逐字搬运，**唯一改动**：末尾两个依赖 localStorage 的钩子（ruleBlock / reviewBlock）
   改成从参数 hooks 取，其余一字未动。 */
import { G, GONG, stripB, gxTx, szTx, ganTx, zhi } from './judgment.js';

export function plainAll(c, B, hooks) {
  var L = [];
  L.push('【所问】' + c.q);
  if (c.bg) L.push('【背景】' + c.bg);
  L.push('【卦】' + c.g1 + ' · ' + c.g2 + ' · ' + c.g3 + '　' + zhi[c.zi - 1] + '时　（' + c.src + '）');
  L.push('【事类】' + c.cat.name);
  L.push('');
  /* 六宫备查：不给全的话，模型用到非落宫时只能从自己的通用知识里补——那就不是「只按判据解」了 */
  L.push('【六宫属性 · 类象 · 备查】');
  L.push('读法：六宫不是分类表。类象是素材库，宫义由所问之事决定（问什么，是什么）；不够用时用八卦＋五行去推——「五行本身也有类象 只不过，我们在小六壬当中，优先考虑的是六神类象」。');
  GONG.forEach(function (g) {
    L.push('· ' + g + '　' + G[g].wx + ' · ' + G[g].jx + ' · 核心动作词「' + G[g].act + '」：' + G[g].xing);
    L.push('　　类象：' + G[g].lei + '　（类象是素材库，远不止这些）');
    L.push('　　' + stripB(gxTx(g)) + '｜方位 ' + G[g].fw + '｜' + stripB(szTx(g)) + '｜' + stripB(ganTx(g)) + '｜季 ' + G[g].ji +
           '｜固定三数 ' + G[g].san + '｜排位轮回 ' + G[g].ying);
  });
  L.push('');
  B.forEach(function (b) {
    L.push('— ' + b.n + '. ' + b.t + ' —');
    b.items.forEach(function (it) {
      L.push('· ' + it.lb + '：' + String(it.tx).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ''));
    });
    L.push('');
  });
  if (hooks && typeof hooks.ruleBlock === 'function') {
    var kb = hooks.ruleBlock();
    if (kb) L.push(kb);              /* ★ 已确认准则：权重高于一般判据 */
  }
  if (hooks && typeof hooks.reviewBlock === 'function') {
    var rb = hooks.reviewBlock();
    if (rb) L.push(rb);
  }
  return L.join('\n');
}
