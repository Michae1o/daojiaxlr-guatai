package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.ComposeContainer
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.layout.Arrangement
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.material3.Button
import com.tencent.kuikly.compose.material3.Text
import com.tencent.kuikly.compose.setContent
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.unit.dp
import com.tencent.kuikly.compose.ui.unit.sp
import com.tencent.kuikly.core.annotations.Page

@Page("Hello")
class HelloPage : ComposeContainer() {

    override fun willInit() {
        super.willInit()
        setContent {
            HelloScreen()
        }
    }
}

@Composable
private fun HelloScreen() {
    var count by remember { mutableStateOf(0) }

    Column(
        modifier = Modifier.fillMaxSize().background(Color(0xFFF7F4EE)).padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "工具链通了",
            fontSize = 28.sp,
            color = Color(0xFF2B2B2B),
        )
        Text(
            text = "Kuikly · 点击次数 $count",
            fontSize = 16.sp,
            color = Color(0xFF6B6B6B),
            modifier = Modifier.padding(top = 12.dp, bottom = 24.dp),
        )
        Button(onClick = { count++ }) {
            Text(text = "点我")
        }
    }
}
