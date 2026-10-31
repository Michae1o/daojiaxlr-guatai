package com.xlr.k.adapter

import android.app.Activity
import android.content.Context
import android.content.Intent
import com.tencent.kuikly.core.render.android.adapter.IKRRouterAdapter
import com.xlr.k.MainActivity
import org.json.JSONObject

class KRRouterAdapter : IKRRouterAdapter {

    override fun openPage(
        context: Context,
        pageName: String,
        pageData: JSONObject,
    ) {
        // 目前只有一屏，页面跳转统一重开 MainActivity 并带上 pageName
        val intent = Intent(context, MainActivity::class.java)
        intent.putExtra("pageName", pageName)
        intent.putExtra("pageData", pageData.toString())
        context.startActivity(intent)
    }

    override fun closePage(context: Context) {
        (context as? Activity)?.finish()
    }
}
