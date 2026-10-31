package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.animation.core.Animatable
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.border
import com.tencent.kuikly.compose.foundation.gestures.detectHorizontalDragGestures
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Row
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxHeight
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.fillMaxWidth
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.offset
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.foundation.layout.width
import com.tencent.kuikly.compose.foundation.lazy.LazyColumn
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.foundation.shape.CircleShape
import com.tencent.kuikly.compose.foundation.layout.size
import com.tencent.kuikly.compose.foundation.text.BasicTextField
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.draw.clip
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.graphics.SolidColor
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.input.pointer.pointerInput
import com.tencent.kuikly.compose.ui.layout.onGloballyPositioned
import com.tencent.kuikly.compose.ui.platform.LocalDensity
import com.tencent.kuikly.compose.ui.text.TextStyle
import com.tencent.kuikly.compose.ui.unit.dp
import com.tencent.kuikly.compose.ui.unit.sp
import com.xlr.k.judge.Rec
import kotlinx.coroutines.launch
import kotlinx.datetime.toLocalDateTime

/* 记录（旧 apps/mobile-web/src/components/Records.jsx + 参照图）
   左侧抽屉：搜索框 → 页签「卦例 / 准则」→ 按天分组列表（日期 · 所问 · ⋮）→ 回收站胶囊 → 设置。
   · 点一条 = 打开**详情**（早先那一版 `Detail`：‹ 返回列表 / 所问 / 背景 / 起卦 / 当时的断辞 / 准不准·实际情况）
   · ⋮ = 贴行浮出菜单（早先那一版 sheetActs：看这一卦 / 应验 / 没应验 / 删）
   · 左滑 = 只露出「删除」（微信那种跟手）
   ⚠ 还没搬：复制断辞、接着问、复盘（标「没应验」→ 模型说错在哪 → 写入准则）、准则列表、导出导入。 */

/** 记录抽屉的开关缓动（点开/点关走这里；手指拖时由手势直接写 Session.recProg，跟手）。
 *  非线性：开 = easeOutCubic（起手就给出去大半），关 = easeInCubic（先慢后快收回）。 */
internal object RecDrawer {
    private var job: kotlinx.coroutines.Job? = null

    fun anim(scope: kotlinx.coroutines.CoroutineScope, target: Float) {
        job?.cancel()
        if (target > 0.5f && Session.recProg < 0.05f) {
            /* 从 0 打开（点顶栏菜单图标那条路）：重档震动一次；拖动松手吸附那条不再重复震 */
            Platform.haptic?.invoke(2)
        }
        if (target > 0.5f) Session.recordsOpen = true
        job = scope.launch {
            val from = Session.recProg
            if (kotlin.math.abs(target - from) < 0.002f) {
                Session.recProg = target
                Session.recordsOpen = target > 0.5f
                return@launch
            }
            val dur = if (target > from) 300 else 240
            var t = 0
            while (t <= dur) {
                if (Session.recDragging) return@launch
                val k = (t.toFloat() / dur).coerceIn(0f, 1f)
                val e = if (target > from) 1f - (1f - k) * (1f - k) * (1f - k) else k * k * k
                Session.recProg = from + (target - from) * e
                kotlinx.coroutines.delay(16)
                t += 16
            }
            Session.recProg = target
            Session.recordsOpen = target > 0.5f
        }
    }

    fun open(scope: kotlinx.coroutines.CoroutineScope) = anim(scope, 1f)
    fun close(scope: kotlinx.coroutines.CoroutineScope) = anim(scope, 0f)
}

@Composable
internal fun RecordsOverlay() {
    var mounted by remember { mutableStateOf(false) }
    val prog = Session.recProg
    LaunchedEffect(Session.recordsOpen, prog > 0.001f) {
        mounted = Session.recordsOpen || prog > 0.001f
    }
    if (!mounted) return

    var ver by remember { mutableStateOf(0) }
    var tab by remember { mutableStateOf("cases") }
    var q by remember { mutableStateOf("") }
    var detailId by remember { mutableStateOf("") }
    var trashOpen by remember { mutableStateOf(false) }
    var menuId by remember { mutableStateOf("") }
    var menuX by remember { mutableStateOf(0f) }      /* 锚点（根坐标 px） */
    var menuY by remember { mutableStateOf(0f) }
    var menuDots by remember { mutableStateOf(false) } /* true = 从 ⋮ 打开，菜单右沿对齐它 */
    var swId by remember { mutableStateOf("") }
    var swDx by remember { mutableStateOf(0f) }
    var canvasW by remember { mutableStateOf(0f) }
    var canvasH by remember { mutableStateOf(0f) }
    var panelW by remember { mutableStateOf(0f) }
    val rowY = remember { mutableStateMapOf<String, Float>() }
    val dens = LocalDensity.current
    val delW = with(dens) { 76.dp.toPx() }
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    /* 松手：用 easeOutBack 滑到终点（先冲过头一点再回来，Q 弹），不是线性也不是直接吸附 */
    fun settleRow() {
        val from = swDx
        val target = if (swDx < -delW * 0.4f) -delW else 0f
        if (from == target) return
        scope.launch {
            val dur = 300
            var t = 0
            while (t <= dur) {
                val k = t.toFloat() / dur
                val c1 = 1.70158f
                val c3 = c1 + 1f
                val e = 1f + c3 * (k - 1f) * (k - 1f) * (k - 1f) + c1 * (k - 1f) * (k - 1f)
                swDx = from + (target - from) * e
                kotlinx.coroutines.delay(16)
                t += 16
            }
            swDx = target
            if (target == 0f) swId = ""
        }
    }

    val all = remember(ver, Session.recordsOpen) { RecStore.load().reversed() }
    val dead = remember(ver, Session.recordsOpen) { RecStore.loadDeleted() }
    val rows = remember(all, q) {
        if (q.isBlank()) all else all.filter { r ->
            ((r["q"] ?: "") + (r["duanci"] ?: "")).lowercase().contains(q.lowercase())
        }
    }
    val detail = rows.firstOrNull { it["id"] == detailId }

    Box(modifier = Modifier.fillMaxSize().onGloballyPositioned {
        canvasW = it.size.width.toFloat()
        canvasH = it.size.height.toFloat()
    }) {
        /* 右边露出主界面那条：点一下收抽屉 */
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0.07f, 0.06f, 0.05f, 0.10f * Session.recProg))
                .tapNoIndication { RecDrawer.close(scope) }
        )
        Box(
            modifier = Modifier
                .fillMaxWidth(0.72f)
                .fillMaxHeight()
                .align(Alignment.CenterStart)
                .onGloballyPositioned { panelW = it.size.width.toFloat() }
                .graphicsLayer { translationX = -panelW * (1f - Session.recProg) }
                .clip(RoundedCornerShape(topEnd = 22.dp, bottomEnd = 22.dp))
                .glassMaterial(RoundedCornerShape(topEnd = 22.dp, bottomEnd = 22.dp), drawer = true)
                /* ⚠ 面板自己吃掉空白处的点击：否则会**穿透到后面那层**（点了就关抽屉/跳回主界面） */
                .tapNoIndication { menuId = "" }
                /* 左滑删除：手势挂在**面板**这层（行内那层收不到拖动，只到点击），
                   起手按 y 认最近的一行；松手 easeOutBack 弹到位 */
                .pointerInput(Unit) {
                    var activeId = ""
                    detectHorizontalDragGestures(
                        onDragStart = { off ->
                            val yy = off.y
                            val rowH = with(dens) { 64.dp.toPx() }
                            var best = ""
                            /* 先按「落在这一行的区间里」找；找不到再退回最近的一行 */
                            for (rr in rows) {
                                val id = rr["id"] ?: ""
                                val y0 = rowY[id] ?: -1f
                                if (y0 >= 0f && yy >= y0 - 6f && yy <= y0 + rowH) { best = id; break }
                            }
                            if (best == "") {
                                var bestD = Float.MAX_VALUE
                                for (rr in rows) {
                                    val id = rr["id"] ?: ""
                                    val y0 = rowY[id] ?: -1f
                                    if (y0 < 0f) continue
                                    val d = kotlin.math.abs(y0 - yy)
                                    if (d < bestD) { bestD = d; best = id }
                                }
                            }
                            activeId = best
                            if (activeId != "") {
                                if (swId != activeId) { swId = activeId; swDx = 0f }
                                menuId = ""
                            }
                        },
                        onDragEnd = { if (activeId != "") settleRow() },
                        onDragCancel = { if (activeId != "") settleRow() },
                        onHorizontalDrag = { _, amount ->
                            if (activeId != "") swDx = (swDx + amount).coerceIn(-delW, 0f)
                        },
                    )
                }
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                Column(modifier = Modifier.fillMaxSize()) {
                    /* 搜索框 */
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(start = 14.dp, end = 12.dp, top = 56.dp, bottom = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(
                            modifier = Modifier
                                .weight(1f)
                                .height(38.dp)
                                .clip(RoundedCornerShape(19.dp))
                                .glassMaterial(RoundedCornerShape(19.dp), control = true)
                                .padding(horizontal = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            SearchGlyph()
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(modifier = Modifier.weight(1f).height(20.dp)) {
                                if (q.isEmpty()) {
                                    Text_(text = "搜索卦例内容…", fontSize = 12f, lineHeight = 18f, color = KY_DIM2)
                                }
                                BasicTextField(
                                    value = q,
                                    onValueChange = { q = it },
                                    modifier = Modifier.fillMaxWidth(),
                                    textStyle = TextStyle(fontSize = 12f.sp, lineHeight = 18f.sp, color = KY_INK),
                                    cursorBrush = SolidColor(KY_INK),
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier.width(34.dp).height(34.dp).tapNoIndication { RecDrawer.close(scope) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text_(text = "×", fontSize = 17f, lineHeight = 22f, color = KY_DIM2)
                        }
                    }
                    /* 页签 */
                    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp)) {
                        RecTab("卦例", tab == "cases") { tab = "cases"; detailId = ""; menuId = "" }
                        Spacer(modifier = Modifier.width(16.dp))
                        RecTab("准则 " + RecStore.loadRules().size, tab == "rules") { tab = "rules"; detailId = ""; menuId = "" }
                        Spacer(modifier = Modifier.weight(1f))
                    }
                    Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(KY_LINE))

                    when {
                        tab == "rules" -> Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                            val rs = RecStore.loadRules()
                            if (rs.isEmpty()) {
                                Box(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                                    Text_(
                                        text = "还没有准则。\n准则只从【你确认过的复盘】里来——不自动写、不偷偷学。",
                                        fontSize = 11.5f,
                                        lineHeight = 21f,
                                        color = KY_DIM2,
                                    )
                                }
                            } else {
                                LazyColumn(modifier = Modifier.fillMaxSize()) {
                                    rs.forEachIndexed { idx, r ->
                                        item(key = "rule-" + (r["id"] ?: idx.toString())) {
                                            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 9.dp)) {
                                                Text_(
                                                    text = "第 " + (idx + 1) + " 条 · " + (r["at"] ?: "") + (if ((r["gua"] ?: "").isNotEmpty()) " · " + r["gua"] else ""),
                                                    fontSize = 10f,
                                                    lineHeight = 16f,
                                                    color = KY_DIM2,
                                                )
                                                Spacer(modifier = Modifier.height(3.dp))
                                                Text_(text = r["rule"] ?: "", fontSize = 12.5f, lineHeight = 21f)
                                                val why = r["why"] ?: ""
                                                if (why.isNotEmpty()) {
                                                    Spacer(modifier = Modifier.height(3.dp))
                                                    Text_(text = "依据：" + why, fontSize = 10.5f, lineHeight = 18f, color = KY_DIM)
                                                }
                                                Spacer(modifier = Modifier.height(5.dp))
                                                SetBtn("删掉这条准则", danger = true, small = true) { RecStore.delRule(r["id"] ?: ""); ver++ }
                                            }
                                            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(KY_LINE))
                                        }
                                    }
                                }
                            }
                        }

                        /* ---- 详情（早先那一版 Detail） ---- */
                        detail != null -> Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                            RecDetail(
                                r = detail,
                                onChange = { ver++ },
                                onBack = { detailId = "" },
                                /* 早先那一版写完准则会 sdbTab('rules')：详情收起、落在准则列表上 */
                                onRuleWritten = { detailId = ""; tab = "rules" },
                            )
                        }

                        rows.isEmpty() -> Box(modifier = Modifier.weight(1f).fillMaxWidth().padding(16.dp)) {
                            Text_(
                                text = if (q.isBlank())
                                    "还没有记录。\n每起一卦都会自动记进这里。事后回来标一下准不准——错的卦才值钱。"
                                else "没有匹配的记录。",
                                fontSize = 11.5f,
                                lineHeight = 21f,
                                color = KY_DIM2,
                            )
                        }

                        else -> LazyColumn(modifier = Modifier.weight(1f).fillMaxWidth()) {
                            var lastDay = ""
                            rows.forEach { r ->
                                val id = r["id"] ?: ""
                                val day = (r["t"] ?: "").take(10)
                                if (day != lastDay) {
                                    lastDay = day
                                    item(key = "d-" + day) { DayHeader(day) }
                                }
                                item(key = "r-" + id) {
                                    RecRow(
                                        r = r,
                                        swipedDx = if (swId == id) swDx else 0f,
                                        delW = delW,
                                        onY = { y -> rowY[id] = y },
                                        onOpen = { detailId = id },
                                        /* 这里累加（不能用行里捕获的 dx，pointerInput(Unit) 会把它冻在首帧） */
                                        onSwipe = { d2 -> swId = id; swDx = (swDx + d2).coerceIn(-delW, 0f) },
                                        onSwipeEnd = { settleRow() },
                                        onMenu = { mx, my, dots ->
                                            /* 长按记录 / 点 ⋮ 都走这里：重档震动一下（要的） */
                                            Platform.haptic?.invoke(2)
                                            menuId = id
                                            menuX = mx
                                            menuY = my
                                            menuDots = dots
                                        },
                                        onDelete = {
                                            RecStore.del(id)
                                            swId = ""; swDx = 0f
                                            ver++
                                        },
                                    )
                                }
                            }
                            item { Spacer(modifier = Modifier.height(12.dp)) }
                        }
                    }

                    /* 底栏：回收站胶囊 + 分隔 + 居中设置 */
                    if (detail == null) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Row(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(36.dp)
                                        .clip(RoundedCornerShape(18.dp))
                                        .glassMaterial(RoundedCornerShape(18.dp), control = true)
                                        .tapNoIndication { trashOpen = !trashOpen }
                                        .padding(horizontal = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text_(
                                        text = "回收站 · " + dead.size + " 则",
                                        fontSize = 11.5f,
                                        lineHeight = 18f,
                                        color = KY_DIM2,
                                    )
                                    Spacer(modifier = Modifier.weight(1f))
                                    Text_(text = if (trashOpen) "˄" else "˅", fontSize = 11f, lineHeight = 16f, color = KY_DIM2)
                                }
                            }
                            if (trashOpen) {
                                Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp)) {
                                    if (dead.isEmpty()) {
                                        Text_(
                                            text = "回收站是空的。删掉的记录会先来这里，可以还原。",
                                            fontSize = 10.5f,
                                            lineHeight = 18f,
                                            color = KY_DIM2,
                                        )
                                    } else {
                                        dead.takeLast(10).forEach { d ->
                                            val id = d["id"] ?: ""
                                            Row(
                                                modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                Text_(
                                                    text = (d["q"] ?: ""),
                                                    fontSize = 11f,
                                                    lineHeight = 18f,
                                                    maxLines = 1,
                                                    color = KY_DIM,
                                                    modifier = Modifier.weight(1f),
                                                )
                                                SetBtn("还原", small = true) { RecStore.restore(id); ver++ }
                                                Spacer(modifier = Modifier.width(6.dp))
                                                SetBtn("彻底删", danger = true, small = true) { RecStore.purge(id); ver++ }
                                            }
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                }
                            }
                            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(KY_LINE))
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                                    .tapNoIndication {
                                        RecDrawer.close(scope)
                                        dismissIme()
                                        Session.settingsOpen = true
                                    },
                                horizontalArrangement = com.tencent.kuikly.compose.foundation.layout.Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text_(text = "⚙  设置", fontSize = 12.5f, lineHeight = 20f, color = KY_DIM)
                                /* 缺 Key 的小圆点（早先那一版 #setDot：`.dot` 空心、配好了 `.dot.on` 变实心绿）
                                   —— K 里设置入口在抽屉底部，点就挂在这一行右端 */
                                Spacer(modifier = Modifier.width(6.dp))
                                val llmOk = LlmStore.missing(LlmStore.load()).isEmpty()
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(if (llmOk) KY_OK else Color.Transparent)
                                        .border(1.dp, if (llmOk) KY_OK else KY_DIM2, CircleShape),
                                )
                            }
                        }
                    }
                }

                /* ---- ⋮ 贴行浮出菜单（早先那一版 .cr-menu / sheetActs） ---- */
                val rec = rows.firstOrNull { it["id"] == menuId }
                if (rec != null) {
                    /* ---- 位置：长按贴手指、点 ⋮ 对齐 ⋮；放不下就翻到上面 ---- */
                    val nItem = if (rec["ans"] == "model") 6 else 5
                    val mw = with(dens) { 150.dp.toPx() }
                    val mh = with(dens) { (41f * nItem + 8f).dp.toPx() }
                    val gap = with(dens) { 6.dp.toPx() }
                    var mx = if (menuDots) menuX - mw else menuX - with(dens) { 6.dp.toPx() }
                    mx = mx.coerceIn(
                        with(dens) { 8.dp.toPx() },
                        (canvasW - mw - with(dens) { 8.dp.toPx() }).coerceAtLeast(with(dens) { 8.dp.toPx() }),
                    )
                    var my = menuY + gap
                    val flip = canvasH > 0f && my + mh + with(dens) { 10.dp.toPx() } > canvasH
                    if (flip) my = (menuY - mh - gap).coerceAtLeast(with(dens) { 10.dp.toPx() })
                    /* ---- 入场：170ms 淡入 + 6dp 位移（：「出现得如此突然」）---- */
                    var menuShown by remember(menuId) { mutableStateOf(false) }
                    LaunchedEffect(menuId) { menuShown = true }
                    val mp by com.tencent.kuikly.compose.animation.core.animateFloatAsState(
                        targetValue = if (menuShown) 1f else 0f,
                        animationSpec = com.tencent.kuikly.compose.animation.core.tween(
                            170,
                            easing = com.tencent.kuikly.compose.animation.core.CubicBezierEasing(0.22f, 1f, 0.36f, 1f),
                        ),
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .tapNoIndication { menuId = "" }
                    )
                    Column(
                        modifier = Modifier
                            .width(150.dp)
                            .offset(x = with(dens) { mx.toDp() }, y = with(dens) { my.toDp() })
                            .graphicsLayer {
                                alpha = mp
                                translationY = (1f - mp) * (if (flip) -6f else 6f) * dens.density
                            }
                            .clip(RoundedCornerShape(12.dp))
                            .glassMaterial(RoundedCornerShape(12.dp), popup = true)
                            .padding(vertical = 4.dp)
                    ) {
                        MenuItem("看这一卦") {
                            menuId = ""; detailId = rec["id"] ?: ""
                        }
                        MenuItem("应验") {
                            RecStore.setFb(rec["id"] ?: "", "对"); menuId = ""; ver++
                        }
                        MenuItem("没应验") {
                            RecStore.setFb(rec["id"] ?: "", "错"); menuId = ""; ver++
                        }
                        /* 早先那一版只有模型解过的才有「接着问」 */
                        if (rec["ans"] == "model") {
                            MenuItem("接着问") {
                                menuId = ""; detailId = rec["id"] ?: ""
                            }
                        }
                        MenuItem("复制断辞") {
                            val d = rec["duanci"] ?: ""
                            if (d.isNotEmpty()) Platform.copy?.invoke(plainDuanci(d))
                            menuId = ""
                            Session.say(if (d.isEmpty()) "这一卦没出过断辞。" else "断辞已复制。")
                        }
                        MenuItem("删除", danger = true) {
                            RecStore.del(rec["id"] ?: ""); menuId = ""; ver++
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MenuItem(label: String, danger: Boolean = false, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(41.dp)
            .tapNoIndication { onClick() }
            .padding(horizontal = 14.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Text_(
            text = label,
            fontSize = 12.5f,
            lineHeight = 20f,
            color = if (danger) Color(0.70f, 0.26f, 0.22f) else KY_INK,
        )
    }
}

/* 一行：左滑露出「删除」（跟手，宽随拖距） */
@Composable
private fun RecRow(
    r: Rec,
    swipedDx: Float,
    delW: Float,
    onY: (Float) -> Unit,
    onOpen: () -> Unit,
    onSwipe: (Float) -> Unit,
    onSwipeEnd: () -> Unit,
    /* x,y = 根坐标下的锚点；dots = 来自 ⋮（菜单右沿对齐它）还是长按（贴着手指） */
    onMenu: (Float, Float, Boolean) -> Unit,
    onDelete: () -> Unit,
) {
    val fb = r["fb"] ?: ""
    val dens = LocalDensity.current
    val dx = swipedDx
    /* 两个块在根坐标里的位置：长按点 / ⋮ 的锚点都靠它换算（别再按行高猜） */
    var qAt by remember { mutableStateOf(com.tencent.kuikly.compose.ui.geometry.Offset.Zero) }
    var dotAt by remember { mutableStateOf(com.tencent.kuikly.compose.ui.geometry.Offset.Zero) }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 10.dp, vertical = 4.dp)
            .onGloballyPositioned { onY(it.localToRoot(com.tencent.kuikly.compose.ui.geometry.Offset.Zero).y) }
    ) {
        /* 删除键（贴着右边，宽随拖距） */
        if (dx < 0f) {
            Box(
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .width(with(dens) { (-dx).toFloat().toDp() })
                    .height(with(dens) { 56.dp })
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color(0.72f, 0.20f, 0.16f))
                    .tapNoIndication { onDelete() },
                contentAlignment = Alignment.Center,
            ) {
                Text_(text = "删除", fontSize = 12.5f, lineHeight = 18f, color = Color(1f, 1f, 1f))
            }
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .graphicsLayer { translationX = dx }
                .clip(RoundedCornerShape(14.dp))
                .background(Color.Transparent),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            /* 手势层与点击层分开：外层只管左滑，内层只管点开（同一层会把 ⋮ 的点击吃掉） */
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .tapNoIndication { }
                    .padding(start = 10.dp, end = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text_(text = monthDay(r["t"] ?: ""), fontSize = 10f, lineHeight = 16f, color = KY_DIM2)
                Spacer(modifier = Modifier.width(8.dp))
                /* 只有「所问」这一块可点开；⋮ 是另一块，别把点击抢走。
                   长按同一块 = 出那个选项面板（早先那一版：长按一条记录、或点 ⋮，都是同一个面板） */
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp)
                        .onGloballyPositioned {
                            qAt = it.localToRoot(com.tencent.kuikly.compose.ui.geometry.Offset.Zero)
                        }
                        .tapOrLongPress(
                            onTap = { if (dx < 0f) onSwipeEnd() else onOpen() },
                            onLongPress = { if (dx < 0f) onSwipeEnd() else onMenu(qAt.x, qAt.y + with(dens) { 28.dp.toPx() }, false) },
                            onLongPressAt = { off ->
                                if (dx < 0f) onSwipeEnd()
                                else onMenu(qAt.x + off.x, qAt.y + off.y, false)
                            },
                        ),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    Text_(
                        text = r["q"] ?: "",
                        fontSize = 12.5f,
                        lineHeight = 20f,
                        weight = 500,
                        maxLines = 1,
                    )
                }
                Box(
                    modifier = Modifier
                        .width(34.dp)
                        .height(34.dp)
                        .onGloballyPositioned {
                            dotAt = it.localToRoot(com.tencent.kuikly.compose.ui.geometry.Offset.Zero)
                        }
                        .tapNoIndication {
                            /* 锚点 = ⋮ 的右下角：菜单右沿对齐它、贴在它下面 */
                            val s = with(dens) { 34.dp.toPx() }
                            onMenu(dotAt.x + s, dotAt.y + s, true)
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    Text_(text = "⋮", fontSize = 15f, lineHeight = 20f, color = KY_DIM2)
                }
            }
        }
    }
}

/* 详情（早先那一版 Detail：逐节照抄文案） */
@Composable
private fun RecDetail(r: Rec, onChange: () -> Unit, onBack: () -> Unit, onRuleWritten: () -> Unit = {}) {
    val id = r["id"] ?: ""
    val fb = r["fb"] ?: ""
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .height(30.dp)
                    .clip(RoundedCornerShape(15.dp))
                    .tapNoIndication { onBack() }
                    .padding(horizontal = 4.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text_(text = "‹ 返回列表", fontSize = 12f, lineHeight = 18f, color = KY_DIM)
            }
            Spacer(modifier = Modifier.weight(1f))
            Text_(text = "复盘", fontSize = 10.5f, lineHeight = 16f, color = KY_DIM2)
        }
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(KY_LINE))
        LazyColumn(modifier = Modifier.weight(1f).fillMaxWidth()) {
            item {
                Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                    SecLabel("所问")
                    Text_(text = r["q"] ?: "", fontSize = 13.5f, lineHeight = 23f)
                    val bg = r["bg"] ?: ""
                    if (bg.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        SecLabel("背景")
                        Text_(text = bg, fontSize = 12f, lineHeight = 21f, color = KY_DIM)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    SecLabel("起卦")
                    Text_(text = r["gua"] ?: "", fontSize = 13.5f, lineHeight = 23f, serif = true)
                    Text_(
                        text = "事类：" + (r["cat"] ?: "通用") + " · 记于 " + (r["t"] ?: ""),
                        fontSize = 10.5f,
                        lineHeight = 17f,
                        color = KY_DIM2,
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    SecLabel("当时的断辞")
                    val du = r["duanci"] ?: ""
                    if (du.isBlank()) {
                        Text_(text = "这一卦没出过断辞。", fontSize = 10.5f, lineHeight = 17f, color = KY_DIM2)
                    } else {
                        DocView(du)
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    SecLabel("准不准 · 实际情况")
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        SetBtn(if (fb == "对") "应验 ✓" else "应验", primary = fb == "对") {
                            RecStore.setFb(id, "对"); onChange()
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        SetBtn(if (fb == "错") "没应验 ✓" else "没应验", primary = fb == "错") {
                            RecStore.setFb(id, "错"); onChange()
                        }
                        Spacer(modifier = Modifier.weight(1f))
                        SetBtn("删掉这则", danger = true) { RecStore.del(id); onChange(); onBack() }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    SetLabel("实际情况")
                    SetField(r["note"] ?: "", { RecStore.setNote(id, it) }, ph = "后来到底怎么着了？写一句，复盘要用它")

                    /* ---- 在这卦里的追问（早先那一版 thread） ---- */
                    val th = threadOf(r)
                    if (th.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(16.dp))
                        SecLabel("在这卦里的追问（" + th.size + "）")
                        th.forEach { it2 ->
                            Text_(text = it2.first, fontSize = 12.5f, lineHeight = 21f, weight = 500)
                            Spacer(modifier = Modifier.height(3.dp))
                            Text_(text = it2.second, fontSize = 12f, lineHeight = 20f, color = KY_DIM)
                            Spacer(modifier = Modifier.height(9.dp))
                        }
                    }

                    /* ---- 复盘（标了「没应验」才有；早先那一版会自动跑一次） ---- */
                    if (fb == "错") {
                        Spacer(modifier = Modifier.height(16.dp))
                        RvArea(r = r, onChange = onChange, onRuleWritten = onRuleWritten)
                    }

                    /* ---- 接着问 ---- */
                    Spacer(modifier = Modifier.height(16.dp))
                    if (r["ans"] == "model") {
                        SecLabel("接着问（还是这一卦）")
                        FollowAsk(r = r, onChange = onChange)
                    } else {
                        SecLabel("接着问")
                        Text_(
                            text = "用模型解过这一卦之后，这里就能接着问。",
                            fontSize = 10.5f,
                            lineHeight = 18f,
                            color = KY_DIM2,
                        )
                    }
                    Spacer(modifier = Modifier.height(28.dp))
                }
            }
        }
    }
}

@Composable
private fun SecLabel(t: String) {
    Text_(
        text = t,
        fontSize = 10.5f,
        lineHeight = 17f,
        letterSpacing = 1.5f,
        color = KY_DIM2,
        modifier = Modifier.padding(bottom = 5.dp),
    )
}

private fun monthDay(t: String): String {
    if (t.length < 10) return t
    val mm = t.substring(5, 7).trimStart('0')
    val dd = t.substring(8, 10).trimStart('0')
    return mm + "·" + dd
}

@Composable
private fun DayHeader(day: String) {
    val today = kotlinx.datetime.Clock.System.now()
        .toLocalDateTime(kotlinx.datetime.TimeZone.currentSystemDefault())
    fun p(x: Int) = if (x < 10) "0$x" else "$x"
    val td = "" + today.year + p(today.monthNumber) + p(today.dayOfMonth)
    val ydDate = kotlinx.datetime.LocalDate.fromEpochDays(today.date.toEpochDays() - 1)
    val yd = "" + ydDate.year + p(ydDate.monthNumber) + p(ydDate.dayOfMonth)
    val label = when (day.replace("-", "")) {
        td -> "今天"
        yd -> "昨天"
        else -> {
            val mm = day.drop(5).take(2).trimStart('0')
            val dd = day.drop(8).take(2).trimStart('0')
            if (day.substring(0, 4) == td.substring(0, 4)) mm + " 月 " + dd + " 日" else day
        }
    }
    Text_(
        text = label,
        fontSize = 11f,
        lineHeight = 18f,
        color = KY_DIM2,
        modifier = Modifier.padding(start = 14.dp, top = 14.dp, bottom = 6.dp),
    )
}

@Composable
private fun RecTab(label: String, on: Boolean, onClick: () -> Unit) {
    Column(
        modifier = Modifier.tapNoIndication { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text_(
            text = label,
            fontSize = 12.5f,
            lineHeight = 20f,
            weight = if (on) 500 else 400,
            color = if (on) KY_INK else KY_DIM2,
            modifier = Modifier.padding(vertical = 8.dp),
        )
        Box(
            modifier = Modifier
                .width(if (on) 18.dp else 0.dp)
                .height(2.dp)
                .background(if (on) KY_ACCENT else Color(0f, 0f, 0f, 0f))
        )
    }
}

@Composable
private fun SearchGlyph() {
    Box(modifier = Modifier.width(13.dp).height(13.dp)) {
        Box(
            modifier = Modifier
                .width(9.dp)
                .height(9.dp)
                .clip(RoundedCornerShape(5.dp))
                .border(1.2f.dp, KY_DIM2, RoundedCornerShape(5.dp))
                .align(Alignment.TopStart)
        )
        Box(
            modifier = Modifier
                .width(1.2f.dp)
                .height(5.dp)
                .align(Alignment.BottomEnd)
                .graphicsLayer { rotationZ = -45f }
                .background(KY_DIM2)
        )
    }
}
