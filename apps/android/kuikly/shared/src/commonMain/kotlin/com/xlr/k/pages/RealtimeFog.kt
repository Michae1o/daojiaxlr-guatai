package com.xlr.k.pages

import androidx.compose.runtime.Composable
import com.tencent.kuikly.compose.extension.MakeKuiklyComposeNode
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.core.base.Attr
import com.tencent.kuikly.core.base.DeclarativeBaseView
import com.tencent.kuikly.core.base.event.Event

internal expect fun realtimeFogAvailable(): Boolean

internal class RealtimeFogAttr : Attr() {
    fun configure(skin: String, moving: Boolean) {
        "fogSkin" with skin
        "fogMoving" with moving
        touchEnable(false)
    }
}
internal class RealtimeFogNode : DeclarativeBaseView<RealtimeFogAttr, Event>() {
    override fun createAttr() = RealtimeFogAttr()
    override fun createEvent() = Event()
    override fun viewName() = "XLRRealtimeFog"
}

@Composable
internal fun RealtimeFog(skin: String, moving: Boolean) {
    MakeKuiklyComposeNode(
        factory = { RealtimeFogNode() },
        modifier = Modifier.fillMaxSize(),
        viewUpdate = { node -> node.attr { configure(skin, moving) } },
    )
}


