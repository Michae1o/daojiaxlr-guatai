package com.xlr.k.judge

import kotlinx.datetime.LocalDate
import kotlinx.datetime.LocalDateTime

/* ⚠ 逐行对照 apps/shared-judgment/src/{judgment.js,cast.js} 移植，算式不改。
   本文件只放「算」的部分；界面上的展示文案仍在页面层。 */

internal data class LunarDate(val y: Int, val m: Int, val d: Int, val leap: Int)

internal data class ClockNums(val hh: Int, val mm: Int, val raw: List<Int>, val nums: List<Int>, val zi: Int)

internal data class Cast(
    val steps: List<Int>,
    val zi: Int,
    val gi: List<Int>,
    val g: List<String>,
    val ziName: String,
    val mode: String,
    val src: String,
    val clock: ClockNums? = null,
    val lunar: LunarDate? = null,
)

internal data class BodyUse(val t: String, val jx: String, val txt: String, val why: String)

internal data class Xiang(val yy: String, val gua: String, val xiang: String)

internal data class Context(
    val q: String,
    val bg: String,
    val catKey: String,
    val zi: Int,
    val g1: String,
    val g2: String,
    val g3: String,
    val src: String,
    val cat: Cat,
    val yy: String,
    val gua: String,
    val guaXiang: String,
    val bu: BodyUse,
)

/* ---------- 起卦 ---------- */

/** judgment.js:438 —— 六宫进位（0 基，六宫循环） */
internal fun advance(gi: Int, steps: Int): Int = (gi + steps - 1) % 6

/** cast.js:7-12 —— 时间取数：时 / 分十位 / 分个位，0 按 10 取 */
internal fun clockNums(dt: LocalDateTime): ClockNums {
    val hh = dt.hour
    val mm = dt.minute
    val raw = listOf(hh, mm / 10, mm % 10)
    val nums = raw.map { if (it == 0) 10 else it }
    val zi = ((hh + 1) shr 1) % 12 + 1
    return ClockNums(hh = hh, mm = mm, raw = raw, nums = nums, zi = zi)
}

/** cast.js:15-20 —— 报数归一：取绝对值，0 按 10 取 */
internal fun normalizeNums(vals: List<String?>): List<Int> = (0..2).map { i ->
    val x = vals.getOrNull(i)?.trim()?.toIntOrNull()?.let { kotlin.math.abs(it) } ?: 0
    if (x == 0) 10 else x
}

/** cast.js:23-26 */
internal fun numsFilled(vals: List<String?>): Boolean = (0..2).all { i ->
    val v = vals.getOrNull(i)
    v != null && v != ""
}

/** cast.js:29-32 —— 三路分支共同的出口算式 */
private fun finish(steps: List<Int>, zi: Int): Cast {
    val g1 = advance(0, steps[0])
    val g2 = advance(g1, steps[1])
    val g3 = advance(g2, steps[2])
    val gi = listOf(g1, g2, g3)
    return Cast(
        steps = steps.toList(),
        zi = zi,
        gi = gi,
        g = gi.map { GONG[it] },
        ziName = ZHI[zi - 1],
        mode = "",
        src = "",
    )
}

private fun mm2(mm: Int): String = if (mm < 10) "0$mm" else "$mm"

/** 分支 A：时间取数（时钟或手改三个数）。ziOverride = 用户手选了时辰（旧 变更记录） */
internal fun castByClock(dt: LocalDateTime, manualNums: List<String?>? = null, ziOverride: Int? = null): Cast {
    val t = clockNums(dt)
    val manual = manualNums != null && numsFilled(manualNums)
    val steps = if (manual) normalizeNums(manualNums!!) else t.nums
    val z = ziOverride ?: t.zi
    val r = finish(steps, z)
    val src = if (manual) {
        "时间取数·手改 ${steps.joinToString(" / ")}，${ZHI[z - 1]}时"
    } else {
        "时间取数 ${t.hh}:${mm2(t.mm)} ⇒ ${steps.joinToString(" / ")}，${ZHI[z - 1]}时"
    }
    return r.copy(mode = if (manual) "clock-manual" else "clock-auto", src = src, clock = t)
}

/** 分支 B：报数。zi 不传 ⇒ 按传入时刻算时辰 */
internal fun castByNums(rawNums: List<String?>, zi: Int? = null, dt: LocalDateTime): Cast {
    val nn = normalizeNums(rawNums)
    val z = zi ?: (((dt.hour + 1) shr 1) % 12 + 1)
    val r = finish(nn, z)
    val rawJoined = (0..2).joinToString(",") { i ->
        (rawNums.getOrNull(i)?.trim()?.toIntOrNull()?.let { kotlin.math.abs(it) } ?: 0).toString()
    }
    val nnJoined = nn.joinToString(",")
    val tail = if (nnJoined != rawJoined) "（0 按 10 取）" else ""
    val src = "报数 ${rawNums.getOrNull(0)} / ${rawNums.getOrNull(1)} / ${rawNums.getOrNull(2)}$tail，${ZHI[z - 1]}时"
    return r.copy(mode = "num", src = src)
}

/** 分支 C：公历日期 → 农历月日时（越界返回 null） */
internal fun castByDate(dateStr: String, zi: Int? = null, dt: LocalDateTime): Cast? {
    val p = dateStr.split("-")
    val lu = lunarOf(p[0].toInt(), p[1].toInt(), p[2].toInt()) ?: return null
    val z = zi ?: (((dt.hour + 1) shr 1) % 12 + 1)
    val steps = listOf(lu.m, lu.d, z)
    val r = finish(steps, z)
    val leapTxt = if (lu.leap == 1) "闰" else ""
    val src = "公历 $dateStr ⇒ 农历 ${lu.y} 年$leapTxt${lu.m} 月${lu.d} 日，${ZHI[z - 1]}时"
    return r.copy(mode = "date", src = src, lunar = lu)
}

/* ---------- 农历 ---------- */

private fun dayNum(y: Int, m: Int, d: Int): Int = LocalDate(y, m, d).toEpochDays()

private fun solarDayOfYear(year: Int, ny: String): Int {
    val mm = ny.substring(0, 2).toInt()
    val dd = ny.substring(3).toInt()
    return dayNum(year, mm, dd)
}

/** judgment.js:440-453 —— 逐行等价（原来的 Date.UTC 天数差换成 epochDays 差值） */
internal fun lunarOf(y: Int, m: Int, d: Int): LunarDate? {
    val t0 = dayNum(y, m, d)
    var ly = y
    var e = LUNAR[ly] ?: return null
    var base = solarDayOfYear(ly, e.ny)
    if (t0 < base) {
        ly = y - 1
        e = LUNAR[ly] ?: return null
        base = solarDayOfYear(ly, e.ny)
    }
    val off = t0 - base
    if (off < 0) return null
    val order = mutableListOf<Int>()
    for (i in 1..12) {
        order.add(i * 2)          // 月，非闰
        if (e.leap == i) order.add(i * 2 + 1) // 月，闰
    }
    var acc = 0
    var k = 0
    while (k < order.size) {
        if (off < acc + e.days[k]) break
        acc += e.days[k]
        k++
    }
    if (k >= order.size) return null
    val mIdx = order[k] / 2
    val isLeap = order[k] % 2
    return LunarDate(y = ly, m = mIdx, d = off - acc + 1, leap = isLeap)
}

/* ---------- 体用与关系 ---------- */

/** judgment.js:456-468 */
internal fun bodyUse(g3: String, zi: Int): BodyUse {
    val b = G[g3]!!.wx
    val u = ZWX[zi - 1]
    if (b == u) {
        val help = GYY[g3] != ZYY[zi - 1]
        return BodyUse(
            t = if (help) "比助" else "比劫",
            jx = if (help) "吉" else "凶",
            txt = if (help) "比助——朋友、有帮助" else "比劫——竞争、小人、阻碍",
            why = "体（$g3·$b·${GYY[g3]}）与用（${ZHI[zi - 1]}时·$u·${ZYY[zi - 1]}）五行相同，再看阴阳：" +
                if (help) "阴阳不同 ⇒ 比助（助我）" else "阴阳相同 ⇒ 比劫（克我）",
        )
    }
    if (SHENG[u] == b) return BodyUse("用生体", "大吉", "有贵人、有帮助、有好的转机", "用（$u）生体（$b）")
    if (KE[b] == u) return BodyUse("体克用", "小吉", "克出为收入；主动努力可得", "体（$b）克用（$u）")
    if (SHENG[b] == u) return BodyUse("体生用", "小凶", "泄、消耗、付出多；也可视为投资", "体（$b）生用（$u）")
    return BodyUse("用克体", "大凶", "受阻、有压力；克亦有考察、改造、占有之意，遂非俱凶", "用（$u）克体（$b）")
}

/** judgment.js:469-476 */
internal fun relTo(g: String, g3: String): String {
    val a = G[g]!!.wx
    val b = G[g3]!!.wx
    if (a == b) return "比肩（同五行）——平顺，多以利看"
    if (SHENG[a] == b) return "生落宫 —— 助"
    if (KE[a] == b) return "克落宫 —— 不利"
    if (SHENG[b] == a) return "落宫生之 —— 泄（耗）"
    return "落宫克之 —— 被落宫所制"
}

/** judgment.js:479-483 —— 三宫阴阳 → 八卦 */
internal fun xiangOf(g1: String, g2: String, g3: String): Xiang {
    val s = "${GYY[g1]}${GYY[g2]}${GYY[g3]}"
    val gua = YAO[s] ?: "—"
    return Xiang(yy = s, gua = gua, xiang = if (gua == "—") "" else (GUA_XIANG[gua] ?: ""))
}

/** judgment.js:486-496 */
internal fun buildContext(
    q: String,
    bg: String,
    catKey: String,
    cast: Cast,
): Context {
    val cat = CATS[catKey] ?: CATS["general"]!!
    val x = xiangOf(cast.g[0], cast.g[1], cast.g[2])
    return Context(
        q = q,
        bg = bg,
        catKey = catKey,
        zi = cast.zi,
        g1 = cast.g[0],
        g2 = cast.g[1],
        g3 = cast.g[2],
        src = cast.src,
        cat = cat,
        yy = x.yy,
        gua = x.gua,
        guaXiang = x.xiang,
        bu = bodyUse(cast.g[2], cast.zi),
    )
}

/** judgment.js:421-435 —— 按关键词命中数判事类，全不中走「通用」 */
internal fun autoCat(q: String): String {
    var best = "general"
    var bn = 0
    for ((k, cat) in CATS) {
        if (k == "general" || cat.kw.isEmpty()) continue
        var n = 0
        for (kw in cat.kw) if (q.contains(kw)) n++
        if (n > bn) {
            bn = n
            best = k
        }
    }
    return if (bn > 0) best else "general"
}

/* ---------- 自检：跟早先的 JS 的实跑结果对一遍 ---------- */

fun selfCheck(): String {
    val dt = LocalDateTime(2026, 10, 28, 12, 30)
    val dt2 = LocalDateTime(2026, 10, 28, 0, 5)
    val dt3 = LocalDateTime(2026, 10, 28, 21, 10)
    val got = listOf(
        summary(castByClock(dt)),
        summary(castByClock(dt2)),
        summary(castByClock(dt3, listOf("3", "7", "10"))),
        summary(castByNums(listOf("1", "2", "3"), 5, dt)),
        summary(castByNums(listOf("0", "0", "0"), 7, dt)),
        summary(castByDate("2026-10-28", 9, dt)!!),
        summary(castByDate("2027-01-01", 1, dt)!!),
    )
    val bad = CAST_CASES.mapIndexedNotNull { i, c -> if (got[i] != c.expect) "${c.name}: 期望 ${c.expect} / 实得 ${got[i]}" else null }
    return if (bad.isEmpty()) "PASS ${CAST_CASES.size}/${CAST_CASES.size}" else "FAIL\n" + bad.joinToString("\n")
}

private fun summary(c: Cast): String =
    c.g.joinToString("/") + "|" + c.steps.joinToString(",") + "|" + c.zi + "|" + c.ziName + "|" + c.mode
