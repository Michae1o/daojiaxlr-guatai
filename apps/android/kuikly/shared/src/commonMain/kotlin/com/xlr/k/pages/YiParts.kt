package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import com.tencent.kuikly.compose.foundation.layout.requiredHeight
import com.tencent.kuikly.compose.ui.draw.clipToBounds
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.animation.core.CubicBezierEasing
import com.tencent.kuikly.compose.animation.core.animateFloatAsState
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.foundation.Canvas
import com.tencent.kuikly.compose.ui.draw.shadow
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.border
import com.tencent.kuikly.compose.foundation.clickable
import com.tencent.kuikly.compose.foundation.text.BasicTextField
import com.tencent.kuikly.compose.foundation.text.KeyboardActions
import com.tencent.kuikly.compose.foundation.text.KeyboardOptions
import com.tencent.kuikly.compose.ui.text.input.ImeAction
import com.tencent.kuikly.compose.ui.unit.sp
import com.tencent.kuikly.compose.foundation.gestures.detectTapGestures
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
import com.tencent.kuikly.compose.foundation.layout.size
import com.tencent.kuikly.compose.foundation.layout.width
import com.tencent.kuikly.compose.foundation.shape.CircleShape
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.material3.Text
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.draw.clip
import com.tencent.kuikly.compose.ui.draw.drawBehind
import com.tencent.kuikly.compose.ui.geometry.Offset
import com.tencent.kuikly.compose.ui.platform.LocalDensity
import com.tencent.kuikly.compose.ui.geometry.Rect
import com.tencent.kuikly.compose.ui.geometry.Size
import com.tencent.kuikly.compose.ui.graphics.Path
import com.tencent.kuikly.compose.ui.graphics.StrokeCap
import com.tencent.kuikly.compose.ui.graphics.StrokeJoin
import com.tencent.kuikly.compose.ui.graphics.Brush
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.platform.LocalDensity
import com.tencent.kuikly.compose.ui.graphics.drawscope.DrawScope
import com.tencent.kuikly.compose.ui.graphics.drawscope.Stroke
import com.tencent.kuikly.compose.ui.text.font.FontFamily
import com.tencent.kuikly.compose.ui.text.font.FontWeight
import com.tencent.kuikly.compose.ui.text.style.TextAlign
import com.tencent.kuikly.compose.ui.text.style.TextOverflow
import com.tencent.kuikly.compose.ui.layout.onGloballyPositioned
import com.tencent.kuikly.compose.ui.text.TextStyle
import com.tencent.kuikly.compose.ui.graphics.SolidColor
import com.tencent.kuikly.compose.ui.unit.dp
import com.tencent.kuikly.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/* 动画口径（定）：**一律非线性**。
   所有位移/缩放/透明度/尺寸过渡都走下面这几条缓动曲线，不用 LinearEasing、不做 1:1 线性插值。
   出场类（进场、升起、落位）用 OUT；收起类用 IN；带回弹的用 BACK。 */
internal val KY_EASE_OUT = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)
/* 需要「慢慢起、慢慢收」的一段（卡片撑开 + 键盘收起这两条要严丝合缝地叠在一起），
   用 ease-in-out。起手轻 ⇒ 两条动画之间的半帧错位在画面上看不出来。 */
internal val KY_EASE_IO = CubicBezierEasing(0.4f, 0f, 0.2f, 1f)
internal val KY_EASE_IN = CubicBezierEasing(0.4f, 0f, 1f, 1f)
internal val KY_EASE_BACK = CubicBezierEasing(0.34f, 1.3f, 0.5f, 1f)

@Composable
internal fun Text_(
    text: String,
    modifier: Modifier = Modifier,
    fontSize: Float = 14.5f,
    color: Color = KY_INK,
    weight: Int = 400,
    serif: Boolean = false,
    letterSpacing: Float = 0f,
    lineHeight: Float? = null,
    maxLines: Int = Int.MAX_VALUE,
    align: TextAlign? = null,
) {
    Text(
        text = text,
        modifier = modifier,
        color = color,
        fontSize = fontSize.sp,
        fontWeight = FontWeight(weight),
        fontFamily = if (serif) FontFamily.Serif else null,
        letterSpacing = letterSpacing.sp,
        lineHeight = (lineHeight ?: (fontSize * 1.85f)).sp,
        maxLines = maxLines,
        overflow = TextOverflow.Clip,
        textAlign = align,
    )
}

/* 柔光：新框架没有圆形渐变，用同心圆按 stop 叠出来（只画一次，不参与每帧） */
internal fun DrawScope.softGlow(
    cx: Float,
    cy: Float,
    radius: Float,
    color: Color,
    alpha: Float,
    rings: Int = 46,
) {
    /* （第三轮，）

       实测（放大 4 倍逐点看 + 关掉这层对照）：斜纹就是**斜向线性渐变**画出来的 ——
       Kuikly 画 45° 渐变会在卡面留下 6~8px 的斜向台阶；而卡片自己那条**竖向**渐变是干净的。
       ⇒ 规律：**轴对齐（横/竖）的渐变平滑，斜的会出台阶。**

       所以一团柔光改成「横向一档 ＋ 纵向一档」两层轴对齐渐变叠着画：
       两轴相乘的观感 ≈ 一团径向柔光，但每一步都是轴对齐的，不会再出斜纹。
       （`rings` 只为不改 12 个调用点的签名，已经不参与绘制。） */
    val w = size.width
    val h = size.height
    if (w <= 0f || h <= 0f) return
    val a = alpha * 0.58f
    drawRect(Brush.horizontalGradient(colorStops = glowStops(cx, radius, w, color, a)))
    drawRect(Brush.verticalGradient(colorStops = glowStops(cy, radius, h, color, a)))
}

/* 一条轴上「光心亮、两端透明」的 stop 表。
   第一版写错了：光心落在画布外（比如 fy>1）时会产出两个相同 t 的 stop，颜色直接乱掉
     —— 敦煌的暖沙当场变灰绿就是它。现在改成**按位置求值**：在 t=0 / 光心 / t=1 三处算 alpha，
     光心在画布外时中间那点夹到边界，自然退化成单向斜升/斜降。 */
private fun glowStops(
    center: Float,
    r: Float,
    total: Float,
    c: Color,
    a: Float,
): Array<Pair<Float, Color>> {
    if (total <= 0f) return arrayOf(0f to c.copy(alpha = 0f), 1f to c.copy(alpha = 0f))
    val pc = center / total
    val pr = (r / total).coerceAtLeast(0.0001f)
    fun alphaAt(t: Float): Float =
        (a * (1f - kotlin.math.abs(t - pc) / pr)).coerceIn(0f, 1f)

    val ts = ArrayList<Float>(3)
    ts += 0f
    val mid = pc.coerceIn(0f, 1f)
    if (mid > 0.0005f && mid < 0.9995f) ts += mid
    ts += 1f
    ts.sort()

    val out = ArrayList<Pair<Float, Color>>(3)
    var last = -1f
    for (t in ts) {
        var tt = t
        if (tt <= last) tt = last + 0.0005f
        if (tt > 1f) tt = 1f
        if (tt <= last) continue
        last = tt
        out += tt to c.copy(alpha = alphaAt(t))
    }
    if (out.size == 1) out += 1f to c.copy(alpha = 0f)
    return out.toTypedArray()
}

/* 小控件玻璃面：沿用统一材质，轮廓光限制在边缘，板面保持平整。 */
@Composable
internal fun GlassSurface(
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape,
    glow: Boolean = false,
    content: @Composable () -> Unit,
) {
    val d = Skin.def
    val bru = Skin.cur == "bru"
    // One background brush: keep the actual face and rim in one paint operation.
    // Layering several background modifiers can lose the intended face on this renderer.
    val face = d.surface.copy(alpha = if (Skin.dark) 0.86f else 0.72f)
    val light = if (Skin.dark) d.ink.copy(alpha = 0.34f) else Color.White.copy(alpha = 0.94f)
    val foot = if (Skin.dark) d.surface2.copy(alpha = 0.90f) else d.surface2.copy(alpha = 0.68f)
    Box(
        modifier = modifier.clip(shape)
            .background(
                Brush.verticalGradient(
                    0f to (if (bru) d.surface else light),
                    0.07f to (if (bru) d.surface else face),
                    0.86f to (if (bru) d.surface else face),
                    1f to (if (bru) d.surface else foot),
                )
            )
            .border(Skin.borderW, if (bru) d.ink else glassEdge, shape),
    ) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
internal fun MenuGlyph() {
    Canvas(modifier = Modifier.size(16.dp)) {
        val c = KY_DIM
        val k = size.width / 16f
        val w = 1.13f * k
        drawLine(c, Offset(2.7f * k, 3.3f * k), Offset(13.4f * k, 3.3f * k), strokeWidth = w)
        drawLine(c, Offset(2.7f * k, 6.7f * k), Offset(13.4f * k, 6.7f * k), strokeWidth = w)
        drawLine(c, Offset(2.7f * k, 10f * k), Offset(9.3f * k, 10f * k), strokeWidth = w)
        drawLine(c, Offset(2.7f * k, 13.3f * k), Offset(6.7f * k, 13.3f * k), strokeWidth = w)
    }
}

@Composable
internal fun SkinGlyph() {
    Canvas(modifier = Modifier.size(16.dp)) {
        val c = KY_DIM
        val k = size.width / 16f
        drawCircle(c, radius = 6.2f * k, center = Offset(8f * k, 8f * k), style = Stroke(1.07f * k))
        drawCircle(c, radius = 1.1f * k, center = Offset(5.1f * k, 7.6f * k))
        drawCircle(c, radius = 1.1f * k, center = Offset(6.9f * k, 4.9f * k))
        drawCircle(c, radius = 1.1f * k, center = Offset(10.1f * k, 5.2f * k))
    }
}

@Composable
internal fun SunGlyph() {
    /* 照早先那一版外壳 shell.html 的 #btnDN .ic-sun：
       <circle cx=12 cy=12 r=4/> + 8 条射线（M12 2v3 / M12 19v3 / M2 12h3 / M19 12h3 /
       M4.9 4.9l2.1 2.1 / M17 17l2.1 2.1 / M19.1 4.9L17 7 / M7 17l-2.1 2.1），
       线宽 1.6/24、圆头 ⇒ 这里按 24 格坐标画，随画布缩放 */
    Canvas(modifier = Modifier.size(16.dp)) {
        val c = KY_DIM
        val s = size.width / 24f
        val w = 1.6f * s
        drawCircle(c, radius = 4f * s, center = Offset(12f * s, 12f * s), style = Stroke(w))
        val rays = listOf(
            Offset(12f, 2f) to Offset(12f, 5f),
            Offset(12f, 19f) to Offset(12f, 22f),
            Offset(2f, 12f) to Offset(5f, 12f),
            Offset(19f, 12f) to Offset(22f, 12f),
            Offset(4.9f, 4.9f) to Offset(7f, 7f),
            Offset(17f, 17f) to Offset(19.1f, 19.1f),
            Offset(19.1f, 4.9f) to Offset(17f, 7f),
            Offset(7f, 17f) to Offset(4.9f, 19.1f),
        )
        rays.forEach {
            drawLine(c, Offset(it.first.x * s, it.first.y * s), Offset(it.second.x * s, it.second.y * s), strokeWidth = w)
        }
    }
}

@Composable
internal fun MoonGlyph() {
    /* 照早先那一版 .ic-moon 的那条 path：
         M20 14.5 A8.5 8.5 0 1 1 9.5 4 a6.8 6.8 0 0 0 10.5 10.5 z
       把它拆成两段弧（圆弧参数算好写死，别再拿眼睛凑）：
         外弧：圆心 (11.82,12.18) r8.5，从 15.8° 起顺时针 238.4°（走左边那一大圈）
         内弧：两端点间距 14.849 ⇒ 半径被 SVG 撑到 7.4246（半圆），圆心 (14.75,9.25)，
               从 225° 起逆时针 180°（走右边那一小圈）⇒ 两道弧线合成月牙，线宽和太阳一致 */
    Canvas(modifier = Modifier.size(16.dp)) {
        val c = KY_DIM
        val s = size.width / 24f
        val w = 1.6f * s
        val p = Path()
        p.moveTo(20f * s, 14.5f * s)
        p.arcTo(
            rect = Rect(3.32f * s, 3.68f * s, 20.32f * s, 20.68f * s),
            startAngleDegrees = 15.8f,
            sweepAngleDegrees = 238.4f,
            forceMoveTo = false,
        )
        p.arcTo(
            rect = Rect(7.3254f * s, 1.8254f * s, 22.1746f * s, 16.6746f * s),
            startAngleDegrees = 225f,
            sweepAngleDegrees = -180f,
            forceMoveTo = false,
        )
        p.close()
        drawPath(p, color = c, style = Stroke(width = w, cap = StrokeCap.Round, join = StrokeJoin.Round))
    }
}

@Composable
internal fun ArrowGlyph(color: Color) {
    Canvas(modifier = Modifier.size(19.dp)) {
        val k = size.width / 19f
        val w = 1.5f * k
        drawLine(color, Offset(3.9f * k, 9.5f * k), Offset(14.2f * k, 9.5f * k), strokeWidth = w)
        drawLine(color, Offset(9.8f * k, 4.9f * k), Offset(14.4f * k, 9.5f * k), strokeWidth = w)
        drawLine(color, Offset(9.8f * k, 14.1f * k), Offset(14.4f * k, 9.5f * k), strokeWidth = w)
    }
}

@Composable
internal fun CaretGlyph() {
    Canvas(modifier = Modifier.size(8.dp)) {
        val c = KY_DIM
        val k = size.width / 8f
        drawLine(c, Offset(1f * k, 2.5f * k), Offset(4f * k, 5.5f * k), strokeWidth = 1f * k)
        drawLine(c, Offset(7f * k, 2.5f * k), Offset(4f * k, 5.5f * k), strokeWidth = 1f * k)
    }
}

/* 顶栏正中的步进序号：常显当前一个；落位后自动展开「贰 · 起卦」3 秒再收回，
   点一下也能就地展开 2 秒（早先的实现 STEP_TAP_MS = 2000）。 */
@Composable
internal fun StepBadge(step: String, label: String) {
    var open by remember { mutableStateOf(false) }
    /* 切页落位：展开 3 秒（旧 VFULL_MS = 3000）；换步时把「手势期强制收起」放掉 */
    LaunchedEffect(step) {
        Session.stepLabelClosed = false
        open = true
        delay(3000)
        open = false
    }
    /* 手点：展开 2 秒 */
    var tapAt by remember { mutableStateOf(0) }
    LaunchedEffect(tapAt) {
        if (tapAt > 0) {
            delay(2000)
            open = false
        }
    }
    val curve = KY_EASE_BACK
    /* 手势期（旧 stepCollapseAll）标签恒收起 */
    val isOpen = open && !Session.stepLabelClosed
    /* 三段过渡各走各的时长（照早先的实现：字号 .46s / 标签宽 .5s / 透明度 .3s），一律缓动 */
    val p by animateFloatAsState(if (isOpen) 1f else 0f, tween(500, easing = curve))
    val fp by animateFloatAsState(if (isOpen) 1f else 0f, tween(460, easing = curve))
    val ap by animateFloatAsState(if (isOpen) 1f else 0f, tween(300, easing = curve))
    val stepSize = 21f - 4f * fp          // 展开时 21 → 17
    val labelWidth = 50f * p              // max-width 0 → 约 50dp
    val labelShift = -5f + 5f * p         // translateX(-5px → 0)
    val marginLeft = 7f * p

    Row(
        modifier = Modifier.height(40.dp).tapNoIndication {
            open = true
            Session.stepLabelClosed = false
            tapAt = tapAt + 1
        },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text_(
            text = Session.stepGlyphOverride ?: step,
            fontSize = stepSize,
            lineHeight = 21f,
            serif = true,
            color = KY_INK,
        )
        if (p > 0.002f) {
            Spacer(modifier = Modifier.width(marginLeft.dp))
            Box(
                modifier = Modifier
                    .width(labelWidth.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .graphicsLayer {
                        alpha = ap
                        translationX = labelShift
                    },
            ) {
                Text_(
                    text = "· $label",
                    fontSize = 12f,
                    lineHeight = 18f,
                    color = KY_DIM,
                    maxLines = 1,
                )
            }
        }
    }
}

/* 起卦卡 */
@Composable
internal fun AskCard(onCast: () -> Unit) {
    val shape = RoundedCornerShape(Skin.rCard)
    /* 壳的淡入（早先那一版 html[data-step] .cbar 的 opacity .18s ease） */
    val shellA by com.tencent.kuikly.compose.animation.core.animateFloatAsState(
        targetValue = if (Session.cardShellOn) 1f else 0f,
        animationSpec = com.tencent.kuikly.compose.animation.core.tween(
            180,
            easing = com.tencent.kuikly.compose.animation.core.CubicBezierEasing(0.25f, 0.1f, 0.25f, 1f),
        ),
    )
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .onGloballyPositioned {
                /* 开屏那颗球要落到这张卡上：把它的根坐标记下来（早先那一版是 getBoundingClientRect('.cbar')） */
                val p = it.localToRoot(com.tencent.kuikly.compose.ui.geometry.Offset.Zero)
                Session.cardRect = floatArrayOf(p.x, p.y, it.size.width.toFloat(), it.size.height.toFloat())
            }
            .graphicsLayer {
                /* 壳不是硬切上来的：180ms 淡入（早先那一版 1346 那一帧是硬切，但那时球和卡像素级一致；
                   这里留一点交叠，万一有细微明暗差也不会"啪"一下） */
                alpha = shellA
            }
            .clip(shape)
            .glassMaterial(shape)
    ) {
        /* 开屏球落地后，卡里的内容才淡上来。早先那一版两条过渡分开写（legacy.css L3420）：
           opacity .42s ease ＋ transform .34s cubic-bezier(.2,.7,.25,1)，起点 translateY(7px) */
        val revOp by com.tencent.kuikly.compose.animation.core.animateFloatAsState(
            targetValue = if (Session.cardReveal) 1f else 0f,
            animationSpec = com.tencent.kuikly.compose.animation.core.tween(
                420,
                easing = com.tencent.kuikly.compose.animation.core.CubicBezierEasing(0.25f, 0.1f, 0.25f, 1f),
            ),
        )
        val revT by com.tencent.kuikly.compose.animation.core.animateFloatAsState(
            targetValue = if (Session.cardReveal) 1f else 0f,
            animationSpec = com.tencent.kuikly.compose.animation.core.tween(
                340,
                easing = com.tencent.kuikly.compose.animation.core.CubicBezierEasing(0.2f, 0.7f, 0.25f, 1f),
            ),
        )
        val dens = LocalDensity.current
        Column(
            modifier = Modifier
                .fillMaxWidth()
                /* ⚠ 移位必须用 offset（走布局），不能用 graphicsLayer.translationY：
                   Kuikly 给 BasicTextField 摆原生 EditText 时只认布局坐标，
                   用 graphicsLayer 移过的组，原生输入框会错位到下面「补充背景」那一行去
                   （实测被顶到 y1578–1658，一点就聚焦问题框）。修 */
                .offset(y = ((1f - revT) * 7f).dp)
                .graphicsLayer { alpha = revOp }
                .padding(start = 14.dp, top = 10.dp, end = 14.dp, bottom = 8.dp)
        ) {
            /* ：
               字段高度 = 30dp + (行数-1) × 27.2dp，最多 4 行；下面是 30dp 的老空档，所以单行时总高仍是 60dp，
               与改动前完全一致，多一行就真长一行。
               ⚠ 更正 之前记的「字段一高、下面整排按钮点不动」是**测量错误**——
                 点的是「报数」和「＋」之间的空隙（x=650）。按真实坐标（报数 543、＋ 776、箭头 916，y=2130）
                 重测：单行 57dp 与多行 87dp 两种高度下，报数/＋/箭头/字段全部正常响应。 */
            val fieldW = remember { mutableStateOf(0f) }
            val rows = fieldRows(Session.q, fieldW.value)
            val fieldH = 30f + (rows - 1) * 27.2f
            Box(modifier = Modifier.fillMaxWidth().height((fieldH + 30f).dp)) {
                if (Session.q.isEmpty()) {
                    Text_(
                        text = "问具体的事。例如「我这次面试能过吗」",
                        fontSize = 16f,
                        lineHeight = 27.2f,
                        color = KY_DIM2,
                        maxLines = 1,
                    )
                }
                /* Kuikly 给原生 EditText 摆位置时比 Compose 画的低一个框高：
                   占位文字画在 y1383，能点的矩形却在 1578–1658（正好压住「补充背景」那行）。
                   ⇒ 字段自己往回挪一个框高，让「能点的」回到「画出来的」那儿。*/
                BasicTextField(
                    value = Session.q,
                    onValueChange = { Session.q = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(fieldH.dp)
                        .onGloballyPositioned { c -> fieldW.value = c.size.width / dens.density },
                    textStyle = TextStyle(fontSize = 16.sp, lineHeight = 27.2.sp, color = KY_INK),
                    cursorBrush = SolidColor(KY_INK),
                    maxLines = 4,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = { if (Session.q.isNotBlank()) onCast() }),
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            /* ：
               ① 卡只留 输入框＋取数方式＋起卦键（原来 271dp ⇒ 现在约 136dp）；
               ② 详情**不做浮层**、也不做「三个点」——。
                  改为卡里一句「详情」：点它先收输入法，再在卡里撑开三段（补充背景 / 取数细节 / 事类）。 */
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                ModeSeg()
                Spacer(modifier = Modifier.weight(1f))
                DetailButton()
                Spacer(modifier = Modifier.width(8.dp))
                GoButton(onCast, Session.q.isNotBlank())
            }
            /* 报数：三个数直接在卡里报。
               只在报数模式出现，高度 44dp（8 间距 + 30 控件 + 6 垫底），跟别处一样缓动开合。
               用户同日：「一旦展开详情，这个小格子就隐藏」——详情里的三个步进才是完整版，
                 两个同时出现会重复 ⇒ 报数 且 详情展开时收起便捷格。 */
            val numH by animateFloatAsState(
                targetValue = if (Session.mode == "num" && !Session.moreOpen) 44f else 0f,
                animationSpec = tween(200, easing = KY_EASE_IO),
            )
            if (numH > 0.5f) {
                Box(modifier = Modifier.fillMaxWidth().height(numH.dp).clipToBounds()) {
                    Column(modifier = Modifier.fillMaxWidth().requiredHeight(44.dp)) {
                        /* ：「位置是不是太下了」⇒ 上间距 10→8、底部再垫 6，
                           让这一行离开卡片下沿，别贴着边 */
                        Spacer(modifier = Modifier.height(8.dp))
                        NumRowCompact()
                        Spacer(modifier = Modifier.height(6.dp))
                    }
                }
            }
            /* 卡片自己撑大：外层高度做缓动，内容按固定尺寸裁切（跟 BgFold / DetailPanel 一个套路） */
            val expOpen = Session.moreOpen
            val innerH = 24f + (if (Session.bgOpen) BG_H else 0f) + 10f + DT_H + 10f + 36f
            val expH by animateFloatAsState(
                targetValue = if (expOpen) innerH else 0f,
                animationSpec = tween(260, easing = KY_EASE_IO),
            )
            if (expH > 0.5f) {
                Box(modifier = Modifier.fillMaxWidth().height(expH.dp).clipToBounds()) {
                    Column(modifier = Modifier.fillMaxWidth().requiredHeight(innerH.dp)) {
                        Spacer(modifier = Modifier.height(10.dp))
                        BgFold()
                        Spacer(modifier = Modifier.height(10.dp))
                        DetailPanel()
                        Spacer(modifier = Modifier.height(10.dp))
                        CatCapsule()
                    }
                }
            }
            if (Session.errOn && Session.err.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text_(text = Session.err, fontSize = 11.5f, lineHeight = 18f, color = KY_ACCENT, weight = 500)
            }
        }
    }
}

@Composable
private fun DetailButton() {
    /* ：「详情做成按钮，也是圆的，里面是 V 型箭头，放在起卦按钮左边」。
       闪一下的成因：收键盘（宿主把整块往下放）+ 撑卡（往上长）不同步 ⇒ 一上一下。
       现在两边都是 200ms 同一曲线、同一帧起步，效果是「详情把键盘顶下去」。 */
    var held by remember { mutableStateOf(false) }
    val light by animateFloatAsState(
        if (held) 1f else 0f,
        animationSpec = tween(if (held) 90 else 180, easing = KY_EASE_OUT),
    )
    val open = Session.moreOpen
    val dens = LocalDensity.current
    val rot by animateFloatAsState(
        targetValue = if (open) 45f else 0f,
        animationSpec = tween(260, easing = KY_EASE_IO),
    )
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(RoundedCornerShape(999.dp))
            .glassMaterial(RoundedCornerShape(999.dp), pressed = light, control = true)
            .tapPressable({ held = it }) {
                /* 用户改口径：「不要两拍，一次成型，就像详情把键盘顶下去」——
                   点下去同一帧就干两件事：叫键盘收、撑卡。
                   宿主那边 hideIme 会**当场**把底部补间推回 0（200ms），撑卡也是 200ms 同一曲线
                   ⇒ 卡片的顶边几乎不动、底边跟着往下去换键盘的位置，看起来就是一次。
                   ⚠ 时长得对齐（宿主 animateImePad = 200ms decelerate），改一个记得改另一个。 */
                if (open) {
                    Session.moreOpen = false
                    /* 收起：撤掉 anchorOn（openP 会把它连同留白一起缓动回 0），宿主补间交还监听 */
                    Platform.anchorOn = false
                    Platform.padDriven = false
                } else {
                    Session.detailOpen = true
                    Session.moreOpen = true
                    if (Platform.imeVisible) {
                        /* 用户定的算法：「键盘高 100、详情只有 80，差 20 ⇒
                           点开详情的同时整张卡再一起回落 20」。
                           卡片长高 D 刚好吃掉键盘让出来的 D，(kb − D) 交给整卡回落
                           ⇒ 顶边钉住不动，只有下面被撑开。
                           ⚠ (kb − D) 必须做成**页面自己的底部留白**（Platform.anchorPadDp），
                             不能靠宿主内边距——那样露出的是窗口底色（白条）。 */
                        val dPx = with(dens) {
                            (24f + (if (Session.bgOpen) BG_H else 0f) + 10f + DT_H + 10f + 36f).dp.toPx()
                        }.toInt()
                        Platform.anchorKbPx = Platform.imePadPx      /* 记住这一刻的键盘高 */
                        Platform.anchorPadDp = with(dens) {
                            (Platform.anchorKbPx - dPx).coerceAtLeast(0).toFloat().toDp().value
                        }
                        Platform.anchorOn = true
                        Platform.padDriven = true      /* 内边距改由 Compose 每帧写 */
                        Platform.hideIme?.invoke()
                    }
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        /* 选 B：加号（DeepSeek 那种「更多」）。
           用 drawLine 两笔画，不用字符 ＋（字符的笔画粗细和字心跟圆对不齐）。
           展开时原地转 45° 变 ×＝收起来。
           同日第二轮：「+ 的颜色深了点，要和亮起来之后的起卦箭头一个色号」
             ⇒ 直接取 GoButton 里那支箭头的颜色（卡通＝onAccent，其余＝近黑 45% 透明）。 */
        val ic = if (Skin.cur == "bru") Skin.def.onAccent else KY_INK
        Canvas(modifier = Modifier.size(14.dp).graphicsLayer { rotationZ = rot }) {
            val s = size.width / 14f
            val w = 1.5f * s      /* 和那支箭头同样的 1.5 线宽，不然同样颜色也显得更重 */
            drawLine(ic, Offset(7f * s, 1.4f * s), Offset(7f * s, 12.6f * s), strokeWidth = w, cap = StrokeCap.Round)
            drawLine(ic, Offset(1.4f * s, 7f * s), Offset(12.6f * s, 7f * s), strokeWidth = w, cap = StrokeCap.Round)
        }
    }
}

@Composable
private fun GoButton(onClick: () -> Unit, enabled: Boolean) {
    /* 空框不给亮面、也不给点（早先的实现 syncGo：空就 disabled，opacity .3 + 去饱和）。
       命中区比视觉大一圈（56dp 容器装 42dp 圆），手指不用点得那么准。 */
    var held by remember { mutableStateOf(false) }
    val light by animateFloatAsState(
        if (held && enabled) 1f else 0f,
        animationSpec = tween(if (held) 90 else 180, easing = KY_EASE_OUT),
    )
    Box(
        modifier = Modifier
            .size(48.dp)
            .onGloballyPositioned { c ->
                val p = c.localToRoot(Offset.Zero)
                CastFx.fromX = p.x + c.size.width / 2f
                CastFx.fromY = p.y + c.size.height / 2f
                /* 开屏剥出来的那枚小球要滑到这里（早先那一版 dotAbs = card.querySelector('.go')） */
                Session.sendRect = floatArrayOf(p.x, p.y, c.size.width.toFloat(), c.size.height.toFloat())
            }
            .tapPressable({ held = it }) { if (enabled && Session.q.isNotBlank()) onClick() },
        contentAlignment = Alignment.Center,
    ) {
        val bru = Skin.cur == "bru"
        val sendShape: com.tencent.kuikly.compose.ui.graphics.Shape =
            if (bru) RoundedCornerShape(Skin.rPill) else CircleShape
        Box(
            modifier = Modifier
                .size(36.dp)
                .graphicsLayer { alpha = if (enabled) 1f else 0.3f }
                .clip(sendShape)
                .then(
                    if (bru) Modifier.background(Skin.def.accent)
                        .border(Skin.borderW, Skin.def.ink, sendShape)
                    else Modifier.glassMaterial(sendShape, pressed = light, control = true)
                ),
            contentAlignment = Alignment.Center,
        ) {
            ArrowGlyph(if (bru) Skin.def.onAccent else KY_INK)
        }
    }
}

/* 输入框要几行（1..4）：按字符估宽折行 —— 全角 16.2dp、半角 8.6dp，wDp 是字段可用宽度。 */
private fun fieldRows(s: String, wDp: Float): Int {
    if (wDp <= 0f) return 1
    var total = 0
    for (line in s.split('\n')) {
        var sum = 0f
        var n = 1
        for (ch in line) {
            val adv = if (ch.code > 0x2E80) 16.2f else 8.6f
            if (sum + adv > wDp) {
                n++
                sum = adv
            } else {
                sum += adv
            }
        }
        total += n
    }
    return total.coerceIn(1, 4)
}

