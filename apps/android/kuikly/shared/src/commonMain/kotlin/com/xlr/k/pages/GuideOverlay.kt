package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.animation.core.Animatable
import com.tencent.kuikly.compose.animation.core.animateFloatAsState
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.border
import com.tencent.kuikly.compose.foundation.Image
import com.tencent.kuikly.compose.foundation.layout.Arrangement
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Row
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxHeight
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.fillMaxWidth
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.foundation.layout.width
import com.tencent.kuikly.compose.foundation.lazy.LazyColumn
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.draw.clip
import com.tencent.kuikly.compose.ui.draw.drawBehind
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.platform.LocalDensity
import com.tencent.kuikly.compose.ui.unit.dp

/* 配置引导（旧 apps/mobile-web/src/data/guideCore.js 的 #onbLayer）
   早先那一版样式（legacy.css L887-939）：
     .onb          铺满、底色 = --bg、居中、padding 24（小屏 16）
     .onb .card    max-width 680、1px --line2 边、底 = --surface、padding 24 30 24、内部可滚
     .gtop         「N / 8」左（11px .16em dim2）＋「跳过」右（12px dim2）
     .gttl         19px serif 600 .08em
     .gbody .lead  13.5px、行高 2、正文 dim、加粗处 ink 600
     .glink        11.5px dim2，链接串用 accent 加粗下划线（点开系统浏览器）
     .gnav         两颗按钮等宽（.sbtn，主按钮 .pri＝accent 底）
   早先那一版「按钮钉在卡片底部、上方渐隐＋模糊」的观感 ⇒ 这里把按钮放在滚动区外面（等价效果，也不用叠渐变）。
   配图这一步先没做：Kuikly 的 Image 只收 Painter，取本地 webp 另开一轮。 */
@Composable
internal fun GuideOverlay() {
    /* 开/关都要有过渡（：「点开之后出现得太过突然」）：
       底色 340ms 淡入、卡片同时从下方 46dp 浮上来并微放大到 1（ease-out）；
       关是 220ms ease-in 反向，播完才卸 —— 只写 `if (!on) return` 会硬消失。 */
    var mounted by remember { mutableStateOf(false) }
    val p = remember { Animatable(0f) }
    LaunchedEffect(Session.guideOn) {
        if (Session.guideOn) {
            mounted = true
            p.snapTo(0f)
            p.animateTo(1f, tween(340, easing = KY_EASE_OUT))
        } else if (mounted) {
            p.animateTo(0f, tween(220, easing = KY_EASE_IN))
            mounted = false
        }
    }
    if (!mounted) return
    val dens = LocalDensity.current
    val risePx = with(dens) { 46.dp.toPx() }

    /* 步切换：内容整块换页要有过渡（同样 点名「八步之间没有过渡」）。
       方向按前后决定，260ms 从那一侧 30dp 滑进来 + 淡入；顶行 N/8 与按钮不参与，点了立刻响应。 */
    var shownStep by remember { mutableStateOf(Session.guideStep) }
    val sp = remember { Animatable(1f) }
    var dir by remember { mutableStateOf(1f) }
    LaunchedEffect(Session.guideStep) {
        if (Session.guideStep == shownStep) return@LaunchedEffect
        dir = if (Session.guideStep > shownStep) 1f else -1f
        shownStep = Session.guideStep
        sp.snapTo(0f)
        sp.animateTo(1f, tween(260, easing = KY_EASE_OUT))
    }
    val slidePx = with(dens) { 30.dp.toPx() }

    val step = shownStep
    val s = GUIDE_STEPS.getOrElse(step) { GUIDE_STEPS[0] }
    val last = Session.guideStep >= GUIDE_STEPS.size - 1

    Box(
        modifier = Modifier
            .fillMaxSize()
            .graphicsLayer { alpha = p.value }
            .background(KY_BG)
            /* 点卡片外面 = 跳过（早先那一版：d.addEventListener → target === d 就 close('skip')） */
            .tapNoIndication { closeGuide("skip") },
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer {
                    translationY = risePx * (1f - p.value)
                    val k = 0.975f + 0.025f * p.value
                    scaleX = k
                    scaleY = k
                }
                .padding(horizontal = 16.dp, vertical = 22.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(Color.White)
                    .border(Skin.borderW, KY_LINE, RoundedCornerShape(18.dp))
                    /* 卡片自己吃掉点击，别把「点外面跳过」传上去 */
                    .tapNoIndication { }
                    .padding(start = 20.dp, end = 20.dp, top = 18.dp, bottom = 16.dp),
            ) {
                /* 顶行：1 / 8 ＋ 跳过 */
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text_(
                        text = "${Session.guideStep + 1} / ${GUIDE_STEPS.size}",
                        fontSize = 11f,
                        letterSpacing = 1.8f,
                        color = KY_DIM2,
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    Box(
                        modifier = Modifier
                            .tapNoIndication { closeGuide("skip") }
                            .padding(horizontal = 8.dp, vertical = 5.dp),
                    ) {
                        Text_(text = "跳过", fontSize = 12f, letterSpacing = 1.2f, color = KY_DIM2)
                    }
                }
                /* 标题 + 正文 + 地址 + 配图 = 一步的内容，整块吃换页过渡（分别挂 graphicsLayer，
                   别在外面包一层 Column —— LazyColumn 的 weight(1f) 必须直接挂在卡片 Column 下） */
                Spacer(modifier = Modifier.height(8.dp))
                Text_(
                    text = s.t,
                    fontSize = 19f,
                    serif = true,
                    weight = 600,
                    letterSpacing = 1.5f,
                    color = KY_INK,
                    modifier = Modifier.graphicsLayer {
                        alpha = sp.value
                        translationX = dir * slidePx * (1f - sp.value)
                    },
                )
                Spacer(modifier = Modifier.height(10.dp))

                /* 正文 ＋ 页面地址 ＋ 配图，全放在滚动区里的 item：
                   ⚠ 别把其中某一块挪到 LazyColumn 外面 —— 一旦 LazyColumn 拿了 weight(1f)，
                   它会占满剩余高度，后面那些兄弟就被顶到卡外（画得出来但点不到，实测）。 */
                LazyColumn(
                    modifier = Modifier
                        .weight(1f, fill = false)
                        .graphicsLayer {
                            alpha = sp.value
                            translationX = dir * slidePx * (1f - sp.value)
                        }
                ) {
                    item {
                        RichText_(text = s.body, fontSize = 13.5f, color = KY_DIM, lineHeight = 27f)
                    }
                    if (s.link.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(6.dp))
                            /* ⚠ 点这一行要挂在 **Box** 上：同样在 LazyColumn 的 item 里，
                               Row 上的 tapNoIndication 收不到（实测点了没反应），Box 就行
                               （同一层里那张配图就是 Box，点得动）。 */
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(40.dp)
                                    .tapNoIndication {
                                        Platform.openUrl?.invoke(s.link)
                                    },
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text_(text = "页面地址：", fontSize = 11.5f, color = KY_DIM2)
                                    Box(
                                        modifier = Modifier
                                            .tapNoIndication { Platform.openUrl?.invoke(s.link) },
                                    ) {
                                        Text_(
                                            text = s.link.removePrefix("https://").removePrefix("http://"),
                                            fontSize = 11.5f,
                                            weight = 600,
                                            color = KY_ACCENT,
                                        )
                                    }
                                }
                            }
                        }
                    }
                    if (s.img.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(6.dp))
                            /* 配图：抽到 androidApp/src/main/assets/common/guide/ 的 webp，
                               走 Kuikly 的 coil 取图（src 用 assets://common/ 前缀）。
                               早先那一版 .gimg：1px 边、12 圆角、点一下放大（gzoom） */
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(veil(0.55f))
                                    .border(Skin.borderW, KY_LINE, RoundedCornerShape(12.dp))
                                    .tapNoIndication { Session.guideZoom = s.img },
                            ) {
                                Image(
                                    painter = com.tencent.kuikly.compose.coil3.rememberAsyncImagePainter(
                                        "assets://common/guide/${s.img}.webp",
                                    ),
                                    contentDescription = "智谱开放平台截图",
                                    modifier = Modifier.fillMaxWidth().height(210.dp),
                                    contentScale = com.tencent.kuikly.compose.ui.layout.ContentScale.Fit,
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))
                /* 底部两颗按钮 */
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    if (step > 0) {
                        GuideBtn("上一步", primary = false, modifier = Modifier.weight(1f)) {
                            Session.guideStep = (step - 1).coerceAtLeast(0)
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                    }
                    GuideBtn(buttonText(s, last), primary = true, modifier = Modifier.weight(1f)) {
                        when {
                            s.go -> goConfig()
                            last -> closeGuide("done")
                            else -> Session.guideStep = step + 1
                        }
                    }
                }
            }
        }

        /* 点图放大（旧 .gzoom）：整屏深底 + 铺满宽度的原图，点任意处关掉。
           开的时候给 200ms 淡入（原来一眼就跳出来，和引导层同一个毛病） */
        val zoom = Session.guideZoom
        if (zoom != null) {
            val za = remember { Animatable(0f) }
            LaunchedEffect(zoom) {
                za.snapTo(0f)
                za.animateTo(1f, tween(200, easing = KY_EASE_OUT))
            }
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer { alpha = za.value }
                    .background(Color(0f, 0f, 0f, 0.92f))
                    .tapNoIndication { Session.guideZoom = null },
                contentAlignment = Alignment.Center,
            ) {
                Image(
                    painter = com.tencent.kuikly.compose.coil3.rememberAsyncImagePainter(
                        "assets://common/guide/$zoom.webp",
                    ),
                    contentDescription = "智谱开放平台截图（放大）",
                    modifier = Modifier.fillMaxWidth().fillMaxHeight(0.86f),
                    contentScale = com.tencent.kuikly.compose.ui.layout.ContentScale.Fit,
                )
            }
        }
    }
}

private fun buttonText(s: GStep, last: Boolean): String =
    if (s.go) "去配置" else if (last) "开始问卦" else "下一步"

/** 旧 close(flag)：记标记 + 收层。flag = 'skip' / 'done' */
internal fun closeGuide(flag: String) {
    Platform.put?.invoke(GUIDE_KEY, flag)
    Session.guideOn = false
}

/** 旧 goConfig()：收起引导 → 打开设置 → 送去「大模型」那一栏（已经配好的不动他的服务商） */
internal fun goConfig() {
    closeGuide("done")
    dismissIme()
    Session.settingsOpen = true
    Session.settingsPage = ""
    Session.settingsTab = "llm"
}

/** 首次进来自动弹一次（旧 maybeWelcome：开屏在场时不弹；看过就不再弹） */
internal fun maybeGuide() {
    val seen = Platform.get?.invoke(GUIDE_KEY)
    if (!seen.isNullOrEmpty()) return
    Session.guideStep = 0
    Session.guideOn = true
}

@Composable
private fun GuideBtn(text: String, primary: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val shape = RoundedCornerShape(11.dp)
    Box(
        modifier = modifier
            .height(44.dp)
            .clip(shape)
            .background(if (primary) KY_ACCENT else Color.Transparent)
            .border(Skin.borderW, if (primary) KY_ACCENT else KY_LINE, shape)
            .tapNoIndication { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Text_(
            text = text,
            fontSize = 13.5f,
            weight = 600,
            letterSpacing = 0.6f,
            color = if (primary) KY_ON_ACCENT else KY_INK,
        )
    }
}
