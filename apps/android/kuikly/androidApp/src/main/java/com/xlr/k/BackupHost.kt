package com.xlr.k

import android.app.Activity
import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import androidx.appcompat.app.AlertDialog
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

/* 卸载 / 重装的数据兜底。

   根因不是"更新会清数据"：卦例本、准则、API Key、模型预设全都住在同一份
   SharedPreferences（`xlr-k-llm.xml`）里，只有「卸载」或「清除数据」才会整目录消失。

   两道保险：
   ① Manifest 的 android:hasFragileUserData="true" —— 安卓 10+ 卸载对话框会多出一个
      「保留应用数据」勾选项，勾了重装就能原样回来（系统行为，不需要写代码）；
   ② 这里：改过数据就把整份 xlr-k-llm 落一份到「下载/道家小六壬/卦台备份.json」，
      全新安装启动时若本地是空的、备份还在 ⇒ 问一句「要恢复吗」。

   ⚠ 备份里含 API Key（明文）。不这么做用户每次重装都得重填；写的是 MediaStore 的
     公共 Download 目录，安卓 11+ 其他应用没有权限读它。SDK < 29 不做（写公共目录要运行时权限），
      那档系统也没有「保留应用数据」的勾选项 —— 靠用户自己导出。
*/
internal object BackupHost {

    private const val FILE_NAME = "卦台备份.json"
    private const val DIR_HINT = "道家小六壬"
    private const val K_CASES = "xlr-cases"
    private const val K_SKIP = "backup.skipSig"

    private var appCtx: Context? = null
    private val ui = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor { r ->
        Thread(r, "xlr-backup").apply { isDaemon = true }
    }
    private var timer: Runnable? = null

    fun install(ctx: Context) {
        appCtx = ctx.applicationContext
    }

    /* ---------- 写备份：合并短时间内的多次写入，只落一次盘 ---------- */

    /** 每次 Platform.put 之后调一次（LlmHost 里挂着）。3 秒内的连续改动合并成一次。 */
    fun markDirty() {
        if (Build.VERSION.SDK_INT < 29) return
        if (appCtx == null) return
        timer?.let { ui.removeCallbacks(it) }
        val r = Runnable { timer = null; runCatching { writeNow() } }
        timer = r
        ui.postDelayed(r, 3000)
    }

    /** 切后台时立刻落盘（起完一卦马上杀进程也不会丢备份） */
    fun flush() {
        if (Build.VERSION.SDK_INT < 29) return
        timer?.let { ui.removeCallbacks(it) }
        timer = null
        runCatching { writeNow() }
    }

    private fun writeNow() {
        val c = appCtx ?: return
        io.execute {
            try {
                val sp = c.getSharedPreferences(LlmHost.SP_NAME, Context.MODE_PRIVATE)
                val data = JSONObject()
                for ((k, v) in sp.all) {
                    if (v is String && v.isNotEmpty()) data.put(k, v)
                }
                /* 一条记录都没有就别覆盖旧备份（否则新装用户空跑一次会把好备份冲掉） */
                if (data.optString(K_CASES, "").let { it.isEmpty() || it == "[]" }) {
                    if (!data.has("llm.key")) return@execute
                }
                val root = JSONObject().apply {
                    put("_v", 1)
                    put("_at", SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.CHINA).format(Date()))
                    put("_pkg", c.packageName)
                    put("data", data)
                }
                LlmHost.saveToDownloads(c, FILE_NAME, root.toString())
            } catch (e: Throwable) {
                android.util.Log.w("XLRBAK", "写备份失败：" + e.message)
            }
        }
    }

    /* ---------- 读备份 + 恢复 ---------- */

    /** 启动后调一次：本地是空的、备份还在 ⇒ 弹一次问要不要恢复 */
    fun scheduleRestoreCheck(act: Activity) {
        if (Build.VERSION.SDK_INT < 29) return
        if (appCtx == null) return
        ui.postDelayed({ runCatching { checkRestore(act) } }, 1600)
    }

    private fun checkRestore(act: Activity) {
        if (act.isFinishing || act.isDestroyed) return
        val sp = act.getSharedPreferences(LlmHost.SP_NAME, Context.MODE_PRIVATE)
        val local = sp.getString(K_CASES, "") ?: ""
        /* 本地已有卦例 ⇒ 不打扰（正常覆盖升级、或上次没卸载干净） */
        if (local.isNotEmpty() && local != "[]" && countCases(local) > 0) return

        val root = readBackup(act) ?: return
        /* 备份是另一个安装（完整版/lite 是两个包名）写的就跳过：
           数据格式相通，但把 A 的卦例倒进 B 里只会让人困惑 */
        val bpkg = root.optString("_pkg", "")
        if (bpkg.isNotEmpty() && bpkg != act.packageName) return
        val data = root.optJSONObject("data") ?: return
        val cases = data.optString(K_CASES, "")
        val n = countCases(cases)
        val hasKey = data.optString("llm.key", "").isNotEmpty()
        if (n <= 0 && !hasKey) return

        val sig = root.optString("_at", "") + "|" + data.length()
        if (sp.getString(K_SKIP, "") == sig) return  /* 这份备份上次已经拒绝过 */

        val lines = ArrayList<String>()
        if (n > 0) lines.add("· 卦例 $n 条")
        if (hasKey) lines.add("· 已配好的模型与 API Key")
        data.optString("xlr-rules", "").let { if (countCases(it) > 0) lines.add("· 复盘准则 ${countCases(it)} 条") }

        AlertDialog.Builder(act)
            .setTitle("找到上次的备份")
            .setMessage(
                "这台设备上现在没有数据，但「下载/道家小六壬/」里还留着上一次卸载前的备份：\n\n" +
                    lines.joinToString("\n") +
                    "\n\n备份时间：" + root.optString("_at", "未知") +
                    "\n\n要恢复到这台设备吗？"
            )
            .setPositiveButton("恢复") { _, _ ->
                restore(act, data)
            }
            .setNegativeButton("不用了") { _, _ ->
                sp.edit().putString(K_SKIP, sig).apply()
            }
            .setCancelable(false)
            .show()
    }

    private fun restore(act: Activity, data: JSONObject) {
        val sp = act.getSharedPreferences(LlmHost.SP_NAME, Context.MODE_PRIVATE)
        val e = sp.edit()
        for (k in data.keys()) {
            val v = data.optString(k, "")
            if (v.isNotEmpty()) e.putString(k, v)
        }
        e.apply()
        sp.edit().remove(K_SKIP).apply()
        /* 共享层是启动时读的，整块界面重建一次才会按恢复后的数据重画 */
        ui.postDelayed({
            if (!act.isFinishing) act.recreate()
        }, 250)
    }

    /* ---------- 备份文件（MediaStore Downloads） ---------- */

    private fun readBackup(c: Context): JSONObject? {
        if (Build.VERSION.SDK_INT < 29) return null   /* MediaStore.Downloads 是 29 才有的 */
        val col: Uri = MediaStore.Downloads.EXTERNAL_CONTENT_URI
        val proj = arrayOf(
            MediaStore.MediaColumns._ID,
            MediaStore.MediaColumns.DISPLAY_NAME,
            MediaStore.MediaColumns.RELATIVE_PATH,
        )
        try {
            c.contentResolver.query(col, proj, null, null, null)?.use { cur ->
                while (cur.moveToNext()) {
                    val dn = cur.getString(1) ?: ""
                    val rp = cur.getString(2) ?: ""
                    if (dn != FILE_NAME || !rp.contains(DIR_HINT)) continue
                    val uri = ContentUris.withAppendedId(col, cur.getLong(0))
                    val txt = c.contentResolver.openInputStream(uri)
                        ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: return null
                    return runCatching { JSONObject(txt) }.getOrNull()
                }
            }
        } catch (e: Throwable) {
            android.util.Log.w("XLRBAK", "读备份失败：" + e.message)
        }
        return null
    }

    private fun countCases(raw: String): Int = runCatching { JSONArray(raw).length() }.getOrDefault(0)
}
