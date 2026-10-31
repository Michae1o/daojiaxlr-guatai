package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.animation.core.animateDpAsState
import com.tencent.kuikly.compose.animation.core.animateFloatAsState
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.foundation.Image
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.border
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Row
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxWidth
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.heightIn
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.foundation.layout.size
import com.tencent.kuikly.compose.foundation.layout.width
import com.tencent.kuikly.compose.foundation.shape.CircleShape
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.foundation.text.BasicTextField
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.foundation.lazy.LazyColumn
import com.tencent.kuikly.compose.foundation.lazy.itemsIndexed
import com.tencent.kuikly.compose.ui.draw.clip
import com.tencent.kuikly.compose.ui.draw.drawBehind
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.graphics.SolidColor
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.text.TextStyle
import com.tencent.kuikly.compose.ui.unit.dp
import com.tencent.kuikly.compose.ui.unit.sp
import com.xlr.k.judge.Block
import com.xlr.k.judge.Context
import com.xlr.k.judge.plainAll
import kotlinx.coroutines.launch

/* 叁页下面的「接着问」（旧 `#askBox`）
   版式真源：apps/mobile-web/src/tailwind.css L165–274（早先那一版这套是 JS 注入的，变更记录 之后由这里补回）
     · 它是**单独一个模块**：`#right > #askBox{padding:14px 18px; border-radius:--m-r-lg}`，
       底/边/影跟断辞卡片同一套（带 `pane` 类），宽度和断辞卡片对齐
     · `.ask-item{border-top:1px solid --line2; padding:8px 0 2px}`，第一条不要这条线
     · `.ask-q{13px/600}`，前面一个 `问 · `（dim、400）；`.ask-a{13px; line-height:1.75}`
     · `.ask-line{gap:8px}`；输入框 **透明底** + 1px 边 + 半径 8 + `padding:7px 10px` + 13px；
       按钮 `min-width:92px; height:48px`，输入框也 48（否则一高一矮）
     · 问着时按钮**形变成 48×48 圆**（0.36s），文字淡出，按钮皮收掉，里面是 44 的太极慢转 3.6s/圈
     · `.ask-list:not(:empty){margin-bottom:8px}`；空列表不占位
     · 顺序：list → line → tip（在本卦的基础上接着问，mt 7）→ note（状态行，mt 6）
   行为真源：data/modelAskCore.js 的 followupUser / runFollowup / askMore / persistThread。 */

internal object Follow {
    /** 本卦已问过的问答（q to a，a 为纯文本，空串＝正在解） */
    val items = mutableStateListOf<Pair<String, String>>()
    var q by mutableStateOf("")
    var busy by mutableStateOf(false)
    var note by mutableStateOf("")
    /** 太极只要出现过就一直留着（旧 orbOnce：askTaijiOff 也不删节点） */
    var orbOnce by mutableStateOf(false)

    fun reset() {
        items.clear()
        q = ""
        busy = false
        note = ""
        orbOnce = false
    }

    fun setLastA(a: String) {
        if (items.isEmpty()) return
        val i = items.lastIndex
        items[i] = items[i].first to a
    }
}

private const val ASK_TIP = "在本卦的基础上接着问"
private const val NO_KEY_NOTE = "还没配模型。点「设置」配一个再来；或先看上面那份速断结果。"

/* 旧 followupUser(c, B, thread, q) 逐字（modelAskCore L199–219） */
internal fun followUserMain(c: Context, B: List<Block>, thread: List<Pair<String, String>>, q: String): String {
    val L = mutableListOf<String>()
    L.add("请接着这一卦继续答（接前卦：同一卦内追问，不另起卦）。")
    L.add("")
    L.add(plainAll(c, B))
    L.add("【这一卦已经答过的】")
    if (thread.isEmpty()) L.add("（这是第一次追问）")
    thread.forEachIndexed { i, it ->
        L.add("问${i + 1}：" + it.first)
        L.add("答${i + 1}：" + it.second)
    }
    L.add("")
    L.add("【这次要问的】")
    L.add(q)
    L.add("")
    L.add("【续问规矩】")
    L.add("① 只用这一卦：不另起、不重起，答案要从这一卦里得出；")
    L.add("② 落宫为主：先看这一问在这卦里对应到哪座宫、什么关系，再答（问什么，是什么）；")
    L.add("③ 每处判断括注依据（哪宫／哪关系／哪条判据）；")
    L.add("④ 这一问若不在这一卦里（问的是旁人别的事、或无端之问），直接说「这不在这一卦里」并讲清原因，不要硬答；")
    L.add("⑤ 不要主动再问、不要邀着继续问、不展开没问到的东西；")
    L.add("⑥ 格式同主断辞（【结论】【断辞】…），宁短勿长、够用即止。")
    return L.joinToString("\n")
}

/* 旧 askMore()：校验 → 清输入 → 入列表 → 流式 → 收尾 */
internal fun askFollow(ctx: Context, B: List<Block>, scope: kotlinx.coroutines.CoroutineScope) {
    val q = Follow.q.trim()
    if (q.isEmpty()) return
    val cfg = LlmStore.load()
    if (LlmStore.missing(cfg).isNotEmpty()) {
        Follow.note = NO_KEY_NOTE
        return
    }
    Follow.q = ""
    Follow.items.add(q to "")
    Follow.note = ""
    Follow.busy = true
    Follow.orbOnce = true
    val seq = Session.castSeq
    val thread = Follow.items.dropLast(1).map { it }
    scope.launch {
        var ans = ""
        try {
            val full = askModelStream(cfg, if (Platform.lite) com.xlr.k.judge.SYS_LITE else com.xlr.k.judge.SYS, followUserMain(ctx, B, thread, q)) { t ->
                ans = t
                Follow.setLastA(t)
            }
            ans = full
        } catch (e: Throwable) {
            Follow.busy = false
            if (Session.castSeq != seq) return@launch
            Follow.setLastA("出错：" + (e.message ?: "未知错误"))
            return@launch
        }
        Follow.busy = false
        if (Session.castSeq != seq) return@launch   /* 已经换卦：这一问不算这一卦的 */
        Follow.setLastA(ans)
        Follow.note = "已答。要接着问就继续——够用即止。"
        /* 旧 persistThread：这一卦的记录条里也存一份，记录页里能接着问 */
        if (Session.recId.isNotEmpty()) {
            appendThread(Session.recId, q, ans)
        }
    }
}

/* 叁页里那一块（样式按 tailwind.css 那套；它是「单独一个模块」，所以自己有边/底/内距） */
@Composable
internal fun FollowPane(ctx: Context, B: List<Block>, modifier: Modifier = Modifier) {
    val scope = rememberCoroutineScope()
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Skin.rCard))
            .glassMaterial(RoundedCornerShape(Skin.rCard))
            .padding(horizontal = 18.dp, vertical = 14.dp),
    ) {
        /* ---- 问答列表：**不做卡内滚动**，有几轮长几轮，交给整页滚
           （——原来这里是个 heightIn(170) 的
           内滚列表，答完一轮它就变成可滚区，手指落在上面只滚它、页面纹丝不动。改成普通 Column ⇒ 全归整页） ---- */
        Column(modifier = Modifier.fillMaxWidth()) {
            Follow.items.forEachIndexed { idx, it ->
                if (idx > 0) {
                    Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(KY_LINE))
                }
                Column(modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 2.dp)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp)) {
                        Text_(text = "问 · ", fontSize = 13f, lineHeight = 21f, color = KY_DIM2)
                        Text_(
                            text = it.first,
                            fontSize = 13f,
                            lineHeight = 21f,
                            weight = 600,
                            color = KY_INK,
                        )
                    }
                    if (it.second.isEmpty()) {
                        SmallCursor()
                    } else {
                        RichText_(text = it.second, fontSize = 13f, color = KY_INK, lineHeight = 22.75f)
                    }
                }
            }
        }
        if (Follow.items.isNotEmpty()) Spacer(modifier = Modifier.height(8.dp))

        /* ---- 输入行：早先那一版在手机宽度上**输入框与按钮各占一行**（.ask-line 是 flex-wrap，
               输入框 flex 1 1 200px、按钮 92px ⇒ 390 屏上必然换行，按钮落到下一行左对齐） ---- */
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .clip(RoundedCornerShape(8.dp))
                /* 早先那一版输入框是**透明底**，只有 1px 边 */
                .border(Skin.borderW, KY_LINE, RoundedCornerShape(8.dp))
                .padding(horizontal = 10.dp, vertical = 7.dp),
            contentAlignment = Alignment.CenterStart,
        ) {
            if (Follow.q.isEmpty()) {
                Text_(
                    text = "在这个卦里，〔谁／什么事〕怎么样？",
                    fontSize = 13f,
                    lineHeight = 20f,
                    color = KY_DIM2,
                    maxLines = 1,
                )
            }
            BasicTextField(
                value = Follow.q,
                onValueChange = { Follow.q = it },
                modifier = Modifier.fillMaxWidth().height(26.dp),
                textStyle = TextStyle(fontSize = 13f.sp, lineHeight = 20f.sp, color = KY_INK),
                cursorBrush = SolidColor(KY_INK),
                maxLines = 1,
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        AskButton(ctx, B, scope)

        /* ---- tip → note（旧 .ask-note 有 min-height:15，空着也占一行） ---- */
        Spacer(modifier = Modifier.height(7.dp))
        Text_(text = ASK_TIP, fontSize = 11.5f, lineHeight = 18f, letterSpacing = 0.46f, color = KY_DIM2)
        Spacer(modifier = Modifier.height(6.dp))
        if (Follow.note.isNotEmpty()) {
            Text_(text = Follow.note, fontSize = 11.5f, lineHeight = 18f, color = KY_DIM2)
        } else {
            Spacer(modifier = Modifier.height(15.dp))
        }
    }
}

/* 旧 #btnAskMore：文字态 min-width 92 × 48；
   `.asking` 时宽高收成 48×48 圆、文字淡出、按钮皮收掉，里面是 44 的太极慢转（3.6s/圈） */
@Composable
private fun AskButton(ctx: Context, B: List<Block>, scope: kotlinx.coroutines.CoroutineScope) {
    val busy = Follow.busy
    val orb = busy || Follow.orbOnce
    val w by animateDpAsState(
        targetValue = if (busy) 48.dp else 92.dp,
        animationSpec = tween(360, easing = KY_EASE_OUT),
    )
    val rad by animateDpAsState(
        targetValue = if (busy) 24.dp else 8.dp,
        animationSpec = tween(360, easing = KY_EASE_OUT),
    )
    val lblA by animateFloatAsState(
        targetValue = if (busy) 0f else 1f,
        animationSpec = tween(200, easing = KY_EASE_OUT),
    )
    var spin by remember { mutableStateOf(0f) }
    LaunchedEffect(busy) {
        if (!busy) return@LaunchedEffect
        var ms = 0f
        while (true) {
            kotlinx.coroutines.delay(16)
            ms += 16f
            spin = (ms / 3600f * 360f) % 360f     /* 3.6s 一圈，匀速（旧 askSpin linear） */
        }
    }

    Box(
        modifier = Modifier
            .width(w)
            .height(48.dp)
            .clip(RoundedCornerShape(rad))
            /* 早先那一版 asking 时把按钮自身的皮（底/描边）收掉，只剩太极 */
            .background(if (busy) Color.Transparent else KY_ACCENT)
            .tapNoIndication { if (!busy) askFollow(ctx, B, scope) },
        contentAlignment = Alignment.Center,
    ) {
        if (lblA > 0.01f) {
            Text_(
                text = "接着问",
                fontSize = 13f,
                weight = 600,
                color = KY_ON_ACCENT,
                modifier = Modifier.graphicsLayer { alpha = lblA },
            )
        }
        if (orb) {
            Image(
                painter = com.tencent.kuikly.compose.coil3.rememberAsyncImagePainter(
                    "assets://common/taiji-ask-144.png",
                ),
                contentDescription = null,
                modifier = Modifier
                    .size(44.dp)
                    .graphicsLayer {
                        alpha = if (busy) 1f else 0f
                        scaleX = if (busy) 1f else 0.28f
                        scaleY = if (busy) 1f else 0.28f
                        rotationZ = spin
                    },
            )
        }
    }
}

/* 答案流式落笔时的小光标（与叁页那根同款，缩小一档） */
@Composable
private fun SmallCursor() {
    var on by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(520)
            on = !on
        }
    }
    Box(modifier = Modifier.width(2.5.dp).height(14.dp).background(if (on) KY_INK else Color.Transparent))
}
