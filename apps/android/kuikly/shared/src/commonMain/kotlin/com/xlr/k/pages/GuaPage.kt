package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.animation.core.CubicBezierEasing
import com.tencent.kuikly.compose.animation.core.animateFloatAsState
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.foundation.Canvas
import com.tencent.kuikly.compose.foundation.clickable
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.border
import com.tencent.kuikly.compose.foundation.layout.Arrangement
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Row
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.fillMaxWidth
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.offset
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.foundation.layout.size
import com.tencent.kuikly.compose.foundation.layout.width
import com.tencent.kuikly.compose.foundation.lazy.LazyColumn
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.draw.clip
import com.tencent.kuikly.compose.ui.draw.drawBehind
import com.tencent.kuikly.compose.ui.geometry.Offset
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.text.style.TextAlign
import com.tencent.kuikly.compose.ui.unit.dp
import com.xlr.k.judge.Cast
import com.xlr.k.judge.Context
import com.xlr.k.judge.G
import kotlin.math.cos
import kotlin.math.sin

/* 贰页 · 起卦（掌诀盘）
 *
 * 结构照早先的实现的 DOM：卡片(305 宽) 内 = 掌诀圆环(268) + 三宫/时辰 + 问句 + 四枚标签 + 一个主按钮。
 * 圆环：六宫围一圈，大安在正上，顺时针 留连→速喜→赤口→小吉→空亡，半径 96，宫格 66×66。
 * ⚠ 现在是**静态样张**：卦象数值（三宫、落宫、五行、体用、事类）是写死的样例，
 *   真值要等判据（起卦/排盘）移植进来才接。
 */

internal val KY_ACCENT: Color get() = Skin.def.accent

private val GONG = listOf(
    Triple("大安", "水", ""),
    Triple("留连", "土", "地"),
    Triple("速喜", "火", ""),
    Triple("赤口", "金", ""),
    Triple("小吉", "木", "人"),
    Triple("空亡", "土", "天"),
)

@Composable
internal fun GuaContent(onNext: () -> Unit, active: Boolean, onBack: () -> Unit = {}) {
    val ctx = Session.ctx
    val cast = Session.cast
    /* 没起卦（比如刚点过「新开一卦」）也给一句人话，别留一片空白 ——
       「起过一卦就随便切页」，所以这两页真会被翻到没卦的状态。 */
    if (ctx == null || cast == null) {
        NoGuaHint(onBack = onBack)
        return
    }
    /* 矮屏（长宽比没那么长的手机）里卡片放不下时，底部那颗「看断辞 · 结果」会被压扁
       —— 整页改成 LazyColumn（Kuikly 里没有 verticalScroll）：装得下就不滚，
       装不下滚一点，按钮永远保持 58 高。 */
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(start = 44.dp, end = 44.dp, top = 115.dp)
            .padding(bottom = 71.dp)
    ) {
        item {
        val shape = RoundedCornerShape(Skin.rCard)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(shape)
                .glassMaterial(shape)
                .padding(top = 13.dp, bottom = 7.dp)
        ) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                /* ringIn：0.72s，透明度 0→1，缩放 .94→1，阻尼曲线 */
                var shown by remember { mutableStateOf(false) }
                LaunchedEffect(Unit) { shown = true }
                val p by animateFloatAsState(
                    targetValue = if (shown) 1f else 0f,
                    animationSpec = tween(720, easing = KY_EASE_OUT),
                )
                Box(
                    modifier = Modifier.graphicsLayer {
                        alpha = p
                        scaleX = 0.94f + 0.06f * p
                        scaleY = 0.94f + 0.06f * p
                    }
                ) {
                    WalkRing(landIndex = cast.gi[2], gi = cast.gi, active = active)
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(KY_LINE))
            Column(
                modifier = Modifier.fillMaxWidth().padding(start = 26.dp, end = 26.dp, top = 28.dp, bottom = 32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                GuaInfo(ctx, cast)
            }
            Spacer(modifier = Modifier.height(24.dp))
            Box(modifier = Modifier.padding(horizontal = 15.dp)) {
                PrimaryButton("看断辞 · 结果 →", onNext)
            }
        }
        }
    }
}

/* 掌诀圆环 */
@Composable
private fun WalkRing(landIndex: Int, gi: List<Int>, active: Boolean) {
    /* 落宫点亮：圆盘入场 0.72s 之后，天→地→人 依次浮现，隔 140ms，最后落宫弹一下 */
    var n by remember { mutableStateOf(0) }
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(760)
        for (k in 1..3) {
            n = k
            kotlinx.coroutines.delay(230)
        }
    }
    val pop by animateFloatAsState(
        targetValue = if (n >= 3) 1f else 0f,
        animationSpec = tween(260, easing = CubicBezierEasing(0.34f, 1.4f, 0.5f, 1f)),
    )
    val landIn by animateFloatAsState(
        targetValue = if (n >= 3) 1f else 0f,
        animationSpec = tween(240, easing = KY_EASE_OUT),
    )
    val r = 104f
    val cell = 74f
    val box = 292f
    val center = box / 2f
    Box(modifier = Modifier.size(box.dp)) {
        /* 虚线圆 */
        Canvas(modifier = Modifier.fillMaxSize()) {
            val cx = size.width / 2f
            val cy = size.height / 2f
            val rr = size.width * (104f / 292f)
            val seg = 72
            var i = 0
            while (i < seg) {
                if (i % 2 == 0) {
                    val a0 = (i.toFloat() / seg) * 6.2831853f
                    val a1 = ((i + 1).toFloat() / seg) * 6.2831853f
                    drawLine(
                        color = Color(0.043f, 0.043f, 0.047f, 0.13f),
                        start = Offset(cx + cos(a0) * rr, cy + sin(a0) * rr),
                        end = Offset(cx + cos(a1) * rr, cy + sin(a1) * rr),
                        strokeWidth = size.width * 0.004f,
                    )
                }
                i += 1
            }
        }
        GONG.forEachIndexed { i, g ->
            val ang = (i * 60.0 - 90.0) * 3.14159265 / 180.0
            val dx = (cos(ang) * r * 2.75).toFloat()
            val dy = (sin(ang) * r * 2.75).toFloat()
            val left = (center * 2.75f + dx - cell * 2.75f / 2f) / 2.75f
            val top = (center * 2.75f + dy - cell * 2.75f / 2f) / 2.75f
            val isLand = i == landIndex
            Column(
                modifier = Modifier
                    .offset(x = left.dp, y = top.dp)
                    .size(cell.dp)
                    .graphicsLayer {
                        if (isLand) {
                            val s = 1f + 0.08f * pop
                            scaleX = s
                            scaleY = s
                        }
                    }
                    .clip(RoundedCornerShape(999.dp))
                    .background(if (isLand) KY_ACCENT_BG2.copy(alpha = KY_ACCENT_BG2.alpha * landIn) else Color.Transparent)
                    .border(
                        width = if (isLand) 1.dp else 0.dp,
                        color = if (isLand) KY_ACCENT_LINE else Color.Transparent,
                        shape = RoundedCornerShape(999.dp),
                    ),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                val roles = gi.mapIndexedNotNull { idx, gIdx ->
                    if (gIdx == i) idx to (if (idx == 0) "天" else if (idx == 1) "地" else "人") else null
                }
                if (roles.isNotEmpty()) {
                    /* 同一宫既当天宫又当地宫时，标记叠成「天·地」，不丢信息；按 n 逐个浮现 */
                    val shown = roles.filter { n > it.first }.map { it.second }
                    if (shown.isNotEmpty()) {
                        /* 天地人标记：未落定时压暗、落定后缓动提到全亮（不是硬切） */
                        Box(modifier = Modifier.graphicsLayer { alpha = 0.6f + 0.4f * landIn }) {
                            Text_(text = shown.joinToString("·"), fontSize = 9f, lineHeight = 12f, color = KY_ACCENT)
                        }
                    }
                }
                Text_(
                    text = g.first,
                    fontSize = 15f,
                    lineHeight = 17f,
                    serif = true,
                    weight = if (isLand) 600 else 400,
                    color = if (isLand) KY_ACCENT else KY_INK,
                )
            }
        }
        /* 中心那一行 */
        Column(
            modifier = Modifier.align(Alignment.Center).width((r * 1.2f).dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text_(text = "天 · 地 · 人", fontSize = 9.5f, lineHeight = 12f, letterSpacing = 1.9f, color = KY_DIM2)
        }
    }
}

@Composable
private fun GuaInfo(ctx: Context, cast: Cast) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        /* .gua-top：三宫 + 时辰 一行居中（21px 衬线 dim2，字距 .14em，间隔 10） */
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text_(text = cast.g[0], fontSize = 23f, lineHeight = 31f, serif = true, letterSpacing = 2.9f, color = KY_DIM)
            Text_(text = "·", fontSize = 15f, lineHeight = 31f, modifier = Modifier.padding(horizontal = 10.dp), color = KY_DIM2)
            Text_(text = cast.g[1], fontSize = 21f, lineHeight = 29f, serif = true, letterSpacing = 2.9f, color = KY_DIM)
            Text_(text = "·", fontSize = 14f, lineHeight = 29f, modifier = Modifier.padding(horizontal = 9.dp), color = KY_DIM2)
            Text_(text = cast.g[2], fontSize = 21f, lineHeight = 29f, serif = true, letterSpacing = 2.9f, color = KY_DIM)
            Text_(text = cast.ziName + "时", fontSize = 12.5f, lineHeight = 24f, modifier = Modifier.padding(start = 11.dp), color = KY_DIM2)
        }
        /* .q：整行居中，12.5 / 1.75 */
        Text_(
            text = ctx.q,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(top = 12.dp),
            fontSize = 12.5f,
            lineHeight = 21.9f,
            color = KY_DIM2,
            align = TextAlign.Center,
        )
        /* 「落宫 小吉」那条宽胶囊也删了（图一红框）：圆盘上落宫本来就高亮着，
           这条只是把同一个信息再说一遍，白占一整行高度。 */
        /* 五行 / 体用 / 事类 三颗胶囊**删掉了**（：「红框位置的信息可以隐藏了或者删了，
           因为占位置，还会在一些手机里把下面的『看断辞 · 结果』按钮顶到下面」）。
           体用与五行在叁页断辞里本来就有正文，这里不再重复占高度。 */
    }
}

/* .chips .tag：高 31 的圆角胶囊，底透明、边 1px --line，标签灰、值墨色 600 */
@Composable
private fun Chip(tag: String, value: String) {
    Row(
        modifier = Modifier
            .height(31.dp)
            .clip(RoundedCornerShape(999.dp))
            .glassMaterial(RoundedCornerShape(999.dp), control = true)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text_(text = tag, fontSize = 12f, lineHeight = 31f, color = KY_DIM2)
        Spacer(modifier = Modifier.width(7.dp))
        Text_(text = value, fontSize = 12f, lineHeight = 31f, weight = 500)
    }
}

/* .vnext button：满宽、最小 58 高、实心 accent、字色用底色、圆角 999、18/600 字距 .24em */
@Composable
private fun PrimaryButton(label: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(58.dp)
            .tapNoIndication { onClick() }
            .clip(RoundedCornerShape(999.dp))
            .glassMaterial(RoundedCornerShape(999.dp), control = true, primary = true),
        contentAlignment = Alignment.Center,
    ) {
        Text_(
            text = label,
            fontSize = 18f,
            lineHeight = 22f,
            weight = 500,
            letterSpacing = 4.32f,
            color = KY_PRIMARY_LABEL,
        )
    }
}

/* 还没起卦时的空态（贰/叁页共用）。
   「起过一卦就随便切页，哪怕点了新开一卦」⇒ 这两页会被翻到没有卦的状态，
   别留一片空白：一句话 + 一颗回壹页的胶囊。 */
@Composable
internal fun NoGuaHint(onBack: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text_(text = "还没起卦", fontSize = 15f, lineHeight = 24f, color = KY_DIM2)
            Spacer(modifier = Modifier.height(8.dp))
            Text_(
                text = "回壹页把所问写清楚，起一卦就有这一页了",
                fontSize = 12.5f,
                lineHeight = 20f,
                color = KY_DIM2,
            )
            Spacer(modifier = Modifier.height(20.dp))
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .glassMaterial(RoundedCornerShape(999.dp), control = true)
                    .tapNoIndication { onBack() }
                    .padding(horizontal = 18.dp, vertical = 9.dp),
            ) {
                Text_(text = "去问卦", fontSize = 13f, lineHeight = 20f, color = KY_INK)
            }
        }
    }
}
