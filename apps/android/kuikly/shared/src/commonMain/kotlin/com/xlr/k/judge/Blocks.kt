package com.xlr.k.judge

/* 断卦依据（judgment.js buildBlocks 的 Kotlin 版）。
   8 组：0 理法根基 / A 主断 / B 体用 / C 三宫 / E 应期 / F 取数 / H 自查 / I 边界。
   D（专门判据）依赖各事类的 extra 函数，尚未搬 —— 搬好后插到 C 与 E 之间。
   G（三宫具象）算法已搬好（gBlock），但按口径**不在断卦依据里显示**，不进列表。
   ⚠ 文本里的 <b> 标记保留原文，界面层负责吃掉。 */

internal data class BlockItem(val lb: String, val tx: String, val src: String = "")
internal data class Block(
    val n: String,
    val t: String,
    val d: String,
    val items: List<BlockItem>,
    /* 有这条、但入口不给用（列表里显示成灰的，点不开） */
    val disabled: Boolean = false,
)

/** 三宫两两关系（判据 buildBlocks C 组用的 relTo，已有；这里给 Block 层用同一份） */
private fun gWx(g: String): String = G[g]?.wx ?: ""

internal fun buildBlocks(c: Context): List<Block> {
    val B = mutableListOf<Block>()
    val g1 = c.g1
    val g2 = c.g2
    val g3 = c.g3
    val gg = G[g3]!!

    /* ---- 0 理法根基 ---- */
    val lf = mutableListOf<BlockItem>()
    lf.add(
        BlockItem(
            "框架",
            "理法是根基，类象是辅助。<b>六神优先于五行</b>——原文：「六神才是道家小六壬最核心的符号 也是道家小六壬这套占卜术的根本」" +
                "「为什么说断卦要优先以六神为主 不要一上来就五行生克」；宫义由所问决定——「问什么，是什么」；" +
                "类象不够用时才合八卦五行——「五行本身也有类象 只不过，我们在小六壬当中，优先考虑的是六神类象」。",
            "01 · 6.3 / 8",
        )
    )
    lf.add(
        BlockItem(
            "阴阳",
            "六宫阴阳<b>以吉凶定</b>（大安 · 速喜 · 小吉为阳，留连 · 赤口 · 空亡为阴）。同一宫在不同层次上阴阳可以不同" +
                "——速喜从吉凶看为阳，从八卦看是离＝中女＝<b>阴卦</b>；赤口「我们平常断的时候，赤口还是多以阴的信息用的」。" +
                "原文：「卦分阴阳要按卦主、卦事、卦性等去分析」——<b>引用时要说清是哪一层的阴阳。</b>",
            "01 · 5.2",
        )
    )
    lf.add(
        BlockItem(
            "本卦三宫",
            listOf("天" to g1, "地" to g2, "人" to g3).joinToString("　／　") { r ->
                "<b>${r.second}</b>（${gWx(r.second)} · ${GYY[r.second]} · ${G[r.second]?.gan}）${r.first}宫"
            } + "。",
            "01 · 7.4",
        )
    )
    lf.add(BlockItem("落宫天干", ganTx(g3) + "。两干之间的关系就是这一宫性情的来由——这是「<b>类象为什么长这样</b>」的答案。", "01 · 7.4"))
    lf.add(BlockItem("落宫名号", szTx(g3) + "；" + gxTx(g3) + "。", "01 · 7.3 / 8"))
    val gsAll = listOf(g1, g2, g3)
    if (gsAll.contains("留连")) {
        lf.add(
            BlockItem(
                "留连 · 腾蛇",
                "<b>腾蛇＝留连的神煞之名</b>——原文：「留连就是隐藏在四个角专门捣乱的鬼」「所以，留连又为小人、为腾蛇」；" +
                    "留连为四方土、四季之土，因「拐弯转角」而「不通畅」，故主「缓慢」「停 滞」「拖延」「暗昧」「纠缠」「暂留」。留连的「缠」不只是「凶」，根在这里。",
                "01 · 8.3（014 第7页 / 065 第2页）",
            )
        )
    }
    if (gsAll.contains("空亡")) {
        lf.add(
            BlockItem(
                "空亡 · 勾陈",
                "<b>勾陈为中央土</b>——原文：「为中央，为勾陈，为土」「空亡为神」；「其空亡之点为灵空太极点，不在四 季中，与时间无关，仅空间为中」。" +
                    "所以空亡既主极凶、也主无事——「空亡卦要么就没有病，要么就是很凶啊」。",
                "01 · 8.3（014 第6页 / 065 第3页）",
            )
        )
        lf.add(BlockItem("空亡 · 位在中央", "空亡本职在中央：065「不在四季，位在中央」；八卦上配艮（东北）只是方位上的挂靠，不是本体。", "01 · 8.2"))
    }
    B.add(Block("0", "理法根基", "本卦用得到的那几条", lf))

    /* ---- A 主断 ---- */
    val luoTx = c.cat.luo?.get(g3) ?: gg.xing
    val a = mutableListOf<BlockItem>()
    a.add(BlockItem("落宫", "<b>$g3</b>　${gg.jx}　${gg.wx}　核心动作词「<b>${gg.act}</b>」"))
    a.add(
        BlockItem(
            "取用",
            "<b>$g3</b> 的类象（素材库，非全集）：${gg.lei}。<br><b>宫义由所问之事决定</b>（问什么，是什么）——上面这些不是「本宫只断这些」；" +
                "原文：「落宫不可能包含所有的信息，否则就乱了」「其它的都要在卦里面或转太极点去看」。类象不够用时，用<b>八卦＋五行</b>推" +
                "（「五行本身也有类象 只不过，我们在小六壬当中，优先考虑的是六神类象」）。",
            "01 · 8 / 04 · Ⓐ",
        )
    )
    a.add(
        if (c.cat.luo != null) BlockItem("在" + c.cat.name, luoTx, "05 占法应用")
        else BlockItem("归类", "此问未归入专类，只用落宫／体用／三宫。类象不够用时，按引申法用<b>八卦＋五行</b>推。", "05 占法应用")
    )
    a.add(BlockItem("宫性", "${gg.xing}。方位 ${gg.fw}、${szTx(g3)}、${gxTx(g3)}。", "03"))
    B.add(Block("A", "主断 · 落宫", "先看落宫——它决定九成", a))

    /* ---- B 体用 ---- */
    val need = "事非最终结果、还有后续 / 吉凶不明确 / 卦或事复杂特殊"
    B.add(
        Block(
            "B", "体用", "体＝落宫，用＝起卦时辰",
            listOf(
                BlockItem("关系", "<b>${c.bu.t}　${c.bu.jx}</b>　${c.bu.txt}", "04 · Ⓓ"),
                BlockItem("怎么来的", c.bu.why + "。", "04"),
                BlockItem("要不要看", "体用只在三种情况之一才看：$need。<b>不需要就不要展开</b>——体用只看将来走势，不看当下结果。", "04 · Ⓓ"),
            ),
        )
    )

    /* ---- C 三宫 ---- */
    val role = listOf(
        "起因 · 时间 · 长辈上级政策 · 财源",
        "经过 · 空间 · 环境财库 · 兄弟同事",
        "结果 · 当下 · 当事人本身",
    )
    val ci = mutableListOf<BlockItem>()
    listOf(Triple(g1, "天宫", 0), Triple(g2, "地宫", 1), Triple(g3, "人宫", 2)).forEach { r ->
        ci.add(
            BlockItem(
                r.second,
                "<b>${r.first}</b>（${gWx(r.first)} · ${G[r.first]?.jx}）＝" + role[r.third] +
                    (if (r.second == "人宫") "" else "；对落宫：" + relTo(r.first, g3)),
            )
        )
    }
    ci.add(BlockItem("读法", COMMON["san"] ?: "", "04 · Ⓒ"))
    ci.add(BlockItem("注意", (COMMON["wuji"] ?: "") + " " + (COMMON["shengke"] ?: ""), "04 · Ⓒ"))
    B.add(Block("C", "三宫", "天宫 / 地宫 / 人宫", ci))

    /* ---- D 专门判据（按事类给一组「此类事的专门取象」） ---- */
    val ext = extrasOf(c.catKey, c)
    if (ext.isNotEmpty()) B.add(Block("D", "专门判据 · " + c.cat.name, "此类事的专门取象", ext))

    /* ---- E 应期 ---- */
    B.add(
        Block(
            "E", "应期", "什么时候应验",
            listOf(
                BlockItem("区间", "六神四季属位：<b>$g3 → ${gg.ji}</b>。", "03 · 六"),
                BlockItem("三步", YQ["step"] ?: "", "03 · 六"),
                BlockItem("警告", YQ["warn"] ?: "", "03 · 六"),
                BlockItem("硬约束", YQ["hard"] ?: "", "03 · 六"),
                BlockItem("近口径", YQ["modern"] ?: "", "03 · 六"),
                BlockItem("要数字", "问的是「几个／几名／多少／几号／多远」，另见下面「<b>数</b>」那一条——<b>数不等于应期</b>。", "03"),
            ),
        )
    )

    /* ---- F 数 · 取数与数应 ---- */
    B.add(
        Block(
            "F", "数 · 取数与数应", "要不要给数字、给哪个数",
            listOf(
                BlockItem(
                    "能断什么",
                    "数不只断应期：应期、数量的权衡、事物多少、名次、分数、金额、日期、距离——<b>问什么，就以什么取数</b>。" +
                        "原话：「就算别人问的是数字性问题，你也要先以 卦的吉凶论事，然后才看数字。」",
                    "03 · 五（068 第3页）",
                ),
                BlockItem(
                    "取数池",
                    "落宫 <b>$g3</b> 的固定三数：<b>${gg.san}</b>。排位轮回叠上后为 <b>${gg.ying}</b>（第 1 组＝排位轮回，后两组＝另两数）。正常情况下<b>只用这套</b>。",
                    "03 · 五（068）",
                ),
                BlockItem(
                    "次第",
                    "① 先吉凶、后数字——数字性问题也一样<br>② 排位数多用于名次与两位数以上的首位数，取年份则落最后<br>③ 先定尾数，再定前面的数<br>" +
                        "④ 尾数按该宫用时的阴阳定奇偶<br>⑤ 首位大小看生克与卦之吉凶：天克人／人克地取小数、受生取大数，失利之卦取小数<br>" +
                        "⑥ 据卦问者男女、题之性质、三宫生克之迟缓，附以上下浮动<br>⑦ 体用为参考（体＝落宫，用＝时辰）　⑧ 阴阳之合则两数都用<br>" +
                        "⑨ 明数不合适才取隐藏数　⑩ 历法默认农历，问阳历则取阳历　⑪ 0 取 10",
                    "03 · 五",
                ),
                BlockItem("别用错", "本命数／五行数（$g3 → ${gg.ben}）属<b>空间数</b>（038：定数是空间、变数是时间），日常取数「一般取本宫位数」，不要拿它当主力。", "03 · 五 / 01 · 9.2"),
                BlockItem("不许", "天干数、地支数、神煞数：原文说「可以有」，但「卜法卷用的不多」，本材料未展开——问到就说没有，不许自行补算。", "03 · 五"),
            ),
        )
    )

    /* ---- H 出口前的自查 ---- */
    if (COMMON_XINFA.isNotEmpty()) {
        B.add(
            Block(
                "H", "出口前的自查", "心法纪律",
                COMMON_XINFA.mapIndexed { i, x -> BlockItem((i + 1).toString(), x) },
            )
        )
    }

    /* ---- I 边界 ---- */
    B.add(
        Block(
            "I", "边界与存疑", "请读完再用",
            listOf(
                BlockItem("来源", "规则出自 docs\\体系 00–07（卦例逐字提炼，引文逐字核过）；凡材料未讲者本页不补，不作依据的材料不立条。", "00"),
                BlockItem("缺口", "六亲全表、命法卷、修法卷、穿法卷材料中<b>没有</b>，本页不代补。", "00"),
                BlockItem("存疑", "材料间冲突（天地宫有无吉凶、转出宫论不论吉凶、婚否看天地还是天人、小吉纯阳与阴水……）已在 <b>04 / 05 的冲突条</b>与 <b>01 · 14</b> 如实并列，本页以「老师明文＋用户裁定」为准，不硬统一。", "01 · 14 / 04 / 05"),
                BlockItem("层级", "术数是一套认识问题的思路，<b>不替代医疗、法律、财务等专业意见</b>。结论只到「参考」层级。", "整理者"),
            ),
        )
    )

    /* ---- G 三宫具象（三盘＋变宫）——
       算法保留，但断卦依据里不显示。
       要放回来：在 buildBlocks 末尾 `return B` 前加 `B.add(gBlock(c))`。
       组序按早先的实现排在 I 之后（见 legacy buildBlocks）。 ---- */
    return B
}

internal fun gBlock(c: Context): Block {
    val g1 = c.g1
    val g2 = c.g2
    val g3 = c.g3
    val xlwWx = mapOf("大安" to "木", "留连" to "土", "速喜" to "火", "赤口" to "金", "小吉" to "水", "空亡" to "土")
    val gwWx = mapOf("兑" to "金", "巽" to "木", "离" to "火", "坤" to "土", "艮" to "土", "乾" to "金", "坎" to "水", "震" to "木")
    val keOut = mapOf("木" to "土", "土" to "水", "水" to "火", "火" to "金", "金" to "木")   /* 被它克 */
    val keIn = mapOf("木" to "金", "金" to "火", "火" to "水", "水" to "土", "土" to "木")    /* 克它 */
    val shIn = mapOf("木" to "水", "水" to "金", "金" to "土", "土" to "火", "火" to "木")    /* 生它 */
    val shOut = mapOf("木" to "火", "火" to "土", "土" to "金", "金" to "水", "水" to "木")   /* 它生 */

    fun xlwPalaceOf(wx: String): String {
        if (wx == "土") return "留连／空亡"
        for ((k, v) in xlwWx) if (v == wx) return k
        return wx
    }

    val git = mutableListOf<BlockItem>()
    git.add(
        BlockItem(
            "排法",
            "原文：<b>「天盘的排列：人、天、地；地盘的排列：天、地、人；人盘的排列：天、人、地」</b>。三爻<b>自上而下</b>排，" +
                "按六宫阴阳（大安 · 速喜 · 小吉＝阳，留连 · 赤口 · 空亡＝阴）。<b>地盘＝原卦序</b>（原文问答：「地盘就是原卦？」「是的」）。" +
                "各盘即<b>把本层原宫排在正中</b>——原文：「把天盘的速喜放中间，为天人合一」。",
            "04 · Ⓕ（092）",
        )
    )
    val g3v = listOf(g1, g2, g3)
    data class Pan(val n: String, val ord: List<Int>, val txt: String)
    for (p in listOf(
        Pan("天盘", listOf(3, 1, 2), "人、天、地"),
        Pan("地盘", listOf(1, 2, 3), "天、地、人"),
        Pan("人盘", listOf(1, 3, 2), "天、人、地"),
    )) {
        val pk = p.ord.map { g3v[it - 1] }
        val r = xiangOf(pk[0], pk[1], pk[2])
        val ref = if (p.n == "天盘") g1 else if (p.n == "地盘") g2 else g3
        val a = xlwWx[ref] ?: ""
        val b = gwWx[r.gua] ?: ""
        var rel = ""
        var map: Map<String, String>? = null
        var dir = ""
        if (a == b) rel = "比和"
        else if (keOut[a] == b) { rel = "宫克卦（「克外」）"; map = keOut; dir = "被它克" }
        else if (keIn[a] == b) { rel = "卦克宫"; map = keIn; dir = "克它" }
        else if (shIn[a] == b) { rel = "卦生宫（「生出／生进」）"; map = shIn; dir = "生它" }
        else if (shOut[a] == b) rel = "宫生卦"

        val bh = when {
            rel == "比和" -> "比和——本盘<b>不变</b>（原文：「那就不变」）。"
            rel == "宫生卦" -> "此向原文无实例，不转（仅标出）。"
            map != null -> "三宫全转：每宫换「$dir」的宫 ⇒ <b>" +
                listOf(g1, g2, g3).joinToString(" · ") { g -> xlwPalaceOf(map!![xlwWx[g] ?: ""] ?: "") } + "</b>。"
            else -> ""
        }
        git.add(
            BlockItem(
                p.n + "（" + p.txt + "）",
                pk.joinToString(" · ") { g -> "$g（${GYY[g]}）" } + "　＝ " + r.yy + "　⇒ <b>${r.gua}卦</b>" +
                    (if (p.n == "地盘") "　（原序，即本卦）" else "") +
                    "<br>" + r.gua + "：" + r.xiang + "。" +
                    "<br>本层原宫 × 卦：" + ref + "（" + a + "）× " + r.gua + "（" + b + "）＝ <b>" + rel + "</b>。" + bh,
                "04 · Ⓕ（092）",
            )
        )
    }
    git.add(
        BlockItem(
            "变宫法则",
            "每盘以「<b>本层原宫 × 该盘卦</b>」五行定关系，把三宫<b>同方向全转一遍</b>（输出仍按天·地·人）：<b>宫克卦</b>→每宫换「被它克」的；" +
                "<b>卦克宫</b>→每宫换「克它」的；<b>卦生宫</b>（原文「生出／生进」）→每宫换「生它」的；<b>比和</b>→不变。" +
                "五行归宫：木大安 · 火速喜 · 金赤口 · 水小吉 · <b>土＝留连（阴）／空亡（阳），取土时按阴阳择一</b>。",
            "04 · Ⓕ（092/022）",
        )
    )
    git.add(
        BlockItem(
            "用途",
            "具象只作<b>读象</b>：老师原话「我很少用三宫具象法」「只有在复杂的事需要细剖时才用」「越拆细，越容易出错」。三盘分读<b>前因 → 中段 → 后果</b>。",
            "04 · Ⓕ（092 / 022）",
        )
    )
    return Block("G", "三宫具象（三盘＋变宫）", "只读象，不读吉凶", git)
}

/* ganTx / szTx / gxTx —— judgment.js:64-78 逐字搬 */
internal fun ganTx(n: String): String {
    val g = G[n] ?: return ""
    return "天干 <b>${g.gan}</b>（暗藏 ${g.gan2}）：${g.ganWhy}"
}

internal fun szTx(n: String): String {
    val g = G[n] ?: return ""
    return "神煞 <b>${g.sz}</b>"
}

internal fun gxTx(n: String): String {
    val g = G[n] ?: return ""
    return "卦象 <b>${g.gx}</b>" + if (g.gxNote.isNotEmpty()) "（${g.gxNote}）" else ""
}

/* 去掉 <b>/<em>/<br> 标记：Kuikly 的 Text 不做富文本，界面层用这个
   （早先的 JS 把这些当 HTML 插进 DOM，<em> 会显示成斜体；这里没有斜体，只留文字） */
internal fun stripB(s: String): String = s
    .replace("<b>", "").replace("</b>", "")
    .replace("<em>", "").replace("</em>", "")
    .replace("<br>", "\n")
