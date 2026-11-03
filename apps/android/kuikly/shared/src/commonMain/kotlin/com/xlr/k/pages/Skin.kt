package com.xlr.k.pages

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.Composable
import com.tencent.kuikly.compose.foundation.Canvas
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.border
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.fillMaxWidth
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.foundation.layout.size
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.draw.clip
import com.tencent.kuikly.compose.ui.draw.drawBehind
import com.tencent.kuikly.compose.ui.geometry.Offset
import com.tencent.kuikly.compose.ui.graphics.Brush
import com.tencent.kuikly.compose.ui.graphics.drawscope.DrawScope
import com.tencent.kuikly.compose.ui.unit.dp
import com.tencent.kuikly.compose.ui.graphics.Color

/* 皮肤九套 + 日夜（口径：：「皮肤九套，包括还有昼夜切换也得加」）

   真源 = 手机端网页版 `apps/mobile-web/src/styles/legacy.css` L681-816 的
   `html[data-skin="…"]` 变量块，一套一套逐字抄过来；名字与副标题照
   `apps/mobile-web/src/data/skinsCore.js` 的 SKINS 表。

   日夜口径也照旧（`src/data/globals.js` 的 toggleDayNight）：
     · 早先那一版**不是**给每套皮肤做一份深色值，而是「切到夜＝切到深色那套皮肤」——
       DARKSKIN = { hei:1, mg:1 }；点亮时回到上一次的浅色皮肤（localStorage `xlr-skin-prevlight`）。
     · 顶栏那颗太阳/月亮按钮就是干这个的（早先那一版 #btnDN）。
   ⇒ K 端同样：`toggleDayNight()` 在 {hei, mg} 与「上一次浅色皮肤」之间来回，不去改每套皮肤的值。 */

class SkinDef(
    val key: String,
    val name: String,
    val tag: String,
    val dark: Boolean,
    val bg: Color,
    val surface: Color,
    val surface2: Color,
    val ink: Color,
    val dim: Color,
    val dim2: Color,
    val line: Color,
    val line2: Color,
    val accent: Color,
    val onAccent: Color,
    val accentBg: Color,
    val accentBg2: Color,
    val accentLine: Color,
    val jyc: Color,
    val ok: Color,
    val warn: Color,
    val bad: Color,
)

private fun c(hex: Long): Color = Color(0xFF000000L or hex)
private fun rgba(r: Int, g: Int, b: Int, a: Float): Color = Color(r / 255f, g / 255f, b / 255f, a)

/** 九套皮肤（顺序照早先那一版菜单：黑白 / 黑夜 / 梦幻 / 宣纸 / 青瓷 / 豆沙 / 卡通 / 敦煌 / 莫高窟） */
internal val SKINS: List<SkinDef> = listOf(
    /* 黑白 —— 只有黑白灰，一个色相都不要（默认皮肤） */
    SkinDef(
        "bw", "黑白", "浅 · 无色相", false,
        bg = c(0xEFEFEF), surface = c(0xFFFFFF), surface2 = c(0xECECEE),
        ink = c(0x0B0B0C), dim = c(0x3F3F46), dim2 = c(0x6A6A72),
        line = rgba(11, 11, 12, 0.13f), line2 = rgba(11, 11, 12, 0.30f),
        accent = c(0x0F1013), onAccent = c(0xFFFEFA),
        accentBg = rgba(15, 16, 19, 0.06f), accentBg2 = rgba(15, 16, 19, 0.12f),
        accentLine = rgba(15, 16, 19, 0.26f),
        jyc = c(0x0B0B0C), ok = c(0x0B0B0C), warn = c(0x5F5F66), bad = c(0x7A7A82),
    ),
    /* 黑夜 —— 黑白那套的深底反相 */
    SkinDef(
        "hei", "黑夜", "深 · 无色相", true,
        bg = c(0x131316), surface = c(0x1C1C21), surface2 = c(0x26262C),
        ink = c(0xEDEDF1), dim = c(0xC2C2CB), dim2 = c(0x9D9DA8),
        line = rgba(237, 237, 241, 0.14f), line2 = rgba(237, 237, 241, 0.28f),
        accent = c(0xE8E8EC), onAccent = c(0x131316),
        accentBg = rgba(232, 232, 236, 0.10f), accentBg2 = rgba(232, 232, 236, 0.20f),
        accentLine = rgba(232, 232, 236, 0.32f),
        jyc = c(0xEDEDF1), ok = c(0xF2F2F5), warn = c(0xA9A9B3), bad = c(0x8B8B95),
    ),
    /* 梦幻：月白底，雾粉 / 薰衣草紫 / 浅蓝。功能状态色不参与背景染色。 */
    SkinDef(
        "glass", "梦幻", "浅 · 流光", false,
        bg = c(0xF7F5FB), surface = rgba(255, 255, 255, 0.60f), surface2 = rgba(255, 255, 255, 0.36f),
        ink = c(0x151A24), dim = c(0x454C5E), dim2 = c(0x6B7385),
        line = rgba(255, 255, 255, 0.66f), line2 = rgba(21, 26, 36, 0.16f),
        accent = c(0x7766AE), onAccent = c(0xFFFEFA),
        accentBg = rgba(119, 102, 174, 0.08f), accentBg2 = rgba(119, 102, 174, 0.14f),
        accentLine = rgba(119, 102, 174, 0.28f),
        jyc = c(0x8B6B0B), ok = c(0x10735A), warn = c(0x8A6A12), bad = c(0xB03A34),
    ),
    /* 宣纸 */
    SkinDef(
        "xuan", "宣纸", "浅 · 朱砂", false,
        bg = c(0xF5F3EE), surface = c(0xFDFBF7), surface2 = c(0xEFECE5),
        ink = c(0x1B1A17), dim = c(0x615D55), dim2 = c(0x74706B),
        line = rgba(27, 26, 23, 0.13f), line2 = rgba(27, 26, 23, 0.26f),
        accent = c(0x9C3B28), onAccent = c(0xFFFEFA),
        accentBg = rgba(156, 59, 40, 0.07f), accentBg2 = rgba(156, 59, 40, 0.14f),
        accentLine = rgba(156, 59, 40, 0.30f),
        jyc = c(0x1A778A), ok = c(0x3D6748), warn = c(0x7D6120), bad = c(0x8F3325),
    ),
    /* 青瓷 */
    SkinDef(
        "qing", "青瓷", "浅 · 靛青", false,
        bg = c(0xEEF2F1), surface = c(0xF8FBFA), surface2 = c(0xE3EAE8),
        ink = c(0x15201E), dim = c(0x4D615E), dim2 = c(0x6B7C79),
        line = rgba(21, 32, 30, 0.13f), line2 = rgba(21, 32, 30, 0.26f),
        accent = c(0x2F6F6B), onAccent = c(0xFFFEFA),
        accentBg = rgba(47, 111, 107, 0.08f), accentBg2 = rgba(47, 111, 107, 0.16f),
        accentLine = rgba(47, 111, 107, 0.32f),
        jyc = c(0xB24B52), ok = c(0x2F6F6B), warn = c(0x8A6D1F), bad = c(0xA8433A),
    ),
    /* 豆沙 */
    SkinDef(
        "dou", "豆沙", "浅 · 陶土", false,
        bg = c(0xF6F1EA), surface = c(0xFFFCF8), surface2 = c(0xECE4D9),
        ink = c(0x2A2320), dim = c(0x6B5C53), dim2 = c(0x84766C),
        line = rgba(42, 35, 32, 0.13f), line2 = rgba(42, 35, 32, 0.26f),
        accent = c(0xA8543C), onAccent = c(0xFFFEFA),
        accentBg = rgba(168, 84, 60, 0.08f), accentBg2 = rgba(168, 84, 60, 0.16f),
        accentLine = rgba(168, 84, 60, 0.32f),
        jyc = c(0x2E778B), ok = c(0x5D6B47), warn = c(0x8A6A24), bad = c(0xA8433A),
    ),
    /* 卡通 —— 纯白底白卡 + 纯黑粗框 + 朱红 */
    SkinDef(
        "bru", "卡通", "浅 · 高对比", false,
        bg = c(0xFFFFFF), surface = c(0xFFFFFF), surface2 = c(0xE5E2DA),
        ink = c(0x0D0D0D), dim = c(0x3F3C37), dim2 = c(0x5F5C56),
        line = rgba(13, 13, 13, 0.85f), line2 = c(0x0D0D0D),
        /* 卡通的主按钮是「橙底白字」（早先那一版 .go color:#fff），不是深字 */
        accent = c(0xE8442A), onAccent = c(0xFFFFFF),
        accentBg = rgba(232, 68, 42, 0.10f), accentBg2 = rgba(232, 68, 42, 0.20f),
        accentLine = c(0x0D0D0D),
        jyc = c(0x1A7A89), ok = c(0x0D0D0D), warn = c(0x0D0D0D), bad = c(0xE8442A),
    ),
    /* 敦煌：暖粉白壁面，赭红主色，石绿 / 石青呼应（界面转译色）。 */
    SkinDef(
        "dh", "敦煌", "浅 · 壁上丹青", false,
        bg = c(0xF5EEE8), surface = c(0xFCF7F2), surface2 = c(0xEADDD3),
        ink = c(0x342922), dim = c(0x6E5B50), dim2 = c(0x817064),
        line = rgba(58, 42, 28, 0.15f), line2 = rgba(58, 42, 28, 0.30f),
        accent = c(0x914F40), onAccent = c(0xFFFEFA),
        accentBg = rgba(145, 79, 64, 0.07f), accentBg2 = rgba(145, 79, 64, 0.15f),
        accentLine = rgba(145, 79, 64, 0.34f),
        jyc = c(0x3C647B), ok = c(0x467568), warn = c(0x86672E), bad = c(0xA8322B),
    ),
    /* 莫高窟：回到原版提灯入窟（暖褐壁 + 金 + 群青）。
       仅略提次级文字明度，保留最初的配色关系。 */
    SkinDef(
        "mg", "莫高窟", "深 · 提灯入窟", true,
        bg = c(0x2A1A12), surface = c(0x3A2A1E), surface2 = c(0x4A3422),
        ink = c(0xF2E6D0), dim = c(0xC8B496), dim2 = c(0xAF997A),
        line = rgba(242, 230, 208, 0.14f), line2 = rgba(242, 230, 208, 0.28f),
        accent = c(0xE5B751), onAccent = c(0x131316),
        accentBg = rgba(229, 183, 81, 0.10f), accentBg2 = rgba(229, 183, 81, 0.20f),
        accentLine = rgba(229, 183, 81, 0.38f),
        jyc = c(0x87A3E4), ok = c(0x57C3C2), warn = c(0xE5B751), bad = c(0xC0554A),
    ),
)

/** 深色那一侧（早先那一版 DARKSKIN = {hei:1, mg:1}） */
private val DARK_SKINS = setOf("hei", "mg")

private const val KEY_SKIN = "K_SKIN"
private const val KEY_PREV_LIGHT = "K_SKIN_PREVLIGHT"
private const val KEY_FOG_LEVEL = "K_FOG_LEVEL"
private const val KEY_FOG_FROZEN = "K_FOG_FROZEN"

/** 宿主在创建 Kuikly 视图前调一次：把皮肤与雾开关从本地读回来。
 *  皮肤原先只在 RootPage 组合时 Skin.load()，第一帧已经用默认 bw 画完了，
 *  冷启动会闪一帧黑白。 */
fun preloadSkinForHost() { Skin.load() }

internal object Skin {
    /** 当前皮肤 key */
    var cur by mutableStateOf("bw")
        private set

    // 0: pre-generated still, 1: moving PNG, 2: realtime (where supported).
    var fogLevel by mutableStateOf(0)
        private set

    fun updateFogLevel(level: Int) {
        fogLevel = level.coerceIn(0, 2)
        Platform.put?.invoke(KEY_FOG_LEVEL, fogLevel.toString())
    }

    private var pngFrozen by mutableStateOf(false)
    private var realtimeFrozen by mutableStateOf(false)
    val fogFrozen: Boolean get() = isFogFrozen(fogLevel)

    fun isFogFrozen(level: Int): Boolean = when (level) {
        1 -> pngFrozen
        2 -> realtimeFrozen
        else -> false
    }

    fun toggleFogFrozen(level: Int) {
        if (level !in 1..2) return
        val frozen = !isFogFrozen(level)
        if (level == 1) pngFrozen = frozen else realtimeFrozen = frozen
        Platform.put?.invoke("${KEY_FOG_FROZEN}_$level", frozen.toString())
    }

    fun fogPngPhase(skin: String): Float =
        Platform.get?.invoke("K_FOG_PHASE_$skin")?.toFloatOrNull()?.coerceIn(0f, 1f) ?: 0f

    fun saveFogPngPhase(skin: String, phase: Float) {
        Platform.put?.invoke("K_FOG_PHASE_$skin", phase.toString())
    }

    val def: SkinDef get() = SKINS.firstOrNull { it.key == cur } ?: SKINS[0]
    val dark: Boolean get() = def.dark

    /** 从本地读回来（App 启动时调一次） */
    fun load() {
        pngFrozen = Platform.get?.invoke("${KEY_FOG_FROZEN}_1") == "true"
        realtimeFrozen = Platform.get?.invoke("${KEY_FOG_FROZEN}_2") == "true"
        fogLevel = Platform.get?.invoke(KEY_FOG_LEVEL)?.toIntOrNull()?.coerceIn(0, 2) ?: 0
        val k = Platform.get?.invoke(KEY_SKIN)
        if (k != null && SKINS.any { it.key == k }) cur = k
        val p = Platform.get?.invoke(KEY_PREV_LIGHT)
        if (p != null && SKINS.any { it.key == p } && !DARK_SKINS.contains(p)) prevLight = p
    }

    private var prevLight by mutableStateOf("xuan")

    /** 换肤：点一下立刻生效，并记住 */
    fun apply(k: String) {
        if (!SKINS.any { it.key == k }) return
        cur = k
        if (!DARK_SKINS.contains(k)) prevLight = k
        Platform.put?.invoke(KEY_SKIN, k)
        if (!DARK_SKINS.contains(k)) Platform.put?.invoke(KEY_PREV_LIGHT, k)
    }

    /** 顶栏那颗太阳/月亮（早先那一版 #btnDN / toggleDayNight）：
     *  当前是深色套 ⇒ 回到上次的浅色套；否则 ⇒ 切到黑夜 */
    fun toggleDayNight() {
        if (DARK_SKINS.contains(cur)) {
            var back = prevLight
            if (DARK_SKINS.contains(back)) back = "xuan"
            apply(back)
        } else {
            apply("hei")
        }
    }
}

/** 半透明白（卡片底 / 淡边）——改成「按皮肤表面色上色」：
 *  浅色皮肤＝那套的 surface（宣纸是暖白、敦煌是石膏白、梦幻本来就半透明），
 *  深色皮肤＝很淡的白，否则在深底上整块发白。
 *  所有 `Color(1f, 1f, 1f, a)` 都改走这里（22 处），边框另走 KY_CARD_LINE。 */
internal fun veil(a: Float): Color =
    if (Skin.dark) Color(1f, 1f, 1f, (a * 0.30f).coerceAtMost(0.24f))
    else Skin.def.surface.let { c -> Color(c.red, c.green, c.blue, a.coerceAtMost(1f)) }

/** 卡片 / 胶囊的描边：浅色皮肤是淡淡一道墨，深色皮肤是淡淡一道白（早先那一版 --line2） */
internal val KY_CARD_LINE: Color get() = Skin.def.line2

/* ---------- 皮肤「造型」三件（用户：「卡通这个皮肤和黑白没啥区别了…原本想的是
   那种粗线条、橙色点缀的手绘风格」）----------
   早先那一版卡通(bru)在 legacy.css L842-871 另有一整套「系统级加强」：
     卡片 2px 实黑边 + 5px 5px 0 硬阴影、主按钮 2px 黑边 + 朱红底 + 800 字重、
     输入框 2px 黑边、顶栏压成黑板 + 朱砂底线。
   这里给 Skin 加三个造型参数，各页面只认参数 ⇒ 卡通一换就整套变，不再和黑白撞脸。 */
internal val Skin.borderW: com.tencent.kuikly.compose.ui.unit.Dp
    get() = if (cur == "bru") 2.dp else 1.dp

/** 大卡片的圆角：卡通 0（直角更手绘/漫画），其它 24 */
internal val Skin.rCard: com.tencent.kuikly.compose.ui.unit.Dp
    get() = if (cur == "bru") 0.dp else 24.dp

/** 胶囊/按钮的圆角：卡通 6（近方角），其它沿用 999 */
internal val Skin.rPill: com.tencent.kuikly.compose.ui.unit.Dp
    get() = if (cur == "bru") 6.dp else 999.dp

/** 卡通的文字/按钮要压得更粗（早先那一版 700/800） */
internal val Skin.weightBoost: Int
    get() = if (cur == "bru") 700 else 500

/** 卡片上的柔光：深色皮肤不能再用纯白（会糊成一块） */
internal val KY_GLOW: Color get() = if (Skin.dark) Color(1f, 1f, 1f, 0.10f) else Color.White

/* 统一柔边雾团背景：换肤时重建，避免旧纹理或动画状态残留。 */
@Composable
internal fun SkinBackdropLayer() {
    val skinKey = Skin.cur
    androidx.compose.runtime.key(skinKey) {
        SkinFogBackdrop(skinKey)
    }
}

/* 宣纸：极淡断续帘纹 + 短纤维 + 微小纸屑。固定种子，不随雾气移动。
 * 尺寸按 dp 换算，避免高密度屏上变成刮痕或横格纸。
 */
internal fun DrawScope.paperGrain(ink: Color, white: Color, w: Float, h: Float) {
    var seed = 0x5DEECE66DL
    fun rnd(): Float {
        seed = (seed * 6364136223846793005L + 1442695040888963407L) and 0x7FFFFFFFFFFFFFFFL
        // Positive 63-bit state: shift by 32 yields 31 bits spanning the entire [0,1) range.
        return ((seed ushr 32) and 0x7FFFFFFF).toFloat() / 2147483648f
    }
    val u = density
    val area = (w / u) * (h / u)

    // The laid impression stays faint and broken, without full-width ruled lines.
    var y = rnd() * 10f * u
    while (y < h) {
        var x = -rnd() * 45f * u
        while (x < w) {
            val length = (14f + rnd() * 40f) * u
            val yy = y + (rnd() - 0.5f) * 1.2f * u
            drawLine(ink.copy(alpha = 0.007f + rnd() * 0.006f),
                Offset(x, yy), Offset(x + length, yy + (rnd() - 0.5f) * 0.3f * u),
                strokeWidth = 0.24f * u)
            x += length + (5f + rnd() * 19f) * u
        }
        y += (9f + rnd() * 3f) * u
    }

    // Short, gently bent fibers, scattered over the full sheet instead of long scratches.
    repeat((area / 640f).toInt().coerceIn(150, 850)) {
        val x = rnd() * w
        val yy = rnd() * h
        val length = (2f + rnd() * 11f) * u
        val rise = (rnd() - 0.5f) * 5f * u
        val mid = Offset(x + length * 0.48f, yy + rise * 0.35f + (rnd() - 0.5f) * u)
        val color = ink.copy(alpha = 0.022f + rnd() * 0.024f)
        val width = (0.20f + rnd() * 0.16f) * u
        drawLine(color, Offset(x, yy), mid, strokeWidth = width)
        drawLine(color.copy(alpha = color.alpha * 0.65f), mid,
            Offset(x + length, yy + rise), strokeWidth = width * 0.75f)
    }

    // Small inclusions add a soft paper tooth; no large dark speckles.
    repeat((area / 185f).toInt().coerceIn(500, 2600)) {
        drawCircle(ink.copy(alpha = 0.024f + rnd() * 0.030f),
            radius = (0.16f + rnd() * 0.25f) * u,
            center = Offset(rnd() * w, rnd() * h))
    }
    // Pale fibers and flecks break up dark specks into a paper surface.
    repeat((area / 320f).toInt().coerceIn(300, 1800)) {
        drawCircle(white.copy(alpha = 0.16f + rnd() * 0.18f),
            radius = (0.20f + rnd() * 0.28f) * u,
            center = Offset(rnd() * w, rnd() * h))
    }
    repeat((area / 1600f).toInt().coerceIn(80, 350)) {
        val x = rnd() * w
        val yy = rnd() * h
        drawLine(white.copy(alpha = 0.06f + rnd() * 0.04f),
            Offset(x, yy), Offset(x + (2f + rnd() * 7f) * u, yy + (rnd() - 0.5f) * 2f * u),
            strokeWidth = (0.20f + rnd() * 0.16f) * u)
    }
}

private fun DrawScope.backdropGlow(
    fx: Float,
    fy: Float,
    r: Float,
    c: Color,
    a: Float,
    invert: Boolean = false,
) {
    val cx = size.width * fx
    val cy = size.height * fy
    if (!invert) {
        /* 一团柔光 = 一道朝画面中央扫过去的线性渐变（见 softGlow 头注） */
        softGlow(cx, cy, r, c, a, 40)
    } else {
        /* 暗角：上下各压一道，中间不动（旧的同心圆写法同样会被 8bit 归零，改成竖向渐变） */
        drawRect(
            Brush.verticalGradient(
                colorStops = arrayOf(
                    0f to c.copy(alpha = a),
                    0.38f to c.copy(alpha = 0f),
                    0.62f to c.copy(alpha = 0f),
                    1f to c.copy(alpha = a),
                )
            )
        )
    }
}

/** 颜色混色（CSS color-mix 的近似）：t=0 取 a，t=1 取 b */
private fun mixc(a: Color, b: Color, t: Float): Color = Color(
    a.red + (b.red - a.red) * t,
    a.green + (b.green - a.green) * t,
    a.blue + (b.blue - a.blue) * t,
    a.alpha + (b.alpha - a.alpha) * t,
)

/* 皮肤小样

   早先那一版菜单那颗是 12px 的纯色方块（.skinmenu .sw）+ 一个纯色小点，干、呆、跟界面没关系。
   这里改成一张**迷你卡**：底色 → 里面一张卡（surface）→ 底下一条强调色小条（就是主按钮的颜色），
   一眼能看出这套皮肤「底 / 卡 / 主色」三件，尺寸 18×22，跟设置里那套圆角/描边同一语言。 */
@Composable
internal fun SkinSwatch(d: SkinDef, w: com.tencent.kuikly.compose.ui.unit.Dp = 18.dp, h: com.tencent.kuikly.compose.ui.unit.Dp = 22.dp) {
    Box(
        modifier = Modifier
            .size(w, h)
            .clip(RoundedCornerShape(5.dp))
            .background(d.bg)
            .border(Skin.borderW, d.line2, RoundedCornerShape(5.dp))
            .padding(2.5.dp),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            /* 里面那张卡 */
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .clip(RoundedCornerShape(2.dp))
                    .background(d.surface)
                    .border(0.5.dp, d.line, RoundedCornerShape(2.dp))
            )
            Spacer(modifier = Modifier.height(2.dp))
            /* 主按钮那条 */
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .clip(RoundedCornerShape(1.5.dp))
                    .background(d.accent)
            )
        }
    }
}

/* 材质试版：仅绘制，不改测量、圆角或触摸区域。大面保持平整，亮度变化集中于边缘。 */
internal val glassFill: Color get() {
    val d = Skin.def
    val a = when (Skin.cur) {
        "glass" -> 0.27f
        "bw" -> 0.38f
        "hei" -> 0.58f
        "mg" -> 0.70f
        "xuan" -> 0.66f
        "qing" -> 0.52f
        "dou" -> 0.60f
        "dh" -> 0.64f
        else -> 1f
    }
    return d.surface.copy(alpha = a)
}
internal val glassEdge: Color get() = when {
    Skin.cur == "bru" -> Skin.def.ink
    Skin.cur == "hei" -> Skin.def.ink.copy(alpha = 0.16f)
    Skin.cur == "glass" -> Color.White.copy(alpha = 0.82f)
    Skin.cur == "bw" -> Color.White.copy(alpha = 0.62f)
    Skin.dark -> Skin.def.ink.copy(alpha = 0.20f)
    else -> Color.White.copy(alpha = 0.72f)
}

private data class GlassLight(val top: Float, val side: Float, val bottom: Float, val tint: Float)

internal fun Modifier.glassMaterial(
    shape: com.tencent.kuikly.compose.ui.graphics.Shape,
    drawer: Boolean = false,
    pressed: Float = 0f,
    control: Boolean = false,
    primary: Boolean = false,
    popup: Boolean = false,
): Modifier {
    val d = Skin.def
    if (Skin.cur == "bru") return background(if (primary) d.accent else d.surface).border(Skin.borderW, d.ink, shape)
    // 抽屉用不透明的磨砂近似，避免背景文字穿透；不冒充实时背景模糊。
    if (drawer) return background(d.surface.copy(alpha = 1f))
        .background(Brush.horizontalGradient(
            0f to d.ink.copy(alpha = 0.025f),
            0.80f to Color.Transparent,
            1f to d.ink.copy(alpha = 0.055f),
        ))
        .border(Skin.borderW, glassEdge.copy(alpha = if (Skin.dark) 0.18f else 0.50f), shape)
    /* ：
       Kuikly 没有实时背景模糊（backdrop-filter 那套在这里不存在），"透"这个观感没法靠模糊解决，
       只能把面做实。所以 popup 单独走这条：面用**不透明的 surface**（不是灰、不是 surface2），
       玻璃感交给顶部 rim 高光 + 白色内描边 + 底部淡暗边 —— 面不透字，边还在发亮。
       别再用 surface2 / d.bg 调深色调。 */
    if (popup) {
        val rimP = if (Skin.dark) d.ink else Color.White
        /* ⚠ 另一条踩过的坑（留着备用）：`background(Color)` 不吃带 alpha 的纯色
           （实测 0.96/0.985 都等于没画，菜单区显示的是被遮罩压过的背景 208）。
           以后真要做半透面，必须走 Brush 渐变，别用 background(Color.copy(alpha=…))。 */
        /* 面回到**不透明的 surface**——菜单不透字，玻璃感靠 rim 高光 + 白内描边 + 底部淡暗边。
           半透档（0.90/0.94）在深色皮肤上与列表只差十几级，看着就是没有面板。 */
        return background(d.surface)
            .background(Brush.verticalGradient(
                0f to rimP.copy(alpha = 0.62f),
                0.012f to rimP.copy(alpha = 0.08f),
                0.045f to Color.Transparent,
                0.94f to Color.Transparent,
                0.99f to d.ink.copy(alpha = 0.04f),
                1f to d.ink.copy(alpha = 0.13f),
            ))
            .border(Skin.borderW, glassEdge, shape)
    }
    val profile = when (Skin.cur) {
        "bw" -> GlassLight(0.48f, 0.15f, 0.055f, 0.045f)
        "hei" -> GlassLight(0.30f, 0.12f, 0.035f, 0.035f)
        "glass" -> GlassLight(0.68f, 0.24f, 0.055f, 0.07f)
        else -> GlassLight(0.64f, 0.26f, 0.12f, 0.12f)
    }
    // 小控件比阅读卡片稍凝实；深色控件用深底而非白雾。
    val face = when {
        primary -> d.accent.copy(alpha = 0.92f)
        control -> glassFill.copy(alpha = (glassFill.alpha + 0.12f).coerceAtMost(1f))
        else -> glassFill
    }
    // 面保持平；光学厚度只放在上下边缘，不铺大面积球面明暗。
    val rim = if (Skin.dark) d.ink else Color.White
    return background(face)
        .background(d.accent.copy(alpha = 0.085f * pressed))
        .background(Brush.verticalGradient(
            0f to rim.copy(alpha = (profile.top + 0.18f * pressed).coerceAtMost(1f)),
            0.012f to rim.copy(alpha = profile.top * 0.12f),
            0.045f to Color.Transparent,
            0.94f to Color.Transparent,
            0.99f to d.ink.copy(alpha = profile.bottom * 0.35f),
            1f to d.ink.copy(alpha = profile.bottom),
        ))
        .background(Brush.horizontalGradient(
            0f to rim.copy(alpha = profile.side),
            0.025f to Color.Transparent,
            0.975f to Color.Transparent,
            1f to d.accent.copy(alpha = profile.tint),
        ))
        .border(Skin.borderW, glassEdge, shape)
}
