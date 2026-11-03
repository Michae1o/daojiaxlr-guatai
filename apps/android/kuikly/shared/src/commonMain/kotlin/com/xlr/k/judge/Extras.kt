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
    out.add(BlockItem("已婚未婚",
        verdict + " 材料只给到两步：先用天人两宫看婚否，再落到地宫——「地宫不是主要分析思路」（corpus/03 原记录）；" +
            "天人两宫各组合如何定已婚、未婚，本批未给成文对应表——上面这一步是软件按生克复算的推法，非原文。",
        "corpus/03 原记录"))

    val di = when (c.g2) {
        "大安" -> "本批材料未给这一宫在婚况（地宫层）上的读法。"
        "留连" -> "分手之后——03 原记录 的口径作「留连＝分手后、赤口＝离婚后、空亡＝守寡」。"
        "赤口" -> "离婚之后。"
        "空亡" -> "守寡之意——须合卦主年龄身份，「千万别乱说」。"
        "速喜" -> "本批材料未给这一宫在婚况（地宫层）上的读法。"
        else -> "暧昧——本批只在一案里读到「离婚后还在一起同居」。"
    }
    out.add(BlockItem("地宫", "地宫 ${c.g2}（${G[c.g2]!!.jx}）＝$di", "corpus/05 原记录 / 原记录 / 原记录 / 原记录"))

    out.add(BlockItem("对方",
        "对方的信息靠<b>转太极点</b>取：我克者为妻财——「速喜转赤口」，把落宫转过去、三宫同转再读（04 原记录 第22条）。" +
            "问现有的感情按事件取宫、不硬套官鬼（03 原记录）。要准确还得知卦主年龄生肖，再把三宫转完。",
        "corpus/04 原记录"))
    out.add(BlockItem("变数",
        "留连是六神中唯一不完全确定的宫，夜里测到尤甚，结论不封死（05 原记录⑧）；婚事落留连而地利生之，纠纷落房产与钱（04 原记录 第15条）。" +
            "婚否还有一层——「一个卦里三层可以同时成立」：已婚、离婚、离婚后仍同居并读（03 原记录）。",
        "corpus/05 原记录"))
    return out
}

/* ---------- 孕：性别 / 双胎 / 天数 ---------- */
private fun extraPreg(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    out.add(BlockItem("性别",
        "主口径：<b>大安 · 空亡 · 小吉 ＝ 男孩；留连 · 速喜 · 赤口 ＝ 女孩</b>。" +
            "其中<b>大安 · 小吉 · 留连三宫另有女性几率</b>，不是一锤定音——「大安、留连、小吉，三个宫位会随着一定的因素改变」（04 原记录）。" +
            "让这三宫翻转的具体因素，材料未给清单。",
        "corpus/04 原记录"))
    if (c.g1 == "空亡" && c.g2 == "空亡" && c.g3 == "空亡") {
        out.add(BlockItem("双胎", "<b>空亡 · 空亡 · 空亡 ＝ 双胞胎（男）</b>。", "corpus/05 原记录"))
    }
    if (c.g1 == "空亡" && c.g2 == "赤口" && c.g3 == "空亡") {
        out.add(BlockItem("双胎", "<b>空亡 · 赤口 · 空亡</b> 这一盘：本批材料未给读法——「龙凤胎」一路不在 corpus/04、05 里，不许拿旧说顶上。", "corpus/04 原记录"))
    }
    out.add(BlockItem("天数", "孕天数：本批材料未给取数法（04 原记录、原记录 均无）——不给天数，也不用两端宫数折算。", "corpus/04 原记录"))
    out.add(BlockItem("存疑", "孕事上的留白：什么因素会让大安 · 小吉 · 留连翻成女，未给清单；空亡配土对应何脏腑作者未答；怀胎月份、预产期未给。", "corpus/04 原记录"))
    return out
}

/* ---------- 财：财库 / 组合 / 合作 ---------- */
private fun extraMoney(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    out.add(BlockItem("取角色",
        "取五行定角色：<b>木为项目、金为投资，资金是水</b>——「金生水，水生木」，故以水所在之宫断投资金额（corpus/04 原记录 第56条）。" +
            "项目五行换位时不照搬，「以生项目为主」。",
        "corpus/04 原记录"))
    val lg = wx(c.g3)
    val di = wx(c.g2)
    val rel = when {
        lg == di -> "同五行＝比肩，平顺、多以利看（生克只是关系与状态，不作谁把谁克死）。"
        SHENG[lg] == di -> "落宫生地宫 ＝ <b>泄</b>，付出多、消耗大；也可视为投资。"
        SHENG[di] == lg -> "地宫生落宫 ＝ 有进项、财往你这边来。"
        KE[lg] == di -> "落宫克地宫 ＝ 落宫去克地宫，主动去拿才有（克出为得一说见 05 原记录论速喜宫性）。"
        else -> "地宫克落宫 ＝ 财上有压力、被压着；克是相互的，须有承受的一方。"
    }
    out.add(BlockItem("财库", "落宫 ${c.g3}（$lg）与地宫 ${c.g2}（$di）：$rel", "corpus/03 原记录"))

    val tian = wx(c.g1)
    val ren = wx(c.g3)
    val l2 = mutableListOf<String>()
    if (KE[ren] == di) l2.add("人与地为克——材料只给「天与人克地」一例，单看人克地的读法未给")
    if (KE[tian] == di && KE[ren] == di) l2.add("天与人克地 ＝ 租金偏高、招人不易，或投资方与卦主对场地不满意（第57条）")
    if (SHENG[ren] == di) l2.add("人生地 ＝ 泄，吃力耗时")
    if (l2.isNotEmpty()) out.add(BlockItem("组合", l2.joinToString("；") + "。", "corpus/04 原记录"))
    out.add(BlockItem("合作",
        "特别规则：<b>比助只在合作之事上作助</b>——「如果不是因为合作之事，赤口落宫，体用比助不一定有什么大的作用」；" +
            "且只是协商一致的假象，实则矛盾暗藏（第50、51条）。",
        "corpus/04 原记录"))
    return out
}

/* ---------- 工作：行业属性 / 多选项四法 ---------- */
private fun extraWork(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    val kg = keGongOf(c.g3)
    out.add(BlockItem("行业",
        "取宫按六亲：以落宫为我，「我克者妻财」——落宫 ${c.g3}（${wx(c.g3)}）克 " +
            (kg ?: "—") + "（" + (kg?.let { wx(it) } ?: "—") + "）⇒ 该项落在妻财位，行业属性偏" +
            (kg?.let { wx(it) } ?: "—") + "性。行业名录材料未给（05 原记录·2），只到这一步。",
        "corpus/03 原记录"))
    out.add(BlockItem("多选项",
        "四路比法：① <b>类象法</b>——哪一项的类象合${c.g3}；② <b>方位法</b>——${c.g3}＝${G[c.g3]!!.fw}，" +
            "再看方位合不合体用五行；③ <b>性质类别法</b>——哪一项的类别被体用五行所生；" +
            "④ <b>分类分析</b>——赤口→升职、留连→得利、小吉／水→轻松＋贵人运、大安／木→综合平顺＋人脉成长。",
        "corpus/04 原记录"))
    return out
}

/* ---------- 病：三宫分工 / 人宫要动 / 病位 / 应期 / 禁区 ---------- */
private fun extraIll(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    out.add(BlockItem("三宫分工",
        "天时为得病之<b>因</b>（你为${c.g1}）；地宫为<b>病位与传变</b>（${c.g2}，中宫空亡即入土）；人宫为<b>结果</b>（${c.g3}）" +
            "——「天时为得病原因」「人宫为结果」（corpus/04 原记录）。",
        "corpus/04 原记录"))
    val move = c.g3 == "小吉" || c.g3 == "速喜"
    out.add(BlockItem("关键",
        "<b>人宫要动，人要动才吉</b>——「动则吉、不动则死」，动则有贵人、有良医（第45条）。" +
            "本卦人宫为 ${c.g3}（${G[c.g3]!!.act}）" +
            (if (move) "，属「动」的一侧，宜尽快就医、宜有行动。" else "，不是「动」的一侧——<em>务必主动就医，不要等</em>。") +
            " 材料记的一例是：断词送医院则吉、不送则亡，家属未送医。",
        "corpus/04 原记录"))
    out.add(BlockItem("观八卦",
        "断病位／病象可合八卦取象（材料一例：空亡转而取象为兑卦、呼吸道）。" +
            (if (c.gua.isNotEmpty()) "本卦具象为 <b>${c.gua}</b>——${GUA_XIANG[c.gua] ?: ""}。"
             else "可在左侧勾选「附带八卦具象」后一并看。"),
        "corpus/05 原记录"))
    out.add(BlockItem("应期",
        "以落宫数取日：${c.g3} 取 ${G[c.g3]!!.ying}；材料只示范了速喜一宫的三、六、九（六日一转折、九日康复），" +
            "须在克日、泄日里取最合的一日，<b>从卜卦日起算</b>。",
        "corpus/04 原记录"))
    out.add(BlockItem("禁区",
        "<em>本页不替代医疗意见；疾病的具体诊断与用药材料未涉及（04 原记录）。断病只作方向提示，以医生诊断为准。</em>",
        "corpus/04 原记录"))
    return out
}

/* ---------- 失物：要不要找（体用）/ 方位 / 应期 ---------- */
private fun extraLost(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    val lg = wx(c.g3)
    val zi = ZWX[c.zi - 1]
    val rel = when {
        SHENG[lg] == zi -> "体生用——为耗，要主动想办法去找才行；主动去找还是有希望的。"
        SHENG[zi] == lg -> "用生体——本批寻物案未给这一关系的读法，回到落宫与三宫看。"
        KE[lg] == zi -> "体克用——本批寻物案未给这一关系的读法，口径只到体生用为耗、用克体难而有希望。"
        KE[zi] == lg -> "用克体——虽然有找到的希望，但是也难，要积极主动才好。"
        else -> "比和——材料未给失物上比和的读法，回到落宫与三宫看。"
    }
    out.add(BlockItem("要不要找", "体用定要不要主动找：$rel", "corpus/04 原记录"))
    val kg = keGongOf(c.g3)
    out.add(BlockItem("方位",
        "寻物方位材料未给：本例只到「小吉水，餐厅消费处」，未落到罗盘方位（04 原记录 第65条 · 原记录）。" +
            "材料里有方位的是另一案（失财）：按卦与事发日地支的克应定——赤口为金、乙巳日火克金，应在卦主家的西南位（第76条）。" +
            "下面这一行是软件按宫—所克—方位的复算：落宫 ${c.g3}（$lg）克 ${kg ?: "—"} ⇒ " +
            (kg?.let { G[it]!!.fw } ?: "—") + "，<b>非原文成法</b>，仅供参考。",
        "corpus/04 原记录"))
    out.add(BlockItem("应期",
        "由五行生克＋当时时辰定：本卦若是体生用则为耗，越拖越不利（戌时问＝火生土＝体生用为耗，材料一例）。" +
            "当日有利时辰已过，应期顺延到次日同一气的时辰——「所以，你会在今天的巳午时找到」（04 原记录 第67、68条）。",
        "corpus/04 原记录"))
    return out
}

/* ---------- 出行：归期 / 倾向 ---------- */
private fun extraTravel(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    out.add(BlockItem("归期",
        "<em>行人何时归、在何方的具体取数与方位规则，本批材料未给出（04 原记录 留白）——这里不编。</em>能给的只有落宫性质（上表）。",
        "corpus/04 原记录"))
    val lu = c.g3 == "小吉" || c.g3 == "速喜" || c.g3 == "大安"
    out.add(BlockItem("倾向",
        if (lu) "落宫为 ${c.g3}——偏会来、正在路上这一侧；大安还没动身，催一下比干等好。"
        else "落宫为 ${c.g3}——偏不来、拖延、有变这一侧，宜主动确认。",
        "corpus/04 原记录"))
    return out
}

/* ---------- 官司：真伪 / 格局 / 注意 / 取保 ---------- */
private fun extraLaw(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    if (c.g1 == "赤口") {
        out.add(BlockItem("真伪",
            "天宫赤口 ＝ <b>谎言、骗子之象</b>——「赤口为天时，赤口我以前讲过，有谎言，骗子之意」（corpus/04 原记录 第75条）。",
            "corpus/04 原记录"))
    }
    if (wx(c.g1) != wx(c.g3) && KE[wx(c.g1)] == wx(c.g2)) {
        out.add(BlockItem("格局",
            "天盘／地盘皆克人盘 ⇒ <b>已失天时地利</b>——「首先，天盘、地盘都克人盘，也就是说己失天时地利了」，处境被动（corpus/04 原记录 第77条）。",
            "corpus/04 原记录"))
    }
    if (c.g3 == "大安") {
        out.add(BlockItem("注意",
            "大安虽吉，但「身未动」＝<b>财不动</b>——「另外，大安，也代表财不动了，己到别人那了，不动了岂还有回来之理」；" +
                "另一层是叫你财别再动，「否则会被骗更多」（corpus/04 原记录 第77、78条）。",
            "corpus/04 原记录"))
    }
    out.add(BlockItem("取保",
        "看押类问题材料未给断法，只有两条可用：空亡宫有牢狱之象（corpus/05 原记录⑦）；要转太极点则按神煞转法、看神煞相克（corpus/03 原记录）。取保成否，本批未给出。",
        "corpus/05 原记录"))
    return out
}

/* ---------- 考：输赢 / 提问取向 / 大数 ---------- */
private fun extraExam(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    val ji = listOf(c.g1, c.g2, c.g3).count { it == "大安" || it == "速喜" || it == "小吉" }
    val verdict = when (ji) {
        3 -> "三宫皆吉宫。"
        0 -> "三宫皆凶宫。"
        else -> "三宫吉凶混杂（吉宫 $ji 个）。"
    }
    out.add(BlockItem("输赢",
        verdict + "六神三吉三凶是先定的那一层（大安 · 速喜 · 小吉为吉，留连 · 赤口 · 空亡为凶），" +
            "但<b>比赛胜负、考试分数怎么取，本批材料未给案例</b>（04 原记录）——这里只报吉凶格局，不出输赢结论。",
        "corpus/05 原记录"))
    out.add(BlockItem("提问",
        "问法决定给什么：「卦问吉凶则断吉凶，卦不问吉凶，只分析结果」（04 原记录 第1条）。所以问能过吗与问不能过吧不是同一个问，改问法即改取用。",
        "corpus/04 原记录"))
    out.add(BlockItem("大数",
        "预测大数（如金牌数）：<b>以事件起始时的农历取数</b>；取数先取尾数、排位数留到定位时才用（04 原记录 第120、121、125条）。名次、分数这类数量，材料未给案例（04 原记录）。",
        "corpus/04 原记录"))
    return out
}

/* ---------- 天气：读法 / 三宫定位 / 时间轴 / 应期 / 温度 / 组合 / 风向 / 口诀 ---------- */
private fun extraWeather(c: Context): List<BlockItem> {
    val out = mutableListOf<BlockItem>()
    out.add(BlockItem("怎么读",
        "天气卦只取生克关系，<b>不套体用</b>——「这里只有关系，没有体用」（corpus/04 原记录）。天气卦先辨问法（口径）：" +
            "问会不会下雨／下雪就只答会不会＋一句理由；问天气如何才描述天气。能取证的部分只到六宫天象、三宫连读、" +
            "年→季→月→日的大格局与生克定快慢——分流这一条材料本身没给。",
        "corpus/04 原记录"))
    out.add(BlockItem("三宫定位",
        "<b>先定落宫，再反推天地</b>：落宫＝天气的体现（结果）；回头推天宫＝气／先天条件、地宫＝地理环境与当地气温——" +
            "<b>天地是形成落宫这场天气的条件</b>，不是落宫之前的气候变化。注意：不许拿天宫先定天气。",
        "corpus/04 原记录"))
    out.add(BlockItem("时间轴",
        "三宫顺序＝天气推进顺序（原则）。<b>生者动缓会延误、克者立竿见影</b>；具体落在哪个时辰，要按这一卦的日干支与落宫的生克自己推。" +
            "注意：别把某一卦的具体时辰串当模板——那是那一卦的结论。",
        "corpus/04 原记录"))
    out.add(BlockItem("应期三则",
        "断到时辰：① <b>先定当日日干支</b>，再看当日地支时辰与落宫的生克，不可拿六神所配地支直接当降雨时刻（第90条）；" +
            "② <b>生则延误、克则速变</b>——日干支与落宫是生关系，天象到来会延后一程；是克关系，变化来得快（第91条）；" +
            "③ <b>时辰段按三宫次序排</b>成时段（第92条），有正解，不是大致对就算。",
        "corpus/04 原记录"))
    out.add(BlockItem("温度",
        "温度：以日干五行生落宫得当日最高温、以日支五行克落宫得最低温；作者自标「非精准，基本温度」（第94条）。" +
            "宫数只作量级参考——<b>不是把宫里的数字直接当温度</b>，学员据「速喜369」报 36.9 度，作者未采用。",
        "corpus/04 原记录"))
    val combo = c.g1 + "＋" + c.g2
    val sp = mapOf(
        "留连＋留连" to "雾", "留连＋空亡" to "霜", "赤口＋空亡" to "雪（积雪）",
        "赤口＋留连" to "小雪", "赤口＋赤口" to "雹",
    )[combo]
    if (sp != null) {
        out.add(BlockItem("组合", "天宫＋地宫为 <b>$combo</b> ⇒ <b>$sp</b>。", "corpus/05 原记录"))
    }
    out.add(BlockItem("格局", "先合大格局：<b>年 → 季 → 月 → 日</b>，由大往小虑；且<b>地区不能太广</b>，只按当地情况说。", "corpus/04 原记录"))
    out.add(BlockItem("风向",
        "风向：<b>天时起风处、地利为去向、落宫为偏</b>（第96条）。本卦起＝${G[c.g1]!!.fw}、去＝${G[c.g2]!!.fw}、偏＝${G[c.g3]!!.fw}。",
        "corpus/04 原记录"))
    out.add(BlockItem("口诀",
        "生克口诀：木克土为干、土克水为旱、水克火为雾、火克金为霾、金克木为霜；金生水为雨、水生木为露、木生火为霞、火生土为夕、土生金为雹；" +
            "金金为雪、火火为电、木木为雷、水水为涝、土土为震（第95条）。",
        "corpus/04 原记录"))
    return out
}

/* ---------- 通用：只给落宫特性与方位 ---------- */
private fun extraGeneral(c: Context): List<BlockItem> = listOf(
    BlockItem("特性", "落宫 ${c.g3}：${G[c.g3]!!.xing}。核心动作词「<b>${G[c.g3]!!.act}</b>」。", "corpus/03 原记录"),
    BlockItem("方位", "落宫方位 ${G[c.g3]!!.fw}；${szTx(c.g3)}；${gxTx(c.g3)}。", "corpus/03 原记录"),
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
