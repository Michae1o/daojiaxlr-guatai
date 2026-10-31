package com.xlr.k.judge

/* ⚠ 由 apps/shared-judgment 的判据表导出：这些期望值来自早先的 JS 实跑，改动后重新构建。 */

internal data class CastCase(val name: String, val expect: String)

internal val CAST_CASES: List<CastCase> = listOf(
    CastCase("clock-2026-10-28-1230", "空亡/留连/小吉|12,3,10|7|午|clock-auto"),
    CastCase("clock-0005", "赤口/大安/小吉|10,10,5|1|子|clock-auto"),
    CastCase("clock-manual", "速喜/速喜/空亡|3,7,10|12|亥|clock-manual"),
    CastCase("num-1-2-3", "大安/留连/赤口|1,2,3|5|辰|num"),
    CastCase("num-zero", "赤口/大安/赤口|10,10,10|7|午|num"),
    CastCase("date-2026-10-28", "速喜/速喜/小吉|9,19,9|9|申|date"),
    CastCase("date-2027-01-01", "小吉/赤口/赤口|11,24,1|1|子|date"),
)
