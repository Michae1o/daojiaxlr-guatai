package com.xlr.k

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/* 宿主侧：app 内更新（早先的实现 apps/mobile-web/src/data/updateCore.js + XlrUpdatePlugin.java）
   · 安卓这条路**只能**下 APK 交系统安装器覆盖装，做不到静默安装；
   · 比的是 versionCode（数字），不比版本名；
   · 清单是同一个：(你的站点)
   网络与安装都在这里，shared 里只留纯逻辑与界面。 */
object UpdHost {

    /** 与手机端网页版/桌面端共用的一份清单（本机联调用 adb reverse + 临时改这里，验完必须改回线上地址） */
    const val MANIFEST_URL = "(你的站点)"

    fun install(ctx: Context) {
        com.xlr.k.pages.Platform.pkgName = ctx.packageName
        com.xlr.k.pages.Platform.versionCode = BuildConfig.VERSION_CODE
        com.xlr.k.pages.Platform.lite = false
        com.xlr.k.pages.Platform.updCheck = { checkManifest(ctx.packageName) }
        com.xlr.k.pages.Platform.updDownload = { url, fileName -> download(ctx, url, fileName) }
        com.xlr.k.pages.Platform.updInstall = { path -> installApk(ctx, path) }
    }

    /* 拉清单 + 按包名取条目：清单里没有这个包 ⇒ null（＝已是最新 / 这条线没配）
       清单形状（与手机端网页版、桌面端共用）：
       { "android": { "cn.guatai.xiaoliuren": {"versionName":"…","versionCode":2610291,"url":"…","sha256":"…"}, … } } */
    private fun checkManifest(pkg: String): com.xlr.k.pages.UpdItem? {
        if (MANIFEST_URL.isBlank()) return null
        if (MANIFEST_URL.isBlank()) return null
        val body = fetchText(MANIFEST_URL + "?t=" + System.currentTimeMillis())
        val j = try {
            org.json.JSONObject(body)
        } catch (e: Exception) {
            throw RuntimeException("更新清单格式不对")
        }
        val a = j.optJSONObject("android") ?: return null
        val it = a.optJSONObject(pkg) ?: return null
        return com.xlr.k.pages.UpdItem(
            /* ⚠ 清单里安卓这条的版本名字段写的是 `version`（生成更新清单.py 统一口径），
               桌面端读的是 `version`、这里原先读 `versionName` ⇒ 提示里会显示成 v12610294 这种裸号。
               两个键都认，先 versionName 再 version（实测踩到）。 */
            versionName = it.optString("versionName", it.optString("version", "")),
            versionCode = it.optInt("versionCode", 0),
            url = it.optString("url", ""),
            sha256 = it.optString("sha256", ""),
        )
    }

    /* 拉清单：404/502 一律当「连不上」，别把 HTTP 码甩给人看 */
    private fun fetchText(url: String): String {
        val c = URL(url).openConnection() as HttpURLConnection
        try {
            c.connectTimeout = 12000
            c.readTimeout = 12000
            c.requestMethod = "GET"
            c.setRequestProperty("Accept", "application/json")
            val code = c.responseCode
            if (code < 200 || code >= 300) throw RuntimeException("暂时连不上更新服务，稍后再试")
            return c.inputStream.bufferedReader().use { it.readText() }
        } finally {
            try { c.disconnect() } catch (e: Exception) { /* ignore */ }
        }
    }

    /* 下 APK 到 App 私有缓存（不占 Downloads、也不用写权限） */
    private fun download(ctx: Context, url: String, fileName: String): String {
        val dir = File(ctx.cacheDir, "upd").apply { mkdirs() }
        /* 同名前一次留下的先删，免得装到旧的 */
        dir.listFiles()?.forEach { if (it.name == fileName) it.delete() }
        val out = File(dir, fileName)
        val c = URL(url).openConnection() as HttpURLConnection
        try {
            c.connectTimeout = 15000
            c.readTimeout = 120000
            c.instanceFollowRedirects = true
            val code = c.responseCode
            if (code < 200 || code >= 300) throw RuntimeException("下载失败，稍后再试")
            c.inputStream.use { ins ->
                out.outputStream().use { os -> ins.copyTo(os, 64 * 1024) }
            }
        } finally {
            try { c.disconnect() } catch (e: Exception) { /* ignore */ }
        }
        if (!out.exists() || out.length() < 1024L) throw RuntimeException("下载的文件不完整，稍后再试")
        return out.absolutePath
    }

    /* 交系统安装器：N+ 必须用 content:// （FileProvider），file:// 会被系统拒绝 */
    private fun installApk(ctx: Context, path: String) {
        val f = File(path)
        if (!f.exists()) throw RuntimeException("安装包不在了，请重新下载")
        val uri: Uri = FileProvider.getUriForFile(ctx, ctx.packageName + ".upd", f)
        val i = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        ctx.startActivity(i)
    }
}
