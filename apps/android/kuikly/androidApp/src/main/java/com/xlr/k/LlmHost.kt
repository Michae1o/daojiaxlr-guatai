package com.xlr.k

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/* 宿主侧：把「存储」和「发一次 chat 请求」注入给 shared 的 com.xlr.k.pages.Platform。
   shared 里不碰 Android API（KMP commonMain），网络与 SharedPreferences 都住在这里。 */
object LlmHost {

    fun install(ctx: Context) {
        val sp = ctx.getSharedPreferences("xlr-k-llm", Context.MODE_PRIVATE)
        com.xlr.k.pages.Platform.get = { k -> sp.getString(k, null) }
        com.xlr.k.pages.Platform.put = { k, v ->
            sp.edit().putString(k, v).apply()
        }
        com.xlr.k.pages.Platform.chat = { url, headers, body -> post(url, headers, body) }
        com.xlr.k.pages.Platform.list = { url, headers -> get(url, headers) }
        com.xlr.k.pages.Platform.streamStart = { url, headers, body -> streamStart(url, headers, body) }
        com.xlr.k.pages.Platform.streamRead = { id -> streamRead(id) }
        com.xlr.k.pages.Platform.version = BuildConfig.VERSION_NAME
        val dm = ctx.resources.displayMetrics
        com.xlr.k.pages.Platform.screenW = dm.widthPixels
        com.xlr.k.pages.Platform.screenH = dm.heightPixels
        com.xlr.k.pages.Platform.copy = { t ->
            val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            cm.setPrimaryClip(android.content.ClipData.newPlainText("卦辞", t))
        }
        com.xlr.k.pages.Platform.saveFile = { name, text -> saveToDownloads(ctx, name, text) }
        com.xlr.k.pages.Platform.pickText = { cb -> startPick(cb) }
        /* 引导 / 「去哪里拿」里那些链接：
           有系统浏览器就交给系统（早先那一版是 <a target=_blank>）；
           没有（模拟器、或浏览器被禁用）就在本 App 内嵌页里打开 —— 否则点了等于没反应 */
        com.xlr.k.pages.Platform.openUrl = { url ->
            try {
                val view = android.content.Intent(
                    android.content.Intent.ACTION_VIEW,
                    android.net.Uri.parse(url),
                ).apply { addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK) }
                if (view.resolveActivity(ctx.packageManager) != null) {
                    ctx.startActivity(view)
                } else {
                    ctx.startActivity(com.xlr.k.WebViewActivity.intentFor(ctx, url))
                }
            } catch (e: Exception) {
                android.util.Log.w("XLRLINK", "openUrl failed: $url / ${e.message}")
                try {
                    ctx.startActivity(com.xlr.k.WebViewActivity.intentFor(ctx, url))
                } catch (e2: Exception) {
                    android.util.Log.w("XLRLINK", "fallback failed: ${e2.message}")
                }
            }
        }
    }

    /* 导出：写进「下载/道家小六壬/」。
       ⚠ 系统在同一个目录里遇到重名会自己把新文件改名成「名字 (1).json」⇒ 每导一次就多一份、
       名字一直往后排（实测把 (1) 排到了 (10)）。做法：先在 Downloads 里找出**同一族的行**
       （基名本身，或「基名 (N)」），有就原地覆写、多余的同族收掉；实在没有才新建。
       ⇒ 连导多少次都只留一个文件。 */
    private fun saveToDownloads(ctx: Context, name: String, text: String): String? {
        return try {
            if (android.os.Build.VERSION.SDK_INT >= 29) {
                val rows = familyRows(ctx, name)
                if (rows.isNotEmpty()) {
                    val uri = rows[0].second
                    ctx.contentResolver.openOutputStream(uri, "wt")?.use {
                        it.write(text.toByteArray(Charsets.UTF_8))
                    }
                    for (i in 1 until rows.size) {
                        try {
                            ctx.contentResolver.delete(rows[i].second, null, null)
                        } catch (e: Throwable) {
                        }
                    }
                    return "下载/道家小六壬/" + rows[0].first
                }
                val values = android.content.ContentValues().apply {
                    put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, name)
                    put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "application/json")
                    put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, "Download/道家小六壬")
                }
                val uri0 = ctx.contentResolver.insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                if (uri0 == null) null
                else {
                    ctx.contentResolver.openOutputStream(uri0)?.use { it.write(text.toByteArray(Charsets.UTF_8)) }
                    "下载/道家小六壬/" + shownName(ctx, uri0, name)
                }
            } else {
                val dir = java.io.File(
                    android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS),
                    "道家小六壬"
                )
                if (!dir.exists()) dir.mkdirs()
                val f = java.io.File(dir, name)
                f.writeText(text)
                "下载/道家小六壬/" + name
            }
        } catch (e: Throwable) {
            null
        }
    }

    /** 新建之后系统可能把名字改成「… (N)」，回报给用户看的那行要用真实名字 */
    private fun shownName(ctx: Context, uri: android.net.Uri, fallback: String): String {
        return try {
            ctx.contentResolver.query(
                uri,
                arrayOf(android.provider.MediaStore.MediaColumns.DISPLAY_NAME),
                null, null, null
            )?.use { c -> if (c.moveToFirst()) c.getString(0) ?: fallback else fallback }
                ?: fallback
        } catch (e: Throwable) {
            fallback
        }
    }

    /** 「下载/道家小六壬」里与我们这份同族的行：基名本身、以及「基名 (N)」；基名那条排最前。
        ⚠ 不能按 DISPLAY_NAME 做 selection —— 系统改名后基名那条根本不存在，查出来恒 0 行；
        这里整表查 Downloads、在代码里按目录 + 名字族过滤（Download 目录总量很小）。 */
    private fun familyRows(ctx: Context, name: String): List<Pair<String, android.net.Uri>> {
        val out = ArrayList<Pair<String, android.net.Uri>>()
        val dot = name.lastIndexOf('.')
        val stem = if (dot > 0) name.substring(0, dot) else name
        val tail = if (dot > 0) name.substring(dot) else ""
        val pat = Regex("^" + Regex.escape(stem) + "( \\(\\d+\\))?(" + Regex.escape(tail) + ")?$")
        try {
            val c = ctx.contentResolver.query(
                android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                arrayOf(
                    android.provider.MediaStore.MediaColumns._ID,
                    android.provider.MediaStore.MediaColumns.DISPLAY_NAME,
                    android.provider.MediaStore.MediaColumns.RELATIVE_PATH
                ),
                null, null, null
            )
            c?.use { cur ->
                while (cur.moveToNext()) {
                    val idc = cur.getLong(0)
                    val dn = cur.getString(1) ?: ""
                    val rp = cur.getString(2) ?: ""
                    if (!rp.contains("道家小六壬")) continue
                    if (!pat.matches(dn)) continue
                    out.add(
                        dn to android.content.ContentUris.withAppendedId(
                            android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, idc
                        )
                    )
                }
            }
        } catch (e: Throwable) {
            android.util.Log.w("XLRCHECK", "查导出同族文件失败：" + e)
        }
        /* 基名那条优先，其余按名字排 */
        out.sortBy { if (it.first == name) "" else it.first }
        return out
    }

    /* ---------- 导入：系统文件选择器 ---------- */
    var activity: android.app.Activity? = null
    private const val PICK_REQ = 4711
    private var pickCb: ((String?) -> Unit)? = null

    private fun startPick(cb: (String?) -> Unit) {
        val act = activity
        if (act == null) {
            cb(null)
            return
        }
        pickCb = cb
        try {
            val it2 = android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(android.content.Intent.CATEGORY_OPENABLE)
                type = "*/*"
            }
            act.startActivityForResult(it2, PICK_REQ)
        } catch (e: Throwable) {
            pickCb = null
            cb(null)
        }
    }

    fun onPickResult(resultCode: Int, data: android.content.Intent?) {
        val cb = pickCb
        pickCb = null
        if (cb == null) return
        val uri = data?.data
        if (resultCode != android.app.Activity.RESULT_OK || uri == null) {
            cb(null)
            return
        }
        try {
            val txt = activity?.contentResolver?.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
            cb(txt)
        } catch (e: Throwable) {
            cb(null)
        }
    }

    /* ---------- 流式（SSE）：后台线程读、宿主缓冲、shared 侧轮询 ---------- */

    private class SBox {
        val sb = StringBuilder()
        @Volatile var done = false
        @Volatile var err = ""
    }

    private val boxes = java.util.concurrent.ConcurrentHashMap<Int, SBox>()
    private val seq = java.util.concurrent.atomic.AtomicInteger(0)

    private fun streamStart(url: String, headers: Map<String, String>, body: String): Int {
        val id = seq.incrementAndGet()
        val b = SBox()
        boxes[id] = b
        Thread {
            try {
                postStream(url, headers, body) { piece -> synchronized(b.sb) { b.sb.append(piece) } }
            } catch (e: Throwable) {
                b.err = e.message ?: "流式请求失败"
            } finally {
                b.done = true
            }
        }.apply { isDaemon = true; start() }
        return id
    }

    private fun streamRead(id: Int): com.xlr.k.pages.StreamSnap {
        val b = boxes[id] ?: return com.xlr.k.pages.StreamSnap("", true, "请求不存在")
        val t = synchronized(b.sb) { b.sb.toString() }
        return com.xlr.k.pages.StreamSnap(t, b.done, b.err)
    }

    private fun postStream(
        url: String,
        headers: Map<String, String>,
        body: String,
        onDelta: (String) -> Unit,
    ) {
        val conn = (URL(url).openConnection() as HttpURLConnection)
        try {
            conn.requestMethod = "POST"
            conn.connectTimeout = 20_000
            conn.readTimeout = 180_000
            conn.doOutput = true
            headers.forEach { (k, v) -> conn.setRequestProperty(k, v) }
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            if (code !in 200..299) {
                val text = conn.errorStream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
                throw RuntimeException(errText(code, text))
            }
            conn.inputStream.bufferedReader(Charsets.UTF_8).use { r ->
                while (true) {
                    val line = r.readLine() ?: break
                    if (!line.startsWith("data:")) continue
                    val payload = line.substring(5).trim()
                    if (payload.isEmpty()) continue
                    if (payload == "[DONE]") break
                    val j = runCatching { JSONObject(payload) }.getOrNull() ?: continue
                    /* ⚠ 别用 optString：org.json 把 JSON 里的 null 转成字符串 "null"（实测刷了一屏 null） */
                    val c1 = j.optJSONArray("choices")?.optJSONObject(0)?.optJSONObject("delta")?.opt("content")
                    val c2 = j.optJSONObject("delta")?.opt("text")
                    val piece = when {
                        c1 is String && c1.isNotEmpty() -> c1
                        c2 is String && c2.isNotEmpty() -> c2
                        else -> ""
                    }
                    if (piece.isNotEmpty()) onDelta(piece)
                }
            }
        } finally {
            conn.disconnect()
        }
    }

    /* GET <base>/models：只认 data[] / models[]，元素可能是字符串，也可能是 {id|name|model} */
    private fun get(url: String, headers: Map<String, String>): List<String> {
        val conn = (URL(url).openConnection() as HttpURLConnection)
        try {
            conn.requestMethod = "GET"
            conn.connectTimeout = 20_000
            conn.readTimeout = 30_000
            headers.forEach { (k, v) -> conn.setRequestProperty(k, v) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            if (code !in 200..299) throw RuntimeException(errText(code, text))
            val j = JSONObject(text)
            val arr = j.optJSONArray("data") ?: j.optJSONArray("models")
                ?: throw RuntimeException("清单是空的")
            val ids = sortedSetOf<String>()
            for (i in 0 until arr.length()) {
                val it = arr.opt(i)
                val id = when (it) {
                    is String -> it
                    is JSONObject -> it.optString("id")
                        .ifEmpty { it.optString("name") }
                        .ifEmpty { it.optString("model") }
                    else -> ""
                }
                if (id.isNotEmpty()) ids.add(id)
            }
            if (ids.isEmpty()) throw RuntimeException("清单是空的")
            return ids.toList()
        } finally {
            conn.disconnect()
        }
    }

    private fun post(url: String, headers: Map<String, String>, body: String): String {
        val conn = (URL(url).openConnection() as HttpURLConnection)
        try {
            conn.requestMethod = "POST"
            conn.connectTimeout = 20_000
            conn.readTimeout = 90_000
            conn.doOutput = true
            headers.forEach { (k, v) -> conn.setRequestProperty(k, v) }
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            if (code !in 200..299) throw RuntimeException(errText(code, text))
            return extract(text)
        } finally {
            conn.disconnect()
        }
    }

    /* 服务端报错体里通常有一句人话，优先用它；没有就回落到原文截断 */
    private fun errText(code: Int, raw: String): String {
        val msg = runCatching {
            JSONObject(raw).optJSONObject("error")?.optString("message")
        }.getOrNull()
        return if (!msg.isNullOrBlank()) "HTTP $code · $msg" else "HTTP $code · " + raw.take(200)
    }

    /* 兼容两种响应：OpenAI（choices[0].message.content）与 Anthropic（content[].text） */
    private fun extract(raw: String): String {
        val j = runCatching { JSONObject(raw) }.getOrNull()
            ?: return raw.take(4000)
        j.optJSONArray("choices")?.optJSONObject(0)
            ?.optJSONObject("message")?.optString("content")
            ?.let { if (it.isNotBlank()) return it }
        j.optJSONArray("content")?.let { arr ->
            val sb = StringBuilder()
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                if (o.optString("type") == "text") sb.append(o.optString("text"))
            }
            if (sb.isNotEmpty()) return sb.toString()
        }
        j.optJSONObject("error")?.optString("message")?.let { if (it.isNotBlank()) throw RuntimeException(it) }
        return raw.take(4000)
    }
}
