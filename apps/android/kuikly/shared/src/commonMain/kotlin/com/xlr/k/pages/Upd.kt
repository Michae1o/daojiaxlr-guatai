package com.xlr.k.pages

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/* app 内更新（只做安卓端，早先的实现 apps/mobile-web/src/data/updateCore.js）
   口径逐条照旧：
     · 只提示、不自动下；用户再点一次「立即更新」才下载；
     · 比 **versionCode**（数字），不比版本名；
     · 下好交系统安装器覆盖装，做不到静默装；数据与配置都在，不会被清；
     · 清单里没有本包条目 ⇒ 当「已是最新」；连不上 ⇒ 只说「暂时连不上更新服务」。 */
internal object Upd {

    /** 这条线有没有更新能力（网页版没有 ⇒ 关于页不该出现「版本更新」这一行） */
    val available: Boolean get() = Platform.updCheck != null

    /** 检查：null = 已是最新；返回条目 = 有新版；抛异常 = 连不上/格式不对 */
    suspend fun check(): UpdItem? = withContext(Dispatchers.IO) {
        val f = Platform.updCheck ?: throw RuntimeException("这条线没有应用内更新")
        val it = f() ?: return@withContext null
        if ((it.versionCode) > Platform.versionCode) it else null
    }

    /** 下 APK 到私有缓存，返回本地路径 */
    suspend fun download(item: UpdItem): String = withContext(Dispatchers.IO) {
        val d = Platform.updDownload ?: throw RuntimeException("这条线没有应用内更新")
        d(item.url, "guatai-" + item.versionCode + ".apk")
    }

    /** 交系统安装器（必须在主线程调） */
    fun install(path: String) {
        Platform.updInstall?.invoke(path) ?: throw RuntimeException("这条线没有应用内更新")
    }
}
