package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.animation.core.CubicBezierEasing
import com.tencent.kuikly.compose.foundation.Canvas
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.geometry.Offset
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.graphics.drawscope.Stroke
import kotlin.math.cos
import kotlin.math.sin

/* 起卦四拍（照 legacy.css:2709-2816 与 castFx.js 的 castSeq 逐段搬）：
     念起 0~120ms → 气动 120~400ms → 成象 400~950ms → 落卦 950~1400ms（实际总长 2400ms 才起卦）
   时间轴（ms）：
     0        按钮按下（缩放 .9）、遮幕淡入 500ms
     0/110/220  按钮处三圈涟漪（半径 28/42/58，800ms，scale .5→1.22，alpha .9→0）
     400      球从按钮中心起飞，2050ms 飞到落卦位置中心（scale .35→1→2.6→3.9→3.2→3.9→5.4 边飞边散）
     1400/1540/1680  中央三环（84/116/150，1000ms，scale .3→1，alpha 0→.5→0）
     1420     中央玻璃折射圆（86px，1100ms）
     1900+90i  六神六点沿 60° 依次散出（1250ms，-16→-92→-112→-176px）
     2400     真正起卦（换页）
     2450     整层淡出 500ms
     3150     结束
*/
internal object CastFx {
    var playing by mutableStateOf(false)
    var clockMs by mutableStateOf(0f)
    var fromX by mutableStateOf(540f)
    var fromY by mutableStateOf(2085f)
    var toX by mutableStateOf(540f)
    var toY by mutableStateOf(720f)
}

private val FX_EASE = CubicBezierEasing(0.34f, 0.72f, 0.22f, 1f)
/* 起飞/扩散主曲线＝全局出场缓动（见 YiParts.kt KY_EASE_*），不做线性 */
private val GLIDE = KY_EASE_OUT

/** 分段关键帧：times/values 等长，段内用 ease 插值 */
private fun kf(t: Float, times: FloatArray, values: FloatArray, ease: CubicBezierEasing = FX_EASE): Float {
    if (t <= times[0]) return values[0]
    for (i in 1 until times.size) {
        if (t <= times[i]) {
            val span = times[i] - times[i - 1]
            val p = if (span <= 0f) 1f else (t - times[i - 1]) / span
            val e = ease.transform(p.coerceIn(0f, 1f))
            return values[i - 1] + (values[i] - values[i - 1]) * e
        }
    }
    return values.last()
}

@Composable
internal fun CastFxLayer() {
    if (!CastFx.playing) return
    val t = CastFx.clockMs
    val bg = KY_BG

    /* 遮幕：0~500 淡入，2450~2950 淡出（两段都走缓动，不做 1:1 线性） */
    val veil = when {
        t < 500f -> GLIDE.transform((t / 500f).coerceIn(0f, 1f))
        t < 2450f -> 1f
        else -> 1f - GLIDE.transform(((t - 2450f) / 500f).coerceIn(0f, 1f))
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.fillMaxSize().background(bg.copy(alpha = veil)))
        Canvas(modifier = Modifier.fillMaxSize()) {
            val accent = KY_ACCENT
            val fx = CastFx.fromX
            val fy = CastFx.fromY
            val tx = CastFx.toX
            val ty = CastFx.toY

            /* ① 按钮处的三圈涟漪：0 / 110 / 220 起，各 800ms */
            for (i in 0..2) {
                val start = i * 110f
                val p = ((t - start) / 800f)
                if (p in 0f..1f) {
                    val e = GLIDE.transform(p)
                    val r = floatArrayOf(28f, 42f, 58f)[i]
                    drawCircle(
                        color = accent.copy(alpha = (0.9f * (1f - e)).coerceIn(0f, 1f) * 0.42f),
                        radius = r * (0.5f + 0.72f * e),
                        center = Offset(fx, fy),
                        style = Stroke(width = 1.5f),
                    )
                }
            }

            /* ② 球：400 起，2050ms，边飞边散 */
            val op = ((t - 400f) / 2050f)
            if (op in 0f..1f) {
                val scale = kf(op, floatArrayOf(0f, .07f, .40f, .56f, .74f, .88f, 1f),
                    floatArrayOf(.35f, 1f, 2.6f, 3.9f, 3.2f, 3.9f, 5.4f))
                val alpha = kf(op, floatArrayOf(0f, .07f, .40f, .56f, .74f, .88f, 1f),
                    floatArrayOf(0f, .98f, .98f, .96f, .85f, .42f, 0f))
                /* 位移：7%~40% 走完全程，之后停在中心 */
                val move = kf(op, floatArrayOf(0f, .07f, .40f, 1f), floatArrayOf(0f, 0f, 1f, 1f))
                val cx = fx + (tx - fx) * move
                val cy = fy + (ty - fy) * move
                drawCircle(color = accent.copy(alpha = alpha.coerceIn(0f, 1f)), radius = 11f * scale, center = Offset(cx, cy))
            }

            /* ③ 中央三环：1400 / 1540 / 1680，各 1000ms */
            for (i in 0..2) {
                val start = 1400f + i * 140f
                val p = ((t - start) / 1000f)
                if (p in 0f..1f) {
                    val e = GLIDE.transform(p)
                    val r = floatArrayOf(84f, 116f, 150f)[i]
                    /* 亮度也是缓动：起亮 0→.5 走 GLIDE，之后收缩同样走曲线 */
                    val a = if (p < 0.16f) 0.5f * GLIDE.transform(p / 0.16f)
                    else 0.5f * (1f - GLIDE.transform(((p - 0.16f) / 0.84f).coerceIn(0f, 1f)))
                    drawCircle(
                        color = accent.copy(alpha = a.coerceIn(0f, 1f) * 0.36f * 2.6f),
                        radius = r * (0.3f + 0.7f * e),
                        center = Offset(tx, ty),
                        style = Stroke(width = 1f),
                    )
                }
            }

            /* ④ 中央折射圆：1420，1100ms */
            run {
                val p = ((t - 1420f) / 1100f)
                if (p in 0f..1f) {
                    val scale = kf(p, floatArrayOf(0f, .28f, .70f, 1f), floatArrayOf(.74f, .82f, .9f, .98f), GLIDE)
                    val a = kf(p, floatArrayOf(0f, .28f, .70f, 1f), floatArrayOf(0f, .85f, .7f, 0f), GLIDE)
                    drawCircle(color = Color.White.copy(alpha = a.coerceIn(0f, 1f) * 0.55f), radius = 43f * scale, center = Offset(tx, ty))
                }
            }

            /* ⑤ 六神六点：1900 + 90i，各 1250ms，沿 60° 散出 */
            for (i in 0..5) {
                val start = 1900f + i * 90f
                val p = ((t - start) / 1250f)
                if (p in 0f..1f) {
                    val dist = kf(p, floatArrayOf(0f, .20f, .58f, 1f), floatArrayOf(-16f, -92f, -112f, -176f), FX_EASE)
                    val scale = kf(p, floatArrayOf(0f, .20f, .58f, 1f), floatArrayOf(.4f, 1f, 1f, .85f), FX_EASE)
                    val a = kf(p, floatArrayOf(0f, .20f, .58f, 1f), floatArrayOf(0f, .9f, .8f, 0f), FX_EASE)
                    val ang = i * 60.0 * 3.14159265358979 / 180.0
                    /* CSS 是 rotate(a) 再 translateY(-X)：偏移 = (X·sin a, −X·cos a)，X 为正的扩散距离 */
                    val x = -dist
                    val dx = x * sin(ang)
                    val dy = -x * cos(ang)
                    drawCircle(
                        color = accent.copy(alpha = a.coerceIn(0f, 1f) * 0.8f),
                        radius = 3f * scale,
                        center = Offset(tx + dx.toFloat(), ty + dy.toFloat()),
                    )
                }
            }
        }
    }
}
