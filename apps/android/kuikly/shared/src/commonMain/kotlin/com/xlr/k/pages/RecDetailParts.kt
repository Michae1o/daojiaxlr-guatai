package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Row
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxWidth
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.width
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.text.TextStyle
import com.tencent.kuikly.compose.ui.unit.dp
import com.tencent.kuikly.compose.ui.unit.sp
import com.xlr.k.judge.Rec
import kotlinx.coroutines.launch

/* 记录详情里的两块：复盘（RvArea）与接着问（FollowAsk）。
   语义照早先那一版 Record.jsx 的 <Rv> 与 Detail：
   · 标了「没应验」→ 自动跑一次复盘（出网，让模型指出错在哪一步）；
   · 复盘只写在这条记录上（rv/rvWhy/rvRule），**点「写入准则」才进准则表**；
   · 接着问必须是用模型解过的卦（ans == model），一问一答追加到 thread。 */

@Composable
internal fun RvArea(r: Rec, onChange: () -> Unit, onRuleWritten: () -> Unit = {}) {
    val id = r["id"] ?: ""
    val rv = r["rv"] ?: ""
    var live by remember { mutableStateOf("") }
    var err by remember { mutableStateOf("") }
    var started by remember(id) { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val miss = LlmStore.missing(LlmStore.load())

    if (rv.isNotEmpty()) {
        Text_(text = rv, fontSize = 12.5f, lineHeight = 22f, color = KY_INK)
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            /* 旧 Records.jsx L203-205：写入准则 / 算了，不记 ＋ 一句 mini 说明；
               写完跟早先那一版一样切到「准则」那一页（旧 20-script L533 末尾 sdbTab('rules')） */
            SetBtn("写入准则", primary = true) {
                RecStore.addRule(r, r["rvRule"] ?: "", r["rvWhy"] ?: "")
                onChange()
                onRuleWritten()
            }
            Spacer(modifier = Modifier.width(8.dp))
            SetBtn("算了，不记") {
                RecStore.setRv(id, "", "", "")
                onChange()
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text_(
            text = "写入后，以后每次解卦都会一并交给模型",
            fontSize = 10.5f,
            lineHeight = 17f,
            color = KY_DIM2,
        )
        return
    }

    if (miss.isNotEmpty()) {
        Text_(
            text = "要复盘得先接一个模型——" + miss +
                "\n复盘会把这一卦和实际结果一起交给模型，让它指出错在哪一步。" +
                "\n（不接模型的话，这一条就只留在记录里，不生成复盘。）",
            fontSize = 10.5f,
            lineHeight = 19f,
            color = KY_DIM2,
        )
        return
    }

    if (live.isNotEmpty()) {
        Text_(text = live, fontSize = 12.5f, lineHeight = 22f, color = KY_INK)
        Spacer(modifier = Modifier.height(6.dp))
    }
    if (busy) {
        Text_(text = "复盘进行中…", fontSize = 10.5f, lineHeight = 17f, color = KY_DIM2)
    }
    if (err.isNotEmpty()) {
        Text_(text = err, fontSize = 10.5f, lineHeight = 18f, color = Color(0.70f, 0.26f, 0.22f))
        Spacer(modifier = Modifier.height(6.dp))
        SetBtn("重新复盘") {
            err = ""
            started = false
            scope.launch {
                started = true
                busy = true
                try {
                    val out = reviewCase(r) { t -> live = t }
                    RecStore.setRv(id, out.show, out.why, out.rule)
                    live = ""
                    onChange()
                } catch (e: Throwable) {
                    err = "复盘失败：" + (e.message ?: "")
                }
                busy = false
            }
        }
    }

    /* 早先那一版：标「没应验」自动复盘一次（这一条还没复盘过才跑） */
    LaunchedEffect(id, rv) {
        if (rv.isEmpty() && !started && miss.isEmpty()) {
            started = true
            busy = true
            try {
                val out = reviewCase(r) { t -> live = t }
                RecStore.setRv(id, out.show, out.why, out.rule)
                live = ""
                onChange()
            } catch (e: Throwable) {
                err = "复盘失败：" + (e.message ?: "")
            }
            busy = false
        }
    }
}

@Composable
internal fun FollowAsk(r: Rec, onChange: () -> Unit) {
    val id = r["id"] ?: ""
    var q by remember { mutableStateOf("") }
    var ans by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    SetField(q, { q = it }, ph = "接着问一句…")
    Spacer(modifier = Modifier.height(8.dp))
    SetBtn(if (busy) "问着呢…" else "发送") {
        if (q.isNotBlank() && !busy) {
            val qq = q
            busy = true
            ans = ""
            scope.launch {
                try {
                    val text = askModelStream(LlmStore.load(), com.xlr.k.judge.SYS, followUpUser(r, qq)) { t -> ans = t }
                    appendThread(id, qq, text)
                    q = ""
                    ans = ""
                    onChange()
                } catch (e: Throwable) {
                    ans = "问失败：" + (e.message ?: "")
                }
                busy = false
            }
        }
    }
    if (ans.isNotEmpty()) {
        Spacer(modifier = Modifier.height(8.dp))
        Text_(text = ans, fontSize = 12f, lineHeight = 21f, color = KY_DIM)
    }
}
