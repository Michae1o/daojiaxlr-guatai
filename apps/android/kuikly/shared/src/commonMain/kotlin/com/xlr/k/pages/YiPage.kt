package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import com.tencent.kuikly.compose.foundation.Canvas
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.fillMaxWidth
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.draw.clipToBounds
import androidx.compose.runtime.getValue
import com.tencent.kuikly.compose.animation.core.animateFloatAsState
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.ui.geometry.Offset
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.unit.dp
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/* 壹页 · 问卦首屏（黑白皮肤）
 *
 * 数值取自参照物（393×877 dp）：
 *   问候   fs30/600 衬线 字距2.4 行高42.6；副标题 fs13.5 字距1.89 距上9
 *   起卦卡 22~371（宽349），圆角24，边白.55；内边距 16，
 *          占位文字 fs16 lh27.2 单行，补充背景 fs14，
 *          方式胶囊 40 高（内 2dp、键 5×11、fs12.5），事类胶囊 96×34，起卦钮 42×42 圆。
 * 已知差异：没有 backdrop-filter（毛玻璃用半透明叠色代替）；柔光用同心圆叠（框架无圆形渐变）。
 */

/* 这些颜色从「常量」改成「读当前皮肤」——名字不变，所有调用处一行不用改，
   换肤时自动跟着重组（皮肤表在 Skin.kt，值逐字抄自手机端 legacy.css 的 data-skin 各块）。 */
internal val KY_INK: Color get() = Skin.def.ink
internal val KY_DIM: Color get() = Skin.def.dim
internal val KY_DIM2: Color get() = Skin.def.dim2
internal val KY_BG: Color get() = Skin.def.bg
internal val KY_LINE: Color get() = Skin.def.line
/* 破坏性动作（彻底删 / 清空 / 删掉这则）用的一点朱砂：只在描边和字上，不铺整块红底 */
internal val KY_DANGER: Color get() = Skin.def.bad
internal val KY_ACCENT_BG2: Color get() = Skin.def.accentBg2
internal val KY_ACCENT_LINE: Color get() = Skin.def.accentLine
internal val KY_SURFACE: Color get() = Skin.def.surface
internal val KY_SURFACE2: Color get() = Skin.def.surface2
internal val KY_ON_ACCENT: Color get() = Skin.def.onAccent

/* 主按钮（贰页「看断辞」／叁页「让模型解卦」）上的字色。
   这两颗按钮的面在除卡通外的皮肤里都是玻璃底（渲染出来≈页面底色，截图实测：
   黑白是 #EFEFEF 上压白字、黑夜是 #131316 上压 #131316 的字，两处都沉进背景看不清），
   所以字要跟着「压在底色上的墨色」走；卡通那一支的面是实心 accent，仍用 onAccent。 */
internal val KY_PRIMARY_LABEL: Color get() = if (Skin.cur == "bru") KY_ON_ACCENT else KY_INK
internal val KY_ACCENT_BG: Color get() = Skin.def.accentBg
internal val KY_OK: Color get() = Skin.def.ok
internal val KY_WARN: Color get() = Skin.def.warn

/* 十二时辰：本名 + 别名（：「记下所有时辰的本名和别名，在该时辰随机用他们的本名和别名造句问候语」，
   并给了完整别名表：条目多少不齐，多的十几个（寅时）、少的只有一个（丑时荒鸡），照表全收）。 */
private data class Zc(val name: String, val alias: List<String>)

private val SHICHEN = listOf(
    Zc("夜半", listOf("子夜", "夜分", "中夜", "未旦", "宵分")),                                  // 子 23–01
    Zc("鸡鸣", listOf("荒鸡")),                                                                  // 丑 01–03
    Zc("平旦", listOf("平明", "旦明", "黎明", "早旦", "日旦", "昧旦", "早晨", "早朝", "昧爽", "旦日", "旦时")), // 寅 03–05
    Zc("日出", listOf("日上", "日生", "日始", "日晞", "旭日", "破晓")),                          // 卯 05–07
    Zc("食时", listOf("早食", "宴食", "蚤食")),                                                  // 辰 07–09
    Zc("隅中", listOf("日禺", "禺中")),                                                          // 巳 09–11
    Zc("日中", listOf("日正", "日午", "日高", "正午", "亭午", "日当午")),                        // 午 11–13
    Zc("日昳", listOf("日昃", "日仄", "日侧", "日跌", "日斜")),                                  // 未 13–15
    Zc("晡时", listOf("馎时", "日馎", "日稷", "夕食")),                                          // 申 15–17
    Zc("日入", listOf("日没", "日沉", "日西", "日落", "日逝", "日晏", "日旰", "日晦", "傍晚")),    // 酉 17–19
    Zc("黄昏", listOf("日夕", "日末", "日暮", "日晚", "日闇", "日堕", "日曛", "曛黄")),           // 戌 19–21
    Zc("人定", listOf("定昏", "夤夜")),                                                          // 亥 21–23
)

/* 当前小时落在哪个时辰（子=23~1 起算，每两小时一个） */
private fun zcOf(hour: Int): Zc = SHICHEN[((hour + 1) / 2) % 12]

/* 用本名或别名造句：本名与三个别名里随机取一个，套随机模板，所以同一个时辰每次进 app 也不同。 */
private fun greetLine(hour: Int): String {
    val z = zcOf(hour)
    val pool = listOf(z.name) + z.alias
    val w = pool[kotlin.random.Random.nextInt(pool.size)]
    val tpl = listOf(
        "${w}时分，想问什么？",
        "此刻正是$w，问一句吧。",
        "$w，心里那件事说清楚。",
        "$w，一事一卦，心诚则灵。",
        "${w}未过，正好问一句。",
        "$w，把疑问写下来。",
        "正是$w，想求个准话？",
    )
    return tpl[kotlin.random.Random.nextInt(tpl.size)]
}

private val GREET_Z2 = listOf(
    "卦可通神，请讲。", "一事一卦，心诚则灵。", "心动即卦——你要问什么？",
    "六宫在侧，静候一问。", "把疑问写下来，卦台替你问。", "嘘——六宫已列，说吧。",
)

private fun greet(): Pair<String, String> {
    val h = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).hour
    val sub = GREET_Z2[kotlin.random.Random.nextInt(GREET_Z2.size)]
    /* 主句按「，」断成两行（沿用旧的排版：第一行结束在逗号处） */
    return greetLine(h).replace("，", "，\n") to sub
}

/* 一次进程只抽一次：重组/翻页回来都不会换句 */
private val GREET_ONCE: Pair<String, String> by lazy { greet() }

/* 四团雾（bw 皮肤：--a1 #c9d2de / --a2 #ded8cc / --a3 #b9c2cf，118vw×74vh，四角错开） */
@Composable
internal fun AuraLayer() {
    /* ⚠ 敦煌 / 莫高窟 有自己的天光（SkinBackdrop 那层沙壁暖光）；这层通用的冷灰流光会把它们糊成一片灰
       ⇒ 这两套不画（早先那一版 #xlrAura 本来就按皮肤换色，不是一刀切） */
    if (Skin.def.key == "dh" || Skin.def.key == "mg") return
    Canvas(modifier = Modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height
        softGlow(w * 0.02f, h * 0.06f, w * 0.60f, Color(0.788f, 0.824f, 0.871f), 0.34f)
        softGlow(w * 0.75f, h * -0.05f, w * 0.62f, Color(0.871f, 0.847f, 0.8f), 0.42f)
        softGlow(w * 0.98f, h * 0.72f, w * 0.60f, Color(0.725f, 0.761f, 0.812f), 0.32f)
        softGlow(w * 0.10f, h * 0.88f, w * 0.60f, Color(0.788f, 0.824f, 0.871f), 0.30f)
    }
}

@Composable
internal fun YiContent(onCast: () -> Unit) {
    /* （第一轮红框）：底部 71dp 是给手势条/留白用的，键盘一上来就该收成 12dp。
       第二轮：详情展开时「键盘高 − 详情高」那截要落在**页面自己的留白**里
         （Platform.anchorPadDp），不能靠宿主内边距——那会露出窗口底色（白条）。 */
    /* 第三轮：
       卡片高度、页面留白、宿主底部内边距**必须同一个进度推进**。原先内边距走原生 ValueAnimator、
       高度走 Compose 时钟，两者差几帧 ⇒ 卡片先掉过头（掉到屏幕外）再回弹＝果冻/坠。
       现在只留一个进度 openP，其余全由它算，内边距每帧写给宿主。 */
    val openP by com.tencent.kuikly.compose.animation.core.animateFloatAsState(
        targetValue = if (Platform.anchorOn) 1f else 0f,
        animationSpec = com.tencent.kuikly.compose.animation.core.tween(
            260,
            easing = com.tencent.kuikly.compose.animation.core.CubicBezierEasing(0.4f, 0f, 0.2f, 1f),
        ),
    )
    val anchor = Platform.anchorPadDp * openP
    LaunchedEffect(openP) {
        if (Platform.padDriven) {
            /* ⚠ 用点下去那一刻记下的 anchorKbPx：imePadPx 在键盘收掉后会被写成 0 */
            val kb = Platform.anchorKbPx
            if (kb > 0) {
                Platform.setImePadPx?.invoke(((kb * (1f - openP)).toInt()).coerceAtLeast(0))
            }
            if (openP >= 0.999f) Platform.padDriven = false
        }
    }
    LaunchedEffect(Platform.imeVisible) {
        if (Platform.imeVisible) {
            Platform.anchorPadDp = 0f
            Platform.anchorOn = false
        }
    }
    val padB by com.tencent.kuikly.compose.animation.core.animateFloatAsState(
        /* ⚠ 判断用 anchorOn 这个**同步开关**，不能用动画后的 anchor：那一帧还是 0，
           底部留白会先按 71dp 走 ⇒ 卡片开头坠一下（现象：的）。 */
        targetValue = if (Platform.imeVisible || Platform.anchorOn) 12f else 71f,
        animationSpec = com.tencent.kuikly.compose.animation.core.tween(
            260,
            easing = com.tencent.kuikly.compose.animation.core.CubicBezierEasing(0.4f, 0f, 0.2f, 1f),
        ),
    )
    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 22.dp).padding(bottom = (padB + anchor).dp)) {
        Spacer(modifier = Modifier.weight(1f))
        /* 详情展开 + 键盘弹着时，问候语让位：不然「问候语 + 整张展开的卡片」超过可视高度，
           Column 会把卡片压扁，最后一行（事类）就被切掉一截（现象：的）。
           问候语这块实测 330px＝120dp（两行 30sp + 副句），收起时按动画缩放高度。 */
        val greetOn = !(Session.moreOpen && Platform.imeVisible)
        val greetVis by com.tencent.kuikly.compose.animation.core.animateFloatAsState(
            targetValue = if (greetOn) 1f else 0f,
            animationSpec = com.tencent.kuikly.compose.animation.core.tween(
                220,
                easing = com.tencent.kuikly.compose.animation.core.CubicBezierEasing(0.4f, 0f, 0.2f, 1f),
            ),
        )
        if (greetVis > 0.01f) {
            /* 现象：「问候语字被截断」：十二时辰的句子带两个逗号 ⇒ 折成三行（3×42.6sp=128dp），
               而这里写死 120dp（那是两行时的实测值）⇒ 第三行挤掉副句。按行数长高。 */
            val greetH = 120f + (GREET_ONCE.first.count { it == '\n' } - 1).coerceIn(0, 1) * 42.6f
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height((greetH * greetVis).dp)
                    .clipToBounds(),
            ) {
                Box(modifier = Modifier.fillMaxWidth().height(greetH.dp)) {
                    Greeting()
                }
            }
        }
        Spacer(modifier = Modifier.height(36.dp))
        AskCard(onCast)
    }
}

@Composable
private fun Greeting() {
    val g = GREET_ONCE
    /* 开屏撤掉后隔一拍才出（早先那一版 legacy.css L3431）：opacity .35s ease ＋ transform .35s cubic-bezier(.2,.7,.25,1)，起点 translateY(-6px) */
    val revOp by com.tencent.kuikly.compose.animation.core.animateFloatAsState(
        targetValue = if (Session.chromeReveal) 1f else 0f,
        animationSpec = com.tencent.kuikly.compose.animation.core.tween(
            350,
            easing = com.tencent.kuikly.compose.animation.core.CubicBezierEasing(0.25f, 0.1f, 0.25f, 1f),
        ),
    )
    val revT by com.tencent.kuikly.compose.animation.core.animateFloatAsState(
        targetValue = if (Session.chromeReveal) 1f else 0f,
        animationSpec = com.tencent.kuikly.compose.animation.core.tween(
            350,
            easing = com.tencent.kuikly.compose.animation.core.CubicBezierEasing(0.2f, 0.7f, 0.25f, 1f),
        ),
    )
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer {
                alpha = revOp
                translationY = (revT - 1f) * 16f
            }
    ) {
        Text_(
            text = g.first,
            fontSize = 30f,
            lineHeight = 42.6f,
            letterSpacing = 2.4f,
            serif = true,
            weight = 500,
        )
        Spacer(modifier = Modifier.height(9.dp))
        Text_(
            text = g.second,
            fontSize = 13.5f,
            letterSpacing = 1.89f,
            color = KY_DIM2,
        )
    }
}
