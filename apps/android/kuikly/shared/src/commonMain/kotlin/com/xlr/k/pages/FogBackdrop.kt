package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import com.tencent.kuikly.compose.animation.core.Animatable
import com.tencent.kuikly.compose.animation.core.LinearEasing
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.foundation.Image
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.draw.clipToBounds
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.layout.ContentScale
import kotlinx.coroutines.isActive
import kotlin.math.PI
import kotlin.math.sin

/* Android 13+ uses a native AGSL density field through RealtimeFog.
 * Older Android versions retain the existing animated transparent textures.
 * The texture fallback keeps composition-time reads required by Kuikly.
 */
// Explicit opt-in: Dunhuang/Mogao retain their original PNG rendering.
private val REALTIME_FOG_SKINS = setOf("bw", "hei", "glass", "xuan", "qing", "dou")

private const val CLOCK_MS = 540_000           /* 实际 540 秒，运动整体放慢至上一版的三分之一 */
private const val CLOCK_S = 180f  /* 逻辑相位仍走 180 秒，保持首尾连续 */

private fun wave(sec: Float, periodSec: Float, phase: Float): Float =
    sin(2f * PI.toFloat() * (sec / periodSec) + phase)

@Composable
internal fun SkinFogBackdrop(skin: String) {
    val d = Skin.def
    Box(Modifier.fillMaxSize().clipToBounds().background(d.bg)) {
        if (realtimeFogAvailable() && skin in REALTIME_FOG_SKINS) {
            RealtimeFog(skin, Skin.fogMotion)
            if (skin == "xuan") {
                com.tencent.kuikly.compose.foundation.Canvas(Modifier.fillMaxSize()) {
                    paperGrain(d.ink, com.tencent.kuikly.compose.ui.graphics.Color.White, size.width, size.height)
                }
            }
        } else when (skin) {
            "glass" -> {
                FogCloud("pink", 0.0f, 74f, -54f, 0.15f)
                FogCloud("blue", 1.9f, -80f, 69f, 0.17f)
                FogCloud("violet", 3.7f, 59f, -74f, 0.13f)
            }
            "bw" -> {
                FogCloud("bw-ink", 0.6f, 54f, -45f, 0.11f)
                FogCloud("bw-light", 2.6f, -59f, 50f, 0.11f)
            }
            "hei" -> {
                FogCloud("hei-light", 1.2f, 54f, -50f, 0.11f)
                FogCloud("hei-ink", 3.2f, -59f, 45f, 0.12f)
            }
            "xuan" -> {
                FogCloud("xuan-warm", 1.5f, 40f, -35f, 0.08f)
                // The paper texture is stationary and does not redraw with the cloud animation.
                com.tencent.kuikly.compose.foundation.Canvas(Modifier.fillMaxSize()) {
                    paperGrain(d.ink, com.tencent.kuikly.compose.ui.graphics.Color.White, size.width, size.height)
                }
            }
            "qing" -> {
                FogCloud("qing-jade", 0.3f, 64f, -54f, 0.13f)
                FogCloud("qing-blue", 2.1f, -59f, 64f, 0.12f)
            }
            "dou" -> {
                FogCloud("dou-rose", 0.9f, 59f, -50f, 0.12f)
                FogCloud("dou-mauve", 2.9f, -54f, 59f, 0.13f)
            }
            "dh" -> {
                FogCloud("dh-ochre", 0.4f, 54f, -45f, 0.12f, original = true)
                FogCloud("dh-mineral", 2.4f, -59f, 50f, 0.13f, original = true)
                FogCloud("dh-azurite", 4.2f, 45f, -54f, 0.11f, original = true)
            }
            "mg" -> {
                FogCloud("mg-gold", 1.1f, 50f, -40f, 0.12f, original = true)
                FogCloud("mg-blue", 3.4f, -59f, 50f, 0.13f, original = true)
                FogCloud("mg-ember", 5.1f, 45f, -50f, 0.11f, original = true)
            }
            // Cartoon stays flat and clean; no animated clouds.
        }
    }
}

/* 主密度、薄雾、逆向薄雾：三股独立流动。 */
@Composable
private fun FogCloud(name: String, seed: Float, dx: Float, dy: Float, spread: Float, original: Boolean = false) {
    val clock = remember { Animatable(0f) }
    val moving = Skin.fogMotion
    LaunchedEffect(moving) {
        if (!moving) return@LaunchedEffect
        while (isActive) {
            clock.snapTo(0f)
            clock.animateTo(1f, tween(if (original) 90_000 else CLOCK_MS, easing = LinearEasing))
        }
    }
    /* 组合期读一次（理由见文件头 ①） */
    val sec = clock.value * if (original) 90f else CLOCK_S

    for (li in 0..if (original) 1 else 2) {
        val fast = if (li == 0) 1f else if (li == 1) 2f else 0.5f          /* 第二层周期减半 */
        val amp = if (original) { if (li == 0) 1f else 0.55f } else { if (li == 0) 0.48f else if (li == 1) 0.20f else 0.18f }        /* 第二层位移/浓度更小 */
        val ph = seed + li * 7.13f
        val px = dx * (if (original) amp else if (li == 2) -1.6f else 1.45f) * (0.62f * wave(sec, 9f / fast, ph) + 0.38f * wave(sec, 15f / fast, ph + 1.7f))
        val py = dy * (if (original) amp else if (li == 1) -1.4f else 1.25f) * (0.66f * wave(sec, 10f / fast, ph + 3.1f) + 0.34f * wave(sec, 18f / fast, ph + 5.3f))
        val a = amp * ((if (original) 0.55f else 0.65f) + (if (original) 0.45f else 0.35f) * (0.5f + 0.5f * wave(sec, 6f / fast, ph + 2.2f)))
        /* 非等比缩放：X/Y 各自独立相位与周期（10s / 18s，都是 180 的约数）⇒
           密度纹理被拉长、压扁，看起来是在"变形"，而不是整体放大缩小。
           素材边缘透明，小角度旋转改变流向。 */
        val sx = 1.02f + spread * 2.6f * (0.5f + 0.5f * wave(sec, 10f / fast, ph + 6.1f))
        val sy = 1.00f + spread * 1.6f * (0.5f + 0.5f * wave(sec, 18f / fast, ph + 8.4f))
        Image(
            painter = com.tencent.kuikly.compose.coil3.rememberAsyncImagePainter(if (original) "assets://common/fog/$name.png" else "assets://common/fog/$name-${if (li == 1) "wisp" else "flow"}.png"),
            contentDescription = null,
            contentScale = ContentScale.FillBounds,
            modifier = Modifier.fillMaxSize().graphicsLayer {
                translationX = px * density
                translationY = py * density
                scaleX = sx
                scaleY = sy
                rotationZ = if (original) 0f else 7f * wave(sec, 30f / fast, ph + 1.4f)
                alpha = a
            },
        )
    }
}
