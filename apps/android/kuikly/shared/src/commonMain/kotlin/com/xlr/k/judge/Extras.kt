package com.xlr.k.judge

/* 断卦依据 D 组（专门判据 · 此类事的专门取象）
   apps/shared-judgment/src/judgment.js 里各事类 CATS[*].extra 的 Kotlin 版，**逐字搬**，算式不改。
   顺序照旧：婚 / 孕 / 财 / 工作 / 病 / 失物 / 出行 / 官司 / 考 / 天气 / 通用。
   ⚠ 文本里的 <b>/<em> 标记保留原文，界面层用 stripB 吃掉（这里不做替换，否则跟旧码对不上）。 */

private fun wx(g: String): String = G[g]!!.wx

/** 落宫所克之宫（旧码是 for 循环覆盖 ⇒ 命中最后一个） */
private fun keGongOf(g3: String): String? = GONG.filter { KE[wx(g3)] == wx(it) }.lastOrNull()

internal fun extrasOf(catKey: String, c: Context): List<BlockItem> = when (catKey) {
    "marriage" -> extraMarriage(c)
    "preg" -> extraPreg(c)
    "money" -> extraMoney(c)
    "work" -> extraWork(c)
    "ill" -> extraIll(c)
    "lost" -> extraLost(c)
    "travel" -> extraTravel(c)
    "law" -> extraLaw(c)
    "exam" -> extraExam(c)
    "weather" -> extraWeather(c)
    else -> extraGeneral(c)
}

/* ---------- 婚：有婚未婚看天·人两宫 ---------- */
private fun extraMarriage(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    val verdict = when {
        c.g1 == c.g3 -> "天宫与人宫同卦 ⇒ <b>很大程度是已婚</b>。"
        SHENG[wx(c.g1)] == wx(c.g3) -> "天宫生人宫（${c.g1}生${c.g3}）⇒ <b>很大程度是已婚</b>。"
        KE[wx(c.g1)] == wx(c.g3) || KE[wx(c.g3)] == wx(c.g1) -> "天宫与人宫相克 ⇒ <b>未婚</b>。"
        else -> "天宫与人宫既不同卦、也不构成生或克，需回到落宫与三宫细看。"
    }
    out.add(BlockItem("已婚未婚", verdict + " 判据是「有婚未婚看天人两宫，如果显示已婚，再看地宫」。", "05 · 一"))

    val di = when (c.g2) {
        "大安" -> "身未动——单身。"
        "留连" -> "表示同居过、订婚过又分手了。"
        "赤口" -> "离婚之后的状态。"
        "空亡" -> "守寡之意。<em>⚠ 老师明确警告：还得看卦主信息等情况，千万别乱说</em>——十几岁女孩地宫空亡就断守寡，「要被人打的」。"
        "速喜" -> "热络、还在往来之中。"
        else -> "暧昧、藕断丝连。"
    }
    out.add(BlockItem("地宫", "地宫 ${c.g2}（${G[c.g2]!!.jx}）＝$di", "05 · 一"))

    out.add(
        BlockItem(
            "对方",
            "对方的信息靠<b>转太极点</b>取：女问对象取官鬼（克我者），男问对象取妻财（我克者）。" +
                "<em>未婚时未必如此</em>；且取用要看「当年出现的关系」——现知的男友不一定是官鬼。",
            "05 · 一",
        )
    )
    out.add(BlockItem("变数", "感情卦里留连与空亡都要留活口；小吉主暧昧，注意第三方介入。", "05 · 一"))
    return out
}

/* ---------- 孕：性别 / 双胎 / 天数 ---------- */
private fun extraPreg(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    out.add(
        BlockItem(
            "性别",
            "六宫属性断男女：<b>大安 · 小吉 · 空亡 ＝ 男孩；留连 · 速喜 · 赤口 ＝ 女孩</b>。" +
                "其中空亡、赤口、速喜恒定；大安、留连、小吉随因素变。",
            "05 · 二",
        )
    )
    if (c.g1 == "空亡" && c.g2 == "空亡" && c.g3 == "空亡") {
        out.add(BlockItem("双胎", "<b>空亡 · 空亡 · 空亡 ＝ 双胞胎（男）</b>。", "05 · 二"))
    }
    if (c.g1 == "空亡" && c.g2 == "赤口" && c.g3 == "空亡") {
        out.add(BlockItem("双胎", "<b>空亡 · 赤口 · 空亡 ＝ 龙凤胎</b>——「龙凤胎必须是女的在中间，在前后都不算」。", "05 · 二"))
    }
    out.add(BlockItem("天数", "孕天数：用<b>大安取数</b>＝已孕天数，<b>小吉取数</b>＝发生关系之日，两者结合。", "05 · 二"))
    out.add(
        BlockItem(
            "存疑",
            "<em>老师自陈：「我没有这方面的很多案例，我只告诉大家理论，但我不保证这样的方法一定的准确率高」「仅供大家参考」。</em>",
            "05 · 二",
        )
    )
    return out
}

/* ---------- 财：财库 / 组合 / 合作 ---------- */
private fun extraMoney(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    out.add(
        BlockItem(
            "取角色",
            "取五行定角色：<b>木为项目、金为投资、资金是水（以小吉宫断投资金额）</b>。项目属金而投资属木 → 看土，以生项目为主。",
            "05 · 五",
        )
    )
    val lg = wx(c.g3)
    val di = wx(c.g2)
    val rel = when {
        lg == di -> "落宫与地宫同五行——财库关系平顺，无明显消耗，也无明显进项。"
        SHENG[lg] == di -> "落宫生地宫 ＝ <b>财在消耗</b>（泄出去）。"
        SHENG[di] == lg -> "地宫生落宫 ＝ 有进项、财往你这边来。"
        KE[lg] == di -> "落宫克地宫 ＝ 克出为收入，主动去拿才有。"
        else -> "地宫克落宫 ＝ 财上有压力、被压着。"
    }
    out.add(BlockItem("财库", "落宫 ${c.g3}（$lg）与地宫 ${c.g2}（$di）：$rel", "05 · 五"))

    val tian = wx(c.g1)
    val ren = wx(c.g3)
    val l2 = mutableListOf<String>()
    if (KE[ren] == di) l2.add("人克地 ＝ 该岗位／该处挣不到钱")
    if (KE[tian] == di && KE[ren] == di) l2.add("天与人同克地 ＝ 租金高、招人难")
    if (SHENG[ren] == di) l2.add("人泄于地 ＝ 吃力耗时")
    if (l2.isNotEmpty()) out.add(BlockItem("组合", l2.joinToString("；") + "。", "05 · 五"))
    out.add(BlockItem("合作", "特别规则：<b>凡合作之事，遇比肩都为助</b>——但仍要看是不是「形合意不合」。", "05 · 五"))
    return out
}

/* ---------- 工作：行业属性 / 多选项四法 ---------- */
private fun extraWork(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    val kg = keGongOf(c.g3)
    out.add(
        BlockItem(
            "行业",
            "行业属性由「<b>落宫所克之宫</b>」定——「开店为赚钱，赚钱看妻财」：落宫 ${c.g3}（${wx(c.g3)}）克 " +
                (kg ?: "—") + "（" + (kg?.let { wx(it) } ?: "—") + "）⇒ 行业属性偏" + (kg?.let { wx(it) } ?: "—") + "性。",
            "05 · 四",
        )
    )
    out.add(
        BlockItem(
            "多选项",
            "多选项比较四法：① <b>类象法</b>——哪个选项属${c.g3}；② <b>方位法</b>——${c.g3}＝${G[c.g3]!!.fw}；" +
                "③ <b>性质类别法</b>——哪个类别有五行去生${c.g3}；④ <b>分类分析</b>——赤口→升职、留连→赚钱、" +
                "小吉／水→轻松＋贵人运、大安／木→综合＋人脉成长。",
            "05 · 四",
        )
    )
    return out
}

/* ---------- 病：三宫分工 / 人宫要动 / 病位 / 应期 / 禁区 ---------- */
private fun extraIll(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    out.add(
        BlockItem(
            "三宫分工",
            "天宫＝得病<b>起因</b>（你为${c.g1}）；地宫＝<b>病灶与危重</b>（${c.g2}）；人宫＝<b>病人自身与结果</b>（${c.g3}）。",
            "05 · 三",
        )
    )
    val move = c.g3 == "小吉" || c.g3 == "速喜"
    out.add(
        BlockItem(
            "关键",
            "<b>人宫要动，人要动才吉</b>——「送医院则吉，不送医院则亡」。本卦人宫为 ${c.g3}（${G[c.g3]!!.act}）" +
                (if (move) "，属「动」的一侧，宜尽快就医、宜有行动。" else "，不是「动」的一侧——<em>务必主动就医，不要等</em>。") +
                " 动则有贵人（好医生）。",
            "05 · 三",
        )
    )
    out.add(
        BlockItem(
            "观八卦",
            "若要断病位／病象，看八卦取象：" +
                (if (c.gua.isNotEmpty()) "本卦具象为 <b>${c.gua}</b>——${GUA_XIANG[c.gua] ?: ""}。"
                else "可在左侧勾选「附带八卦具象」后一并看。"),
            "05 · 三",
        )
    )
    out.add(BlockItem("应期", "以落宫数取日：${c.g3} 取 ${G[c.g3]!!.ying}；配五行克／泄与当日干支，取最符合的一日，<b>从卜卦日起算</b>。", "05 · 三"))
    out.add(BlockItem("禁区", "<em>本页不替代医疗意见。断病只为提示方向，请以医生诊断为准。</em>", "整理者"))
    return out
}

/* ---------- 失物：要不要找（体用）/ 方位 / 应期 ---------- */
private fun extraLost(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    val lg = wx(c.g3)
    val zi = ZWX[c.zi - 1]
    val rel = when {
        SHENG[lg] == zi -> "体生用——为耗，越拖越不利，但现在动手还来得及。"
        SHENG[zi] == lg -> "用生体——有外力帮忙，别人可能替你找到。"
        KE[lg] == zi -> "体克用——<b>主动找很可能找到</b>，不要拖。"
        KE[zi] == lg -> "用克体——找起来费劲、阻力大。"
        else -> "比和——看落宫数字与方位。"
    }
    out.add(BlockItem("要不要找", "体用决定要不要主动找：$rel", "05 · 九"))
    val kg = keGongOf(c.g3)
    out.add(
        BlockItem(
            "方位",
            "方位以<b>卦主现住址</b>为中心，按「宫—所克—方位」取：落宫 ${c.g3}（$lg）克 ${kg ?: "—"} ⇒ " +
                "往<b>" + (kg?.let { G[it]!!.fw } ?: "—") + "</b>方向找。",
            "05 · 九",
        )
    )
    out.add(BlockItem("应期", "由五行生克＋当时时辰定。（016 卦例：酉时丢＝体克用，当时就能找到；戌时问＝体生用为耗，难。）", "05 原记录"))
    return out
}

/* ---------- 出行：归期 / 倾向 ---------- */
private fun extraTravel(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    out.add(
        BlockItem(
            "归期",
            "<em>行人「何时归／在何方」的具体取数与方位规则，本批材料未给出——这里不编。</em>能给的只有落宫性质（上表）。",
            "05 · 八",
        )
    )
    val lu = c.g3 == "小吉" || c.g3 == "速喜" || c.g3 == "大安"
    out.add(
        BlockItem(
            "倾向",
            if (lu) "落宫为 ${c.g3}——偏「会来／在路上」的一侧，催一下比干等好。"
            else "落宫为 ${c.g3}——偏「不来／拖延／有变」的一侧，宜主动确认。",
            "05 · 八",
        )
    )
    return out
}

/* ---------- 官司：真伪 / 格局 / 注意 / 取保 ---------- */
private fun extraLaw(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    if (c.g1 == "赤口") {
        out.add(BlockItem("真伪", "天宫赤口 ＝ <b>谎言、骗子之象</b>（案例口径：「赤口为天时＝谎言骗子」）。", "05 · 七"))
    }
    if (wx(c.g1) != wx(c.g3) && KE[wx(c.g1)] == wx(c.g2)) {
        out.add(BlockItem("格局", "天盘／地盘皆克人盘 ⇒ <b>已失天时地利</b>，处境被动。", "05 · 七"))
    }
    if (c.g3 == "大安") {
        out.add(
            BlockItem(
                "注意",
                "大安虽吉，但「身未动」＝<b>财不动</b>——若涉及钱款，别指望自己会动。（案例中老师据此警告「别再打款」。）",
                "05 · 七",
            )
        )
    }
    out.add(BlockItem("取保", "看押类问题可按<b>神煞</b>定位：牢狱之象取勾陈（空亡宫），据此转太极后看天克人／人克天定顺逆。", "07 · 七（031）"))
    return out
}

/* ---------- 考：输赢 / 提问取向 / 大数 ---------- */
private fun extraExam(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    val ji = listOf(c.g1, c.g2, c.g3).count { it == "大安" || it == "速喜" || it == "小吉" }
    val verdict = when {
        ji == 3 -> "<b>三吉卦——赢／过</b>。"
        ji == 0 -> "<b>三凶卦——输／不过</b>。"
        else -> "三宫吉凶混杂（吉宫 $ji 个）——不是干净的输赢局，要落到落宫与体用上看。"
    }
    out.add(BlockItem("输赢", verdict + " 比分「<b>以落宫数字为总分</b>」，再看体用生克所消耗。", "05 · 六"))
    out.add(
        BlockItem(
            "提问",
            "提问的取向会影响结果：「我这次考试能通过吗」与「我这次考试不能通过吧」，同样得赤口，结果不一样。问「能过吗」比问「不能过吧」正。",
            "05 · 六",
        )
    )
    out.add(
        BlockItem(
            "大数",
            "预测大数（如金牌数）：<b>大事以事件起始时的农历取卦</b>；取数时「排位数不先取、先取尾数」，并按阴阳日取阴数／阳数。",
            "05 · 六",
        )
    )
    return out
}

/* ---------- 天气：读法 / 三宫定位 / 时间轴 / 应期 / 温度 / 组合 / 风向 / 口诀 ---------- */
private fun extraWeather(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    out.add(
        BlockItem(
            "怎么读",
            "<b>以天为体看天气、以人为体看吉凶</b>。天气卦先辨问法：问「会不会下雨／下雪」是把天气绑成吉凶题（077），" +
                "正问是「天气如何」；还要回到起卦源头——他为什么问、盼不盼这场天气（南方人想见雪／北方人怕误车，读法不同）。",
            "05 · 十（077）",
        )
    )
    out.add(
        BlockItem(
            "三宫定位",
            "<b>先定落宫，再反推天地</b>：落宫＝天气的体现（结果）；回头推天宫＝气／先天条件、地宫＝地理环境与当地气温——" +
                "<b>天地是形成落宫这场天气的条件</b>，不是落宫之前的气候变化。⛔ 不许拿天宫先定天气。",
            "05 · 十（077）",
        )
    )
    out.add(
        BlockItem(
            "时间轴",
            "三宫顺序＝天气推进顺序（原则）。<b>生者动缓会延误、克者立竿见影</b>；具体落在哪个时辰，要按这一卦的日干支与落宫的生克自己推。" +
                "⛔ 015 那串「戌时雨…卯时大晴」是那一卦（赤口·大安·速喜，甲子日）的结论，不是模板。",
            "05 · 十（015／077）",
        )
    )
    out.add(
        BlockItem(
            "应期两路",
            "问「什么时候下」：① 落宫本身代表「正在下」⇒ <b>生出的那段时间就是开始</b>（火生土＝午巳起）；" +
                "② 落宫代表「将下未下」⇒ <b>等它走完、土生金时才下</b>，取金时。",
            "05 · 十（077）",
        )
    )
    out.add(
        BlockItem(
            "温度",
            "温度要结合当地实际气温（北方零下就别报 36 度）；宫数只作量级参考。015 的 36／29 度是甲子日那一卦的取数，不是通式。",
            "05 · 十（015／077）",
        )
    )
    val combo = c.g1 + "＋" + c.g2
    val sp = mapOf(
        "留连＋留连" to "雾",
        "留连＋空亡" to "霜",
        "赤口＋空亡" to "雪（积雪）",
        "赤口＋留连" to "小雪／雨夹雪",
        "赤口＋赤口" to "雹",
    )[combo]
    if (sp != null) out.add(BlockItem("组合", "天宫＋地宫为 <b>$combo</b> ⇒ <b>$sp</b>。", "05 · 十"))
    out.add(BlockItem("格局", "先合大格局：<b>年 → 季 → 月 → 日</b>，由大往小虑；且<b>地区不能太广</b>，只按当地情况说。", "05 · 十（015）"))
    out.add(
        BlockItem(
            "风向",
            "风向：<b>天宫为风起向、地宫为风去向、人宫为偏向</b>。本卦起＝${G[c.g1]!!.fw}、去＝${G[c.g2]!!.fw}、偏＝${G[c.g3]!!.fw}。",
            "05 · 十",
        )
    )
    out.add(
        BlockItem(
            "口诀",
            "生克口诀：木克土为干、土克水为旱、水克火为雾、火克金为霾、金克木为霜；金生水为雨、水生木为露、木生火为霞、火生土为夕、土生金为雹；" +
                "金金为雪、火火为电、木木为雷、水水为涝、土土为震。",
            "05 · 十",
        )
    )
    return out
}

/* ---------- 通用：只给落宫特性与方位 ---------- */
private fun extraGeneral(c: Context): List<BlockItem> = listOf(
    BlockItem("特性", "落宫 ${c.g3}：${G[c.g3]!!.xing}。核心动作词「<b>${G[c.g3]!!.act}</b>」。", "03"),
    BlockItem("方位", "落宫方位 ${G[c.g3]!!.fw}；${szTx(c.g3)}；${gxTx(c.g3)}。", "03"),
)

/* ---------- 自检：跟早先的 JS 的实跑结果逐条比 ---------- */

private fun ctxFor(catKey: String, zi: Int, g: List<String>, q: String): Context {
    val cast = Cast(
        steps = listOf(1, 1, 1), zi = zi, gi = listOf(0, 0, 0), g = g,
        ziName = ZHI[zi - 1], mode = "", src = "",
    )
    return buildContext(q = q, bg = "", catKey = catKey, cast = cast)
}

internal fun extrasDump(catKey: String, zi: Int, g: List<String>, q: String): String =
    extrasOf(catKey, ctxFor(catKey, zi, g, q)).joinToString("\u0001") { "${it.lb}|${it.tx}|${it.src}" }

fun extrasSelfCheck(): String {
    val bad = EXTRA_CASES.mapNotNull { cs ->
        val got = extrasDump(cs.catKey, cs.zi, cs.g, cs.q)
        if (got == cs.expect) null else "${cs.name}: 期望 ${cs.expect.length} 字 / 实得 ${got.length} 字\n  期望 ${cs.expect.take(160)}\n  实得 ${got.take(160)}"
    }
    return if (bad.isEmpty()) "PASS ${EXTRA_CASES.size}/${EXTRA_CASES.size}" else "FAIL\n" + bad.joinToString("\n")
}
