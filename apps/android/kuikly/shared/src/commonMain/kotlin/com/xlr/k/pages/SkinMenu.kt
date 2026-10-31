package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.animation.core.FastOutSlowInEasing
import com.tencent.kuikly.compose.animation.core.animateFloatAsState
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.border
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Row
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.fillMaxWidth
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.foundation.layout.size
import com.tencent.kuikly.compose.foundation.layout.width
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.draw.clip
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.unit.dp
import kotlinx.coroutines.delay

/* 皮肤菜单浮层（早先的实现：外壳 `.skinmenu`，贴在皮肤按钮下方 8px、right 0、min-width 210px、
   面=--surface、边=--line2、当前项=--accent-bg2 + 强调色）

   口径：：「皮肤按钮点开怎么直接进设置了？这个按钮按下是单独唤起皮肤菜单，
   而不是进入设置的外观页面」⇒ 顶栏那颗按钮现在只开这个浮层；设置里的「外观」还在，但不抢这个按钮。

   早先那一版结构：
     .skinmenu .sh   「主题」小标题（10px / letterspacing .2em / dim2）
     .skinmenu button  [色块 12px] 名字（flex 1） [副标题 10px dim2]
     button[aria-current=true]  底 accent-bg2、字 accent */
@Composable
internal fun SkinMenuOverlay() {
    if (!Session.skinMenuOpen) return
    /* 进出都走一段：淡入 + 8dp 上浮 + 0.98→1，关的时候反向播完再卸载（跟浮层三件套同一口径） */
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(16)
        shown = true
    }
    val a by animateFloatAsState(if (shown) 1f else 0f, tween(200, easing = FastOutSlowInEasing))
    val dy by animateFloatAsState(if (shown) 0f else 8f, tween(200, easing = FastOutSlowInEasing))
    val sc by animateFloatAsState(if (shown) 1f else 0.98f, tween(200, easing = FastOutSlowInEasing))

    Box(modifier = Modifier.fillMaxSize()) {
        /* 只接收外部点击，不压暗页面，方便直接比较换肤效果。 */
        Box(
            modifier = Modifier
                .fillMaxSize()
                .tapNoIndication { Session.skinMenuOpen = false }
        )
        /* 浮层本体：贴顶栏下沿、靠右 16dp、210dp 宽 */
        Column(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 94.dp, end = 16.dp)
                .width(210.dp)
                .graphicsLayer {
                    alpha = a
                    translationY = dy * density
                    scaleX = sc
                    scaleY = sc
                }
                .clip(RoundedCornerShape(14.dp))
                .background(KY_SURFACE.copy(alpha = 0.98f))
                .border(Skin.borderW, if (Skin.cur == "bru") KY_INK else KY_LINE, RoundedCornerShape(14.dp))
                .padding(6.dp)
        ) {
            Text_(
                text = "主题",
                fontSize = 10f,
                lineHeight = 17f,
                color = KY_DIM2,
                modifier = Modifier.padding(start = 10.dp, top = 8.dp, bottom = 6.dp),
            )
            SKINS.forEach { d ->
                val on = d.key == Skin.cur
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (on) KY_ACCENT_BG2 else com.tencent.kuikly.compose.ui.graphics.Color(0f, 0f, 0f, 0f))
                        .tapNoIndication {
                            Skin.apply(d.key)
                            Session.skinMenuOpen = false
                        }
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    /* 小样：迷你卡（底 / 卡 / 主色三件），不是一颗死方块 */
                    SkinSwatch(d)
                    Spacer(modifier = Modifier.width(10.dp))
                    Text_(
                        text = d.name,
                        fontSize = 13f,
                        lineHeight = 20f,
                        weight = if (on) 600 else 400,
                        color = if (on) KY_ACCENT else KY_INK,
                        modifier = Modifier.weight(1f),
                    )
                    Text_(text = d.tag, fontSize = 10f, lineHeight = 17f, color = KY_DIM2)
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
        }
    }
}
