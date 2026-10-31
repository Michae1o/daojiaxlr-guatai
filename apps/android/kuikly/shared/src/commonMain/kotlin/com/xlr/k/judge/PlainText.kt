package com.xlr.k.judge

/* 断辞纯文本（旧 apps/shared-judgment/src/plain-text.js 的 plainAll，逐字搬）。
   喂给模型的那份上下文就用它：卦 + 六宫备查 + 断卦依据全文。 */

internal fun plainAll(c: Context, B: List<Block>): String {
    val L = mutableListOf<String>()
    L.add("【所问】" + c.q)
    if (c.bg.isNotEmpty()) L.add("【背景】" + c.bg)
    L.add("【卦】" + c.g1 + " · " + c.g2 + " · " + c.g3 + "　" + ZHI[c.zi - 1] + "时　（" + c.src + "）")
    L.add("【事类】" + c.cat.name)
    L.add("")
    L.add("【六宫属性 · 类象 · 备查】")
    L.add("读法：六宫不是分类表。类象是素材库，宫义由所问之事决定（问什么，是什么）；不够用时用八卦＋五行去推——" +
        "「五行本身也有类象 只不过，我们在小六壬当中，优先考虑的是六神类象」。")
    for (g in GONG) {
        val gg = G[g]!!
        L.add("· $g　${gg.wx} · ${gg.jx} · 核心动作词「${gg.act}」：${gg.xing}")
        L.add("　　类象：${gg.lei}　（类象是素材库，远不止这些）")
        L.add("　　${stripB(gxTx(g))}｜方位 ${gg.fw}｜${stripB(szTx(g))}｜${stripB(ganTx(g))}｜季 ${gg.ji}" +
            "｜固定三数 ${gg.san}｜排位轮回 ${gg.ying}")
    }
    L.add("")
    for (b in B) {
        L.add("— ${b.n}. ${b.t} —")
        for (it in b.items) {
            L.add("· ${it.lb}：" + it.tx.replace("<br>", " ").replace(Regex("<[^>]+>"), ""))
        }
        L.add("")
    }
    return L.joinToString("\n")
}
