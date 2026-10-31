package com.xlr.k.judge

/* ⚠ 由 apps/shared-judgment 的判据表导出，改动后重新构建。 */

internal val MARRIAGE_SUIT_GOOD = "适合。但\"适合\"和\"能不能结\"是两件事，结婚还另有一堆条件。"
internal val MARRIAGE_SUIT_BAD = "目前还不适合。"

internal val WEATHER_BY_PALACE: Map<String, String> = mapOf(
        "大安" to "晴（阴晴不定）",
        "留连" to "细雨",
        "速喜" to "晴",
        "赤口" to "暴雨",
        "小吉" to "雨",
        "空亡" to "阴"
)

internal val LOST_FIND: Map<String, String> = mapOf(
        "大安" to "别乱翻，多半还在原处没动过。",
        "留连" to "东西还在原地，能找到。",
        "速喜" to "东西已经被人看到了，找的时候多问周围人。",
        "赤口" to "是丢了（遗失或随手放忘了），不是被收好。",
        "小吉" to "有希望找回，但不容易，得主动去找。",
        "空亡" to "基本找不到了。"
)
