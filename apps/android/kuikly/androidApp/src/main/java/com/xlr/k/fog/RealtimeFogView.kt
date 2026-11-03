package com.xlr.k.fog

import android.annotation.TargetApi
import android.content.Context
import android.graphics.Bitmap
import android.graphics.ColorSpace
import android.graphics.HardwareRenderer
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.RenderNode
import android.hardware.HardwareBuffer
import android.media.ImageReader
import android.os.Handler
import android.os.Looper
import java.util.concurrent.Executors
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RuntimeShader
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.view.MotionEvent
import android.view.View
import com.tencent.kuikly.core.render.android.expand.component.KRView

/** Kuikly owns layout; Android owns this effect's clock and GPU drawing. */
class RealtimeFogView(context: Context) : KRView(context) {
    private val fog = if (Build.VERSION.SDK_INT >= 33) FogSurface(context) else View(context)

    init {
        addView(fog, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        isClickable = false
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean = false

    override fun setProp(propKey: String, propValue: Any): Boolean {
        if (Build.VERSION.SDK_INT >= 33) {
            when (propKey) {
                "fogSkin" -> { (fog as FogSurface).setSkin(propValue.toString()); return true }
                "fogMoving" -> { (fog as FogSurface).setMoving(propValue.toString() == "true"); return true }
            }
        }
        return super.setProp(propKey, propValue)
    }
}

@TargetApi(33)
private class FogSurface(context: Context) : View(context) {
    // Compile once. Every displayed frame evaluates a continuous 3D density
    // field: time changes its interior, rather than translating a saved image.
    private val savedFrames = context.getSharedPreferences("xlr_fog_frames", Context.MODE_PRIVATE)
    private var skinKey = ""
    private var seed = kotlin.random.Random.nextFloat()*100f
    private var frozenBitmap: Bitmap? = null
    private val bitmapPaint = Paint(Paint.FILTER_BITMAP_FLAG)
    private var snapshotVersion = 0
    private var snapshotAttempted = false
    private val shader = try {
        RuntimeShader(SOURCE).also {
            it.setFloatUniform("seed", seed)
            Log.i("XLRFOG", "AGSL compiled: realtime density, no PNG") }
    } catch (e: IllegalArgumentException) {
        Log.e("XLRFOG", "AGSL compilation failed", e)
        null
    }
    private val paint = Paint().apply { shader = this@FogSurface.shader }
    private var moving = true
    private var phaseSeconds = 0.0
    private var previousNanos = 0L
    private var loggedDraw = false
    private var drawnFrames = 0
    private val tick = object : Runnable {
        override fun run() {
            if (!isAttachedToWindow || !isShown || windowVisibility != VISIBLE || !moving || shader == null) {
                previousNanos = 0L
                return
            }
            val now = SystemClock.elapsedRealtimeNanos()
            if (previousNanos != 0L) phaseSeconds += (now - previousNanos) / 1_000_000_000.0
            previousNanos = now
            invalidate()
            postDelayed(this, 33L)
        }
    }

    init {
        isClickable = false
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
        setSkin("bw")
    }

    fun setSkin(skin: String) {
        if (skinKey == skin) return
        skinKey = skin
        seed = savedFrames.getFloat("${skin}_seed", kotlin.random.Random.nextFloat()*100f)
        phaseSeconds = savedFrames.getFloat("${skin}_phase", 0f).toDouble()
        shader?.let { program ->
            program.setFloatUniform("seed", seed)
            applyPalette(program, skin)
        }
        discardSnapshot()
        if (!moving) freezeToBitmap()
        invalidate()
    }

    private fun applyPalette(program: RuntimeShader, skin: String) {
        val colors = when (skin) {
            "glass" -> intArrayOf(0xDF9EC4, 0x94B5EB, 0xB497DB)
            "hei" -> intArrayOf(0xACACAC, 0x686868, 0x959595)
            "xuan" -> intArrayOf(0xC0A587, 0xB8AA97, 0xC8B89F)
            "qing" -> intArrayOf(0x639F94, 0x819FB2, 0x729C9B)
            "dou" -> intArrayOf(0xA8746A, 0xB8969D, 0xBD9388)
            "dh" -> intArrayOf(0xA96F53, 0x698D7D, 0x647F99)
            "mg" -> intArrayOf(0xC69A59, 0x577392, 0xAD7955)
            else -> intArrayOf(0x242424, 0xFFFFFF, 0x888888)
        }
        for (i in colors.indices) {
            val c = colors[i]
            program.setFloatUniform("color${i + 1}", ((c shr 16) and 255) / 255f, ((c shr 8) and 255) / 255f, (c and 255) / 255f)
        }
        val strength = when (skin) {
            "xuan" -> 0.10f
            "bw" -> 0.16f
            "hei" -> 0.18f
            "mg" -> 0.28f
            "dh" -> 0.30f
            "glass", "qing", "dou" -> 0.33f
            else -> 0.42f
        }
        program.setFloatUniform("strength", strength)
        program.setFloatUniform("relief", 1f) // Irregular smoke + wandering for all opted-in skins.
    }

    fun setMoving(enabled: Boolean) {
        Log.i("XLRFOG", "motion=$enabled")
        if (moving == enabled) return
        moving = enabled
        if (enabled) discardSnapshot() else freezeToBitmap()
        restartClock()
        invalidate()
    }

    private fun restartClock() {
        removeCallbacks(tick)
        previousNanos = 0L
        if (moving && isAttachedToWindow && isShown && windowVisibility == VISIBLE) post(tick)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        restartClock()
        if (!moving) freezeToBitmap()
    }
    override fun onDetachedFromWindow() {
        removeCallbacks(tick)
        previousNanos = 0L
        discardSnapshot()
        super.onDetachedFromWindow()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        discardSnapshot()
        if (!moving) freezeToBitmap()
    }

    private fun discardSnapshot() {
        snapshotVersion++
        snapshotAttempted = false
        // Do not recycle displayed bitmaps: RenderThread may still reference the old display list.
        frozenBitmap = null
        paint.shader = shader
    }

    /** A one-off offscreen GPU render, then only drawBitmap while frozen. */
    private fun freezeToBitmap() {
        removeCallbacks(tick)
        previousNanos = 0L
        if (moving || snapshotAttempted || width <= 0 || height <= 0 || shader == null || !isAttachedToWindow) return
        snapshotAttempted = true
        val version = snapshotVersion
        val savedSkin = skinKey
        val savedSeed = seed
        val savedPhase = phaseSeconds.toFloat()
        val scale = minOf(1f, 2048f / maxOf(width, height))
        val w = (width * scale).toInt().coerceAtLeast(1)
        val h = (height * scale).toInt().coerceAtLeast(1)
        savedFrames.edit().putFloat("${savedSkin}_seed", savedSeed)
            .putFloat("${savedSkin}_phase", savedPhase).apply()
        SNAPSHOT_EXECUTOR.execute {
            val result = runCatching { renderFrozenFrame(w, h, savedSkin, savedSeed, savedPhase) }
            MAIN.post {
                if (version != snapshotVersion || moving || !isAttachedToWindow) {
                    result.getOrNull()?.recycle()
                    return@post
                }
                result.onSuccess { bitmap ->
                    frozenBitmap = bitmap
                    paint.shader = null // No AGSL command remains in subsequent onDraw display lists.
                    invalidate()
                    Log.i("XLRFOG", "frozen bitmap ${w}x${h} skin=$savedSkin phase=$savedPhase; tick stopped, shader bypassed")
                }.onFailure { error ->
                    // Clock still stops if a device cannot render an offscreen snapshot.
                    Log.e("XLRFOG", "snapshot failed; motion clock remains stopped", error)
                }
            }
        }
    }

    private fun renderFrozenFrame(w: Int, h: Int, skin: String, frameSeed: Float, phase: Float): Bitmap {
        val reader = ImageReader.newInstance(w, h, PixelFormat.RGBA_8888, 1,
            HardwareBuffer.USAGE_GPU_SAMPLED_IMAGE or HardwareBuffer.USAGE_GPU_COLOR_OUTPUT)
        val node = RenderNode("FrozenFog")
        val renderer = HardwareRenderer()
        try {
            renderer.isOpaque = false
            renderer.setSurface(reader.surface)
            renderer.setContentRoot(node)
            node.setPosition(0, 0, w, h)
            val program = RuntimeShader(SOURCE)
            applyPalette(program, skin)
            program.setFloatUniform("seed", frameSeed)
            program.setFloatUniform("time", phase)
            program.setFloatUniform("resolution", w.toFloat(), h.toFloat())
            val recording = node.beginRecording()
            recording.drawRect(0f, 0f, w.toFloat(), h.toFloat(), Paint().apply { shader = program })
            node.endRecording()
            renderer.createRenderRequest().setWaitForPresent(true).syncAndDraw()
            val image = reader.acquireNextImage() ?: error("No frozen fog image")
            image.use {
                val buffer = image.hardwareBuffer ?: error("No frozen fog buffer")
                buffer.use {
                    val hardware = Bitmap.wrapHardwareBuffer(buffer, ColorSpace.get(ColorSpace.Named.SRGB))
                        ?: error("Cannot wrap frozen fog buffer")
                    try {
                        return hardware.copy(Bitmap.Config.ARGB_8888, false) ?: error("Cannot copy frozen fog bitmap")
                    } finally { hardware.recycle() }
                }
            }
        } finally {
            renderer.destroy()
            node.discardDisplayList()
            reader.close()
        }
    }
    override fun onWindowVisibilityChanged(visibility: Int) { super.onWindowVisibilityChanged(visibility); restartClock() }
    override fun onVisibilityChanged(changedView: View, visibility: Int) { super.onVisibilityChanged(changedView, visibility); restartClock() }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (width == 0 || height == 0) return
        val still = frozenBitmap
        if (!moving && still != null) {
            canvas.drawBitmap(still, null, Rect(0, 0, width, height), bitmapPaint)
            return
        }
        val program = shader ?: return
        program.setFloatUniform("resolution", width.toFloat(), height.toFloat())
        program.setFloatUniform("time", phaseSeconds.toFloat())
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        drawnFrames++
        if (drawnFrames % 300 == 0) Log.i("XLRFOG", "frames=$drawnFrames time=${phaseSeconds.toFloat()} motion=$moving")
        if (!loggedDraw) {
            Log.i("XLRFOG", "drawing ${width}x${height}, hardware=${canvas.isHardwareAccelerated}, target=30fps")
            loggedDraw = true
        }
    }

    companion object {
        private val SNAPSHOT_EXECUTOR = Executors.newSingleThreadExecutor { task -> Thread(task, "FogSnapshot").apply { isDaemon = true } }
        private val MAIN = Handler(Looper.getMainLooper())
        private const val SOURCE = """
            uniform float2 resolution;
            uniform float time;
            uniform float3 color1;
            uniform float3 color2;
            uniform float3 color3;
            uniform float strength;
            uniform float relief;
            uniform float seed;

            float hash(float3 p) {
                p = fract(p * 0.1031);
                p += dot(p, p.yzx + 33.33);
                return fract((p.x + p.y) * p.z);
            }
            float noise3(float3 p) {
                float3 i = floor(p);
                float3 f = fract(p);
                f = f*f*f*(f*(f*6.0-15.0)+10.0);
                return mix(
                    mix(mix(hash(i), hash(i+float3(1,0,0)), f.x),
                        mix(hash(i+float3(0,1,0)), hash(i+float3(1,1,0)), f.x), f.y),
                    mix(mix(hash(i+float3(0,0,1)), hash(i+float3(1,0,1)), f.x),
                        mix(hash(i+float3(0,1,1)), hash(i+float3(1,1,1)), f.x), f.y), f.z);
            }
            float density(float3 p) {
                return 0.76*noise3(p) + 0.19*noise3(p*1.93+5.7)
                     + 0.05*noise3(p*3.71+13.1);
            }
            // Independent random destinations, smoothly joined: no orbital loop,
            // no per-frame random flicker. Travel spans the viewport, not a corner.
            float2 wander(float seconds, float period, float id) {
                float segment = floor(seconds/period);
                float f = fract(seconds/period);
                f = f*f*f*(f*(f*6.0-15.0)+10.0);
                float2 start = float2(hash(float3(segment,id,seed)),hash(float3(segment,id+9.7,seed)));
                float2 finish = float2(hash(float3(segment+1.0,id,seed)),hash(float3(segment+1.0,id+9.7,seed)));
                return (mix(start,finish,f)-0.5)*2.4;
            }
            float smoke(float3 p) {
                if (relief < 0.5) return density(p);
                // Rotated coordinates and independently warped interiors break
                // smooth round islands into branching, dissolving concentrations.
                p.xy = float2(p.x*0.86-p.y*0.51,p.x*0.51+p.y*0.86);
                float2 curl = float2(noise3(p*1.1+3.7),noise3(p*1.1+9.2))-0.5;
                p.xy += curl*1.1;
                float broad = 0.57*noise3(p) + 0.28*noise3(p*1.87+5.7)
                            + 0.11*noise3(p*3.4+13.1) + 0.04*noise3(p*5.8+21.3);
                float breaks = noise3(float3(p.xy*2.1,p.z*0.7+17.4));
                return broad - 0.13*smoothstep(0.45,0.8,breaks);
            }
            half4 main(float2 coord) {
                float2 uv = coord / resolution.y;
                float t = time * 0.045;
                float2 p = uv * mix(3.2,4.6,relief);
                float2 bend = float2(
                    noise3(float3(p*0.7+2.1,t*0.6)),
                    noise3(float3(p*0.7+8.3,t*0.6+4.2))) - 0.5;
                // A broad evolving current, without high-frequency folds.
                p += bend * (0.65 + 0.55*relief);
                p += relief*0.16*float2(sin(p.y*1.6+t*0.9),sin(p.x*1.4-t*0.7));
                float lo = mix(0.22,0.26,relief);
                float hi = mix(0.86,0.72,relief);
                float2 travelScale = float2(resolution.x/resolution.y,1.0)*4.6;
                float2 wa = relief*wander(time,26.0,1.3)*travelScale;
                float2 wb = relief*wander(time+7.0,31.0,8.9)*travelScale;
                float2 wc = relief*wander(time+15.0,29.0,17.2)*travelScale;
                float a = smoothstep(lo,hi,smoke(float3(p-wa+float2(t*0.55,-t*0.35),t)));
                float b = smoothstep(lo,hi,smoke(float3(p*0.87-wb+float2(5.4-t*0.40,2.6+t*0.28),t+7.3)));
                float c = smoothstep(lo+0.04,hi+0.02,smoke(float3(p*0.72-wc+float2(9.2+t*0.32,6.1-t*0.20),t*0.8+15.7)));
                // Broad soft concentrations with clear gaps: avoid an even pastel wash.
                a *= a;
                b *= b;
                c *= c;
                c *= mix(1.0,0.72,relief); // Warm ochre remains a smaller supporting current.
                float total = a+b+c+0.001;
                float alpha = strength * (1.0-exp(-1.15*total));
                float3 color = (color1*a+color2*b+color3*c)/total;
                // Same-hue darkening INSIDE dense fog, never an outline/drop shadow.
                float core = smoothstep(0.30,1.25,total);
                float depth = noise3(float3(p*0.8+4.7,t*0.85+3.1));
                color *= 1.0-relief*core*(0.08+0.12*depth);
                return half4(color*alpha,alpha);
            }
        """
    }
}
