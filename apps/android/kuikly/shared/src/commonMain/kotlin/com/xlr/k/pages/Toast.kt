package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import com.tencent.kuikly.compose.animation.core.Animatable
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.unit.dp

/* 全局小提示：导出/导入/复制完浮出来一句话，1.8 秒自己淡走。
   早先那一版是设置页里那行 `say('good', …)`；K 版提到全局，任何页都能用 `Session.say(...)`。 */
@Composable
internal fun AppToast() {
    val msg = Session.toast
    if (msg.isEmpty()) return
    val a = androidx.compose.runtime.remember { Animatable(0f) }

    LaunchedEffect(msg) {
        a.snapTo(0f)
        a.animateTo(1f, tween(200, easing = KY_EASE_OUT))
        kotlinx.coroutines.delay(1600)
        a.animateTo(0f, tween(240, easing = KY_EASE_IN))
        if (Session.toast == msg) Session.toast = ""
    }

    /* 吃了点击，别让「点空白」穿透到底下那层 */
    Box(modifier = Modifier.fillMaxSize().tapNoIndication { })

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(bottom = 96.dp),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Box(
            modifier = Modifier
                .graphicsLayer {
                    alpha = a.value
                    translationY = (1f - a.value) * 18f
                }
                .background(Color(0.10f, 0.09f, 0.08f, 0.90f), RoundedCornerShape(14.dp))
                .padding(horizontal = 16.dp, vertical = 10.dp),
        ) {
            Text_(text = msg, fontSize = 12f, lineHeight = 19f, color = Color(1f, 1f, 1f))
        }
    }
}
