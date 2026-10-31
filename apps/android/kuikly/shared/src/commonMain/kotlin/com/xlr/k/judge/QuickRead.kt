package com.xlr.k.judge

import kotlinx.datetime.LocalDateTime

/* 本机速断（quickReadCore.js 的 Kotlin 版，逐支对照搬家）。
   口径：先给答案，再一句理由；不铺依据、不列类象、不碰体用。
   ⚠ 措辞与分支顺序必须跟早先的 JS 一致，否则同一卦会说出不一样的话。 */

private fun speak(s: String): String =
    s.replace("——", "，").replace("，，", "，")

/** 落宫性质白话：取 xing 的前两段（先切掉 —— 之后的解释） */
private fun tag(g: String): String {
    val x = (G[g]?.xing ?: "").replace(Regex("——.*$"), "")
    val ps = x.split(Regex("[、，]")).filter { it.isNotBlank() }
    return if (ps.size >= 2) ps.take(2).joinToString("、") else x
}

private fun pairRel(a: String, b: String): String {
    val wa = G[a]!!.wx
    val wb = G[b]!!.wx
    if (wa == wb) return "比和"
    if (SHENG[wa] == wb) return "生"
    if (KE[wa] == wb) return "克"
    if (SHENG[wb] == wa) return "被生"
    return "受制"
}

private val T2D = mapOf(
    "生" to "接得上，一路往下",
    "克" to "这里别住了",
    "被生" to "中间回头照应起头",
    "受制" to "中间压着起头",
    "比和" to "两段同气",
)

private val D2R = mapOf(
    "生" to "结果是顺着中间这一步过来的",
    "克" to "中间压着结果，这一步是硬拿",
    "被生" to "结果反过来照应中间，越往后越费劲",
    "受制" to "结果压住中间，前面铺的路到后面用不上",
    "比和" to "中间和结果同气，顺",
)

/* 应期：季节 → 月份区间 */
private fun seasonOf(g: String): Pair<IntArray, String> {
    val ji = G[g]?.ji ?: ""
    val table = listOf(
        Triple("长夏", intArrayOf(5, 7), "长夏"),
        Triple("冬春", intArrayOf(2, 4), "冬春之交"),
        Triple("辰巳|四季土", intArrayOf(4, 6), "春末夏初"),
        Triple("春", intArrayOf(2, 4), "春天"),
        Triple("秋", intArrayOf(8, 10), "秋天"),
        Triple("冬", intArrayOf(11, 1), "冬天"),
    )
    for ((re, span, name) in table) if (Regex(re).containsMatchIn(ji)) return span to name
    return intArrayOf(3, 5) to "这一季"
}

private fun whenPoint(g: String, now: LocalDateTime): String {
    val (span, name) = seasonOf(g)
    val near = (G[g]?.jx ?: "").endsWith("吉")
    var off = if (near) 0 else 1
    val m = now.monthNumber
    val crossed = if (span[0] <= span[1]) m > span[1] else (m > span[1] && m < span[0])
    if (crossed) off += 1
    val whenTxt = if (off == 0) "今年" else if (off == 1) "明年" else "后年"
    return whenTxt + name + "，" + span[0] + " 到 " + span[1] + " 月"
}

private fun durationOf(g: String): String {
    val san = G[g]?.san ?: ""
    val n = san.split(Regex("[·\\s]+")).firstOrNull()?.toIntOrNull() ?: 3
    val a = G[g]?.act ?: ""
    val unit = when (a) {
        "快" -> listOf("天", "周")
        "动" -> listOf("周", "个月")
        else -> listOf("个月", "季")
    }
    return "$n ${unit[0]}到 $n ${unit[1]}"
}

/* 是非问句的判定词：跟问法走 */
private val VD = listOf(
    "会不会" to "会", "能不能" to "能", "可不可以" to "可以", "可否" to "可以",
    "有没有" to "有", "行不行" to "行", "该不该" to "该", "是不是" to "是", "是否" to "是",
    "顺利" to "顺", "成功" to "成", "成不成" to "成",
)

/** 主函数：返回「**结论**\n\n一句理由」（** 是加粗标记，界面层负责吃掉） */
internal fun quickRead(ctx: Context, now: LocalDateTime): String {
    if (!G.containsKey(ctx.g3)) return ""
    val g1 = ctx.g1
    val g2 = ctx.g2
    val g3 = ctx.g3
    val gg = G[g3]!!
    val q = ctx.q
    val catKey = ctx.catKey

    val isWhere = Regex("哪|何处|什么地方|何方|位置|方位").containsMatchIn(q)
    val isPoint = Regex("什么时候|何时|几时|哪天|几月|哪年").containsMatchIn(q)
    val isDur = Regex("还有多久|多久能|多长时间|几天|几个月|多久").containsMatchIn(q)
    val isSuit = Regex("适合|该不该|要不要嫁|要不要娶|值得").containsMatchIn(q)
    val isYn = Regex("吗|嘛|是否|能否|会不会|能不能|可不可以|有没有|行不行|该不该").containsMatchIn(q) ||
        Regex("(.)不\\1").containsMatchIn(q)

    var head = ""
    val why = mutableListOf<String>()

    if (isWhere) {
        /* 方位＝「落宫克的那一宫」的方向（judgment.js 的 方位 项：KE[落宫五行] === 该宫五行） */
        val keWx = KE[gg.wx]
        val keGong = GONG.firstOrNull { G[it]?.wx == keWx }
        head = "**往" + (keGong?.let { G[it]?.fw } ?: gg.fw) + "那边找**"
        why.add("方向看的是落宫克的那一宫：它在哪边，就往哪边找，以你现在住的地方为中心。")
    } else if (isPoint) {
        head = "**" + whenPoint(g3, now) + "**"
        why.add("时间按这一宫管的季节推，吉的近一点，不吉的远一点。想钉到哪一年，得先知道你的属相。")
    } else if (isDur) {
        head = "**大概 " + durationOf(g3) + "**"
        why.add("这一宫自带三个数 " + (gg.san) + "，问\"还有多久\"就拿它当个量。数只是参考，不是日期。")
    } else if (isSuit && catKey == "marriage") {
        val ok = gg.jx.endsWith("吉")
        head = "**" + (if (ok) "适合" else "眼下还不适合") + "**"
        val s = (if (ok) MARRIAGE_SUIT_GOOD else MARRIAGE_SUIT_BAD)
            .replace(Regex("^适合。|^目前还不适合。"), "").trim()
        why.add(if (s.isNotEmpty()) s else ("这一宫偏" + tag(g3) + "，吉凶是" + gg.jx + "，现在不是能定下来的状态。"))
    } else if (catKey == "weather") {
        val d1 = WEATHER_BY_PALACE[g1] ?: ""
        val d2 = WEATHER_BY_PALACE[g2] ?: ""
        val d3 = WEATHER_BY_PALACE[g3] ?: ""
        val askRain = Regex("会下雨|会下雪|下不下|下雨吗|下雪吗|会不会下|要下吗|下不下雨").containsMatchIn(q)
        val snow = q.contains("雪")
        if (askRain) {
            head = "**" + (if (d3.contains("雨") || d3.contains("雪")) "会" else "不会") + "**"
            why.add("先看落宫：落到" + g3 + "，天象是" + d3 + "，这就是结果；天宫" + g1 + "是" + d1 + "（气）、地宫" + g2 + "是" + d2 + "（地理气温），这两宫是形成它的条件。")
            why.add(
                if (snow) "雪还要地面够冷，按你当地的气温看；正问是「明天天气如何」。"
                else "要问得更准，直接问「明天天气如何」，别把天气问成吉凶题。"
            )
        } else {
            head = "**" + d3 + "**"
            why.add("先定落宫：落到" + g3 + "，天象是" + d3 + "——这就是天气本身。")
            why.add("再反推天地：天宫" + g1 + "是" + d1 + "（气、先天条件），地宫" + g2 + "是" + d2 + "（地理与当地气温），这两宫是形成它的条件。")
        }
    } else if (isYn) {
        if (head.isEmpty()) {
            val lost = if (catKey == "lost") LOST_FIND[g3] else null
            if (lost != null) {
                head = "**" + lost.replace(Regex("。$"), "") + "**"
            } else {
                var verb = ""
                for ((k, v) in VD) if (q.contains(k)) {
                    verb = v
                    break
                }
                if (verb.isEmpty()) verb = if (q.contains("会")) "会" else if (q.contains("能")) "能" else "是"
                val yes = gg.jx.endsWith("吉")
                val negQ = Regex("严重|要紧|危险|厉害|更糟|恶化|有没有问题|有没有事|难吗").containsMatchIn(q)
                val good = if (negQ) !yes else yes
                val bian = (gg.xing).contains("变数")
                if (bian) {
                    head = "**还没定，眼下还拖着**"
                    why.add("落宫是留连：六宫里只有它自带变数 —— 不是成了，也不是没成，是还缠着。")
                } else {
                    head = "**" + (if (good) verb else if (verb == "有") "没有" else "不$verb") + "**"
                }
            }
        }
    } else {
        head = "**" + tag(g3) + "**"
        why.add(
            "你没问吉凶，那先看这一宫是什么脾气（" +
                (if (gg.jx == g3) g3 else g3 + "，" + gg.jx) + "）。"
        )
    }

    val isWeather = catKey == "weather"
    if (why.isEmpty() && !isWeather) {
        val k12 = pairRel(g1, g2)
        val k23 = pairRel(g2, g3)
        why.add(
            if (g1 == g2) "三宫 $g1→$g2→$g3：起头和中间同气，" + D2R[k23] + "。"
            else "三宫 $g1→$g2→$g3：" + T2D[k12] + "；" + D2R[k23] + "。"
        )
    }
    if (why.isEmpty()) why.add("最后落在" + g3 + "，" + gg.xing.replace(Regex("[。；\\s]+$"), "") + "。")

    return speak(head) + "\n\n" + why.take(1).joinToString("\n") { speak(it) }
}

/** 自检：跟早先的 JS 的实跑结果逐条对 */
fun quickSelfCheck(): String {
    val now = LocalDateTime(2026, 10, 28, 13, 30)
    var bad = 0
    val detail = StringBuilder()
    for (cs in QUICK_CASES) {
        val cast = Cast(
            steps = emptyList(), zi = cs.zi,
            gi = listOf(GONG.indexOf(cs.g[0]), GONG.indexOf(cs.g[1]), GONG.indexOf(cs.g[2])),
            g = cs.g, ziName = ZHI[cs.zi - 1], mode = "", src = "",
        )
        val ctx = buildContext(q = cs.q, bg = "", catKey = autoCat(cs.q), cast = cast)
        val got = quickRead(ctx, now)
        if (got != cs.expect) {
            bad++
            if (bad <= 3) detail.append("\n[").append(cs.name).append("] 期望 ").append(cs.expect).append(" / 实得 ").append(got)
        }
    }
    return if (bad == 0) "QUICK PASS ${QUICK_CASES.size}/${QUICK_CASES.size}" else "QUICK FAIL $bad/${QUICK_CASES.size}$detail"
}
