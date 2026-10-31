package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.tencent.kuikly.compose.material3.Text
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.text.SpanStyle
import com.tencent.kuikly.compose.ui.text.buildAnnotatedString
import com.tencent.kuikly.compose.ui.text.font.FontFamily
import com.tencent.kuikly.compose.ui.text.font.FontWeight
import com.tencent.kuikly.compose.ui.text.withStyle
import com.tencent.kuikly.compose.ui.unit.sp

/* 带粗体的正文：模型断辞里 `**这几个字**` 要真加粗（早先那一版是 <strong> 上墨色）。
   K 版用 AnnotatedString：普通段 400，粗段 500（再重就糊了，正文 13.5sp 上 600 会显脏）。 */

internal fun splitBold(s: String): List<Pair<String, Boolean>> {
    val out = mutableListOf<Pair<String, Boolean>>()
    var i = 0
    while (i < s.length) {
        val a = s.indexOf("**", i)
        if (a < 0) {
            if (i < s.length) out.add(s.substring(i) to false)
            break
        }
        if (a > i) out.add(s.substring(i, a) to false)
        val b = s.indexOf("**", a + 2)
        if (b < 0) {
            out.add(s.substring(a) to false)
            break
        }
        out.add(s.substring(a + 2, b) to true)
        i = b + 2
    }
    return out
}

@Composable
internal fun RichText_(
    text: String,
    modifier: Modifier = Modifier,
    fontSize: Float = 13.5f,
    color: Color = KY_INK,
    serif: Boolean = false,
    lineHeight: Float? = null,
) {
    val runs = remember(text) { splitBold(text) }
    val anyBold = runs.any { it.second }
    if (!anyBold) {
        Text_(
            text = text,
            modifier = modifier,
            fontSize = fontSize,
            color = color,
            serif = serif,
            lineHeight = lineHeight,
        )
        return
    }
    Text(
        text = buildAnnotatedString {
            runs.forEach { r ->
                if (r.second) {
                    withStyle(SpanStyle(fontWeight = FontWeight(500))) { append(r.first) }
                } else {
                    append(r.first)
                }
            }
        },
        modifier = modifier,
        color = color,
        fontSize = fontSize.sp,
        fontWeight = FontWeight(400),
        fontFamily = if (serif) FontFamily.Serif else null,
        lineHeight = (lineHeight ?: (fontSize * 1.85f)).sp,
    )
}
