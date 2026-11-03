package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.key
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
// Third tier supports all fog skins; Dunhuang/Mogao keep original PNGs in tiers 0/1.
private val REALTIME_FOG_SKINS = setOf("bw", "hei", "glass", "xuan", "qing", "dou", "dh", "mg")

private const val CLOCK_MS = 210_000           /* 二档完整循环 210 秒，保留连续相位并增强游移可见度 */
private const val CLOCK_S = 180f  /* 逻辑相位仍走 180 秒，保持首尾连续 */

private fun wave(sec: Float, periodSec: Float, phase: Float): Float =
    sin(2f * PI.toFloat() * (sec / periodSec) + phase)

@Composable
internal fun SkinFogBackdrop(skin: String) {
    val d = Skin.def
    val level = Skin.fogLevel
    var shownLevel by remember { mutableStateOf(level) }
    val fade = remember { Animatable(1f) }
    LaunchedEffect(level) {
        if (shownLevel != level) {
            fade.animateTo(0f, tween(160, easing = KY_EASE_OUT))
            shownLevel = level
        }
        fade.animateTo(1f, tween(360, easing = KY_EASE_OUT))
    }
    val moving = shownLevel > 0 && !Skin.isFogFrozen(shownLevel)
    val clock = remember(skin, shownLevel) { Animatable(if (shownLevel > 0) Skin.fogPngPhase(skin) else 0f) }
    val realtime = shownLevel == 2 && realtimeFogAvailable() && skin in REALTIME_FOG_SKINS
    LaunchedEffect(skin, shownLevel, moving) {
        if (shownLevel == 0 || realtime) return@LaunchedEffect
        if (!moving) {
            Skin.saveFogPngPhase(skin, clock.value)
            return@LaunchedEffect
        }
        while (isActive) {
            val duration = if (skin == "dh" || skin == "mg") 90_000 else CLOCK_MS
            clock.animateTo(1f, tween((duration * (1f-clock.value)).toInt().coerceAtLeast(1), easing = LinearEasing))
            clock.snapTo(0f)
        }
    }
    DisposableEffect(skin, shownLevel) {
        val persistPhase = shownLevel > 0 && !realtime
        onDispose {
            if (persistPhase) Skin.saveFogPngPhase(skin, clock.value)
        }
    }
    val seconds = clock.value * if (skin == "dh" || skin == "mg") 90f else CLOCK_S
    val opacity = fade.value // Read during composition so Kuikly updates each transition frame.
    Box(Modifier.fillMaxSize().clipToBounds().background(d.bg)) {
        Box(Modifier.fillMaxSize().graphicsLayer { alpha = opacity }) {
        key(shownLevel) {
            if (realtime) {
                RealtimeFog(skin, moving)
            } else when (skin) {
                "glass" -> {
                    FogCloud("pink", 0.0f, 74f, -54f, 0.15f, sec = seconds)
                    FogCloud("blue", 1.9f, -80f, 69f, 0.17f, sec = seconds)
                    FogCloud("violet", 3.7f, 59f, -74f, 0.13f, sec = seconds)
                }
                "bw" -> {
                    FogCloud("bw-ink", 0.6f, 54f, -45f, 0.11f, sec = seconds)
                    FogCloud("bw-light", 2.6f, -59f, 50f, 0.11f, sec = seconds)
                }
                "hei" -> {
                    FogCloud("hei-light", 1.2f, 54f, -50f, 0.11f, sec = seconds)
                    FogCloud("hei-ink", 3.2f, -59f, 45f, 0.12f, sec = seconds)
                }
                "xuan" -> {
                    FogCloud("xuan-warm", 1.5f, 40f, -35f, 0.08f, sec = seconds)

                }
                "qing" -> {
                    FogCloud("qing-jade", 0.3f, 64f, -54f, 0.13f, sec = seconds)
                    FogCloud("qing-blue", 2.1f, -59f, 64f, 0.12f, sec = seconds)
                }
                "dou" -> {
                    FogCloud("dou-rose", 0.9f, 59f, -50f, 0.12f, sec = seconds)
                    FogCloud("dou-mauve", 2.9f, -54f, 59f, 0.13f, sec = seconds)
                }
                "dh" -> {
                    FogCloud("dh-ochre", 0.4f, 54f, -45f, 0.12f, original = true, sec = seconds)
                    FogCloud("dh-mineral", 2.4f, -59f, 50f, 0.13f, original = true, sec = seconds)
                    FogCloud("dh-azurite", 4.2f, 45f, -54f, 0.11f, original = true, sec = seconds)
                }
                "mg" -> {
                    FogCloud("mg-gold", 1.1f, 50f, -40f, 0.12f, original = true, sec = seconds)
                    FogCloud("mg-blue", 3.4f, -59f, 50f, 0.13f, original = true, sec = seconds)
                    FogCloud("mg-ember", 5.1f, 45f, -50f, 0.11f, original = true, sec = seconds)
                }
                // Cartoon stays flat and clean; no animated clouds.
            }
        }
        }
        if (skin == "xuan") {
            Image(
                painter = com.tencent.kuikly.compose.coil3.rememberAsyncImagePainter("assets://common/fog/xuan-cinnabar.png"),
                contentDescription = null,
                contentScale = ContentScale.FillBounds,
                modifier = Modifier.fillMaxSize(),
            )
            com.tencent.kuikly.compose.foundation.Canvas(Modifier.fillMaxSize()) {
                paperGrain(d.ink, com.tencent.kuikly.compose.ui.graphics.Color.White, size.width, size.height)
            }
        }
    }
}

/* 主密度、薄雾、逆向薄雾：三股独立流动。 */
@Composable
private fun FogCloud(name: String, seed: Float, dx: Float, dy: Float, spread: Float, original: Boolean = false, sec: Float) {
    for (li in 0..if (original) 1 else 2) {
        val fast = if (li == 0) 1f else if (li == 1) 2f else 0.5f          /* 第二层周期减半 */
        val amp = if (original) { if (li == 0) 1f else 0.55f } else { if (li == 0) 0.48f else if (li == 1) 0.20f else 0.18f }        /* 第二层位移/浓度更小 */
        val ph = seed + li * 7.13f
        val px = dx * (if (original) amp else if (li == 2) -2.0f else 1.85f) * (0.62f * wave(sec, 9f / fast, ph) + 0.38f * wave(sec, 15f / fast, ph + 1.7f))
        val py = dy * (if (original) amp else if (li == 1) -1.8f else 1.65f) * (0.66f * wave(sec, 10f / fast, ph + 3.1f) + 0.34f * wave(sec, 18f / fast, ph + 5.3f))
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
