package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.animation.core.Animatable
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.foundation.Canvas
import com.tencent.kuikly.compose.foundation.Image
import com.tencent.kuikly.compose.ui.geometry.Offset
import com.tencent.kuikly.compose.ui.geometry.Size
import com.tencent.kuikly.compose.ui.graphics.drawscope.Stroke
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.border
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Row
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.offset
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.foundation.layout.size
import com.tencent.kuikly.compose.foundation.layout.width
import com.tencent.kuikly.compose.foundation.shape.CircleShape
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.draw.drawBehind
import com.tencent.kuikly.compose.ui.graphics.Brush
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.layout.onGloballyPositioned
import com.tencent.kuikly.compose.ui.platform.LocalDensity
import com.tencent.kuikly.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/* 开屏（手机版）。抄 apps/mobile-web/src/data/splashCore.js 的**手机那一支**
   ＋ styles/legacy.css 的 #xlrSplash 一组规则（的口径）。

   ⚠ 别去画太极：明确「太极取消」，CSS 里 .sl-taiji / .sl-orbwrap 是
     display:none !important（legacy.css L3336-3337）。现在开屏＝竖轴 + 标题 + 副题 + 分隔线 +
     箴言 + 三条提示 + 一枚 58dp 液态玻璃圆按钮 + 「点击进入」。

   三层时间轴（早先那一版逐段照抄，全部是**非线性**曲线）：
     ① 入场：按钮 slUp（0.7s / 延迟 .5s，opacity 0→1 + 上移 8px），之后 slBreath（4.2s 一循环，±3px）
     ② 飞行 720ms，5 段关键帧，**每段一条自己的 cubic-bezier**（WAAPI 里 easing 属于「该帧起始的那一段」）：
        0→.13  ease-out            translate(0,0)      → translate(0,3)      scale(1,1)  → (1.07,.93)
        .13→.42 cubic(.1,.9,.2,1)  → translate(dx*.08,-rise) scale(.97,1.04)
        .42→.83 cubic(.45,0,.88,.52) → translate(dx,floorY)  scale(.95,1.09)
        .83→.92 cubic(.35,0,.9,.45)  → translate(dx,floorY)  scale(1.18,.82)   ← 撞底压扁
        .92→1   cubic(.2,.8,.3,1)    → translate(dx,floorY-bounce) scale(1,1)  ← 反弹
     ③ 形变 620ms（早先那一版 d2=620，不是 430）：
        width/height  cubic(.2,.75,.25,1)
        border-radius cubic(.4,.05,.2,1)
        transform     cubic(.2,.72,.24,1)
        同时 .26s 内把「主题色实心」褪成**和输入卡同一套玻璃面**
        （⚠ 源码 L344-345 点名过：这一步给 delay 就会出现「尺寸已经是方框、颜色还是实心主题色」的黑块）

   早先那一版的「小球从大球里剥离、飞去当提交键」这一段（seed，860→1340ms）这版还没做。 */

private const val MS_MOTION = 720f
private const val MS_MORPH = 620f      /* 早期版本 var d2 = 620（不是 430） */
private const val MS_SEED = 480f       /* 剥离小球横滑：860 → 1340 */
private const val T_END = 1620f        /* 开屏层撤掉的时刻 */

/** 按钮在根坐标里的基准位置（px） */
private class Base(val x: Float, val y: Float, val w: Float)

/** 一个关键帧：进度 / 横向位移比例（乘 dx）/ 纵向位移（px，绝对值）/ 两个缩放 */
private class Kf(val at: Float, val fx: Float, val ty: Float, val sx: Float, val sy: Float)

/** 各段缓动（对应早先那一版关键帧上的 easing；第 0 段是 CSS 的 ease-out） */
private val SEG = listOf(
    floatArrayOf(0f, 0f, 0.58f, 1f),      /* ease-out */
    floatArrayOf(0.1f, 0.9f, 0.2f, 1f),
    floatArrayOf(0.45f, 0f, 0.88f, 0.52f),
    floatArrayOf(0.35f, 0f, 0.9f, 0.45f),
    floatArrayOf(0.2f, 0.8f, 0.3f, 1f),
)

/** CSS cubic-bezier：先解 x(u)=t，再取 y(u) */
private fun bezier(b: FloatArray, t: Float): Float {
    val x1 = b[0]
    val y1 = b[1]
    val x2 = b[2]
    val y2 = b[3]
    val tt = t.coerceIn(0f, 1f)
    var u = tt
    for (i in 0 until 7) {
        val x = 3f * (1 - u) * (1 - u) * u * x1 + 3f * (1 - u) * u * u * x2 + u * u * u
        val d = 3f * (1 - u) * (1 - u) * x1 + 6f * (1 - u) * u * (x2 - x1) + 3f * u * u * (1 - x2)
        if (kotlin.math.abs(d) < 1e-5f) break
        u = (u - (x - tt) / d).coerceIn(0f, 1f)
    }
    return 3f * (1 - u) * (1 - u) * u * y1 + 3f * (1 - u) * u * u * y2 + u * u * u
}

@Composable
internal fun SplashOverlay() {
    if (!Session.splashOn) return
    val dens = LocalDensity.current
    val scope = rememberCoroutineScope()
    val den = dens.density

    var t by remember { mutableStateOf(-1f) }        /* <0 = 还没点 */
    var base by remember { mutableStateOf<Base?>(null) }

    /* 入场（旧 slUp：0.7s / 延迟 .5s）＋ 呼吸（旧 slBreath：4.2s 一循环 ±3px，1.6s 后开始） */
    val enterA = remember { Animatable(0f) }
    val enterY = remember { Animatable(8f) }
    val breath = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        delay(500)
        launch { enterA.animateTo(1f, tween(700, easing = KY_EASE_OUT)) }
        enterY.animateTo(0f, tween(700, easing = KY_EASE_OUT))
        delay(900)
        while (true) {
            breath.animateTo(-3f * den, tween(2100, easing = KY_EASE_OUT))
            breath.animateTo(0f, tween(2100, easing = KY_EASE_IN))
        }
    }

    val tapped = t >= 0f
    val pm = if (!tapped) 0f else (t / MS_MOTION).coerceIn(0f, 1f)
    val mm = if (!tapped) 0f else ((t - MS_MOTION) / MS_MORPH).coerceIn(0f, 1f)

    val screenH = (if (Platform.screenH > 0) Platform.screenH else 2400).toFloat()
    val rise = minOf(104f * den, screenH * 0.12f)
    val bounce = rise * 0.46f
    val card = Session.cardRect
    val b = base
    val bw = b?.w ?: (58f * den)
    val bx = b?.x ?: 0f
    val by = b?.y ?: 0f
    val cardW = card?.get(2) ?: bw
    val cardH = card?.get(3) ?: bw
    val cardX = card?.get(0) ?: bx
    val cardY = card?.get(1) ?: by
    val dx = (cardX + cardW / 2f) - (bx + bw / 2f)
    val floorY = screenH - bw - by

    /* ---- ① 飞行段：五段关键帧，各用各的贝塞尔 ---- */
    var mx = 0f
    var my = 0f
    var msx = 1f
    var msy = 1f
    if (tapped) {
        val kfs = listOf(
            Kf(0.00f, 0f, 0f, 1f, 1f),
            Kf(0.13f, 0f, 3f * den, 1.07f, 0.93f),
            Kf(0.42f, 0.08f, -rise, 0.97f, 1.04f),
            Kf(0.83f, 1f, floorY, 0.95f, 1.09f),
            Kf(0.92f, 1f, floorY, 1.18f, 0.82f),
            Kf(1.00f, 1f, floorY - bounce, 1f, 1f),
        )
        var i = 0
        while (i < kfs.size - 2 && pm > kfs[i + 1].at) i++
        val a = kfs[i]
        val c = kfs[i + 1]
        val span = (c.at - a.at).coerceAtLeast(0.0001f)
        val k = bezier(SEG[i.coerceAtMost(SEG.size - 1)], (pm - a.at) / span)
        mx = (a.fx + (c.fx - a.fx) * k) * dx
        my = a.ty + (c.ty - a.ty) * k
        msx = a.sx + (c.sx - a.sx) * k
        msy = a.sy + (c.sy - a.sy) * k
    }

    /* ---- ② 形变段：宽高 / 位移 / 圆角 各走各的曲线（早先那一版三条 transition 分开写） ---- */
    val eW = bezier(floatArrayOf(0.2f, 0.75f, 0.25f, 1f), mm)
    val eT = bezier(floatArrayOf(0.2f, 0.72f, 0.24f, 1f), mm)
    val eR = bezier(floatArrayOf(0.4f, 0.05f, 0.2f, 1f), mm)
    val wPx = bw + (cardW - bw) * eW
    val hPx = bw + (cardH - bw) * eW
    val rPx = (bw / 2f) + (24f * den - bw / 2f) * eR
    val leftPx = (bx + mx) + (cardX - (bx + mx)) * eT
    val topPx = (by + my) + (cardY - (by + my)) * eT
    /* 主题色 → 卡的玻璃面：0.26s，不能延后（早先那一版注释点名过，延后就是一块实心黑框）。
       用 ease-out（别用 ease-in）：先快速褪淡，别让它在飞行末尾还读成一块黑 */
    val glassMix = if (!tapped) 0f else bezier(floatArrayOf(0.2f, 0.85f, 0.25f, 1f), (t - MS_MOTION).coerceAtLeast(0f) / 260f)

    val textA = if (!tapped) 1f else (1f - (t - 150f).coerceAtLeast(0f) / 260f).coerceIn(0f, 1f)
    val tint = if (!tapped) 0f else bezier(floatArrayOf(0.25f, 0.1f, 0.25f, 1f), (t - 150f).coerceAtLeast(0f) / 420f)
    /* 720ms 起开屏层自己的底色渐隐（旧 #xlrSplash{transition:background .42s ease}）。
       早先那一版是 .42s，这里放长到 560ms 并用 ease-out——`.42s ease` 在中段掉得很快，观感像"啪"一下没了 */
    val layerA = if (!tapped) 1f else
        (1f - bezier(floatArrayOf(0.2f, 0.75f, 0.25f, 1f), (t - MS_MOTION).coerceAtLeast(0f) / 560f)).coerceIn(0f, 1f)
    val arrowA = if (!tapped) 1f else (1f - t / 220f).coerceIn(0f, 1f)

    /* 早先那一版 --accent-bg = accent 的 7%：黑皮肤下 ≈ #E4E4E5 */
    val bgR = KY_BG.red + (0.895f - KY_BG.red) * tint
    val bgG = KY_BG.green + (0.895f - KY_BG.green) * tint
    val bgB = KY_BG.blue + (0.895f - KY_BG.blue) * tint

    Box(modifier = Modifier.fillMaxSize()) {
        /* 只是「底色」这一层跟着 layerA 渐隐；飞的那块和文字各自管自己的透明度 */
        Box(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer { alpha = layerA }
                .background(Color(bgR, bgG, bgB, 1f))
        )
        /* 开屏的「画」：水墨晕染圆 + 香槟金细线与节点
           只在没点之前画（飞行动画期间每秒重绘上千笔会掉帧），随文字一起淡出 */
        /* ⚠ 现象：「点击后飞起来极其慢、像卡住」：这幅水墨每帧上千笔（160 弧 + 900 点 + 200 笔触），
           我上一版把它挂在「t < 720ms」里 ⇒ 恰好盖住了整个起飞段，每帧都被这堆绘制拖住，动画看起来像在爬。
           ⇒ 改成**只在没点之前挂载**：点下去的瞬间它就撤掉（文字本来也在 150ms 后开始淡出，看不出断）。 */
        if (!tapped) {
            SplashArt(alphaProvider = { textA }, rise = rise)
        }
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(modifier = Modifier.height((screenH * 0.18f / den).dp))
            Box(
                modifier = Modifier
                    .width(1.dp)
                    .height(18.dp)
                    .background(Color(0.05f, 0.05f, 0.06f, 0.10f))
                    .graphicsLayer { alpha = textA }
            )
            Box(
                modifier = Modifier
                    .size(4.dp)
                    .background(Color(0.05f, 0.05f, 0.06f, 0.30f), CircleShape)
                    .graphicsLayer { alpha = textA }
            )
            Text_(
                text = "道家小六壬",
                fontSize = 34f,
                lineHeight = 46f,
                letterSpacing = 10.2f,
                serif = true,
                color = KY_INK,
                modifier = Modifier.padding(top = 18.dp).graphicsLayer { alpha = textA },
            )
            Text_(
                text = "基于邵一尘老师 · 道家小六壬所作",
                fontSize = 12.5f,
                lineHeight = 20f,
                letterSpacing = 0.75f,
                serif = true,
                color = KY_DIM,
                modifier = Modifier.padding(top = 11.dp).graphicsLayer { alpha = textA },
            )
            Box(
                modifier = Modifier
                    .padding(top = 18.dp)
                    .width(44.dp)
                    .height(1.dp)
                    .background(Color(0.05f, 0.05f, 0.06f, 0.14f))
                    .graphicsLayer { alpha = textA }
            )
            Text_(
                text = "无事不卦 · 心动即卦 · 一事不二卦",
                fontSize = 16f,
                lineHeight = 26f,
                letterSpacing = 2.6f,
                serif = true,
                color = KY_INK,
                modifier = Modifier.padding(top = 16.dp).graphicsLayer { alpha = textA },
            )
            Column(
                modifier = Modifier.padding(top = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                listOf(
                    "问题要具体：问什么，卦就答什么",
                    "越拆细越容易错 —— 够用即止",
                    "结果只到「参考」层级，决定权在你",
                ).forEach { line ->
                    Text_(
                        text = line,
                        fontSize = 12f,
                        lineHeight = 24f,
                        serif = true,
                        color = KY_DIM2,
                        modifier = Modifier.graphicsLayer { alpha = textA },
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            /* 飞行前：按钮就在版面上（玻璃面 + 呼吸）；飞起来以后这里留空位 */
            Box(modifier = Modifier.size(58.dp), contentAlignment = Alignment.Center) {
                if (t <= MS_MOTION) {
                    Box(
                        modifier = Modifier
                            .size(58.dp)
                            .graphicsLayer {
                                alpha = enterA.value
                                translationY = enterY.value + breath.value + my
                                translationX = mx
                                scaleX = msx
                                scaleY = msy
                            }
                            .onGloballyPositioned {
                                if (!tapped) {
                                    val p = it.localToRoot(com.tencent.kuikly.compose.ui.geometry.Offset.Zero)
                                    base = Base(p.x, p.y, it.size.width.toFloat())
                                }
                            }
                            .tapNoIndication {
                                if (!tapped) {
                                    t = 0f
                                    scope.launch {
                                        /* ：
                                           原来时间轴是**按帧累加**的（每帧 +16ms）—— 只要某几帧画得慢，
                                           时间轴就比真实时间走得慢，720ms 的起飞能拖成两三秒。
                                           改成**按真实时钟走**（早先那一版那几条 setTimeout 本来也是墙钟）：
                                           不管掉不掉帧，节奏都是 720 / 620 / 1340 / 1620。 */
                                        val t0 = kotlinx.datetime.Clock.System.now().toEpochMilliseconds()
                                        while (true) {
                                            val el = (kotlinx.datetime.Clock.System.now().toEpochMilliseconds() - t0).toFloat()
                                            t = el
                                            /* 早先那一版那几条 setTimeout 的里程碑，统一在这条时间轴上判 */
                                            if (el >= 920f && !Session.cardReveal) Session.cardReveal = true
                                            if (el >= 990f && !Session.chromeReveal) Session.chromeReveal = true
                                            if (el >= 1346f && !Session.cardShellOn) Session.cardShellOn = true
                                            if (el > T_END) break
                                            delay(16)
                                        }
                                        Session.splashOn = false
                                    }
                                }
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        /* 面：早先那一版 linear-gradient(168deg, rgba(255,255,255,.56), rgba(255,255,255,.22))
                           → 点下去先变成主题色（旧 .sl-go.ink），形变时再褪回玻璃（旧 .sl-go.glass） */
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    if (tapped) KY_ACCENT else veil(0f),
                                    CircleShape,
                                )
                        )
                        if (!tapped) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.linearGradient(
                                            listOf(veil(0.56f), veil(0.22f))
                                        ),
                                        CircleShape,
                                    )
                            )
                        }
                        /* 边：1px 白 .55；内受光：顶上一条很细的高光（旧 inset 0 1px 0 rgba(255,255,255,.92)） */
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .border(Skin.borderW, KY_CARD_LINE, CircleShape)
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(1.5.dp)
                                .border(Skin.borderW, KY_CARD_LINE, CircleShape)
                        )
                        if (arrowA > 0f) {
                            Box(modifier = Modifier.graphicsLayer { alpha = arrowA }) {
                                ArrowGlyph(if (tapped) Color(1f, 1f, 1f) else KY_INK)
                            }
                        }
                    }
                }
            }

            if (!tapped) {
                Row(
                    modifier = Modifier
                        .padding(top = 18.dp)
                        .graphicsLayer {
                            alpha = enterA.value * textA
                            translationY = enterY.value
                        },
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(modifier = Modifier.width(40.dp).height(1.dp).background(Color(0.05f, 0.05f, 0.06f, 0.14f)))
                    Text_(
                        text = "点击进入",
                        fontSize = 11.5f,
                        lineHeight = 18f,
                        letterSpacing = 3.2f,
                        color = KY_DIM2,
                        modifier = Modifier.padding(horizontal = 12.dp),
                    )
                    Box(modifier = Modifier.width(40.dp).height(1.dp).background(Color(0.05f, 0.05f, 0.06f, 0.14f)))
                }
            }
            Spacer(modifier = Modifier.weight(1f))
        }

        /* 形变段：同一块东西从天上长到输入卡的位置。底层主题色按 glassMix 褪掉，
           上面盖一层和输入卡同样的玻璃面（白 .22→.14 + 白边 .55），落地那刻正好接上真卡 */
        if (tapped && t > MS_MOTION && t < 1526f) {
            val blockA = (1f - (t - 1346f).coerceAtLeast(0f) / 180f).coerceIn(0f, 1f)
            Box(
                modifier = Modifier
                    .offset(x = with(dens) { leftPx.toDp() }, y = with(dens) { topPx.toDp() })
                    .size(width = with(dens) { wPx.toDp() }, height = with(dens) { hPx.toDp() })
                    .graphicsLayer { alpha = blockA }
                    .background(
                        KY_ACCENT.copy(alpha = (1f - glassMix).coerceIn(0f, 1f)),
                        RoundedCornerShape(with(dens) { rPx.toDp() }),
                    )
            ) {
                /* 这一层必须和输入卡长得一模一样（面 .22→.14 + 白边 .55 + 同一份柔光），
                   否则 1346ms 那一下「球隐去、卡显现」就会闪：位置尺寸相同但明暗不同 */
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .drawBehind {
                            softGlow(size.width * 0.12f, -size.height * 0.08f, size.width * 1.1f, KY_GLOW, 0.52f, 32)
                        }
                        .background(
                            Brush.linearGradient(
                                listOf(
                                    Color(1f, 1f, 1f, 0.22f * glassMix),
                                    Color(1f, 1f, 1f, 0.14f * glassMix),
                                )
                            ),
                            RoundedCornerShape(with(dens) { rPx.toDp() }),
                        )
                        .border(Skin.borderW, KY_CARD_LINE, RoundedCornerShape(with(dens) { rPx.toDp() }))
                )
            }
        }
        /* 剥离出来的小球（早先那一版 seed，860ms 起）：从卡底边中点向右滑到提交键的位置，
           位移用「极慢起手」的 cubic-bezier(.62,.02,.28,1)，**透明度另走一条 ease-out**
           （源码点名：透明度若也走那条曲线，方框成形时小球还是全透明的，等于没淡入）。 */
        if (tapped && t >= 860f && t <= 1600f) {
            val seedW = 42f * den
            val p = ((t - 860f) / MS_SEED).coerceIn(0f, 1f)
            val eS = bezier(floatArrayOf(0.62f, 0.02f, 0.28f, 1f), p)
            val sx0 = cardX + cardW / 2f - seedW / 2f
            val sy0 = cardY + cardH - seedW - 9f * den
            val sTarget = Session.sendRect
            val txT = (sTarget?.get(0) ?: (cardX + cardW - seedW - 16f * den))
            val tyT = (sTarget?.get(1) ?: (cardY + cardH - seedW - 13f * den))
            val sLeft = sx0 + (txT - sx0) * eS
            val sTop = sy0 + (tyT - sy0) * eS
            val op0 = 1f
            var sOp = when {
                p < 0.18f -> op0 * 0.5f * (p / 0.18f)
                p < 0.55f -> op0 * 0.5f + op0 * 0.5f * ((p - 0.18f) / 0.37f)
                else -> op0
            }
            if (t > 1420f) sOp *= (1f - (t - 1420f) / 180f).coerceIn(0f, 1f)
            Box(
                modifier = Modifier
                    .offset(x = with(dens) { sLeft.toDp() }, y = with(dens) { sTop.toDp() })
                    .size(with(dens) { seedW.toDp() })
                    .graphicsLayer { alpha = sOp }
                    .drawBehind {
                        /* 浅底上白球边界会糊掉：底下垫一圈很淡的暗晕，边才立得住（早先那一版靠投影） */
                        softGlow(size.width / 2f, size.height / 2f, size.width * 0.82f, Color(0f, 0f, 0f), 0.16f, 10)
                    }
                    .background(
                        Brush.linearGradient(listOf(veil(0.96f), veil(0.74f))),
                        CircleShape,
                    )
                    .border(1.2.dp, KY_CARD_LINE, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                ArrowGlyph(Color(0.06f, 0.06f, 0.07f, 0.5f))
            }
        }
    }
}

/* ---------------- 开屏水墨 + 金线 ----------------

   参考图：顶部一团「水墨晕染圆」（边缘像毛笔在宣纸上洇开），上面压几根香槟金细线和节点，
   正中一条竖线落下来接标题。Kuikly 没有径向渐变、也没有模糊，所以墨团只能用「很多根细弧线 + 很多颗点」
   叠出洇开的层次：
     · 160 道同心细弧（1px 描边），透明度按到圆心的距离做钟形分布 ⇒ 一圈厚薄不均的墨环
     · 900 颗点洒在这条环带上（半径 0.55R~1.12R），越靠外越淡 ⇒ 边缘的毛糙、洇散
     · 200 根短的径向笔触 ⇒ 毛笔扫过的丝
   全部用固定种子的伪随机：每次重绘一模一样，不会闪。
   金线：一根竖线穿过圆、三颗节点（圆/菱形）、下面一道浅弧 —— 就是参考图里那种「罗盘/星图」的味道。 */
@Composable
private fun SplashArt(alphaProvider: () -> Float, rise: Float) {
    val dens = LocalDensity.current.density
    val swPx = (if (Platform.screenW > 0) Platform.screenW else 1080).toFloat()
    val shPx = (if (Platform.screenH > 0) Platform.screenH else 2400).toFloat()
    /* 用户给的那张半透明水墨旋涡（assets/ink.png，640×1137；墨迹包围盒 x 9..633 / y 262..947）：
       按「墨迹中心」对齐到原来那个墨团的圆心（屏宽一半、屏高 0.20），墨迹铺到 0.95 屏宽。
       ⚠ 之前是拿图元画（160 弧 + 900 点 + 200 笔触），说「你好像没用我的 png」⇒ 换成真图。
       位图走 coil3 的 assets://（FollowAsk 那颗球同一条路），不用碰 internal 的 KuiklyImageBitmap。 */
    val imgW = swPx * 0.95f
    val imgH = imgW * 1137f / 640f
    val topPx = shPx * 0.20f - imgH * (604f / 1137f)
    Box(
        modifier = Modifier
            .fillMaxSize()
            /* alpha 在 layer 里读：淡出只更新这一层的属性，不重新走绘制 */
            .graphicsLayer { alpha = alphaProvider() },
    ) {
        Image(
            painter = com.tencent.kuikly.compose.coil3.rememberAsyncImagePainter("assets://ink.png"),
            contentDescription = null,
            modifier = Modifier
                .offset(x = ((swPx - imgW) / 2f / dens).dp, y = (topPx / dens).dp)
                .size((imgW / dens).dp, (imgH / dens).dp),
        )
        /* 香槟金细线照旧压在墨团上：一根竖线穿过、三颗节点、下面一道浅弧 */
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height
            val cx = w / 2f
            val cy = h * 0.20f
            val r = w * 0.40f
            val gold = Color(0.86f, 0.73f, 0.47f)

            val ga = 0.78f
            drawLine(
                color = gold.copy(alpha = ga),
                start = Offset(cx, h * 0.075f),
                end = Offset(cx, cy + r * 0.62f),
                strokeWidth = 1.4f,
            )
            listOf(h * 0.075f, h * 0.075f + 34f, cy - r * 0.42f).forEachIndexed { k, y ->
                if (k == 1) {
                    /* 菱形节点：两条斜线交叉 */
                    val s = 4.3f
                    drawLine(gold.copy(alpha = ga), Offset(cx - s, y - s), Offset(cx + s, y + s), strokeWidth = 1f)
                    drawLine(gold.copy(alpha = ga), Offset(cx - s, y + s), Offset(cx + s, y - s), strokeWidth = 1f)
                } else {
                    drawCircle(gold.copy(alpha = ga), radius = 3.4f, center = Offset(cx, y), style = Stroke(1f))
                }
            }
            /* 圆下一道很浅的弧（像罗盘外圈） */
            drawArc(
                color = gold.copy(alpha = 0.46f),
                startAngle = 200f,
                sweepAngle = 140f,
                useCenter = false,
                topLeft = Offset(cx - r * 0.92f, cy - r * 0.92f + rise * 0.10f),
                size = Size(r * 1.84f, r * 1.84f),
                style = Stroke(1f),
            )
        }
    }
}
