package com.xlr.k

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * 一个极简的内嵌浏览器：给「去哪里拿 Key」「配置引导里的智谱链接」用。
 *
 * 为什么不直接 startActivity(ACTION_VIEW)：很多手机上没装浏览器（模拟器就没有），
 * 或者默认浏览器被禁用 —— 那样点了等于没反应（报「链接打不开」）。
 * 这里的策略是：系统有浏览器就交给系统（跟早先那一版 <a target=_blank> 一致），
 * 没有就在本 App 里打开，保证「点得开」。
 */
class WebViewActivity : Activity() {

    private var web: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val url = intent?.getStringExtra("url").orEmpty()
        val w = WebView(this)
        web = w
        w.settings.javaScriptEnabled = true
        w.settings.domStorageEnabled = true
        w.settings.loadWithOverviewMode = true
        w.settings.useWideViewPort = true
        w.webViewClient = WebViewClient()
        w.webChromeClient = WebChromeClient()
        w.loadUrl(url)
        setContentView(
            w,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )
    }

    /* 返回键先在网页里回退，退回不去才关掉这一页 */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        val w = web
        if (keyCode == KeyEvent.KEYCODE_BACK && w != null && w.canGoBack()) {
            w.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        web?.destroy()
        web = null
        super.onDestroy()
    }

    companion object {
        fun intentFor(context: android.content.Context, url: String): Intent =
            Intent(context, WebViewActivity::class.java)
                .putExtra("url", url)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
}
