package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import com.tencent.kuikly.compose.animation.core.Animatable
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

/* Static soft-edge assets, animated only by layer transforms. No per-frame Canvas redraw.
 * Each cloud has a distinct duration; slow ease-in/out avoids a visible loop seam.
 * Changing the skin removes the keyed composition and cancels its animations.
 */
@Composable
internal fun SkinFogBackdrop(skin: String) {
    val d = Skin.def
    Box(Modifier.fillMaxSize().clipToBounds().background(d.bg)) {
        when (skin) {
            "glass" -> {
                FogCloud("pink", 31000, 22f, -16f, 0.08f)
                FogCloud("blue", 39000, -25f, 21f, 0.10f)
                FogCloud("violet", 47000, 18f, -24f, 0.07f)
            }
            "bw" -> {
                FogCloud("bw-ink", 49000, 12f, -10f, 0.05f)
                FogCloud("bw-light", 57000, -14f, 12f, 0.05f)
            }
            "hei" -> {
                FogCloud("hei-light", 53000, 12f, -12f, 0.05f)
                FogCloud("hei-ink", 61000, -14f, 10f, 0.06f)
            }
            "xuan" -> {
                FogCloud("xuan-warm", 61000, 9f, -8f, 0.04f)
                // The paper texture is stationary and does not redraw with the cloud animation.
                com.tencent.kuikly.compose.foundation.Canvas(Modifier.fillMaxSize()) {
                    paperGrain(d.ink, com.tencent.kuikly.compose.ui.graphics.Color.White, size.width, size.height)
                }
            }
            "qing" -> {
                FogCloud("qing-jade", 43000, 18f, -15f, 0.07f)
                FogCloud("qing-blue", 53000, -16f, 18f, 0.06f)
            }
            "dou" -> {
                FogCloud("dou-rose", 47000, 16f, -12f, 0.06f)
                FogCloud("dou-mauve", 57000, -14f, 17f, 0.07f)
            }
            "dh" -> {
                FogCloud("dh-ochre", 57000, 15f, -12f, 0.06f)
                FogCloud("dh-mineral", 67000, -17f, 14f, 0.07f)
                FogCloud("dh-azurite", 73000, 12f, -16f, 0.05f)
            }
            "mg" -> {
                FogCloud("mg-gold", 61000, 13f, -11f, 0.06f)
                FogCloud("mg-blue", 71000, -16f, 14f, 0.07f)
                FogCloud("mg-ember", 79000, 11f, -14f, 0.05f)
            }
            // Cartoon stays flat and clean; no animated clouds.
        }
    }
}

@Composable
private fun FogCloud(name: String, duration: Int, dx: Float, dy: Float, spread: Float) {
    val phase = remember { Animatable(0.5f) }
    val moving = Skin.fogMotion
    // Changing this key cancels the animation coroutine. Disabled means no ticking loop;
    // keep the current phase so switching off freezes the clouds without a visual jump.
    LaunchedEffect(moving) {
        if (!moving) return@LaunchedEffect
        while (isActive) {
            phase.animateTo(1f, tween(duration, easing = KY_EASE_IO))
            phase.animateTo(0f, tween(duration + 7000, easing = KY_EASE_IO))
        }
    }
    Image(
        painter = com.tencent.kuikly.compose.coil3.rememberAsyncImagePainter("assets://common/fog/$name.png"),
        contentDescription = null,
        contentScale = ContentScale.FillBounds,
        modifier = Modifier.fillMaxSize().graphicsLayer {
            val t = phase.value
            translationX = dx * density * (2f * t - 1f)
            translationY = dy * density * (2f * t - 1f)
            scaleX = 1.08f + spread * t
            scaleY = 1.08f + spread * t
            alpha = 0.82f + 0.18f * t
        },
    )
}
