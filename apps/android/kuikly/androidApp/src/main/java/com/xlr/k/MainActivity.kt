package com.xlr.k

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import com.tencent.kuikly.core.render.android.adapter.KuiklyRenderAdapterManager
import com.tencent.kuikly.core.render.android.expand.KuiklyRenderViewBaseDelegator
import com.tencent.kuikly.core.render.android.expand.KuiklyRenderViewBaseDelegatorDelegate
import com.xlr.k.adapter.KRImageAdapter
import com.xlr.k.adapter.KRLogAdapter
import com.xlr.k.adapter.KRRouterAdapter
import com.xlr.k.adapter.KRThreadAdapter
import com.xlr.k.adapter.KRUncaughtExceptionHandlerAdapter

class MainActivity : AppCompatActivity() {

    private lateinit var delegator: KuiklyRenderViewBaseDelegator

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        android.util.Log.i("XLRCHECK", com.xlr.k.judge.selfCheck())
        android.util.Log.i("XLRCHECK", com.xlr.k.judge.quickSelfCheck())
        android.util.Log.i("XLRCHECK", com.xlr.k.judge.extrasSelfCheck())
        setContentView(R.layout.activity_hr)
        setupAdapters()
        com.xlr.k.LlmHost.install(applicationContext)
        com.xlr.k.LlmHost.activity = this
        com.xlr.k.UpdHost.install(applicationContext)
        setupImmersiveMode()

        val container = findViewById<ViewGroup>(R.id.hr_container)
        applyImeInset(container)
        /* 起卦完成后收起输入法（shared 侧调 Platform.hideIme）。
           ⚠ 这个回调是从 Kuikly 的 HRContextQueueHandlerThread 进来的，碰 View 必须回主线程，
              否则 CalledFromWrongThreadException 直接崩（实测过一次）。 */
        com.xlr.k.pages.Platform.hideIme = {
            runOnUiThread {
                currentFocus?.clearFocus()
                val imm = getSystemService(android.content.Context.INPUT_METHOD_SERVICE)
                    as android.view.inputmethod.InputMethodManager
                imm.hideSoftInputFromWindow(container.windowToken, 0)
                /* 收键盘的同时**立刻**把底部补间推回 0 ——
                   等系统把可见区报回来再动会晚一跳，卡片就闪一下。
                   同时把 imeVisible 立刻置 false：壹页的卡片底部留白（12→71dp）
                   也必须在同一帧起步，否则键盘都收完了它才补那一下 = 再闪一次。 */
                com.xlr.k.pages.Platform.imeVisible = false
                /* 详情展开那一段由 Compose 单时钟驱动（padDriven），这里别跟它抢 */
                if (!com.xlr.k.pages.Platform.padDriven) animateImePad(container, 0)
            }
        }
        /* Compose 每帧写底部内边距（详情展开时用，保证和卡片高度同一个时钟） */
        com.xlr.k.pages.Platform.setImePadPx = { px ->
            runOnUiThread {
                imeAnim?.cancel()
                imePadTarget = px
                container.setPadding(0, 0, 0, px)
            }
        }
        /* 页面底色同步：底部内边距让出来的那块用页面色，别露窗口白（） */
        com.xlr.k.pages.Platform.setPageBg = { r, g, b ->
            runOnUiThread {
                val c = android.graphics.Color.rgb(
                    (r * 255f).toInt().coerceIn(0, 255),
                    (g * 255f).toInt().coerceIn(0, 255),
                    (b * 255f).toInt().coerceIn(0, 255),
                )
                if (c != pageBgInt) {
                    pageBgInt = c
                    container.setBackgroundColor(c)
                }
            }
        }
        /* 原生震动（shared 侧调 Platform.haptic(level)）：
           0 = 刻度（页间滑动，八卦名每换一格抽一下）· 1 = 钝感（开记录抽屉）· 2 = 重（起卦、记录菜单这类「按下去要有回音」）。
           ⚠ 同 hideIme：回调不在主线程，vibrate 本身线程无所谓，但为了跟 View 侧一致都回主线程。 */
        com.xlr.k.pages.Platform.haptic = { level ->
            runOnUiThread {
                try {
                    val vib: android.os.Vibrator? = if (Build.VERSION.SDK_INT >= 31) {
                        val mgr = getSystemService(android.os.VibratorManager::class.java)
                        mgr?.defaultVibrator
                    } else {
                        @Suppress("DEPRECATION")
                        getSystemService(android.content.Context.VIBRATOR_SERVICE) as? android.os.Vibrator
                    }
                    if (vib != null && vib.hasVibrator()) {
                        /* ：三档都往上抬 ——
                           刻度 10→14ms / 120→150，钝感 28→34ms / 200→225，重档 48ms / 255。
                           ⚠ 振幅要先问 hasAmplitudeControl：不支持的机器上带 amplitude 的效果
                              会被当成「0 振幅」⇒ 一点感觉都没有；不支持就退 DEFAULT_AMPLITUDE。
                           ⚠ 12+ 再挂一条 USAGE_TOUCH 的 VibrationAttributes：走系统的
                              「触感反馈」通道，才按用户那边的触感强度/静音策略正常出。 */
                        val ms = when (level) { 0 -> 14L; 1 -> 34L; else -> 48L }
                        val amp = when (level) { 0 -> 150; 1 -> 225; else -> 255 }
                        if (Build.VERSION.SDK_INT >= 26) {
                            val hasAmp = vib.hasAmplitudeControl()
                            val fx = if (hasAmp) {
                                android.os.VibrationEffect.createOneShot(ms, amp)
                            } else {
                                android.os.VibrationEffect.createOneShot(
                                    ms, android.os.VibrationEffect.DEFAULT_AMPLITUDE
                                )
                            }
                            if (Build.VERSION.SDK_INT >= 33) {
                                vib.vibrate(
                                    fx,
                                    android.os.VibrationAttributes.createForUsage(
                                        android.os.VibrationAttributes.USAGE_TOUCH
                                    )
                                )
                            } else {
                                vib.vibrate(fx)
                            }
                        } else {
                            @Suppress("DEPRECATION")
                            vib.vibrate(ms)
                        }
                        android.util.Log.i("XLRHAP", "haptic level=$level vibrator=yes amp=${vib.hasAmplitudeControl()}")
                    } else {
                        android.util.Log.i("XLRHAP", "haptic level=$level 没有振动马达（模拟器常见），跳过")
                    }
                } catch (e: Throwable) {
                    android.util.Log.i("XLRHAP", "haptic 失败: " + e.message)
                }
            }
        }
        /* 系统返回键交给共享层决定：
           浮层 → 设置（→ 回到记录抽屉）→ 抽屉 → 三页（两次退出）。*/
        com.xlr.k.pages.Platform.exitApp = {
            runOnUiThread { finish() }
        }
        val delegate = object : KuiklyRenderViewBaseDelegatorDelegate {}
        delegator = KuiklyRenderViewBaseDelegator(delegate)
        // contextCode 传 ""，即 JVM 模式：共享模块的 Kotlin 代码直接编进 APK
        delegator.onAttach(container, "", PAGE_NAME, mapOf<String, Any>("appId" to 1))
    }

    /* 返回键先问共享层（浮层 → 设置 → 记录抽屉 → 三页两次退出），它没消化才真的退 Activity。
       ⚠ AppCompatActivity 在 API 33+ 仍走 onBackPressed（本工程没开 enableOnBackInvokedCallback）。 */
    override fun onBackPressed() {
        val handled = com.xlr.k.pages.Platform.onBack?.invoke() ?: false
        if (handled) return
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }

    override fun onResume() {
        super.onResume()
        if (::delegator.isInitialized) delegator.onResume()
    }

    override fun onPause() {
        super.onPause()
        if (::delegator.isInitialized) delegator.onPause()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::delegator.isInitialized) delegator.onDetach()
        com.xlr.k.LlmHost.activity = null
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        com.xlr.k.LlmHost.onPickResult(resultCode, data)
    }

    private fun setupAdapters() {
        if (KuiklyRenderAdapterManager.krImageAdapter == null) {
            KuiklyRenderAdapterManager.krImageAdapter = KRImageAdapter(applicationContext)
        }
        if (KuiklyRenderAdapterManager.krLogAdapter == null) {
            KuiklyRenderAdapterManager.krLogAdapter = KRLogAdapter
        }
        if (KuiklyRenderAdapterManager.krUncaughtExceptionHandlerAdapter == null) {
            KuiklyRenderAdapterManager.krUncaughtExceptionHandlerAdapter =
                KRUncaughtExceptionHandlerAdapter
        }
        if (KuiklyRenderAdapterManager.krRouterAdapter == null) {
            KuiklyRenderAdapterManager.krRouterAdapter = KRRouterAdapter()
        }
        if (KuiklyRenderAdapterManager.krThreadAdapter == null) {
            KuiklyRenderAdapterManager.krThreadAdapter = KRThreadAdapter()
        }
    }

    /* 唤起输入法时把整块界面往上顶（manifest 原来是 adjustNothing ⇒ 键盘直接盖住输入框）。
       ⚠ 不走 WindowInsets：edge-to-edge（setDecorFitsSystemWindows(false)）下这台安卓 15 的
       ime inset 一直是 0（实测打点 ime=0），改成老办法——量「窗口可见区」和根视图的高度差。 */
    private fun applyImeInset(v: View) {
        if (Build.VERSION.SDK_INT < 30) return   /* 30 以下 adjustResize 会自己缩窗口 */
        val r = android.graphics.Rect()
        v.viewTreeObserver.addOnGlobalLayoutListener {
            v.getWindowVisibleDisplayFrame(r)
            val rootH = v.rootView.height
            val kb = (rootH - r.bottom).coerceAtLeast(0)
            /* 小于 15% 屏高的一律当 0（状态栏/手势条/过渡中间态，别让界面乱抖） */
            val pad = if (kb > rootH * 0.15f) kb else 0
            com.xlr.k.pages.Platform.imePadPx = pad
            com.xlr.k.pages.Platform.imeVisible = pad > 0
            if (v.paddingBottom != pad && !com.xlr.k.pages.Platform.padDriven) animateImePad(v, pad)
        }
    }

    /* ：
       padding 一步到位＝硬跳 ⇒ 统一走 200ms 缓出补间。涨落都走这里，别处不要直接 setPadding。
       ⚠ 动画期间 layout 会再回调，用 imePadTarget 去重，别自己打断自己。 */
    private fun animateImePad(v: View, pad: Int) {
        if (pad == imePadTarget) return
        imePadTarget = pad
        imeAnim?.cancel()
        val a = android.animation.ValueAnimator.ofInt(v.paddingBottom, pad)
        a.duration = 260
        /* （第三轮）：和 Compose 那头对齐成**同一条 ease-in-out**（cubic-bezier(.4,0,.2,1)）。
           原先用「先快后慢」的曲线，两个动画只要差半帧，位移误差就被放大成看得见的抖动；
           改成起手很轻的曲线后，同样的时间误差只剩原来的十分之一，肉眼就看不出来了。 */
        a.interpolator = android.view.animation.PathInterpolator(0.4f, 0f, 0.2f, 1f)
        a.addUpdateListener { an -> v.setPadding(0, 0, 0, an.animatedValue as Int) }
        imeAnim = a
        a.start()
    }

    private var imeAnim: android.animation.ValueAnimator? = null
    private var imePadTarget = -1
    private var pageBgInt = 0

    private fun setupImmersiveMode() {
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.setSystemBarsAppearance(
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            )
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        }
        if (Build.VERSION.SDK_INT >= 28) {
            val attrs: WindowManager.LayoutParams = window.attributes
            attrs.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            window.attributes = attrs
        }
    }

    companion object {
        private const val PAGE_NAME = "Yi"
    }
}
