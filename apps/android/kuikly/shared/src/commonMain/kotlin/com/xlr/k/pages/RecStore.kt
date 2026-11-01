package com.xlr.k.pages

import com.xlr.k.judge.Rec
import com.xlr.k.judge.dumpRows
import com.xlr.k.judge.parseRows
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/* 卦例本（旧 apps/mobile-web/src/data/recordsStore.js 的存储层，键名沿用 `xlr-cases`）
   一条记录＝一次起卦；模型解完把断辞写回同一条（早先那一版 `__recId` 那套）。
   ⚠ 数据是扁平字符串表，落盘走 judge/JsonLite.kt（导出就是合法 JSON，能看到早先那一版那套字段名）。 */

internal object RecStore {
    private const val KEY = "xlr-cases"

    private fun stamp(): String {
        val d = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault())
        fun p(x: Int) = if (x < 10) "0$x" else "$x"
        return "${d.year}-${p(d.monthNumber)}-${p(d.dayOfMonth)} ${p(d.hour)}:${p(d.minute)}"
    }

    fun loadRaw(): MutableList<Rec> = parseRows(Platform.get?.invoke(KEY))

    /** 未删除的（界面用） */
    fun load(): List<Rec> = loadRaw().filter { (it["deleted"] ?: "").isEmpty() }

    fun save(a: List<Rec>) {
        Platform.put?.invoke(KEY, dumpRows(a.takeLast(200)))
    }

    /** 起一卦就记一条（同一卦不重复记：调用方传已有 id 就跳过） */
    fun add(q: String, bg: String, gua: String, cat: String, catKey: String, src: String, zi: Int): String {
        val id = "c" + Clock.System.now().toEpochMilliseconds()
        val a = loadRaw()
        a.add(
            mutableMapOf(
                "id" to id,
                "t" to stamp(),
                "q" to q,
                "bg" to bg,
                "gua" to gua,
                "cat" to cat,
                "catKey" to catKey,
                "zi" to zi.toString(),
                "src" to src,
                "duanci" to "",
                "ans" to "",
                "fb" to "",
                "note" to "",
                "rv" to "",
                "rvWhy" to "",
                "rvAt" to "",
            )
        )
        save(a)
        return id
    }

    fun updateDuanci(id: String, text: String, model: Boolean) {
        if (id.isEmpty()) return
        val a = loadRaw()
        for (r in a) if (r["id"] == id) {
            r["duanci"] = text
            if (model) r["ans"] = "model"
            save(a)
            return
        }
    }

    /** 应验标记：再点一次取消（早先那一版 setFb 的取反语义） */
    fun setFb(id: String, fb: String) {
        val a = loadRaw()
        for (r in a) if (r["id"] == id) {
            r["fb"] = if (r["fb"] == fb) "" else fb
            if (r["fb"] != "错") {
                r["rv"] = ""
                r["rvWhy"] = ""
            }
        }
        save(a)
    }

    fun setNote(id: String, note: String) {
        val a = loadRaw()
        for (r in a) if (r["id"] == id) r["note"] = note
        save(a)
    }

    fun del(id: String) {
        val a = loadRaw()
        for (r in a) if (r["id"] == id) r["deleted"] = Clock.System.now().toEpochMilliseconds().toString()
        save(a)
    }

    /** 回收站里的（已标记删除） */
    fun loadDeleted(): List<Rec> = loadRaw().filter { (it["deleted"] ?: "").isNotEmpty() }

    fun restore(id: String) {
        val a = loadRaw()
        for (r in a) if (r["id"] == id) r.remove("deleted")
        save(a)
    }

    /** 彻底删掉（出回收站） */
    fun purge(id: String) {
        save(loadRaw().filter { it["id"] != id })
    }

    fun clearAll() {
        val a = loadRaw()
        val now = Clock.System.now().toEpochMilliseconds().toString()
        for (r in a) if ((r["deleted"] ?: "").isEmpty()) r["deleted"] = now
        save(a)
    }

    /** 全部重置用：卦例本**真删干净**（不进回收站）——早先那一版那句 removeItem('xlr-cases') */
    fun wipeCases() {
        Platform.put?.invoke(KEY, "[]")
    }

    /* ---------- 复盘结果（写在同一条记录上，字段名照早先那一版 rv/rvWhy/rvRule） ---------- */

    fun setRv(id: String, html: String, why: String, rule: String) {
        val a = loadRaw()
        for (r in a) if (r["id"] == id) {
            r["rv"] = html
            r["rvWhy"] = why
            r["rvRule"] = rule
        }
        save(a)
    }

    /* ---------- 准则（早先那一版 `xlr-rules`，只从「你确认过的复盘」来） ---------- */

    private const val RKEY = "xlr-rules"

    fun loadRules(): MutableList<Rec> = parseRows(Platform.get?.invoke(RKEY))

    fun saveRules(a: List<Rec>) {
        Platform.put?.invoke(RKEY, dumpRows(a))
    }

    fun addRule(from: Rec, rule: String, why: String): Int {
        val a = loadRules()
        a.add(
            mutableMapOf(
                "id" to ("r" + Clock.System.now().toEpochMilliseconds()),
                "at" to stamp(),
                "from" to (from["id"] ?: ""),
                "gua" to (from["gua"] ?: ""),
                "q" to (from["q"] ?: ""),
                "rule" to rule,
                "why" to why,
            )
        )
        saveRules(a)
        return a.size
    }

    fun delRule(id: String) {
        saveRules(loadRules().filter { it["id"] != id })
    }

    /* ---------- 导出 / 导入（早先那一版数据栏那套语义） ---------- */

    fun exportCasesText(): String = dumpRows(loadRaw())

    fun exportRulesText(): String = dumpRows(loadRules())

    /** 早先那一版「只加不覆盖」：按 id 去重，本地已有的不动；没有 id 的现补一个；落盘前按时间排序 */
    fun mergeCases(incoming: List<Rec>): Int {
        val cur = loadRaw()
        val seen = cur.map { it["id"] ?: "" }.toMutableSet()
        var added = 0
        for (r in incoming) {
            val id = r["id"] ?: ""
            if (id.isNotEmpty() && seen.contains(id)) continue
            if (id.isEmpty()) r["id"] = "c" + Clock.System.now().toEpochMilliseconds() + "_" + added
            seen.add(r["id"] ?: "")
            cur.add(r)
            added++
        }
        if (added > 0) {
            val sorted = cur.sortedBy { it["t"] ?: "" }
            save(sorted)
        }
        return added
    }

    fun mergeRules(incoming: List<Rec>): Int {
        val cur = loadRules()
        val seen = cur.map { it["id"] ?: "" }.toMutableSet()
        var added = 0
        for (r in incoming) {
            val id = r["id"] ?: ""
            if (id.isNotEmpty() && seen.contains(id)) continue
            if (id.isEmpty()) r["id"] = "r" + Clock.System.now().toEpochMilliseconds() + "_" + added
            seen.add(r["id"] ?: "")
            cur.add(r)
            added++
        }
        if (added > 0) {
            saveRules(cur.sortedBy { it["at"] ?: "" }.takeLast(100))
        }
        return added
    }

    fun clearRules() {
        saveRules(emptyList())
    }
}
