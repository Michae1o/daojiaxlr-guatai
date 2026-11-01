package com.xlr.k.pages

import androidx.compose.runtime.Composable
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Row
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.unit.dp
import com.xlr.k.judge.tidyDuanci

/* 断辞正文排版（旧 apps/mobile-web/src/data/docRender.js ＋ legacy.css #llmPane #doc 那几条）
   规则：先 tidyDuanci 清洗 → 按行拆：
     · 空行           ⇒ 段距 7px
     · 【xxx】余下文字 ⇒ 小节标题 h4（13/500/上 14 下 4）
     · 首块正文：
         · 前面没有小标题 ⇒ 本机速断：立成大字（44px 衬线、判定色，这里按屏宽取 34）
         · 前面有小标题   ⇒ 模型那条：**不放大**，只上判定色 + 加粗（旧 CSS `#doc>div.jy`）
     · 其余           ⇒ 普通正文 13.5 / 行高 1.95
   判词与括注：`判定词（括注）余下` ⇒ 判词上判定色、括注降灰降一档、余下照常。 */

internal sealed interface DocBlk {
    data class H(val t: String) : DocBlk
    /** kind: 0 普通 / 1 速断大字 / 2 模型结论块（判定色、不放大） */
    data class P(val t: String, val kind: Int) : DocBlk
    data object Gap : DocBlk
}

private val RE_HEAD = Regex("^【(.+?)】\\s*(.*)$")
private val RE_VERDICT = Regex("^(\\*\\*)?([^（）()]{1,16})（([^（）]{0,44})）(\\*\\*)?(.*)$")
private val RE_BOLD = Regex("\\*\\*(.+?)\\*\\*")

internal fun stripBold(s: String): String = s.replace(RE_BOLD, "$1")

internal fun docBlocks(raw: String, bigFirst: Boolean = true): List<DocBlk> {
    val t = tidyDuanci(raw)
    val out = mutableListOf<DocBlk>()
    var headSeen = false
    var bodySeen = false
    for (ln in t.split("\n")) {
        val s = ln.trim()
        if (s.isEmpty()) {
            out.add(DocBlk.Gap)
            continue
        }
        val m = RE_HEAD.find(s)
        if (m != null) {
            out.add(DocBlk.H("【" + m.groupValues[1] + "】"))
            headSeen = true
            val rest = m.groupValues[2]
            if (rest.isNotEmpty()) {
                out.add(DocBlk.P(rest, if (bodySeen) 0 else 2))
                bodySeen = true
            }
            continue
        }
        val kind = when {
            bodySeen -> 0
            headSeen -> 2
            bigFirst -> 1
            else -> 2      /* 模型那条：不放大，只上判定色 + 加粗（旧 CSS #doc>div.jy 的意图） */
        }
        out.add(DocBlk.P(s, kind))
        bodySeen = true
    }
    return out
}

@Composable
internal fun DocView(raw: String, modifier: Modifier = Modifier) {
    if (raw.isBlank()) {
        Text_(
            text = "还没有断辞。点下面的「让模型解卦」让它解。",
            fontSize = 12.5f,
            lineHeight = 22f,
            color = KY_DIM2,
            modifier = modifier,
        )
        return
    }
    Column(modifier = modifier) {
        docBlocks(raw).forEach { b -> DocBlockView(b) }
    }
}

/** 单块渲染（叁页把它拆成 LazyColumn 的多个 item —— Kuikly 里一整块超高 item 不好滚） */
@Composable
internal fun DocBlockView(b: DocBlk) {
    when (b) {
        is DocBlk.Gap -> Spacer(modifier = Modifier.height(7.dp))
        is DocBlk.H -> Text_(
            text = stripBold(b.t),
            fontSize = 13f,
            lineHeight = 21f,
            weight = 500,
            color = KY_INK,
            modifier = Modifier.padding(top = 14.dp, bottom = 4.dp),
        )
        is DocBlk.P -> when (b.kind) {
            /* 本机速断：整句就是结论 ⇒ 大字（判词判定色、括注灰小）*/
            1 -> {
                val v = RE_VERDICT.find(b.t)
                if (v != null) {
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text_(
                            text = stripBold(v.groupValues[2]),
                            fontSize = 30f,
                            lineHeight = 42f,
                            weight = 500,
                            serif = true,
                            letterSpacing = 1.0f,
                            color = KY_JYC,
                        )
                        Text_(
                            text = "（" + v.groupValues[3] + "）",
                            fontSize = 17f,
                            lineHeight = 28f,
                            color = KY_DIM2,
                            modifier = Modifier.padding(start = 2.dp, bottom = 6.dp),
                        )
                    }
                    val tail = v.groupValues[5]
                    if (tail.isNotBlank()) RichText_(text = tail, fontSize = 13.5f, lineHeight = 26f, color = KY_DIM)
                } else {
                    Text_(
                        text = stripBold(b.t),
                        fontSize = 30f,
                        lineHeight = 42f,
                        weight = 500,
                        serif = true,
                        letterSpacing = 1.0f,
                        color = KY_JYC,
                    )
                }
            }
            /* 模型结论块：字号/字体与本机速断一致（衬线 + 判定色），
               「判定词（括注）」那种短句直接立 30；整句结论（模型常写成一句话）用 22，
               免得三十个字全撑成标题。 */
            2 -> {
                val v = RE_VERDICT.find(b.t)
                if (v != null) {
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text_(
                            text = stripBold(v.groupValues[2]),
                            fontSize = 30f,
                            lineHeight = 42f,
                            weight = 500,
                            serif = true,
                            letterSpacing = 1.0f,
                            color = KY_JYC,
                        )
                        Text_(
                            text = "（" + v.groupValues[3] + "）",
                            fontSize = 17f,
                            lineHeight = 28f,
                            color = KY_DIM2,
                            modifier = Modifier.padding(start = 2.dp, bottom = 6.dp),
                        )
                    }
                    val tail = v.groupValues[5]
                    if (tail.isNotBlank()) RichText_(text = tail, fontSize = 13.5f, lineHeight = 26f, color = KY_DIM)
                } else {
                    val s = stripBold(b.t)
                    val big = s.length <= 18
                    Text_(
                        text = s,
                        fontSize = if (big) 30f else 22f,
                        lineHeight = if (big) 37f else 33f,
                        weight = 500,
                        serif = true,
                        letterSpacing = 1.0f,
                        color = KY_JYC,
                    )
                }
            }
            else -> RichText_(text = b.t, fontSize = 13.5f, lineHeight = 26f, color = KY_DIM)
        }
    }
}
