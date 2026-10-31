package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.animation.core.Animatable
import com.tencent.kuikly.compose.animation.core.animateFloatAsState
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.animation.core.spring
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.border
import com.tencent.kuikly.compose.foundation.clickable
import com.tencent.kuikly.compose.foundation.gestures.detectTapGestures
import com.tencent.kuikly.compose.foundation.gestures.detectHorizontalDragGestures
import com.tencent.kuikly.compose.ui.input.pointer.pointerInput
import com.tencent.kuikly.compose.foundation.layout.Arrangement
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Row
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.fillMaxWidth
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.offset
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.foundation.layout.requiredHeight
import com.tencent.kuikly.compose.foundation.layout.width
import com.tencent.kuikly.compose.foundation.lazy.LazyColumn
import com.tencent.kuikly.compose.foundation.lazy.items
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.draw.clip
import com.tencent.kuikly.compose.ui.draw.clipToBounds
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.geometry.Offset
import com.tencent.kuikly.compose.ui.layout.onGloballyPositioned
import com.tencent.kuikly.compose.ui.platform.LocalDensity
import com.tencent.kuikly.compose.ui.unit.dp
import com.tencent.kuikly.compose.ui.unit.sp
import com.xlr.k.judge.ZHI
import com.xlr.k.judge.clockNums
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/* 壹页「所问之事」的可交互零件：起卦方式、补充背景、详情面板（九数 / 日期 / 时辰）、事类、选择弹层。
   早先的实现对位：apps/mobile-web/src/{components/AskPanel.jsx, data/askCore.js, data/castCore.js}
   ⚠ 文案逐字照抄早先的实现（CAST_LB / miniFor / CAT_OPTS / 报错句），改字要先改那边。 */

internal val CAT_OPTS: List<Pair<String, String>> = listOf(
    "auto" to "事类·自动",
    "marriage" to "婚姻 · 感情",
    "preg" to "求子 · 孕产",
    "money" to "财运 · 投资 · 借贷",
    "work" to "工作 · 事业 · 选择",
    "ill" to "疾病 · 健康 · 灾祸",
    "lost" to "失物 · 寻人",
    "travel" to "出行 · 行人",
    "law" to "官司 · 是非 · 骗局",
    "exam" to "考试 · 比赛 · 名次",
    "weather" to "天气 · 天象",
)

private val MODE_HINT = mapOf("clock" to "时间取数", "time" to "月日时", "num" to "报数")

private val CAST_LB = mapOf(
    "clock" to "当前时间自动取数（时 · 分十位 · 分个位）",
    "time" to "日期（公历，自动换算农历）· 起卦时辰",
    "num" to "随口报三个数（1–9，可重复）· 起卦时辰",
)

/* 点一下就响应、不带 clickable 默认高亮（Kuikly 的 clickable 会留一块白高亮/水波纹，
   小胶囊上很难看）。所有小控件统一用这个。
   ⚠ 必须走 rememberUpdatedState：`pointerInput(Unit)` 只建一次，直接捕 onTap 会**永远执行第一次
   那个 lambda**（闭包里读到的状态也是旧的）——踩到：设置顶栏 tab 点回「大模型」没反应，
   因为第一次组合时它是选中态、闭包里 `if (!on)` 一直是 false。 */
@Composable
internal fun Modifier.tapNoIndication(onTap: () -> Unit): Modifier {
    /* 盘查：全仓 56 处按点击走的是这个 `tapNoIndication`（原本**一点按下反馈都没有**），
       只有 2 处用了 tapPressable 自己演。与其一个个改，不如把反馈做进这里 ——
       一处生效、56 个按钮跟着有反馈：
         · 按下缩到 0.965、透明度压到 0.82（90ms 进，松手 130ms 回）
         · 用 graphicsLayer 缩放，不参与布局 ⇒ 不会顶动周围元素
         · tryAwaitRelease 兜住「按着拖出去」，不会卡在按下态 */
    val cur = rememberUpdatedState(onTap)
    var pressed by remember { mutableStateOf(false) }
    val s by animateFloatAsState(
        targetValue = if (pressed) 0.965f else 1f,
        animationSpec = tween(if (pressed) 90 else 130, easing = KY_EASE_OUT),
    )
    val al by animateFloatAsState(
        targetValue = if (pressed) 0.82f else 1f,
        animationSpec = tween(if (pressed) 90 else 130, easing = KY_EASE_OUT),
    )
    return this
        .graphicsLayer {
            scaleX = s
            scaleY = s
            alpha = al
        }
        .pointerInput(Unit) {
            detectTapGestures(
                onPress = {
                    pressed = true
                    try {
                        tryAwaitRelease()
                    } finally {
                        pressed = false
                    }
                },
                onTap = { cur.value() },
            )
        }
}

/* 按下去有反馈的版本（缩放/底色由调用方按 onPress 自己演）：
   down 进、抬手/滑出都复位 —— 用 tryAwaitRelease 兜住「按着不松手拖出去」那种情况，
   否则按钮会一直停在按下态。⚠ 同 tapNoIndication，回调都走 rememberUpdatedState。 */
@Composable
internal fun Modifier.tapPressable(onPress: (Boolean) -> Unit, onTap: () -> Unit): Modifier {
    val cp = rememberUpdatedState(onPress)
    val ct = rememberUpdatedState(onTap)
    return this.pointerInput(Unit) {
        detectTapGestures(
            onPress = {
                cp.value(true)
                try {
                    tryAwaitRelease()
                } finally {
                    cp.value(false)
                }
            },
            onTap = { ct.value() },
        )
    }
}

/* 点 / 长按两件事挂在同一块上（记录行长按出选项面板用；早先那一版 520ms，Kuikly 默认长按阈值≈500ms）。
   两个都走 rememberUpdatedState；长按触发时不会再触发 onTap（detectTapGestures 自己的语义）。 */
@Composable
internal fun Modifier.tapOrLongPress(
    onTap: () -> Unit,
    onLongPress: () -> Unit,
    /* 长按要「跟手」时用它：回调里给的是**这个控件本地坐标**里的按下点，
       调用方自己 localToRoot 换算，才能把菜单贴在手指上（早先那一版只有无参 onLongPress，位置只能靠行高猜） */
    onLongPressAt: ((com.tencent.kuikly.compose.ui.geometry.Offset) -> Unit)? = null,
): Modifier {
    val ct = rememberUpdatedState(onTap)
    val cl = rememberUpdatedState(onLongPress)
    val ca = rememberUpdatedState(onLongPressAt)
    return this.pointerInput(Unit) {
        detectTapGestures(
            onTap = { ct.value() },
            onLongPress = { off ->
                val at = ca.value
                if (at != null) at.invoke(off) else cl.value()
            },
        )
    }
}

/* 当前时钟读数（与判据同一份 clockNums） */
private fun nowClock() = clockNums(Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()))

/** 当前应采用哪个时辰：自己点过就用点的，没点过就按此刻 */
internal fun ziNow(mode: String): Int =
    if (mode == "time") (if (Session.ziTouchH1) Session.ziH1 else nowClock().zi)
    else (if (Session.ziTouchH2) Session.ziH2 else nowClock().zi)

/** 旧 refreshClock：没手改过就把三个数刷成当前时钟的读数（只在「时间取数」下自动刷） */
internal fun refreshClockNums() {
    if (Session.mode != "clock" || Session.numManual) return
    val t = nowClock()
    Session.setNums(t.nums.map { it.toString() })
}

/** 旧 setMode：状态 + 副作用（暂存/恢复九数、开合详情、清手改标记） */
internal fun setAskMode(m: String) {
    /* ：「点击其他取数方式……键盘依旧收回」 */
    dismissIme()
    val prev = Session.mode
    if (prev == "num" && m != "num") Session.numsStash = Session.nums()
    if (prev != "num" && m == "num") Session.setNums(Session.numsStash ?: listOf("", "", ""))
    Session.mode = m
    if (m != "clock") Session.numManual = false
    /* 口径（第三次修正）：
       「取数方式点到报数时，会展开详情，此时如果我点回时间取数、月日时，我希望详情收回，除非我手动点开详情」
       ⇒ 切到「报数」仍然自动展开（detailManual 归零＝这是自动展开的）；
         从「报数」切回别的 → 只有**不是**手动展开的才自动收回；用户自己点开过就保持原样。 */
    /* 用户改口径：「展开详情之后，任何都别收回了，因为整体逻辑变了」
       —— 早先的实现（那次）是「切回别的模式就自动收」，现在详情是卡片自己的一部分，
       切模式只换里头的控件（日期 ↔ 九数），不许收。只有用户点「详情」才收起。 */
    if (m != prev && m == "num") {
        /* ⇒ 三个数改到**卡里**直接报
           （AskCard 里的 NumRowCompact），这里就**不再**自动撑开详情了。 */
        Session.detailOpen = true
        Session.detailManual = false
    }
    if (m == "clock") refreshClockNums()
    Session.errOn = false
}

/** 详情面板底下那句提示（旧 miniFor，去掉 <b> 标记） */
internal fun miniText(mode: String): String = when (mode) {
    "num" -> "报完不要改；报了 0 当 10 取，报了两位数也不重报。记得选起卦时辰。"
    "time" -> "测比赛、考试、事故等有明确官方时间的事，把日期填成事件发生的时间再起卦。"
    else -> {
        val t = nowClock()
        val p: (Int) -> String = { x -> if (x < 10) "0$x" else "$x" }
        if (Session.numManual) {
            "手动取数：按 " + Session.nums().joinToString(" / ") + " 起卦 · " + ZHI[t.zi - 1] + "时（收起九数就回到自动）"
        } else {
            "时间取数：现在是 " + t.hh + ":" + p(t.mm) + " ⇒ 按 " + t.nums.joinToString(" / ") +
                " 起卦 · " + ZHI[t.zi - 1] + "时（软件自动读取，起卦以当时为准）"
        }
    }
}

/* ---------- 起卦方式那一排（时间取数 / 月日时 / 报数） ----------
   照早先的实现的真身搬：**一颗白药丸在格子里滑**（`.seg .spill`），不是每格自己变色。
   几何/曲线取自 legacy.css L2017–2020 与 38-script placeSpill：
     left  .42s cubic-bezier(.3,.9,.25,1)
     width .46s cubic-bezier(.2,1.28,.4,1)   ← 宽度带回弹
   药丸挂在活动格子的 offsetLeft/offsetWidth 上（这里用 onGloballyPositioned 量）。 */
private val EASE_PILL_L = com.tencent.kuikly.compose.animation.core.CubicBezierEasing(0.3f, 0.9f, 0.25f, 1f)
private val EASE_PILL_W = com.tencent.kuikly.compose.animation.core.CubicBezierEasing(0.2f, 1.28f, 0.4f, 1f)

@Composable
internal fun ModeSeg() {
    val idx = when (Session.mode) {
        "time" -> 1
        "num" -> 2
        else -> 0
    }
    val itemX = remember { mutableStateListOf(-1f, -1f, -1f) }
    val itemW = remember { mutableStateListOf(0f, 0f, 0f) }
    var rowX by remember { mutableStateOf(-1f) }
    val ready = rowX >= 0f && (0..2).all { itemX[it] >= 0f && itemW[it] > 0f }
    val pillL = remember { Animatable(0f) }
    val pillW = remember { Animatable(0f) }
    val dens = LocalDensity.current

    val targetL = if (ready) itemX[idx] - rowX else 0f
    val targetW = if (ready) itemW[idx] else 0f

    /* 把「报数」那一格的中轴记下来（相对酒丸左缘）：报数便捷格要对着它排 */
    LaunchedEffect(ready, itemX[2], itemW[2], rowX) {
        if (ready) {
            val cx = (itemX[2] + itemW[2] / 2f) - rowX
            Session.numAxisRelDp = with(dens) { cx.toDp().value }
        }
    }

    LaunchedEffect(idx, ready, targetL, targetW) {
        if (!ready || targetW <= 0f) return@LaunchedEffect
        if (pillW.value <= 0f) {          /* 首次就位：不播动画 */
            pillL.snapTo(targetL)
            pillW.snapTo(targetW)
            return@LaunchedEffect
        }
        /* spring 比 tween 更「丝滑」：起手不愣、末段自己收住，不靠固定时长曲线 */
        launch {
            pillL.animateTo(
                targetL,
                spring(dampingRatio = 0.90f, stiffness = 210f, visibilityThreshold = 0.5f),
            )
        }
        launch {
            pillW.animateTo(
                targetW,
                spring(dampingRatio = 0.72f, stiffness = 260f, visibilityThreshold = 0.5f),
            )
        }
    }

    /* 药丸可以**直接拿手拖着走**（：「我想要胶囊移动的那种丝滑拖拽感」）：
       按下就抓住药丸，手指到哪它到哪；松手时按药丸中心落在哪一格就切到哪一格，
       剩下的距离交回上面的 spring 收尾。
       ：
         **前缘跟手、后缘拖半拍** ⇒ 药丸被拉长一截（最多 75% 宽），同时略扁一点（scaleY 0.9），
         松手弹回原长/落格 —— 就是橡皮筋那种「被拉扯」的形变，不是一块硬牌子平移。 */
    var rowW by remember { mutableStateOf(0f) }
    var dragL by remember { mutableStateOf<Float?>(null) }
    var dragW by remember { mutableStateOf<Float?>(null) }
    var dragD by remember { mutableStateOf(0f) }
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    var settleJob by remember { mutableStateOf<kotlinx.coroutines.Job?>(null) }

    fun modeOf(i: Int): String = when (i) { 1 -> "time"; 2 -> "num"; else -> "clock" }

    /* 松手收尾：从「拉长的这一刻」弹回目标格（spring 带回弹），落定后再把状态交给 pillL/pillW */
    fun settlePill(toL: Float, toW: Float) {
        settleJob?.cancel()
        val fromL = dragL
        val fromW = dragW
        if (fromL == null || fromW == null) {
            dragL = null
            dragW = null
            dragD = 0f
            return
        }
        settleJob = scope.launch {
            val aL = Animatable(fromL)
            val aW = Animatable(fromW)
            launch {
                aW.animateTo(
                    toW,
                    spring(dampingRatio = 0.70f, stiffness = 260f, visibilityThreshold = 0.5f),
                ) { dragW = value }
            }
            aL.animateTo(
                toL,
                spring(dampingRatio = 0.86f, stiffness = 220f, visibilityThreshold = 0.5f),
            ) { dragL = value }
            pillL.snapTo(toL)
            pillW.snapTo(toW)
            dragL = null
            dragW = null
            dragD = 0f
        }
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            /* 轨道比以前淡一档（0.42 → 0.26）：浅色皮肤下不再是一块发灰的实底 */
            .glassMaterial(RoundedCornerShape(999.dp), control = true)
            .padding(2.dp)
            .onGloballyPositioned {
                rowW = it.size.width.toFloat()
                /* 记下这一排在 root 里的上下边：根手势拿到「起手落在这一排里」就不抢去开记录抽屉，
                   否则往右拖药丸会被抽屉手势吃走（实测就是被吃走了）。 */
                val top = it.localToRoot(Offset.Zero).y
                Session.segY0 = top
                Session.segY1 = top + it.size.height
            }
            .pointerInput(ready, rowW) {
                if (!ready) return@pointerInput
                var start = 0f
                var startW = 0f
                detectHorizontalDragGestures(
                    onDragStart = {
                        settleJob?.cancel()
                        start = pillL.value
                        startW = pillW.value
                        dragD = 0f
                        dragL = start
                        dragW = startW
                    },
                    onDragEnd = {
                        val curL = dragL ?: start
                        val curW = dragW ?: startW
                        /* 药丸中心落在哪一格 → 切哪一格 */
                        val cx = curL + curW / 2f
                        var best = 0
                        var bestD = Float.MAX_VALUE
                        for (i in 0..2) {
                            val c = itemX[i] - rowX + itemW[i] / 2f
                            val d = kotlin.math.abs(c - cx)
                            if (d < bestD) {
                                bestD = d
                                best = i
                            }
                        }
                        setAskMode(modeOf(best))
                        settlePill(itemX[best] - rowX, itemW[best])
                    },
                    onDragCancel = {
                        val i = when (Session.mode) { "time" -> 1; "num" -> 2; else -> 0 }
                        settlePill(itemX[i] - rowX, itemW[i])
                    },
                    onHorizontalDrag = { _, amount ->
                        if (startW <= 0f) return@detectHorizontalDragGestures
                        dragD += amount
                        val d = dragD
                        /* 形变量：位移的 42% 变成宽度，最多长 62%（再多就像橡皮筋横跨两格了，收着点） */
                        val stretch = kotlin.math.min(kotlin.math.abs(d) * 0.42f, startW * 0.62f)
                        val w = startW + stretch
                        /* 前缘跟手：往右拖 ⇒ 右缘在 start+startW+d；往左拖 ⇒ 左缘在 start+d */
                        val rawL = if (d >= 0f) (start + startW + d) - w else start + d
                        val maxL = (rowW - w - 4f).coerceAtLeast(0f)
                        dragW = w
                        dragL = rawL.coerceIn(0f, maxL)
                    },
                )
            }
    ) {
        /* 拉得越长、压得越扁一点（橡皮筋的形变），松手自己回到 1.0 */
        val stretchRatio = if (dragW != null && pillW.value > 0f) {
            ((dragW!! - pillW.value) / pillW.value).coerceIn(0f, 0.8f)
        } else 0f
        Box(
            modifier = Modifier
                .offset(x = with(dens) { (dragL ?: pillL.value).toDp() })
                .width(with(dens) { (dragW ?: pillW.value).toDp() })
                .height(28.dp)
                .graphicsLayer { scaleY = 1f - 0.10f * stretchRatio }
                .clip(RoundedCornerShape(999.dp))
                /* 药丸本身也淡一档（0.95 → 0.66）：留一点透，压在卡片上不像贴了块白胶布 */
                .background(veil(0.46f))
        )
        Row(
            modifier = Modifier.onGloballyPositioned { c -> rowX = c.localToRoot(Offset.Zero).x },
            horizontalArrangement = Arrangement.spacedBy(2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SegItem("时间取数", 0, idx == 0, itemX, itemW) { setAskMode("clock") }
            SegItem("月日时", 1, idx == 1, itemX, itemW) { setAskMode("time") }
            SegItem("报数", 2, idx == 2, itemX, itemW) { setAskMode("num") }
        }
    }
}

@Composable
private fun SegItem(
    label: String,
    i: Int,
    active: Boolean,
    itemX: MutableList<Float>,
    itemW: MutableList<Float>,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .onGloballyPositioned { c ->
                itemX[i] = c.localToRoot(Offset.Zero).x
                itemW[i] = c.size.width.toFloat()
            }
            .padding(horizontal = 11.dp, vertical = 5.dp)
            .tapNoIndication { onClick() }
    ) {
        Text_(
            text = label,
            fontSize = 12.5f,
            lineHeight = 18f,
            color = if (active) KY_INK else KY_DIM,
            weight = if (active) 600 else 400,
        )
    }
}

/* ---------- 补充背景 ---------- */
internal const val BG_H = 92f

@Composable
internal fun BgFold() {
    /* 早先那一版 `transition:transform .22s var(--ease)` —— 箭头是转的，不是换字符 */
    val rot by animateFloatAsState(
        targetValue = if (Session.bgOpen) 90f else 0f,
        animationSpec = tween(220, easing = KY_EASE_OUT),
    )
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().tapNoIndication { Session.bgOpen = !Session.bgOpen },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            /* 早先那一版是原生 <details><summary> + `summary::before{content:"▸"}`：
               **带路的那个箭头就是开合指示器**，展开时自己转 90°（legacy.css L256-262）。
               行尾不要另加一个 ˅ —— 早先那一版没有，两个箭头会打架（点名） */
            Text_(
                text = "▸",
                fontSize = 11f,
                lineHeight = 18f,
                color = KY_DIM2,
                modifier = Modifier.graphicsLayer { rotationZ = rot },
            )
            Spacer(modifier = Modifier.width(7.dp))
            Text_(text = "补充背景（选填，越具体越准）", fontSize = 14f, color = KY_DIM2)
        }
        /* 展开/收起走缓动：外层高度做动画、内容按自然尺寸裁切（不重排） */
        val h by animateFloatAsState(if (Session.bgOpen) BG_H else 0f, tween(260, easing = KY_EASE_OUT))
        if (h > 0.5f) {
            Box(modifier = Modifier.fillMaxWidth().height(h.dp).clipToBounds()) {
                Column(modifier = Modifier.fillMaxWidth().requiredHeight(BG_H.dp)) {
                    Spacer(modifier = Modifier.height(8.dp))
                    /* ：不要浅色文本框底、不要边——跟主问题输入区一样，纯文字 */
                    Box(modifier = Modifier.fillMaxWidth()) {
                        if (Session.bg.isEmpty()) {
                            Text_(
                                text = "相关的实际情况。例如：已婚；对方是同事；面试是下周三；猫上次在阳台丢的。",
                                fontSize = 13f,
                                lineHeight = 20f,
                                color = KY_DIM2,
                            )
                        }
                        com.tencent.kuikly.compose.foundation.text.BasicTextField(
                            value = Session.bg,
                            onValueChange = { Session.bg = it },
                            modifier = Modifier.fillMaxWidth().height(84.dp),
                            textStyle = com.tencent.kuikly.compose.ui.text.TextStyle(
                                fontSize = 13f.sp,
                                lineHeight = 20f.sp,
                                color = KY_INK,
                            ),
                            cursorBrush = com.tencent.kuikly.compose.ui.graphics.SolidColor(KY_INK),
                        )
                    }
                }
            }
        }
    }
}

/* ---------- 详情面板：九数 / 日期 / 时辰 + 提示 ---------- */
/* 面板总高（dp）：10 间距 + 1 分割线 + 12 上边距 + 17 标题 + 10 + 34 控件行 + 10 + 34 时辰行 + 10 + 54 提示(3 行) */
internal const val DT_H = 192f

@Composable
internal fun DetailPanel() {
    val h by animateFloatAsState(if (Session.detailOpen) DT_H else 0f, tween(280, easing = KY_EASE_OUT))
    if (h <= 0.5f) return
    Box(modifier = Modifier.fillMaxWidth().height(h.dp).clipToBounds()) {
        Column(modifier = Modifier.fillMaxWidth().requiredHeight(DT_H.dp)) {
            Spacer(modifier = Modifier.height(10.dp))
            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(KY_LINE))
            Column(modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
                Text_(text = CAST_LB[Session.mode] ?: "", fontSize = 11.5f, lineHeight = 17f, color = KY_DIM2)
                Spacer(modifier = Modifier.height(10.dp))
                if (Session.mode == "time") {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        PickerPill("${Session.dtYear} 年", 86f) { Session.picker = "year" }
                        Spacer(modifier = Modifier.width(6.dp))
                        PickerPill("${Session.dtMonth} 月", 70f) { Session.picker = "month" }
                        Spacer(modifier = Modifier.width(6.dp))
                        PickerPill("${Session.dtDay} 日", 70f) { Session.picker = "day" }
                    }
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        NumStep(0)
                        Spacer(modifier = Modifier.width(6.dp))
                        NumStep(1)
                        Spacer(modifier = Modifier.width(6.dp))
                        NumStep(2)
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text_(text = "起卦时辰", fontSize = 12f, lineHeight = 18f, color = KY_DIM2)
                    Spacer(modifier = Modifier.width(8.dp))
                    PickerPill(ZHI[ziNow(Session.mode) - 1] + "时", 78f) { Session.picker = "zi" }
                }
                Spacer(modifier = Modifier.height(10.dp))
                Text_(text = miniText(Session.mode), fontSize = 11.5f, lineHeight = 18f, color = KY_DIM2, maxLines = 3)
            }
        }
    }
}

/* 一个数：− / 值 / +（旧 numStep.js 的玻璃步进；范围 0–99） */
@Composable
private fun NumStep(i: Int) {
    val cur = Session.nums().getOrElse(i) { "" }
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .glassMaterial(RoundedCornerShape(999.dp), control = true),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(modifier = Modifier.width(30.dp).height(34.dp).tapNoIndication {  stepNum(i, -1) }, contentAlignment = Alignment.Center) {
            Text_(text = "−", fontSize = 15f, lineHeight = 20f, color = KY_DIM)
        }
        Box(modifier = Modifier.width(46.dp).height(34.dp)) {
            if (cur.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text_(text = "—", fontSize = 15f, lineHeight = 20f, color = KY_DIM2)
                }
            }
            com.tencent.kuikly.compose.foundation.text.BasicTextField(
                value = cur,
                onValueChange = { raw ->
                    val digits = raw.filter { it.isDigit() }.take(2)
                    val next = Session.nums().toMutableList()
                    next[i] = digits
                    Session.setNums(next)
                    if (Session.mode == "clock") Session.numManual = true
                },
                modifier = Modifier.fillMaxSize(),
                textStyle = com.tencent.kuikly.compose.ui.text.TextStyle(
                    fontSize = 15f.sp,
                    lineHeight = 20f.sp,
                    color = KY_INK,
                    textAlign = com.tencent.kuikly.compose.ui.text.style.TextAlign.Center,
                ),
                cursorBrush = com.tencent.kuikly.compose.ui.graphics.SolidColor(KY_INK),
                singleLine = true,
            )
        }
        Box(modifier = Modifier.width(30.dp).height(34.dp).tapNoIndication {  stepNum(i, 1) }, contentAlignment = Alignment.Center) {
            Text_(text = "+", fontSize = 15f, lineHeight = 20f, color = KY_DIM)
        }
    }
}

/* 报数：三个数直接摆在卡里。
   和详情里的 NumStep 共用同一份状态（Session.nums），改哪边都同步。
   用户同日第二轮：「视觉上有点怪，没做到统一」⇒ 改成**跟取数方式那条药丸同款的容器**，
     里面三格 + 细分割线，读起来是「一格一组数字」，不再像三颗孤零零的胶囊。 */
@Composable
internal fun NumRowCompact() {
    /* 跟「取数方式」那条药丸**同一套语法**：外框一条淡底，里面三格用细竖线分开。
       三轮修正：① 不占整条详情 ② 不要白色底 ③ 不写 1/2/3、留空但要分隔符。 */
    /* ：「便携栏放到卡片正中间，以报数那两个字为中心轴的正下方」
       ⇒ 用药丸里量出来的「报数」格中轴（Session.numAxisRelDp），把这条的外框居中到它下面。
       外框宽 = 3*2 内边距 + 40*3 三格 + 1*2 两条分隔 = 128dp（常量，不用再量）。 */
    val startDp = (Session.numAxisRelDp - 62f).coerceIn(0f, 220f)
    Row(
        modifier = Modifier
            .padding(start = startDp.dp)
            .clip(RoundedCornerShape(999.dp))
            .glassMaterial(RoundedCornerShape(999.dp), control = true)
            .padding(horizontal = 3.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        NumCell(0)
        CellSep()
        NumCell(1)
        CellSep()
        NumCell(2)
    }
}

@Composable
private fun CellSep() {
    Box(modifier = Modifier.width(1.dp).height(12.dp).background(KY_LINE))
}

@Composable
private fun NumCell(i: Int) {
    val cur = Session.nums().getOrElse(i) { "" }
    /* ：「里面还有白色背景？不要吧」＋「123 也别写了，留空」⇒ 格子透明、不写占位。 */
    Box(modifier = Modifier.width(40.dp).height(26.dp), contentAlignment = Alignment.Center) {
        com.tencent.kuikly.compose.foundation.text.BasicTextField(
            value = cur,
            onValueChange = { raw ->
                val digits = raw.filter { it.isDigit() }.take(2)
                val next = Session.nums().toMutableList()
                next[i] = digits
                Session.setNums(next)
            },
            modifier = Modifier.fillMaxSize(),
            textStyle = com.tencent.kuikly.compose.ui.text.TextStyle(
                fontSize = 14f.sp,
                lineHeight = 18f.sp,
                color = KY_INK,
                textAlign = com.tencent.kuikly.compose.ui.text.style.TextAlign.Center,
            ),
            cursorBrush = com.tencent.kuikly.compose.ui.graphics.SolidColor(KY_INK),
            singleLine = true,
        )
    }
}

private fun stepNum(i: Int, d: Int) {
    val v0 = Session.nums().getOrElse(i) { "" }.trim()
    var v = if (v0.isEmpty()) 0 else (v0.toIntOrNull() ?: 0)
    v = (v + d).coerceIn(0, 99)
    val next = Session.nums().toMutableList()
    next[i] = v.toString()
    Session.setNums(next)
    /* 时间取数下手改过 ⇒ 记「手动取数」，不再被时钟覆盖 */
    if (Session.mode == "clock") Session.numManual = true
}

/* ---------- 一个小小的下拉胶囊 ---------- */
@Composable
internal fun PickerPill(label: String, w: Float, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .width(w.dp)
            .height(34.dp)
            .clip(RoundedCornerShape(999.dp))
            .glassMaterial(RoundedCornerShape(999.dp), control = true)
            .tapNoIndication {  onClick() },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Text_(text = label, fontSize = 12.5f, lineHeight = 18f, color = KY_INK)
        Spacer(modifier = Modifier.width(4.dp))
        CaretGlyph()
    }
}

/* ---------- 事类胶囊 ---------- */
@Composable
internal fun CatCapsule() {
    val label = CAT_OPTS.firstOrNull { it.first == Session.catSel }?.second ?: "事类·自动"
    Row(
        modifier = Modifier
            .height(34.dp)
            .clip(RoundedCornerShape(999.dp))
            .glassMaterial(RoundedCornerShape(999.dp), control = true)
            .padding(horizontal = 11.dp)
            .tapNoIndication {  dismissIme(); Session.picker = "cat" },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text_(text = label, fontSize = 12.5f, lineHeight = 18f, color = KY_DIM)
        Spacer(modifier = Modifier.width(5.dp))
        CaretGlyph()
    }
}

/* ---------- 选择弹层（事类 / 时辰 / 年月日共用） ---------- */
private fun daysIn(y: Int, m: Int): Int = when (m) {
    1, 3, 5, 7, 8, 10, 12 -> 31
    4, 6, 9, 11 -> 30
    else -> if ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0) 29 else 28
}

private fun pickerTitle(kind: String): String = when (kind) {
    "cat" -> "事类"
    "zi" -> "起卦时辰"
    "year" -> "年"
    "month" -> "月"
    else -> "日"
}

private fun pickerItems(kind: String): List<Pair<String, String>> = when (kind) {
    "cat" -> CAT_OPTS
    "zi" -> (1..12).map { it.toString() to ZHI[it - 1] + "时" }
    "year" -> (2020..2040).map { it.toString() to "$it 年" }
    "month" -> (1..12).map { it.toString() to "$it 月" }
    else -> (1..daysIn(Session.dtYear, Session.dtMonth)).map { it.toString() to "$it 日" }
}

private fun pickerSelected(kind: String): String = when (kind) {
    "cat" -> Session.catSel
    "zi" -> ziNow(Session.mode).toString()
    "year" -> Session.dtYear.toString()
    "month" -> Session.dtMonth.toString()
    else -> Session.dtDay.toString()
}

private fun applyPick(kind: String, v: String) {
    when (kind) {
        "cat" -> Session.catSel = v
        "zi" -> {
            if (Session.mode == "time") {
                Session.ziH1 = v.toInt(); Session.ziTouchH1 = true
            } else {
                Session.ziH2 = v.toInt(); Session.ziTouchH2 = true
            }
        }
        "year" -> Session.dtYear = v.toInt()
        "month" -> {
            Session.dtMonth = v.toInt()
            val max = daysIn(Session.dtYear, Session.dtMonth)
            if (Session.dtDay > max) Session.dtDay = max
        }
        else -> Session.dtDay = v.toInt()
    }
    Session.picker = null
}


@Composable
internal fun AskPicker() {
    /* mounted 管挂载、p 管动画：关的时候先播完再卸（照 EvidenceOverlay 那套） */
    var mounted by remember { mutableStateOf(false) }
    var shown by remember { mutableStateOf("cat") }
    val p = remember { Animatable(0f) }
    LaunchedEffect(Session.picker) {
        val k = Session.picker
        if (k != null) {
            shown = k
            mounted = true
            p.animateTo(1f, tween(280, easing = KY_EASE_OUT))
        } else if (mounted) {
            p.animateTo(0f, tween(200, easing = KY_EASE_IN))
            mounted = false
        }
    }
    if (!mounted) return
    val kind = shown
    val items = pickerItems(kind)
    val sel = pickerSelected(kind)
    val sheetPx = with(LocalDensity.current) { 452.dp.toPx() }
    Box(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0f, 0f, 0f, 0.34f * p.value))
                .tapNoIndication { Session.picker = null }
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .graphicsLayer { translationY = sheetPx * (1f - p.value) }
                .clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
                .background(KY_BG)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().height(52.dp).padding(horizontal = 18.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text_(text = pickerTitle(kind), fontSize = 15f, lineHeight = 22f, weight = 500)
                Spacer(modifier = Modifier.weight(1f))
                Text_(
                    text = "收起",
                    fontSize = 12.5f,
                    lineHeight = 20f,
                    color = KY_DIM2,
                    modifier = Modifier.tapNoIndication { Session.picker = null },
                )
            }
            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(KY_LINE))
            LazyColumn(modifier = Modifier.fillMaxWidth().height(380.dp).padding(horizontal = 12.dp, vertical = 8.dp)) {
                items(items) { it ->
                    val on = it.first == sel
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (on) Color(0.059f, 0.063f, 0.075f, 0.10f) else Color.Transparent)
                            .tapNoIndication { applyPick(kind, it.first) }
                            .padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text_(
                            text = it.second,
                            fontSize = 14f,
                            lineHeight = 22f,
                            weight = if (on) 500 else 400,
                            color = if (on) KY_ACCENT else KY_INK,
                        )
                        Spacer(modifier = Modifier.weight(1f))
                        if (on) Text_(text = "✓", fontSize = 13f, lineHeight = 20f, color = KY_ACCENT)
                    }
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
        }
    }
}
