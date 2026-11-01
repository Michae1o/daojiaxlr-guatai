package com.xlr.k.pages

import kotlinx.coroutines.Dispatchers
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/* 模型解卦 · 配置与请求（早先的实现：apps/mobile-web/src/data/{settingsCore.js, llmEndpoint.js}）
   ⚠ 文案（预设表 / 缺项提示）逐字照抄旧 settingsCore.js。
   网络与存储由宿主（androidApp/LlmHost.kt）注入，shared 侧不碰平台 API。 */

/** 宿主注入的三件事：读配置 / 写配置 / 发一次 chat（返回助手正文，出错抛异常） */
object Platform {
    var get: ((String) -> String?)? = null
    var put: ((String, String) -> Unit)? = null
    var chat: ((String, Map<String, String>, String) -> String)? = null
    /** GET 一个 json，返回模型清单里的 id（宿主负责解析）；出错抛异常 */
    var list: ((String, Map<String, String>) -> List<String>)? = null
    /** 流式：起一个后台请求，返回句柄；之后用 streamRead 轮询已收到的正文 */
    var streamStart: ((String, Map<String, String>, String) -> Int)? = null
    var streamRead: ((Int) -> StreamSnap)? = null
    /** 宿主的版本号（BuildConfig.VERSION_NAME），设置页「关于」显示用 */
    var version: String? = null
    /** 屏幕物理像素宽 / 高（Kuikly 的 localToRoot 给的是设计坐标，手势是物理像素，换算要用） */
    var screenW: Int = 0
    var screenH: Int = 0
    /** 把文字塞进系统剪贴板（记录页「复制断辞」用） */
    var copy: ((String) -> Unit)? = null
    /** 收起输入法（起卦完成后调用，别让键盘一直挂着盖住贰页） */
    var hideIme: (() -> Unit)? = null
    /** 输入法此刻是不是挂着（宿主在量完窗口可见区后写）：点空白处收键盘前先看这个，
     *  没挂就别乱 clearFocus（：点空白不收输入法） */
    /* 键盘是否弹着（MainActivity 的 inset 回调写它）。必须是 Compose 状态：
       壹页要靠它把卡片底部 71dp 留白收掉，普通 var 不会触发重组。 */
    var imeVisible: Boolean by androidx.compose.runtime.mutableStateOf(false)
    /** 键盘此刻的物理高度（px，宿主量出来写这里）——详情展开时按「键盘高 − 详情高」算回落量 */
    var imePadPx: Int by androidx.compose.runtime.mutableStateOf(0)
    /** 详情展开时在壹页**自己**的底部加的留白（dp）：＝(键盘高 − 详情高)。
     *  ⚠ 不能靠宿主的内边距留白 —— 那块不属于页面，会露出窗口底色（白条，抓到）。 */
    var anchorPadDp: Float by androidx.compose.runtime.mutableStateOf(0f)
    /** 同上的**开关版**：点加号那一刻同步置 true。
     *  ⚠ 底部留白不能用 anchorPadDp 动画后的值判断 —— 那一帧还是 0，卡片会先坠一下（现象：的）。 */
    var anchorOn: Boolean by androidx.compose.runtime.mutableStateOf(false)
    /** 由 Compose 每帧直接写给宿主的底部内边距（px）：详情展开时三个动作必须同一个时钟推进，
     *  否则原生的 ValueAnimator 和 Compose 动画各走各的，中间会错开几帧＝卡片掉过头再回弹（果冻）。
     *  为 true 时宿主自己的 inset 监听不再插手。 */
    var padDriven: Boolean = false
    var setImePadPx: ((Int) -> Unit)? = null
    /** 点加号那一刻记下的键盘高度（px）。⚠ 不能每帧去读 imePadPx —— 键盘一收它就被写成 0，
     *  驱动循环会按 0 推内边距，卡片直接坠到底。 */
    var anchorKbPx: Int = 0
    /** 把页面底色同步给宿主窗口：底部内边距让出来的那块必须跟页面同色，
     *  否则动画中途会露出白色（Activity 窗口底色）——用户看到的那条白带。 */
    var setPageBg: ((Float, Float, Float) -> Unit)? = null
    /** 系统返回键（宿主 onBackPressed 里调）：返回 true = 共享层已经消化掉，别退 Activity。
     *  次序见 RootPage 的 handleBack：浮层 → 设置 → 记录抽屉 → 三页（两次退出）。 */
    var onBack: (() -> Boolean)? = null
    /** 真的退出应用（宿主注入 finish()）：三页上连按两次返回才调它 */
    var exitApp: (() -> Unit)? = null
    /** 震动反馈：0 = 刻度（页间滑动时八卦名切换那一格），1 = 钝感（打开记录抽屉）。
     *  宿主没实现就静默跳过（别在这里判 typeof，直接 invoke 前判 null）。 */
    var haptic: ((Int) -> Unit)? = null
    /** 是不是 lite 包（构建期 -PxlrLite=true）：不显示「断卦依据」、解卦用 SYS_LITE */
    var lite: Boolean = false
    /** 写一个文件到「下载/道家小六壬/」，返回给用户看的路径（失败 null） */
    var saveFile: ((String, String) -> String?)? = null
    /** 让用户挑一个文本文件来读；读到内容（或 null）后回调 —— 旧数据导入用 */
    var pickText: (((String?) -> Unit) -> Unit)? = null
    /** 打开系统浏览器（引导里那条智谱链接，早先那一版是 <a target=_blank>） */
    var openUrl: ((String) -> Unit)? = null
    /** 本应用包名 / versionCode（app 内更新比的是 versionCode，旧 updateCore.js 同口径） */
    var pkgName: String? = null
    var versionCode: Int = 0
    /** 拉更新清单、取本包那一条（没有该包 ⇒ null；出错抛异常） */
    var updCheck: (() -> UpdItem?)? = null
    /** 下 APK 到私有缓存，返回本地路径（出错抛异常） */
    var updDownload: ((String, String) -> String)? = null
    /** 把下好的 APK 交系统安装器 */
    var updInstall: ((String) -> Unit)? = null
}

/** 更新清单里的一条（只取用得到的字段） */
class UpdItem(
    val versionName: String = "",
    val versionCode: Int = 0,
    val url: String = "",
    val sha256: String = "",
)

/** 流式请求的当前快照：已收到的正文 / 是否结束 / 错误（空串表示没出错） */
class StreamSnap(val text: String, val done: Boolean, val err: String)

internal data class LlmCfg(
    var wire: String = "direct",
    var base: String = "https://api.deepseek.com",
    var model: String = "deepseek-chat",
    var key: String = "",
    var temp: Double = 0.5,
    var proxy: String = "http://127.0.0.1:8080",
)

internal data class Prov(
    val k: String,
    val n: String,
    val base: String,
    val model: String,
    val note: String,
    val url: String = "",
)

/* 旧 PROVS 原表（顺序与文案逐字不动；"自定义"那一项在 UI 里落到「自己填地址」） */
internal val PROVS = listOf(
    Prov("deepseek", "DeepSeek", "https://api.deepseek.com", "deepseek-chat",
        "便宜、稳，实测可直接连", "https://platform.deepseek.com/api_keys"),
    Prov("zhipu", "智谱 GLM", "https://open.bigmodel.cn/api/paas/v4", "glm-5.3-flash",
        "新号送 2000 万 tokens · 推荐先试", "https://open.bigmodel.cn/login"),
    Prov("silicon", "硅基流动", "https://api.siliconflow.cn/v1", "deepseek-ai/DeepSeek-V3",
        "模型多、常有赠额", "https://cloud.siliconflow.cn/account/ak"),
    Prov("kimi", "Kimi（月之暗面）", "https://api.moonshot.cn/v1", "moonshot-v1-8k",
        "长文写作强", "https://platform.moonshot.cn/console/api-keys"),
    Prov("openai", "OpenAI", "https://api.openai.com/v1", "gpt-4o-mini",
        "要能访问外网", "https://platform.openai.com/api-keys"),
    Prov("minimax", "MiniMax", "https://api.minimax.cn/v1", "MiniMax-M3.1-Flash",
        "长文与角色扮演强", "https://platform.minimax.cn/user-center"),
    Prov("gemini", "Gemini", "https://generativelanguage.googleapis.com/v1beta/openai", "gemini-2.5-flash",
        "要能访问外网", "https://aistudio.google.com/app/apikey"),
)

internal object LlmStore {
    private const val K_BASE = "llm.base"
    private const val K_MODEL = "llm.model"
    private const val K_KEY = "llm.key"
    private const val K_WIRE = "llm.wire"
    private const val K_TEMP = "llm.temp"
    private const val K_PROXY = "llm.proxy"

    fun load(): LlmCfg {
        val d = LlmCfg()
        val g = Platform.get ?: return d
        return LlmCfg(
            wire = g(K_WIRE) ?: d.wire,
            base = g(K_BASE) ?: d.base,
            model = g(K_MODEL) ?: d.model,
            key = g(K_KEY) ?: d.key,
            temp = g(K_TEMP)?.toDoubleOrNull() ?: d.temp,
            proxy = g(K_PROXY)?.ifEmpty { null } ?: d.proxy,
        )
    }

    fun save(c: LlmCfg) {
        val p = Platform.put ?: return
        p(K_BASE, c.base)
        p(K_MODEL, c.model)
        p(K_KEY, c.key)
        p(K_WIRE, c.wire)
        p(K_TEMP, c.temp.toString())
        p(K_PROXY, c.proxy)
    }

    fun clear() {
        val p = Platform.put ?: return
        listOf(K_BASE, K_MODEL, K_KEY, K_WIRE, K_TEMP, K_PROXY).forEach { p(it, "") }
    }

    /* ---------- 自定义服务商（旧 SettingsScreen 的 #stCustomGo / prov-del） ----------
       早先那一版两个键：`xlr-customs` = [{k,n}]、`xlr-svcs` = {k:{base,model,key}}。
       K 侧把 svcs 也摊成**扁平对象数组** [{k,base,model,key}] —— 共享层只有 JsonLite（扁平表），
       嵌套对象读不了；键名沿用，内容语义一致。 */
    private const val K_CUSTOMS = "xlr-customs"
    private const val K_SVCS = "xlr-svcs"

    fun customs(): MutableList<com.xlr.k.judge.Rec> =
        com.xlr.k.judge.parseRows(Platform.get?.invoke(K_CUSTOMS))

    fun saveCustoms(a: List<com.xlr.k.judge.Rec>) {
        Platform.put?.invoke(K_CUSTOMS, com.xlr.k.judge.dumpRows(a))
    }

    fun svcs(): MutableList<com.xlr.k.judge.Rec> =
        com.xlr.k.judge.parseRows(Platform.get?.invoke(K_SVCS))

    fun svcOf(k: String): com.xlr.k.judge.Rec? = svcs().firstOrNull { it["k"] == k }

    /** 保存时把当前这家（自定义的才有 k）的地址/模型/Key 一起记下来 */
    fun upsertSvc(k: String, base: String, model: String, key: String) {
        if (k.isEmpty()) return
        val a = svcs()
        var hit = false
        for (r in a) if (r["k"] == k) {
            r["base"] = base
            r["model"] = model
            r["key"] = key
            hit = true
        }
        if (!hit) {
            a.add(mutableMapOf("k" to k, "base" to base, "model" to model, "key" to key))
        }
        Platform.put?.invoke(K_SVCS, com.xlr.k.judge.dumpRows(a))
    }

    fun addCustom(name: String): String {
        val a = customs()
        val k = "c" + kotlinx.datetime.Clock.System.now().toEpochMilliseconds()
        a.add(mutableMapOf("k" to k, "n" to name))
        saveCustoms(a)
        return k
    }

    fun delCustom(k: String) {
        saveCustoms(customs().filter { it["k"] != k })
        Platform.put?.invoke(K_SVCS, com.xlr.k.judge.dumpRows(svcs().filter { it["k"] != k }))
    }

    /** 当前草稿对应哪一家自定义的 k（按地址认；认不出就空串 = 不是自定义的） */
    fun customKeyOf(base: String): String {
        val b = base.trim().trimEnd('/')
        for (c in customs()) {
            val k = c["k"] ?: ""
            val sv = svcOf(k) ?: continue
            if ((sv["base"] ?: "").trim().trimEnd('/') == b && b.isNotEmpty()) return k
        }
        return ""
    }

    /** 旧 missing()：逐字照抄（补了「本地中转」那一支） */
    fun missing(c: LlmCfg): String {
        if (c.base.isEmpty()) return "还没选服务商，接口地址是空的。"
        if (c.model.isEmpty()) return "还没挑模型。"
        if (c.wire == "direct" && c.key.isEmpty() &&
            !Regex("localhost|127\\.0\\.0\\.1").containsMatchIn(c.base)
        ) return "直连需要 API Key。"
        if (c.wire == "proxy" && c.proxy.isEmpty()) return "选了本地中转，但中转地址是空的。"
        return ""
    }
}

/* ---------- 地址 / 头 / 正文：逐条照抄旧 llmEndpoint.js ---------- */

internal data class Ep(val url: String, val anth: Boolean, val proxy: Boolean)

internal fun isAnth(base: String): Boolean =
    Regex("/anthropic(/|$)", RegexOption.IGNORE_CASE).containsMatchIn(base)

internal fun endpointOf(c: LlmCfg): Ep {
    if (c.wire == "proxy") return Ep(c.proxy.trimEnd('/') + "/proxy", false, true)
    val base = c.base.trimEnd('/')
    val a = isAnth(base)
    return Ep(base + if (a) "/v1/messages" else "/chat/completions", a, false)
}

internal fun headersOf(c: LlmCfg, ep: Ep): Map<String, String> {
    val h = mutableMapOf("Content-Type" to "application/json")
    if (ep.proxy) return h                       /* 本地中转：key 在正文里，不放头 */
    if (ep.anth) {
        h["x-api-key"] = c.key
        h["Authorization"] = "Bearer " + c.key
        h["anthropic-version"] = "2023-06-01"
        return h
    }
    h["Authorization"] = "Bearer " + c.key
    return h
}

/* ---------- JSON 小工具（只用来拼请求体，不做通用序列化） ---------- */
internal fun jstr(s: String): String = buildString {
    append('"')
    for (ch in s) {
        when (ch) {
            '"' -> append("\\\"")
            '\\' -> append("\\\\")
            '\n' -> append("\\n")
            '\r' -> append("\\r")
            '\t' -> append("\\t")
            else -> if (ch.code < 32) append(' ') else append(ch)
        }
    }
    append('"')
}

/* ⚠ 早先那一版 OpenAI 那套**不加** max_tokens（各家上限不一，写大了直接报错）；Anthropic 必填。
   ⚠ 温度 Anthropic 只收 0–1，要夹。 */
internal fun payloadOf(c: LlmCfg, sys: String, user: String, stream: Boolean = false): String {
    val anth = isAnth(c.base)
    val st = if (stream) "true" else "false"
    val body = if (anth) {
        val t = c.temp.coerceIn(0.0, 1.0)
        "{\"model\":" + jstr(c.model) +
            ",\"messages\":[{\"role\":\"user\",\"content\":" + jstr(user) + "}]" +
            ",\"stream\":" + st + ",\"max_tokens\":4096,\"system\":" + jstr(sys) +
            ",\"temperature\":" + t + "}"
    } else {
        "{\"model\":" + jstr(c.model) +
            ",\"messages\":[{\"role\":\"system\",\"content\":" + jstr(sys) +
            "},{\"role\":\"user\",\"content\":" + jstr(user) + "}]" +
            ",\"temperature\":" + c.temp + ",\"stream\":" + st + "}"
    }
    return if (c.wire == "proxy") {
        "{\"base\":" + jstr(c.base) + ",\"key\":" + jstr(c.key) + ",\"payload\":" + body + "}"
    } else body
}

/** 发出去解一卦（非流式：等全文回来一次性渲染） */
internal suspend fun askModel(c: LlmCfg, sys: String, user: String): String {
    val f = Platform.chat ?: throw IllegalStateException("网络层没接上。")
    val ep = endpointOf(c)
    return withContext(Dispatchers.Default) { f(ep.url, headersOf(c, ep), payloadOf(c, sys, user)) }
}

/** 流式解卦：每收到一段就回调 onText（已累计的全文）。
    ⚠ 早先那一版就是这个行为（SSE 增量）；宿主负责读流、把增量拼进缓冲区，这边只轮询缓冲区。 */
internal suspend fun askModelStream(
    c: LlmCfg,
    sys: String,
    user: String,
    onText: (String) -> Unit,
): String {
    val start = Platform.streamStart ?: return askModel(c, sys, user)
    val read = Platform.streamRead ?: return askModel(c, sys, user)
    val ep = endpointOf(c)
    val h = withContext(Dispatchers.Default) {
        start(ep.url, headersOf(c, ep), payloadOf(c, sys, user, stream = true))
    }
    var last = ""
    while (true) {
        delay(110)
        val s = withContext(Dispatchers.Default) { read(h) }
        if (s.text != last) {
            last = s.text
            onText(last)
        }
        if (s.err.isNotEmpty()) throw RuntimeException(s.err)
        if (s.done) {
            if (s.text.isNotEmpty()) onText(s.text)
            return s.text
        }
    }
}

/* ---------- 拉取可用模型（旧 SettingsScreen 的 pull()，同一条路） ---------- */

/* 内置常用清单：拉不到实时列表时给用户挑（旧 settingsCore.FALLBACK 逐字） */
internal val FALLBACK = mapOf(
    "deepseek" to listOf("deepseek-chat", "deepseek-reasoner"),
    "zhipu" to listOf("glm-5.3-flash", "glm-5.3-flashx", "glm-5.3"),
    "silicon" to listOf("deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-7B-Instruct", "THUDM/glm-4-9b-chat"),
    "kimi" to listOf("moonshot-v1-8k", "moonshot-v1-32k", "kimi-latest"),
    "openai" to listOf("gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"),
    "minimax" to listOf("MiniMax-M3.1-Flash", "MiniMax-M3.1", "MiniMax-Text-01", "abab6.5s-chat"),
    "gemini" to listOf("gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"),
)

internal fun guessProv(base: String): String {
    val b = base.lowercase()
    for (p in PROVS) {
        val pb = p.base.lowercase()
        val host = pb.removePrefix("https://").removePrefix("http://")
        if (pb.isNotEmpty() && b.isNotEmpty() && (b == pb || b.contains(host))) return p.k
    }
    return "custom"
}

internal fun isLocalBase(b: String): Boolean =
    Regex("localhost|127\\.0\\.0\\.1").containsMatchIn(b)

/** 拉这家的模型清单：GET <base>/models（走本地中转时也让中转代拉） */
internal suspend fun pullModels(c: LlmCfg): List<String> {
    val f = Platform.list ?: throw IllegalStateException("网络层没接上。")
    val base = c.base.trimEnd('/')
    val url = if (c.wire == "proxy") c.proxy.trimEnd('/') + "/proxy" else base + "/models"
    val h = headersOf(c, Ep(url, false, c.wire == "proxy"))
    return withContext(Dispatchers.Default) { f(url, h) }
}
