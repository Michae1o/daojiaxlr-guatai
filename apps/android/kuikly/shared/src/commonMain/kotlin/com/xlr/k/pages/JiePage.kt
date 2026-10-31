package com.xlr.k.pages

import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.clickable
import com.tencent.kuikly.compose.animation.core.Animatable
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.ui.draw.clipToBounds
import com.tencent.kuikly.compose.ui.geometry.Offset
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.layout.onGloballyPositioned
import com.tencent.kuikly.compose.foundation.lazy.LazyColumn
import com.tencent.kuikly.compose.foundation.lazy.items
import com.tencent.kuikly.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.snapshotFlow
import com.tencent.kuikly.compose.animation.core.animateFloatAsState
import com.tencent.kuikly.compose.animation.core.FastOutSlowInEasing
import kotlinx.coroutines.flow.collectLatest
import com.tencent.kuikly.compose.ui.geometry.CornerRadius
import com.tencent.kuikly.compose.ui.geometry.Size
import com.tencent.kuikly.compose.ui.graphics.Brush
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.foundation.layout.Arrangement
import com.tencent.kuikly.compose.foundation.layout.Row
import com.tencent.kuikly.compose.foundation.layout.width
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.heightIn
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxWidth
import com.xlr.k.judge.Block
import com.tencent.kuikly.compose.foundation.border
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.foundation.Canvas
import com.tencent.kuikly.compose.foundation.layout.size
import com.tencent.kuikly.compose.ui.graphics.drawscope.Stroke
import com.tencent.kuikly.compose.foundation.layout.offset
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.draw.clip
import com.tencent.kuikly.compose.ui.draw.drawBehind
import com.tencent.kuikly.compose.ui.graphics.Color
import com.xlr.k.judge.Cast
import com.xlr.k.judge.Context
import kotlinx.datetime.toLocalDateTime
import kotlinx.coroutines.launch
import com.tencent.kuikly.compose.ui.platform.LocalDensity
import com.tencent.kuikly.compose.ui.unit.dp

/* 判定词色 = 主题强调色的 180° 补色（明度按卡片底调到可读）。
 * 黑白皮肤没有色相⇒ 补色转回它自己 ⇒ 直接返回 accent 本身。 */
internal fun jycOf(accent: Color): Color {
    val r = accent.red
    val g = accent.green
    val b = accent.blue
    val max = maxOf(r, maxOf(g, b))
    val min = minOf(r, minOf(g, b))
    val l = (max + min) / 2f
    val d = max - min
    if (d < 0.04f) return accent // 无色相：补色 = 自身（黑白/黑夜的既定口径）
    val s = if (l < 0.5f) d / (max + min) else d / (2f - max - min)
    var h = when (max) {
        r -> (g - b) / d + (if (g < b) 6f else 0f)
        g -> (b - r) / d + 2f
        else -> (r - g) / d + 4f
    } / 6f
    h = (h + 0.5f) % 1f
    // 明度按「浅底压深」的方向收一档，保证对比度
    val l2 = if (l > 0.6f) 0.28f else if (l < 0.35f) 0.72f else l
    fun ch(p: Float, q: Float, t0: Float): Float {
        var t = t0
        if (t < 0f) t += 1f
        if (t > 1f) t -= 1f
        return when {
            t < 1f / 6f -> p + (q - p) * 6f * t
            t < 0.5f -> q
            t < 2f / 3f -> p + (q - p) * (2f / 3f - t) * 6f
            else -> p
        }
    }
    val q = if (l2 < 0.5f) l2 * (1f + s) else l2 + s - l2 * s
    val p = 2f * l2 - q
    return Color(ch(p, q, h + 1f / 3f), ch(p, q, h), ch(p, q, h - 1f / 3f), accent.alpha)
}

internal val KY_JYC: Color get() = Skin.def.jyc

/* 判定词：本机速断＝大字（34）；模型解卦＝不放大，只上补色 + 加粗 */
@Composable
private fun Conclusion(text: String, large: Boolean) {
    Text_(
        text = text,
        fontSize = if (large) 34f else 15.5f,
        lineHeight = if (large) 40.1f else 31f,
        serif = large,
        weight = 500,
        color = KY_JYC,
    )
}

/* 叁页 · 断卦
 *
 * 结构照早先的实现：断辞卡(305 宽) = 复盘栏（所问 / 三宫·时辰 / 分隔线 / 「结论」小标题）
 *   + 正文（结论大字 + 断语）+ 右侧操作（让模型解卦 / 新开一卦 / 本机速断提示）
 *   下面再挂一条「断卦依据」折叠条（9 组 · 每条带出处）。
 * ⚠ 现在是静态样张：判定词「能」、断语、9 组出处都是写死的，等判据移植后接真值。
 */
@Composable
internal fun JieContent(active: Boolean = true, onNewCast: () -> Unit = {}) {
    val ctx = Session.ctx
    val cast = Session.cast
    /* 没起卦（新开一卦之后还能随便切页）⇒ 给一句人话 + 回壹页，别留空白 */
    if (ctx == null || cast == null) {
        NoGuaHint(onBack = onNewCast)
        return
    }
    val blocks = com.xlr.k.judge.buildBlocks(ctx)
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val quick = com.xlr.k.judge.quickRead(
        ctx,
        kotlinx.datetime.Clock.System.now().toLocalDateTime(kotlinx.datetime.TimeZone.currentSystemDefault()),
    )
    val answer = Session.askAnswer

    /* 定稿，照手机端早先那一版（apps/mobile-web/src/styles/legacy.css L4386 那套）：
       ① 卡片＝**一屏高的卡**：上限 = 可用高 − 底部「断卦依据」条（实测高度），不再无限长；
       ② 断辞**在卡片里自己滚**（早先那一版 `.llm-main{flex:1 1 auto;min-height:0;overflow-y:auto}`）；
       ③ 所问/卦·时（Recap）钉卡顶、两个按钮钉卡底（早先那一版 `flex:0 0 auto`）；
       ④ 「接着问」「断卦依据」在卡外，整页仍可往下滚着看。
       ⚠ 正文可用高度必须由「卡上限 − 实测 Recap − 实测按钮区」算出来：
         Kuikly 的 LazyColumn 挂 `weight(fill=false)` 只会量第一条 item（踩过两次），
         所以这里用 onGloballyPositioned 量真实高度，不拿常数猜。 */
    var recapPx by remember { mutableStateOf(0) }
    var btnsPx by remember { mutableStateOf(0) }
    var evidPx by remember { mutableStateOf(56) }
    var bodyPx by remember { mutableStateOf(0) }
    val density = LocalDensity.current.density
    val availDp = (if (Platform.screenH > 0) Platform.screenH else 2400).toFloat() / density - 115f - 71f
    val cardMaxDp = (availDp - evidPx.toFloat() / density - 20f).coerceAtLeast(280f)
    val bodyCapDp = (cardMaxDp - (recapPx + btnsPx).toFloat() / density - 14f).coerceAtLeast(90f)

    /* 断辞的滚动条状态放在 ScrollHint 自己里面（只重组那一小块，不再每帧重组整个叁页 —— 上一版就是那样才卡） */
    val lst = rememberLazyListState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(start = 44.dp, end = 44.dp, top = 115.dp)
            .padding(bottom = 36.dp)
    ) {
        item {
            val shape = RoundedCornerShape(Skin.rCard)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = cardMaxDp.dp)
                    .clip(shape)
                    .glassMaterial(shape)
            ) {
                /* 所问 / 卦·时 / 「结论」—— 钉卡顶，顺手量高度 */
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .onGloballyPositioned {
                            val h = it.size.height
                            if (h > 0 && h != recapPx) recapPx = h
                        }
                ) { Recap(ctx, cast, onCopy = {
                    /* 复制「这一卦」：口径照早先那一版 resultCore.copyClean（问题／背景／卦·时／事类／断辞／落款） */
                    val body = if (answer.isNotEmpty()) answer else quick
                    Platform.copy?.invoke(copyCleanText(ctx, cast, body))
                    Session.say("已复制")
                }) }
                /* 断辞正文：卡内自己滚（内容短时它就短，卡片跟着收）+ 右侧墨色滚动条
                   （早先那一版 phoneAnim.js initScrollHint：3px 圆角条、取 --ink、停手 900ms 淡出 ⇒ 这里 1000ms）
                   ⚠ 用真 Box 画，不用 drawBehind：Kuikly 的 DrawScope 里带 brush 的 drawRoundRect 不落地。 */
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = bodyCapDp.dp)
                        .onGloballyPositioned {
                            val h = it.size.height
                            if (h > 0 && h != bodyPx) bodyPx = h
                        }
                ) {
                    LazyColumn(
                        state = lst,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp)
                    ) {
                        items(docBlocks(if (answer.isNotEmpty()) answer else quick, bigFirst = answer.isEmpty())) { b ->
                            Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp)) { DocBlockView(b) }
                        }
                        item {
                            if (Session.askBusy) BlinkCursor()
                            Spacer(modifier = Modifier.height(12.dp))
                        }
                    }
                    /* 滚动条：跟手、停 1 秒淡出（独立小块，只它自己重组） */
                    ScrollHint(lst, bodyPx, density, Modifier.align(Alignment.TopEnd))
                }
                /* 两个按钮 + 状态行 —— 钉卡底，顺手量高度 */
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .onGloballyPositioned {
                            val h = it.size.height
                            if (h > 0 && h != btnsPx) btnsPx = h
                        }
                        .padding(horizontal = 18.dp)
                        .padding(top = 10.dp, bottom = 16.dp)
                ) {
                    SideButtons(onNewCast) { scope.launch { askNow(ctx, blocks) } }
                    Spacer(modifier = Modifier.height(8.dp))
                    if (Session.askErr.isNotEmpty()) {
                        Text_(text = Session.askErr, fontSize = 11.5f, lineHeight = 20f, color = KY_ACCENT, weight = 500)
                    } else {
                        Text_(
                            text = if (answer.isEmpty()) "本机速断 · 未用模型"
                            else Session.askStat.ifEmpty { "模型 " + Session.askModelLabel },
                            fontSize = 11.5f,
                            lineHeight = 21f,
                            color = KY_DIM2,
                        )
                    }
                }
            }
        }
        /* 「接着问」在**卡外**（早先那一版是主卡下面第二张卡）：只有模型解卦完成了才出现 */
        if (Session.followReady) {
            item {
                Spacer(modifier = Modifier.height(20.dp))
                FollowPane(ctx, blocks)
            }
        }
        /* lite 包**不显示**「断卦依据」（口径照桌面 lite：不带判据面板，解卦走白话版提示词） */
        if (!Platform.lite) item {
            Spacer(modifier = Modifier.height(20.dp))
            /* 「断卦依据」在卡外，它的表头高度决定断辞卡的上限（早先那一版是 JS 量完写 --xlr-jie-h）。
               ⚠ 量的是**表头**那一行，不是整张卡：展开后卡片会长到几千 px，量整张会把断辞卡压成一条。 */
            EvidenceCard(blocks) { h -> if (h > 0 && h != evidPx) evidPx = h }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

/* 解卦中的闪烁光标（早先那一版 `#doc .cur`）：结论下面一根黑竖条，500ms 一明一灭 */
@Composable
private fun BlinkCursor() {
    var on by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(520)
            on = !on
        }
    }
    Box(
        modifier = Modifier
            .padding(start = 18.dp, top = 3.dp)
            .width(2.5f.dp)
            .height(16.dp)
            .background(if (on) KY_INK else Color(0f, 0f, 0f, 0f))
    )
}

/* 让模型解卦：配好就直接发，没配好先弹设置（早先的实现同一路由：没配置 ⇒ 引导去设置页） */
internal suspend fun askNow(ctx: Context, blocks: List<Block>) {
    Session.askErr = ""
    val cfg = LlmStore.load()
    val miss = LlmStore.missing(cfg)
    if (miss.isNotEmpty()) {
        Session.askErr = miss
        dismissIme()
        Session.settingsOpen = true
        return
    }
    Session.askBusy = true
    Session.askAnswer = ""
    Session.followReady = false      /* 早期版本是答完才 show:true；重解一次先收回 */
    Session.askStat = ""             /* 免得「解卦中」时还挂着上一轮的用时 */
    /* 记下这是第几卦 —— 解卦还在路上时用户又起了一卦的话，
       这一趟的流式文字与收尾统统作废，别把上一卦的断辞写进新卦。 */
    val seq = Session.castSeq
    val t0 = kotlinx.datetime.Clock.System.now().toEpochMilliseconds()
    try {
        val user = "请按格式解这一卦：\n\n" + com.xlr.k.judge.plainAll(ctx, blocks)
        /* 流式：每来一段就把「已累计全文」写回界面（早先那一版就是这个观感） */
        val out = askModelStream(cfg, if (Platform.lite) com.xlr.k.judge.SYS_LITE else com.xlr.k.judge.SYS, user) { t ->
            if (Session.castSeq == seq) Session.askAnswer = t
        }
        /* 解卦途中换了卦：这一趟的文字与落款都不算当前这一卦的，丢掉 */
        if (Session.castSeq != seq) return
        Session.askAnswer = out.trim().ifEmpty { Session.askAnswer.trim() }
        Session.askModelLabel = cfg.model
        /* 旧 modelAskCore L137：`模型 <model> · 用时 <sec> 秒 · 连接方式：<直连/本地中转>` */
        val sec = ((kotlinx.datetime.Clock.System.now().toEpochMilliseconds() - t0) / 100.0).toInt() / 10.0
        Session.askStat = "模型 " + cfg.model + " · 用时 " + sec + " 秒 · 连接方式：" +
            (if (cfg.wire == "proxy") "本地中转" else "浏览器直连")
        /* 断辞写回卦例本那一条（早先那一版 updateCaseDuanci + markModelAnswered） */
        RecStore.updateDuanci(Session.recId, Session.askAnswer, model = true)
        Session.followReady = true     /* 答完 ⇒ 「接着问」出现 */
    } catch (e: Throwable) {
        if (Session.castSeq != seq) return       /* 换卦了：别把上一趟的错贴到新卦上 */
        if (Session.askAnswer.isBlank()) Session.askErr = e.message ?: "解卦失败" else Session.askErr = e.message ?: ""
    } finally {
        if (Session.castSeq == seq) Session.askBusy = false
    }
}

/* 复制「这一卦」的正文 —— 逐条照早先那一版 resultCore.js 的 copyClean()：
   所问 / 背景（有才带）/ 卦·时（带取数来源）/ 事类（有才带）/ 断辞 / 落款 */
private fun copyCleanText(ctx: Context, cast: Cast, body: String): String {
    val L = mutableListOf<String>()
    L += "【所问】" + ctx.q
    if (ctx.bg.isNotEmpty()) L += "【背景】" + ctx.bg
    L += "【卦】" + ctx.g1 + " · " + ctx.g2 + " · " + ctx.g3 + "　" + cast.ziName + "时　（" + ctx.src + "）"
    if (ctx.cat.name.isNotEmpty()) L += "【事类】" + ctx.cat.name
    if (body.isNotBlank()) L += "【断辞】\n" + plainDuanci(body)
    L += "道家小六壬 · 卦台"
    return L.joinToString("\n")
}

/* 剪贴板图标（早先那一版 .doc-copy 里那两条 SVG 路径：11×11 圆角方块 + 左边那张纸的折角） */
@Composable
private fun CopyIcon(onTap: () -> Unit) {
    Box(
        modifier = Modifier.size(28.dp).tapNoIndication { onTap() },
        contentAlignment = Alignment.Center,
    ) {
        Canvas(modifier = Modifier.size(13.dp)) {
            val s = size.width / 24f
            val w = 1.7f * s
            drawRoundRect(
                color = KY_DIM2,
                topLeft = Offset(9f * s, 9f * s),
                size = Size(11f * s, 11f * s),
                cornerRadius = CornerRadius(2f * s),
                style = Stroke(w),
            )
            /* M5 15V5a2 2 0 0 1 2-2h10 —— 竖线 + 圆角拐弯 + 横线 */
            drawLine(KY_DIM2, Offset(5f * s, 15f * s), Offset(5f * s, 7f * s), strokeWidth = w)
            drawArc(
                color = KY_DIM2,
                startAngle = 180f,
                sweepAngle = 90f,
                useCenter = false,
                topLeft = Offset(5f * s, 5f * s),
                size = Size(4f * s, 4f * s),
                style = Stroke(w),
            )
            drawLine(KY_DIM2, Offset(7f * s, 5f * s), Offset(15f * s, 5f * s), strokeWidth = w)
        }
    }
}

@Composable
private fun RecapCard(cast: Cast) {
    val ctx = Session.ctx ?: return
    val shape = RoundedCornerShape(Skin.rCard)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .glassMaterial(shape)
    ) {
        Recap(ctx, cast)
    }
}

@Composable
private fun Recap(ctx: Context, cast: Cast, onCopy: (() -> Unit)? = null) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 14.dp)
        ) {
            /* 标签 → 值 的间距照早先那一版 CSS：`.recap-q{gap:10px}`、`.recap-row{gap:6px 20px}`、
               `.rw{gap:6px}` —— 也就是**标签紧贴自己的值**（6dp），两个「卦 / 时」小段之间空 20dp，
               不再用 42dp 的固定标签槽（：「卦字后面空了很长一段才是真正的卦，
               而时字紧挨着当前时辰，布局都不统一」）。 */
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text_(text = "所问", fontSize = 11f, lineHeight = 19f, letterSpacing = 1.54f, color = KY_DIM2)
                Spacer(modifier = Modifier.width(10.dp))
                Text_(
                    text = ctx.q,
                    modifier = Modifier.weight(1f),
                    fontSize = 13.5f,
                    lineHeight = 23.6f,
                    weight = 500,
                )
                /* 复制这一卦（问题＋卦＋断辞）—— 早先那一版是断辞栏标题右侧那颗 doc-copy 图标
                   （DivinationPane.jsx:84，13px 剪贴板图标、1.7 描边），这里挂在「所问」这一行右端 */
                if (onCopy != null) CopyIcon(onCopy)
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text_(text = "卦", fontSize = 10.5f, lineHeight = 19.4f, letterSpacing = 1.47f, color = KY_DIM2)
                Spacer(modifier = Modifier.width(6.dp))
                Text_(text = cast.g[0] + " · " + cast.g[1] + " · " + cast.g[2], fontSize = 15f, lineHeight = 27.8f, serif = true, letterSpacing = 0.9f)
                Spacer(modifier = Modifier.width(20.dp))
                Text_(text = "时", fontSize = 10.5f, lineHeight = 19.4f, letterSpacing = 1.47f, color = KY_DIM2)
                Spacer(modifier = Modifier.width(6.dp))
                Text_(text = cast.ziName + "时", fontSize = 15f, lineHeight = 27.8f, serif = true, letterSpacing = 0.9f)
            }
            Spacer(modifier = Modifier.height(16.dp))
            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(KY_LINE))
        }
    }
}

@Composable
private fun SideButtons(onNewCast: () -> Unit, onAsk: () -> Unit) {
    /* 左右一排：新开一卦在左、让模型解卦在右（：「顺手一点」） */
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        GhostSmall("新开一卦", onNewCast, Modifier.weight(1f))
        Spacer(modifier = Modifier.width(10.dp))
        PrimarySmall(if (Session.askBusy) "解卦中…" else "让模型解卦", onAsk, Modifier.weight(1f))
    }
}

@Composable
private fun PrimarySmall(label: String, onClick: () -> Unit = {}, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .height(43.dp)
            .clip(RoundedCornerShape(12.dp))
            .glassMaterial(RoundedCornerShape(12.dp), control = true, primary = true)
            .tapNoIndication { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Text_(text = label, fontSize = 14f, lineHeight = 18f, weight = 500, color = KY_PRIMARY_LABEL)
    }
}

@Composable
private fun GhostSmall(label: String, onClick: () -> Unit = {}, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .height(43.dp)
            .tapNoIndication { onClick() }
            .clip(RoundedCornerShape(12.dp))
            .glassMaterial(RoundedCornerShape(12.dp), control = true),
        contentAlignment = Alignment.Center,
    ) {
        Text_(text = label, fontSize = 14f, lineHeight = 18f, color = KY_INK)
    }
}

/* 断卦依据：**一张卡**，点表头 ⇒ 卡片整体拉长，里面的各组排下来（每组再单独展开）。
   ：「断卦依据不是一个卡片吗点击展开之后整个卡片拉长，内部是各种依据排下来，
   然后各种依据展开的动画也没跟上」⇒ 表头与内容放进同一个 Column 的同一张卡里，
   高度变化走 AnimatedVisibility 的 expandVertically / shrinkVertically。 */
@Composable
private fun EvidenceCard(blocks: List<Block>, onHeaderH: (Int) -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    val open = Session.evidenceOpen
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .glassMaterial(shape)
    ) {
        /* 表头（就是原来那条「断卦依据」，高度 56dp，给断辞卡算上限用） */
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .onGloballyPositioned { onHeaderH(it.size.height) }
                .tapNoIndication { Session.evidenceOpen = !open }
                .padding(horizontal = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Start,
        ) {
            Text_(
                text = "▶",
                fontSize = 11f,
                lineHeight = 20f,
                color = KY_DIM2,
                modifier = Modifier.graphicsLayer { rotationZ = if (open) 90f else 0f },
            )
            Spacer(modifier = Modifier.width(14.dp))
            Text_(text = "断卦依据", fontSize = 14f, lineHeight = 26f, weight = 500)
            Spacer(modifier = Modifier.width(13.dp))
            Text_(
                text = blocks.size.toString() + " 组 · 每条带出处",
                fontSize = 11.5f,
                lineHeight = 24f,
                color = KY_DIM2,
            )
            Spacer(modifier = Modifier.weight(1f))
            Text_(text = if (open) "收起" else "点开看", fontSize = 11.5f, lineHeight = 24f, color = KY_DIM2)
        }
        /* 卡片拉长/收回：内容高度自带测量，expandVertically 会从 0 长到自然高。
           ⚠ 必须再套一层 clipToBounds：Kuikly 的 expandVertically 是**整块内容先按自然高排好、
              再裁出可见部分**，不裁的话展开途中内容会画到表头上面去（截图：
              第一组「A」的半截露在「断卦依据」上方，看着像两层浮在一起）。 */
        Box(modifier = Modifier.fillMaxWidth().clipToBounds()) {
        com.tencent.kuikly.compose.animation.AnimatedVisibility(
            visible = open,
            enter = com.tencent.kuikly.compose.animation.expandVertically(
                animationSpec = tween(280, easing = KY_EASE_OUT),
            ) + com.tencent.kuikly.compose.animation.fadeIn(tween(200)),
            exit = com.tencent.kuikly.compose.animation.shrinkVertically(
                animationSpec = tween(220, easing = KY_EASE_IN),
            ) + com.tencent.kuikly.compose.animation.fadeOut(tween(160)),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 10.dp, end = 10.dp, bottom = 6.dp)
            ) {
                blocks.forEach { b -> EvGroup(b) }
            }
        }
        }
    }
}

/* 每一组：点标题展开条目（早先那一版 .blk / .blk-h2 两段式）。展开态挂在 EvOpen 上，
   换一卦就清空（早先那一版是 innerHTML 重写，等价） */
internal object EvOpen {
    var set by mutableStateOf(setOf<String>())
    fun clear() { set = setOf() }
}

@Composable
private fun EvGroup(b: com.xlr.k.judge.Block) {
    val isOpen = EvOpen.set.contains(b.n) && !b.disabled
    /* 子项样式（：「看着反而像是并列级别的菜单」）：
       不做成独立卡片 —— 没有边框、没有底、字号比「断卦依据」那条小一档，行尾一条极淡的分隔线。 */
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .tapNoIndication {
                    if (!b.disabled) EvOpen.set = if (isOpen) EvOpen.set - b.n else EvOpen.set + b.n
                }
                .padding(start = 10.dp, end = 10.dp, top = 9.dp, bottom = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text_(
                text = b.n,
                fontSize = 11f,
                lineHeight = 18f,
                color = KY_DIM2,
                modifier = Modifier.width(18.dp),
            )
            Column(modifier = Modifier.weight(1f)) {
                Text_(
                    text = b.t,
                    fontSize = 12.5f,
                    lineHeight = 19f,
                    weight = 500,
                    color = if (b.disabled) KY_DIM2 else KY_INK,
                )
                if (b.d.isNotEmpty()) {
                    Text_(text = b.d, fontSize = 10.5f, lineHeight = 16f, color = KY_DIM2)
                }
            }
            if (b.disabled) {
                Text_(text = "未开放", fontSize = 10f, lineHeight = 16f, color = KY_DIM2)
            } else {
                Text_(
                    text = b.items.size.toString() + " 条",
                    fontSize = 10.5f,
                    lineHeight = 16f,
                    color = KY_DIM2,
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text_(text = if (isOpen) "▾" else "▸", fontSize = 11f, lineHeight = 16f, color = KY_DIM2)
            }
        }
        /* 每组展开同理要裁剪（：「不止是断卦依据，里面任意一个子项展开也穿帮」）——
           Kuikly 的 expandVertically 不裁子层绘制，不套这层，条目会画到组标题/上一组上面去。 */
        Box(modifier = Modifier.fillMaxWidth().clipToBounds()) {
        com.tencent.kuikly.compose.animation.AnimatedVisibility(
            visible = isOpen,
            enter = com.tencent.kuikly.compose.animation.expandVertically(
                animationSpec = tween(220, easing = KY_EASE_OUT),
            ) + com.tencent.kuikly.compose.animation.fadeIn(tween(160)),
            exit = com.tencent.kuikly.compose.animation.shrinkVertically(
                animationSpec = tween(180, easing = KY_EASE_IN),
            ) + com.tencent.kuikly.compose.animation.fadeOut(tween(120)),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 28.dp, end = 10.dp, bottom = 10.dp)
            ) {
                b.items.forEach { it ->
                    Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                        Text_(
                            text = it.lb,
                            fontSize = 10.5f,
                            lineHeight = 18f,
                            color = KY_DIM2,
                            modifier = Modifier.width(58.dp),
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text_(
                                text = com.xlr.k.judge.stripB(it.tx),
                                fontSize = 11f,
                                lineHeight = 18f,
                                color = KY_DIM,
                            )
                            if (it.src.isNotEmpty()) {
                                Text_(
                                    text = "出处：" + it.src,
                                    fontSize = 10f,
                                    lineHeight = 16f,
                                    color = KY_DIM2,
                                    modifier = Modifier.padding(top = 2.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
        }
        /* 组与组之间一条极淡的线（子项区里才有的分隔，比卡片边框轻得多） */
        Box(modifier = Modifier.fillMaxWidth().padding(start = 10.dp).height(1.dp).background(veil(0.16f)))
    }
}


/* ════════════════════════════════════════════════════════════════════════════════
   断辞的滚动条（用户：「不是进度条，而是滚动条，现在看着很卡顿。
   滚动条你都不会了？那种非线性的，丝滑的。」）

   早先那一版真源：apps/mobile-web/src/data/phoneAnim.js → initScrollHint()
     · 3px 宽圆角墨条，颜色取 `--ink`（30%→19% 竖向渐变），跟九套皮肤走；
     · 拇指高 = 轨道 × (视口高 / 内容高)，最小 26px；位置 = 轨道 × 滚动进度；
     · 只在容器真能滚时出现；停手 900ms 淡出（CSS transition .26s ease）。

   这里移植时踩过两个坑，都写在这：
     ① Kuikly 的 DrawScope 里 `drawRoundRect(brush=…)` 不落地（编译过、状态对、屏幕什么都没有）
        ⇒ 只能用真 Box + background(Brush.verticalGradient)；
     ② 上一版把滚动状态（tick/alpha/prog）放外层的 JieContent 里 ⇒ 每一帧滚动都重组整个叁页
        （含 docBlocks 解析、整张卡）＝ 肉眼可见的卡顿 ⇒ 现在状态全收进这个小组件，只有它自己重组。

   进度按**像素**算（avg 项高 × 序号 + 项内偏移），不是按「第几项」整数跳 ⇒ 平滑；
   再套 tween(220, FastOutSlowIn) 做非线性补间 ⇒ 「丝滑」。
   ════════════════════════════════════════════════════════════════════════════════ */
@Composable
private fun ScrollHint(state: com.tencent.kuikly.compose.foundation.lazy.LazyListState, containerPx: Int, dens: Float, modifier: Modifier = Modifier) {
    if (containerPx <= 0 || dens <= 0f) return
    val info = state.layoutInfo
    val vis = info.visibleItemsInfo
    val tot = info.totalItemsCount
    if (tot <= 0 || vis.isEmpty()) return

    val viewportPx = (info.viewportEndOffset - info.viewportStartOffset).toFloat()
    val vp = if (viewportPx > 0f) viewportPx else containerPx.toFloat()
    /* ⚠ 内容高只在**项数变化**时量一次：滚动过程中可见项会变、平均项高就跟着抖，
       拇指高度会「呼吸」（93px→77→43px 那样），看着就是卡。记住一次就不动了。 */
    val metrics = remember(tot) {
        val vis0 = state.layoutInfo.visibleItemsInfo
        val avg0 = if (vis0.isEmpty()) 1f else vis0.sumOf { it.size }.toFloat() / vis0.size.toFloat()
        floatArrayOf(avg0, avg0 * tot)
    }
    val avgItem = metrics[0]
    val contentPx = metrics[1]
    val scrollablePx = contentPx - vp
    if (avgItem <= 0f || scrollablePx <= 4f) return          /* 内容没超出 ⇒ 不出条 */

    /* 像素级进度（0..1），静止时也连续 */
    val scrolledPx = avgItem * state.firstVisibleItemIndex + state.firstVisibleItemScrollOffset
    val target = (scrolledPx / scrollablePx).coerceIn(0f, 1f)

    /* 停手 1 秒淡出：collectLatest ⇒ 每来一次滚动就重置计时 */
    var lit by remember { mutableStateOf(false) }
    LaunchedEffect(state) {
        snapshotFlow { state.firstVisibleItemIndex * 100000 + state.firstVisibleItemScrollOffset }
            .collectLatest {
                lit = true
                kotlinx.coroutines.delay(1000)
                lit = false
            }
    }
    val alpha by animateFloatAsState(if (lit) 1f else 0f, tween(260, easing = FastOutSlowInEasing))
    val prog by animateFloatAsState(target, tween(220, easing = FastOutSlowInEasing))
    if (alpha <= 0.01f) return

    val containerDp = containerPx / dens
    val trackDp = (containerDp - 8f).coerceAtLeast(24f)
    val thumbDp = (trackDp * (vp / contentPx)).coerceIn(26f.coerceAtMost(trackDp), trackDp)
    val yDp = 4f + (trackDp - thumbDp) * prog

    Box(
        modifier = modifier
            .padding(end = 2.dp)
            .offset(y = yDp.dp)
            .width(3.dp)
            .height(thumbDp.dp)
            .graphicsLayer(alpha = alpha)
            .clip(RoundedCornerShape(2.dp))
            .background(
                Brush.verticalGradient(
                    listOf(
                        KY_INK.copy(alpha = 0.30f),
                        KY_INK.copy(alpha = 0.19f),
                    )
                )
            )
    )
}
