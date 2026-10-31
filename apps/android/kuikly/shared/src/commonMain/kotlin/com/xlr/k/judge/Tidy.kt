package com.xlr.k.judge

/* 断辞清洗（旧 apps/shared-judgment/src/tidy.js 逐条搬）
   模型吐出来的那段字先过这里，再进 renderDoc 那套排版。 */

private const val CJK = "\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff"

private val RE_DIGIT_IN_CJK = Regex("([$CJK])[0-9]([$CJK])")
private val RE_DIGIT_BETWEEN_SAME = Regex("([$CJK])[0-9]\\1")
private val RE_LEAD_DIGIT = Regex("^(\\*\\*\\s*)?[0-9](?=[$CJK])", RegexOption.MULTILINE)
private val RE_HALF_PUNCT_AFTER_CJK = Regex("([$CJK])([,;:!?])")

private val FULL = mapOf(',' to '，', ';' to '；', ':' to '：', '!' to '！', '?' to '？')

internal fun tidyDuanci(input: String?): String {
    var s = input ?: ""
    if (s.isEmpty()) return s

    /* ① 零宽字符与方向控制符 */
    s = s.replace(Regex("[\\u200b-\\u200f\\u2028-\\u202e\\ufeff]"), "")

    /* ② 夹在两个字中间的单个半角数字（"不小5小" → "不小"）—— 最多跑三遍 */
    repeat(3) {
        val next = s.replace(RE_DIGIT_BETWEEN_SAME, "$1").replace(RE_DIGIT_IN_CJK, "$1$2")
        if (next == s) return@repeat
        s = next
    }

    /* ②c 行首孤零零的数字 */
    s = s.replace(RE_LEAD_DIGIT, "$1")

    /* ③ 汉字后的半角标点 → 全角 */
    s = s.replace(RE_HALF_PUNCT_AFTER_CJK) { m ->
        val p = m.groupValues[2].first()
        m.groupValues[1] + (FULL[p] ?: p)
    }

    /* ④ 重复的全角逗号/句号收成一个 */
    s = s.replace(Regex("，{2,}"), "，").replace(Regex("。{2,}"), "。")

    /* ⑤ 行尾空白（不改行数：空行当段距） */
    s = s.replace(Regex("[ \\t\\u3000]+$", RegexOption.MULTILINE), "")
    return s
}
