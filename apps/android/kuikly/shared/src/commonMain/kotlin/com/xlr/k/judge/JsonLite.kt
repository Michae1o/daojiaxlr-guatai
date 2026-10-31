package com.xlr.k.judge

/* 极简 JSON（只服务「卦例本」这类扁平对象数组，不追求通用）。
   形状： `[{"k":"v","n":"2"},…]`（值全部按字符串存，读回来也是字符串）。
   ⚠ 为什么不塞给宿主：存储层键名与早先那一版 `xlr-cases` 保持一致，导出时直接是合法 JSON。 */

internal fun jesc(s: String): String = buildString {
    for (ch in s) {
        when (ch) {
            '"' -> append("\\\"")
            '\\' -> append("\\\\")
            '\n' -> append("\\n")
            '\r' -> append("\\r")
            '\t' -> append("\\t")
            else -> if (ch.code < 32) append(' ') else append(ch)
        }
    }
}

internal fun junesc(s: String): String = buildString {
    var i = 0
    while (i < s.length) {
        val ch = s[i]
        if (ch == '\\' && i + 1 < s.length) {
            when (val n = s[i + 1]) {
                'n' -> append('\n')
                'r' -> append('\r')
                't' -> append('\t')
                '"' -> append('"')
                '\\' -> append('\\')
                'u' -> {
                    val hex = if (i + 5 < s.length) s.substring(i + 2, i + 6) else ""
                    val code = hex.toIntOrNull(16)
                    if (code != null) {
                        append(code.toChar())
                        i += 6
                        continue
                    }
                    append(n)
                }
                else -> append(n)
            }
            i += 2
            continue
        }
        append(ch)
        i++
    }
}

/* 一行记录＝一张扁平字符串表（卦例本用它） */
internal typealias Rec = MutableMap<String, String>

internal fun dumpRows(rows: List<Map<String, String>>): String = buildString {
    append('[')
    rows.forEachIndexed { i, row ->
        if (i > 0) append(',')
        append('{')
        var first = true
        for ((k, v) in row) {
            if (!first) append(',')
            first = false
            append('"').append(jesc(k)).append("\":\"").append(jesc(v)).append('"')
        }
        append('}')
    }
    append(']')
}

internal fun parseRows(raw: String?): MutableList<Rec> {
    val out = mutableListOf<Rec>()
    val s = raw ?: return out
    var i = 0
    var depth = 0
    var cur = mutableMapOf<String, String>()
    var key = ""
    val sb = StringBuilder()
    var inStr = false
    var asKey = false
    var expectKey = true
    var esc = false
    while (i < s.length) {
        val ch = s[i]
        if (inStr) {
            if (esc) {
                sb.append(ch)
                esc = false
            } else if (ch == '\\') {
                sb.append(ch)
                esc = true
            } else if (ch == '"') {
                inStr = false
                if (asKey) key = junesc(sb.toString()) else cur[key] = junesc(sb.toString())
                sb.setLength(0)
            } else {
                sb.append(ch)
            }
            i++
            continue
        }
        when (ch) {
            '{' -> {
                depth++
                if (depth == 1) {
                    cur = mutableMapOf()
                    expectKey = true
                }
            }
            '}' -> {
                if (depth == 1 && cur.isNotEmpty()) out.add(cur)
                depth--
            }
            ',' -> if (depth == 1) expectKey = true
            ':' -> expectKey = false
            '"' -> {
                inStr = true
                asKey = expectKey
                sb.setLength(0)
            }
            else -> {}
        }
        i++
    }
    return out
}

/** 从 `{"cases":[...],"rules":[...]}` 这种外壳里抠出某个数组（没有就返回 null）。
    早先那一版导入允许两种外形：裸数组 / 带 cases+rules 的对象。 */
internal fun sliceArray(raw: String?, key: String): String? {
    val s = raw ?: return null
    val k = s.indexOf("\"" + key + "\"")
    if (k < 0) return null
    val st = s.indexOf('[', k)
    if (st < 0) return null
    var depth = 0
    var inStr = false
    var esc = false
    var i = st
    while (i < s.length) {
        val ch = s[i]
        if (inStr) {
            if (esc) esc = false
            else if (ch == '\\') esc = true
            else if (ch == '"') inStr = false
        } else {
            when (ch) {
                '"' -> inStr = true
                '[' -> depth++
                ']' -> {
                    depth--
                    if (depth == 0) return s.substring(st, i + 1)
                }
                else -> {}
            }
        }
        i++
    }
    return null
}
