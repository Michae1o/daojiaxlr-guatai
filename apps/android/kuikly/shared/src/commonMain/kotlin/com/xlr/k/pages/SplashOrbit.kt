package com.xlr.k.pages

/* SplashOrbit.kt —— 开屏「二十八宿环绕北斗」的运行时（安卓）
 *
 * 素材与数据由 apps/android/tools/gen-splash-orbit.py 生成（见 SplashOrbitData.kt），
 * 口径来自预览「外参考/星图各态/九套环绕动画/轻浮动无宿间连线」：
 *   · 轨道 = 各自原图拟合出来的**倾斜椭圆**；相位按**弧长**走 —— 按角度走会忽快忽慢，
 *     椭圆上等角度 ≠ 等距离，所以先建弧长表再反查参数角
 *   · 宿组只做平移（原像素，不重画不调色）；宿间连线与残留线头已经从素材中移除
 *   · 每宿按原图 ID 错开起伏，幅度 8–11 原图像素，周期 3–6 秒
 *   · 北斗不动，画在最上层
 *   · 24 秒一圈，匀速。这里**必须线性**：项目里「动画一律非线性」指的是进出场过渡，
 *     环绕是持续自转，套缓动会变成一顿一顿地转
 *   · 九套原始内容占比不同（1046~1162 宽不等）⇒ 按静止内容 bbox 归一化：
 *     内容最长边 = 0.6668 屏宽、内容底边 = 0.90 屏高（= 旧静态星图同一视觉大小），九套一样大
 *
 * 性能口径：每帧只写 28 个 Image 的 graphicsLayer（平移），不逐帧重画 Canvas；
 *   Image 的 size / offset 是静态的，不参与每帧布局。点了圆钮后整层卸载（与旧星图一致）。
 */

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import com.tencent.kuikly.compose.animation.core.Animatable
import com.tencent.kuikly.compose.animation.core.LinearEasing
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.coil3.rememberAsyncImagePainter
import com.tencent.kuikly.compose.foundation.Image
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.offset
import com.tencent.kuikly.compose.foundation.layout.size
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.platform.LocalDensity
import com.tencent.kuikly.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

/** 一圈多久 */
private const val ORBIT_TURN_MS = 24000

/** 弧长表精度：1440 段（0.25°/段），插值误差对 800px 的画面不可见 */
private const val ORBIT_ARC_N = 1440

private val TWO_PI = (PI * 2.0).toFloat()

private val BOB_PERIOD_MS = floatArrayOf(3000f, 4000f, 4800f, 6000f)

/** 与确认过的轻浮动预览相同：按原图 ID 错峰，正弦自然减速、换向。
 * 四个周期都整除 24 秒，环绕时钟回到零时不会发生起伏跳变。 */
private fun orbitBob(id: Int, turn: Float): Float {
    val amplitude = 8f + (id % 3) * 1.5f
    val phase = id * 2.399963229728653f
    return amplitude * sin(turn * ORBIT_TURN_MS * TWO_PI / BOB_PERIOD_MS[id % 4] + phase)
}

/** 内容最长边占屏宽的比例：旧静态星图是「画布 0.74 屏宽 × 内容 1130/1254」≈ 0.6668 */
private const val ORBIT_CONTENT_W = 0.6668f

/** 内容底边落在屏高的 0.90（与旧静态星图同一摆位口径） */
private const val ORBIT_CONTENT_BOTTOM = 0.90f

private fun pad2(n: Int) = if (n < 10) "0$n" else "$n"

/** 椭圆的弧长表：参数角 ↔ 弧长双向换算（等弧长匀速才不忽快忽慢） */
private class OrbitPath(val s: OrbitSet) {
    private val cs: Float
    private val sn: Float
    private val ar = FloatArray(ORBIT_ARC_N + 1)
    val total: Float

    /** 每个宿组固定的起始弧长位置（由数据里的参数角换算，只算一次） */
    val s0: FloatArray

    init {
        val th = s.tiltDeg * TWO_PI / 360f
        cs = cos(th)
        sn = sin(th)
        var acc = 0f
        var prevX = 0f
        var prevY = 0f
        for (i in 0..ORBIT_ARC_N) {
            val t = i * TWO_PI / ORBIT_ARC_N
            val x = s.cx + s.a * cos(t) * cs - s.b * sin(t) * sn
            val y = s.cy + s.a * cos(t) * sn + s.b * sin(t) * cs
            if (i > 0) acc += hypot(x - prevX, y - prevY)
            prevX = x
            prevY = y
            ar[i] = acc
        }
        total = acc
        val n = s.g.size / 7
        s0 = FloatArray(n)
        for (i in 0 until n) s0[i] = arcAt(s.g[i * 7 + 6])
    }

    /** 参数角（弧度）→ 弧长位置 */
    private fun arcAt(phase: Float): Float {
        var p = phase % TWO_PI
        if (p < 0f) p += TWO_PI
        val q = p / TWO_PI * ORBIT_ARC_N
        val i = q.toInt().coerceIn(0, ORBIT_ARC_N - 1)
        val f = q - i
        return ar[i] + (ar[i + 1] - ar[i]) * f
    }

    /** 弧长位置 → 参数角（二分 + 线性插值） */
    fun angleAt(pos: Float): Float {
        var v = pos % total
        if (v < 0f) v += total
        var lo = 0
        var hi = ORBIT_ARC_N
        while (hi - lo > 1) {
            val m = (lo + hi) shr 1
            if (ar[m] < v) lo = m else hi = m
        }
        val d = ar[hi] - ar[lo]
        val f = if (d > 0f) (v - ar[lo]) / d else 0f
        return (lo + f) * TWO_PI / ORBIT_ARC_N
    }

    fun xOf(ang: Float) = s.cx + s.a * cos(ang) * cs - s.b * sin(ang) * sn
    fun yOf(ang: Float) = s.cy + s.a * cos(ang) * sn + s.b * sin(ang) * cs
}

/**
 * 开屏的「画」：二十八宿沿倾斜椭圆环绕北斗。
 * alphaProvider 与旧星图一致 —— 跟着开屏文字一起淡出；点圆钮后整个组件被卸载。
 */
@Composable
internal fun SplashOrbit(alphaProvider: () -> Float) {
    /* 皮肤切换：下面的 remember(set.key) / LaunchedEffect(set.key) 会跟着换新，
       这里不再套 key(skinKey) 包一层（没必要，也少一层组合）。 */
    val set = ORBIT_SETS[Skin.cur] ?: return
    SplashOrbitContent(set, alphaProvider)
}

@Composable
private fun SplashOrbitContent(set: OrbitSet, alphaProvider: () -> Float) {
    val dens = LocalDensity.current.density
    val sw = (if (Platform.screenW > 0) Platform.screenW else 1080).toFloat()
    val sh = (if (Platform.screenH > 0) Platform.screenH else 2400).toFloat()

    /* 1254 画布 → 屏幕像素的缩放：九套各自按自己的静止内容 bbox 归一化，视觉大小一致 */
    val contentW = set.bx1 - set.bx0
    val contentH = set.by1 - set.by0
    val k = ORBIT_CONTENT_W * sw / maxOf(contentW, contentH)
    val left = sw / 2f - (set.bx0 + set.bx1) / 2f * k
    val top = sh * ORBIT_CONTENT_BOTTOM - set.by1 * k

    val path = remember(set.key) { OrbitPath(set) }

    /* 一个时钟同时驱动等弧长环绕与各宿起伏，避免多套动画互相叠加。 */
    val turn = remember(set.key) { Animatable(0f) }
    LaunchedEffect(set.key) {
        while (true) {
            turn.snapTo(0f)
            turn.animateTo(1f, tween(ORBIT_TURN_MS, easing = LinearEasing))
        }
    }

    val g = set.g
    val gn = g.size / 7

    /* 必须在**组合作用域**里读一次 turn.value（不能只在 graphicsLayer 的 lambda 里读）：
       Kuikly 的 layer 更新不吃「lambda 依赖 state」这一套 —— 只在 lambda 里读，进度推进了也没人
       重新应用几何，画面就是钉死不动的（实测：logcat 里 progress 稳稳走到 0.29，
       屏幕上零位移）。读在这里 ⇒ 每帧重组本组件 ⇒ Modifier 重建 ⇒ 位移才真的落到 layer 上。 */
    val progress = turn.value

    Box(modifier = Modifier.fillMaxSize().graphicsLayer { alpha = alphaProvider() * 0.9f }) {
        /* 28 个独立宿组：原生裁片框 + 唯一一份位移；size/offset 不逐帧变化。 */
        for (gi in 0 until gn) {
            val i = gi * 7
            val xPx = left + g[i] * k
            val yPx = top + g[i + 1] * k
            val wPx = g[i + 2] * k
            val hPx = g[i + 3] * k
            val scx = g[i + 4]
            val scy = g[i + 5]
            val base = path.s0[gi]
            val id = set.ids[gi]
            Image(
                painter = rememberAsyncImagePainter("assets://splash-orbit/${set.key}/s${pad2(gi + 1)}.png"),
                contentDescription = null,
                modifier = Modifier
                    .offset(x = (xPx / dens).dp, y = (yPx / dens).dp)
                    .size((wPx / dens).dp, (hPx / dens).dp)
                    .graphicsLayer {
                        val ang = path.angleAt(base + path.total * progress)
                        translationX = (path.xOf(ang) - scx) * k
                        translationY = (path.yOf(ang) - scy + orbitBob(id, progress)) * k
                    },
            )
        }

        /* 北斗整体轻浮动：屏幕上下各 3dp，4 秒一轮，七颗星保持相对位置。 */
        Image(
            painter = rememberAsyncImagePainter("assets://splash-orbit/${set.key}/north.png"),
            contentDescription = null,
            modifier = Modifier
                .offset(x = ((left + set.nx * k) / dens).dp, y = ((top + set.ny * k) / dens).dp)
                .size(((set.nw * k) / dens).dp, ((set.nh * k) / dens).dp)
                .graphicsLayer {
                    translationY = 3f * dens * sin(progress * TWO_PI * 6f)
                },
        )
    }
}
