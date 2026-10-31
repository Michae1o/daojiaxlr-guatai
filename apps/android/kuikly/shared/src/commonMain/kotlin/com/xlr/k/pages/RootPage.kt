package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.ComposeContainer
import com.tencent.kuikly.compose.animation.AnimatedContent
import com.tencent.kuikly.compose.animation.core.Animatable
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.animation.fadeIn
import com.tencent.kuikly.compose.animation.fadeOut
import com.tencent.kuikly.compose.animation.scaleIn
import com.tencent.kuikly.compose.animation.scaleOut
import com.tencent.kuikly.compose.animation.togetherWith
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.ui.draw.drawBehind
import com.tencent.kuikly.compose.foundation.gestures.detectHorizontalDragGestures
import com.tencent.kuikly.compose.foundation.gestures.detectTapGestures
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Row
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.fillMaxHeight
import com.tencent.kuikly.compose.ui.draw.clipToBounds
import com.tencent.kuikly.compose.ui.layout.onSizeChanged
import com.tencent.kuikly.compose.ui.platform.LocalDensity
import com.tencent.kuikly.compose.foundation.layout.fillMaxWidth
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.foundation.layout.size
import com.tencent.kuikly.compose.foundation.layout.width
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.setContent
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.input.pointer.pointerInput
import com.tencent.kuikly.compose.ui.unit.dp
import com.tencent.kuikly.core.annotations.Page
import com.xlr.k.judge.autoCat
import com.xlr.k.judge.buildContext
import com.xlr.k.judge.castByClock
import com.xlr.k.judge.castByDate
import com.xlr.k.judge.castByNums
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlinx.coroutines.launch

/* 三个步骤：壹（问卦）/ 贰（起卦）/ 叁（断卦）。
   早先的实现把步骤挂在 html[data-step] 上、由一堆选择器分别管显隐；这里收成一个枚举 + 一次 when。 */
internal enum class XlrStep(val ch: String, val label: String) {
    YI("壹", "问卦"),
    GUA("贰", "起卦"),
    JIE("叁", "断卦");

    fun next(): XlrStep = when (this) {
        YI -> GUA
        GUA -> JIE
        JIE -> JIE
    }

    fun prev(): XlrStep = when (this) {
        YI -> YI
        GUA -> YI
        JIE -> GUA
    }
}

/* 跟手参数（照 phoneAnim.js）：FOLLOW=.86、SWIPE_MIN=110、EDGE_MAX=54、
   缩放 1-.06p、透明度 1-min(.42,|out|/320)、回弹 max(.2,.4-.18p) 秒 */
private const val FOLLOW = 0.86f
private const val SWIPE_MIN = 110f
private const val EDGE_MAX = 54f

/* 旧 drawBagua 的池子（phoneAnim BAGUA_ALL）：滑动手势期步进条按进度换这四个字 */
private val BAGUA_ALL = listOf("乾", "兑", "离", "震", "巽", "坎", "艮", "坤")

@Page("Yi")
class YiPage : ComposeContainer() {

    override fun willInit() {
        super.willInit()
        setContent {
            RootScreen()
        }
    }
}

@Composable
private fun RootScreen() {
    var step by remember { mutableStateOf(XlrStep.YI) }
    /* 一屏宽（px）。三页并排，轨道按 -index*w + 跟手位移 平铺 */
    var wPx by remember { mutableStateOf(0f) }
    /* 轨道当前平移量（px，负值＝往左走）。跟手时同步改它，落位时用 settle 动画到目标 */
    var posX by remember { mutableStateOf(0f) }
    val settle = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    var settling by remember { mutableStateOf(false) }
    val dens = LocalDensity.current
    /* 旧 SWIPE_MIN=110（CSS px）⇒ 换算成这个屏的物理像素，给「途中闪八卦」的进度用 */
    val swipeMinPx = with(dens) { SWIPE_MIN.dp.toPx() }

    /* 真正起卦：按当前「起卦方式」取数 → 判据上下文 → 进贰页（旧 castCore.goCast）。
       ⚠ 早先的实现的三路分支与报错句逐字照抄；报数没填全 ⇒ 当场提示、不播四拍。 */
    fun pad2(v: Int): String = if (v < 10) "0$v" else "$v"

    val askErr: () -> String = {
        val q = Session.q.trim()
        when {
            q.isEmpty() -> "先写清楚你要问的事。"
            q.length < 4 -> "问题太短了——「问什么，卦就答什么」，请写具体一点。"
            Session.mode == "num" && Session.nums().any { it.trim().isEmpty() } -> "三个数都要报。"
            Session.mode == "time" -> {
                val ds = "${Session.dtYear}-${pad2(Session.dtMonth)}-${pad2(Session.dtDay)}"
                val dt = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault())
                if (castByDate(ds, zi = null, dt = dt) == null)
                    "超出内置农历表范围（2020–2040）。改用报数，或手工把农历月日填进报数。"
                else ""
            }
            else -> ""
        }
    }

    val doCast: () -> Unit = doCast@{
        val dt = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault())
        val q = Session.q.trim()
        val bg = Session.bg.trim()
        val c = when (Session.mode) {
            "num" -> castByNums(Session.nums(), zi = if (Session.ziTouchH2) Session.ziH2 else null, dt = dt)
            "time" -> castByDate(
                "${Session.dtYear}-${pad2(Session.dtMonth)}-${pad2(Session.dtDay)}",
                zi = if (Session.ziTouchH1) Session.ziH1 else null,
                dt = dt,
            )
            else -> castByClock(
                dt,
                manualNums = if (Session.numManual && Session.nums().none { it.trim().isEmpty() }) Session.nums() else null,
                ziOverride = if (Session.ziTouchH2) Session.ziH2 else null,
            )
        } ?: return@doCast
        Session.cast = c
        val key = if (Session.catSel == "auto") autoCat("$q $bg") else Session.catSel
        Session.ctx = buildContext(q = q, bg = bg, catKey = key, cast = c)
        /* 起一卦就记一条（早先那一版 `addCase`：每起一卦自动记，同一卦不重记） */
        if (Session.recId.isEmpty()) {
            val cx = Session.ctx!!
            Session.recId = RecStore.add(
                q = cx.q,
                bg = cx.bg,
                gua = c.g[0] + " · " + c.g[1] + " · " + c.g[2] + "　" + c.ziName + "时",
                cat = cx.cat.name,
                catKey = key,
                src = cx.src,
                zi = c.zi,
            )
        }
        step = XlrStep.GUA
        /* 起过一卦 ⇒ 从此三页随便切（：「只要进入 app 起完卦之后，解锁随便切页，
           哪怕点了新开一卦」）。这个标记只在本进程里攒，退掉 app 才回到「没起卦不能切」。 */
        Session.swipeUnlocked = true
        /* 起卦完成 ⇒ 把输入法收回去（：「问卦完成之后，键盘不会自动收回」） */
        Platform.hideIme?.invoke()
    }

    /* 点「起卦」/ 回车：先过一遍校验，过了才播四拍 */
    val tryCast: () -> Unit = {
        val e = askErr()
        Session.err = e
        Session.errOn = e.isNotEmpty()
        if (e.isEmpty() && !CastFx.playing) {
            /* 按下起卦：重档震动（：「点击起卦按钮」也要震） */
            Platform.haptic?.invoke(2)
            /* 新起一卦：接着问区归零（旧 resetAskBox）、这一卦要记新的一条（旧 addCase 每次 show 都记） */
            Follow.reset()
            Session.recId = ""
            Session.followReady = false
            /* 上一卦的模型断辞必须一起清掉 —— 否则新卦进叁页会顶着上一卦的断辞
               。 */
            Session.askAnswer = ""
            Session.askStat = ""
            Session.askModelLabel = ""
            Session.askErr = ""
            Session.askBusy = false
            Session.castSeq += 1
            CastFx.toX = if (wPx > 0f) wPx / 2f else 540f
            CastFx.toY = 720f
            CastFx.playing = true
        }
    }

    /* 初次进入：时辰 / 日期按此刻补齐，三个数按当前方式补齐 */
    LaunchedEffect(Unit) {
        pageScope = scope
        /* 系统返回键交给这里判（宿主 onBackPressed → Platform.onBack） */
        Platform.onBack = { handleBack() }
        Skin.load()   /* 皮肤九套：把上次选的皮肤读回来（没有就黑白） */
        val d = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault())
        Session.ziH1 = ziNow("time")
        Session.ziH2 = ziNow("clock")
        Session.dtYear = d.year
        Session.dtMonth = d.monthNumber
        Session.dtDay = d.dayOfMonth
        refreshClockNums()
    }

    /* 开屏落定之后再弹一次配置引导（旧 maybeWelcome：开屏在场时不弹；看过就不再弹） */
    LaunchedEffect(Session.splashOn) {
        if (Session.splashOn) return@LaunchedEffect
        kotlinx.coroutines.delay(240)
        maybeGuide()
    }

    /* 每 2 秒跟钟（旧 AskPanel 的 setInterval）；只挂在「时间取数」上，换方式即停 */
    LaunchedEffect(Session.mode) {
        if (Session.mode != "clock") return@LaunchedEffect
        while (true) {
            kotlinx.coroutines.delay(2000)
            refreshClockNums()
        }
    }

    /* 按下问卦：先播四拍（念起→气动→成象→落卦），2400ms 才真正起卦，3150ms 收层 */
    LaunchedEffect(CastFx.playing) {
        if (!CastFx.playing) return@LaunchedEffect
        CastFx.clockMs = 0f
        var ms = 0f
        var fired = false
        while (ms < 3150f) {
            CastFx.clockMs = ms
            if (!fired && ms >= 2400f) {
                fired = true
                doCast()
            }
            kotlinx.coroutines.delay(16)
            ms += 16f
        }
        CastFx.clockMs = 3150f
        CastFx.playing = false
    }

    /* 页码变了（手势松手或按钮触发）⇒ 把轨道滑到这一页 */
    LaunchedEffect(step, wPx) {
        if (wPx <= 0f) return@LaunchedEffect
        val target = -step.ordinal * wPx
        if (abs(target - posX) < 1f) return@LaunchedEffect
        settle.snapTo(posX)
        settling = true
        settle.animateTo(target, tween(300, easing = KY_EASE_OUT))
        posX = target
        settling = false
    }

    var dragAcc by remember { mutableStateOf(0f) }
    /* 宿主窗口底色跟着皮肤/昼夜变：详情展开时底部内边距让出来的那块是页面色，不是白（） */
    val pageBg = KY_BG
    SideEffect { Platform.setPageBg?.invoke(pageBg.red, pageBg.green, pageBg.blue) }
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(KY_BG)
            /* 点空白处收输入法（：「点空白部位，输入法不会收回」）：
               按钮/输入框那些子控件自己会把点击吃掉，所以「点空白」才会走到这一层。
               别用「键盘高度 > 0」当闸门——有些机型/输入法的窗口高度量出来是 0，
                 那样这道闸永远不开，用户看到的就是「跟以前一样没反应」。 */
            .pointerInput(Unit) {
                detectTapGestures {
                    Platform.hideIme?.invoke()
                }
            }
            .pointerInput(Unit) {
                /* ⚠ 这些标记必须活在 pointerInput 的协程里、跨手势记住：
                   原来只在 onDragStart 里 `return@detectHorizontalDragGestures`，只是**退出了那个回调**，
                   拖动照样继续走 onHorizontalDrag —— 于是在设置页/抽屉打开时横向一拖，
                   底下这层照样把记录抽屉拉出来（：「设置页面左滑也能唤出记录抽屉，这不合理」）。
                   现在用 blocked 一次性把整次手势掐掉。 */
                var blocked = false
                /* 抽屉跟手模式：壹页往右拖时进入，拖多少给多少，松手再吸附 */
                var drawerMode = false
                var drawerAcc = 0f
                /* 壹页这一拖是往右（开抽屉）还是往左（翻页）——攒够 6px 才定 */
                var dirDecided = false
                var pendingDx = 0f
                /* 起手点（物理像素）—— 用来判断这一拖是不是落在「取数方式」那一排里 */
                var startX = 0f
                var startY = 0f
                var firstMove = true
                /* 刻度震动：上一次抽过的八卦格编号（-1 = 本轮还没抽过） */
                var lastTick = -1
                detectHorizontalDragGestures(
                    onDragStart = {
                        blocked = Session.recordsOpen || Session.settingsOpen ||
                            Session.guideOn || Session.skinMenuOpen
                        drawerMode = false
                        drawerAcc = 0f
                        dirDecided = false
                        pendingDx = 0f
                        if (blocked) return@detectHorizontalDragGestures
                        dragAcc = 0f
                        lastTick = -1
                        firstMove = true
                        posX = if (settling) settle.value else posX
                        settling = false
                        /* 手势期：收起步进条标题、抽 4 个卦名备着（旧 stepCollapseAll + drawBagua） */
                        Session.stepLabelClosed = true
                        Session.stepGlyphOverride = null
                        Session.baguaGrp = BAGUA_ALL.shuffled().take(4)
                    },
                    onDragCancel = {
                        if (blocked) return@detectHorizontalDragGestures
                        if (drawerMode) {
                            drawerMode = false
                            Session.recDragging = false
                            RecDrawer.close(scope)
                            return@detectHorizontalDragGestures
                        }
                        Session.stepGlyphOverride = null
                        settling = true
                        scope.launch {
                            settle.snapTo(posX)
                            settle.animateTo(-step.ordinal * wPx, tween(260, easing = KY_EASE_OUT))
                            posX = -step.ordinal * wPx
                            settling = false
                        }
                    },
                    onDragEnd = {
                        if (blocked) return@detectHorizontalDragGestures
                        if (drawerMode) {
                            drawerMode = false
                            Session.recDragging = false
                            if (Session.recProg > 0.32f) RecDrawer.open(scope) else RecDrawer.close(scope)
                            return@detectHorizontalDragGestures
                        }
                        Session.stepGlyphOverride = null
                        if (wPx > 0f) {
                            val base = -step.ordinal * wPx
                            val d = posX - base          /* 相对当前页的位移 */
                            val cur = step
                            val forward = d < -wPx * 0.22f   /* 往左拖够 ⇒ 下一页 */
                            val backward = d > wPx * 0.22f   /* 往右拖够 ⇒ 上一页 */
                            val want = when {
                                forward -> cur.next()
                                backward -> cur.prev()
                                else -> cur
                            }
                            val allowed = want == XlrStep.YI || Session.swipeUnlocked
                            step = if (allowed) want else cur
                        }
                        settling = true
                        scope.launch {
                            settle.snapTo(posX)
                            val target = -step.ordinal * wPx
                            settle.animateTo(target, tween(300, easing = KY_EASE_OUT))
                            posX = target
                            settling = false
                        }
                    },
                    onHorizontalDrag = { change, amount ->
                        if (blocked) return@detectHorizontalDragGestures
                        /* 起手点：这个重载的 onDragStart 不带坐标，就用第一帧触点位置当起手（差一两像素无妨） */
                        if (firstMove) {
                            firstMove = false
                            startX = change.position.x
                            startY = change.position.y
                            /* ：横滑（翻页 / 拉记录栏）也该先把输入法收回去，
                               不能只在「点空白」那一种情况下收。 */
                            dismissIme()
                        }
                        if (wPx <= 0f) return@detectHorizontalDragGestures
                        val cur = step
                        val base = -cur.ordinal * wPx
                        /* 壹页横拖的两种意思：**往右**= 记录抽屉，**往左**= 翻到贰页。
                           方向要攒够 6px 才敢定（头一两帧的抖动不算方向）。
                           ⚠ 原来不分方向，壹页上一拖就进抽屉模式、左拖被整条吃掉 ——
                              报的「解卦之后回到第一页切不动页」就是它。 */
                        var amt = amount
                        if (!drawerMode && !dirDecided && cur == XlrStep.YI && !Session.recordsOpen) {
                            pendingDx += amount
                            if (abs(pendingDx) < 6f) return@detectHorizontalDragGestures
                            dirDecided = true
                            amt = pendingDx
                            pendingDx = 0f
                            /* 起手落在「取数方式」那一排 ⇒ 让位给药丸横拖，不抢去开抽屉。
                               两个值都是**物理像素**（实测 startY=1878 / segY0=1887 / dens=2.75），直接比。 */
                            val inSeg = Session.segY0 >= 0f && startY >= Session.segY0 - 6f &&
                                startY <= Session.segY1 + 6f
                            if (amt > 0f && !inSeg) {
                                /* 往右 ⇒ 记录抽屉跟手（不是过了阈值才整块弹出来）：
                                   手指拖多少面板就露多少，松手后由 onDragEnd 决定吸到开还是关。 */
                                drawerMode = true
                                drawerAcc = 0f
                                Session.recDragging = true
                                Session.recProg = 0f
                                Session.recordsOpen = true
                                /* 钝感震动：抽屉一被拖起来就闷一下 */
                                com.xlr.k.pages.Platform.haptic?.invoke(1)
                                return@detectHorizontalDragGestures
                            }
                        }
                        if (drawerMode) {
                            /* 往右 = 正；往左 = 往回缩，也跟手 */
                            drawerAcc = (drawerAcc + amt).coerceIn(0f, wPx * 0.55f)
                            val t = (drawerAcc / (wPx * 0.55f)).coerceIn(0f, 1f)
                            /* 非线性：1-(1-t)^2（easeOutQuad）—— 手挪一小段，面板出来一大截 */
                            Session.recProg = 1f - (1f - t) * (1f - t)
                            return@detectHorizontalDragGestures
                        }
                        dragAcc += amt
                        val raw = posX + amt
                        val minX = -(XlrStep.JIE.ordinal) * wPx
                        val noNext = raw < minX - 0.5f || (raw < base && cur == XlrStep.JIE) ||
                            (raw < base && cur == XlrStep.YI && !Session.swipeUnlocked)
                        val noPrev = raw > 0.5f && cur == XlrStep.YI
                        posX = if (noNext || noPrev) {
                            /* 到头：越过边界的部分按阻尼折算 */
                            val over = raw - base
                            base + damp(over, EDGE_MAX * density)
                        } else raw
                        /* 顶栏步进条「途中闪八卦」（旧 phoneAnim swipeMove 里那段）：
                           有目标页时，按拖动进度 0/25/50/75% 依次换成起手抽到的 4 个卦名；
                           到头（阻尼那一路）不换。 */
                        val d = raw - base
                        val hasTarget = if (d < 0f) (cur != XlrStep.JIE && Session.swipeUnlocked) else (cur != XlrStep.YI)
                        val grp = Session.baguaGrp
                        if (hasTarget && grp.isNotEmpty()) {
                            val prog = (abs(d) / swipeMinPx).coerceIn(0f, 1f)
                            val idx = (prog * 4f).toInt().coerceIn(0, grp.size - 1)
                            Session.stepGlyphOverride = grp[idx]
                            /* 刻度震动：八卦名每换一格抽一下（：「让震动跟随八卦的凸显，
                               变成刻度感震动」） */
                            if (idx != lastTick) {
                                lastTick = idx
                                com.xlr.k.pages.Platform.haptic?.invoke(0)
                            }
                        } else {
                            Session.stepGlyphOverride = null
                        }
                    },
                )
            }
    ) {
        AuraLayer()
        /* 皮肤天光（敦煌/莫高窟 的沙壁暖光；其它皮肤只是竖向色阶）—— 必须画成 Canvas 子层 */
        SkinBackdropLayer()
        Box(
            modifier = Modifier.fillMaxSize().background(
                com.tencent.kuikly.compose.ui.graphics.Brush.verticalGradient(
                    listOf(Color(0f, 0f, 0f, 0.02f), Color(0f, 0f, 0f, 0.015f))
                )
            )
        )

        /* 三页各自整屏叠放，靠 translationX 排成一条横轨：
           当前页在 0，下一页在 +w，上一页在 −w；整轨跟着手指走。 */
        Box(
            modifier = Modifier
                .fillMaxSize()
                .clipToBounds()
                .onSizeChanged { if (it.width > 0) wPx = it.width.toFloat() }
        ) {
            val cur = if (settling) settle.value else posX
            Box(modifier = Modifier.fillMaxSize().graphicsLayer { translationX = cur }) {
                YiContent(onCast = tryCast)
            }
            Box(modifier = Modifier.fillMaxSize().graphicsLayer { translationX = cur + wPx }) {
                GuaContent(onNext = { step = XlrStep.JIE }, active = step == XlrStep.GUA, onBack = { step = XlrStep.YI })
            }
            Box(modifier = Modifier.fillMaxSize().graphicsLayer { translationX = cur + wPx * 2f }) {
                JieContent(active = step == XlrStep.JIE, onNewCast = {
                    Session.clear()
                    Session.evidenceOpen = false
                    EvOpen.clear()
                    Session.recId = ""
                    step = XlrStep.YI
                })
            }
        }

        TopBar(step = step)
        SkinMenuOverlay()
        CastFxLayer()
        AskPicker()
        SettingsOverlay()
        RecordsOverlay()
        SplashOverlay()
        GuideOverlay()
        AppToast()
    }
}

private fun backMs(p: Float): Int = (max(0.2f, 0.4f - 0.18f * p) * 1000f).toInt()

/* ---------------- 系统返回键 ----------------
   ：「现在任意页面按手机原生返回会直接退回桌面，这可不对」。
   次序（从最上层往下收）：
     ① 放大图 / 选择面板 / 皮肤菜单 / 断卦依据浮层
     ② 设置页 ⇒ 收设置，回到「记录抽屉打开」那一态（设置是从抽屉点进来的）
     ③ 记录抽屉打开 ⇒ 收回抽屉
     ④ 壹贰叁页 ⇒ 弹一句「再按一下退出」，2.2 秒内再按才真退（Platform.exitApp）
   别在 Activity 里直接 finish。 */
private var backArmedAt = 0L

/** 根组合作用域（抽屉的收/开动画要用它）；RootScreen 里赋值 */
internal var pageScope: kotlinx.coroutines.CoroutineScope? = null

internal fun handleBack(): Boolean {
    if (Session.guideZoom != null) {
        Session.guideZoom = null
        return true
    }
    if (Session.moreOpen) {
        Session.moreOpen = false
        return true
    }
    if (Session.picker != null) {
        Session.picker = null
        return true
    }
    if (Session.skinMenuOpen) {
        Session.skinMenuOpen = false
        return true
    }
    if (Session.evidenceOpen) {
        Session.evidenceOpen = false
        return true
    }
    if (Session.settingsOpen) {
        Session.settingsOpen = false
        Session.settingsPage = ""
        /* 回到「记录抽屉打开」：抽屉直接给满进度（设置在它上面滑走，看不出这一跳） */
        Session.recDragging = false
        Session.recProg = 1f
        Session.recordsOpen = true
        return true
    }
    if (Session.recordsOpen) {
        val sc = pageScope
        if (sc != null) {
            RecDrawer.close(sc)
        } else {
            Session.recordsOpen = false
            Session.recProg = 0f
        }
        return true
    }
    val now = Clock.System.now().toEpochMilliseconds()
    if (backArmedAt > 0L && now - backArmedAt < 2200L) {
        backArmedAt = 0L
        Platform.exitApp?.invoke()
        return true
    }
    backArmedAt = now
    Session.say("再按一下退出")
    Platform.haptic?.invoke(0)
    return true
}

/* 到头阻尼：最多让出 EDGE_MAX，越推越沉 */
private fun damp(dx: Float, edgeMaxPx: Float): Float {
    val s = if (dx < 0f) -1f else 1f
    return s * edgeMaxPx * (1f - 1f / (1f + abs(dx) / (150f * edgeMaxPx / 54f)))
}

/* 收输入法（：「不止点空白，点皮肤、点昼夜、点记录栏、左右滑动，都该收」）。
   统一走这里：键盘没挂就不做，避免多余 clearFocus。 */
internal fun dismissIme() {
    if (Platform.imeVisible) Platform.hideIme?.invoke()
}

@Composable
private fun TopBar(step: XlrStep) {
    val scope = rememberCoroutineScope()
    Column(modifier = Modifier.fillMaxWidth()) {
        Spacer(modifier = Modifier.height(46.dp))
        Box(modifier = Modifier.fillMaxWidth().height(40.dp)) {
            GlassSurface(
                modifier = Modifier.align(Alignment.CenterStart).padding(start = 16.dp).size(40.dp)
                    .tapNoIndication { dismissIme(); RecDrawer.open(scope) },
                shape = RoundedCornerShape(999.dp),
            ) { MenuGlyph() }
            Box(modifier = Modifier.align(Alignment.Center)) {
                StepBadge(step = step.ch, label = step.label)
            }
            Row(modifier = Modifier.align(Alignment.CenterEnd).padding(end = 16.dp)) {
                /* 左：皮肤 —— 单独唤起皮肤菜单浮层（早先那一版 .skinmenu；不是进设置的外观页） */
                GlassSurface(
                    modifier = Modifier.width(43.dp).height(40.dp).tapNoIndication {
                        dismissIme()
                        Session.skinMenuOpen = !Session.skinMenuOpen
                    },
                    shape = RoundedCornerShape(topStart = 999.dp, bottomStart = 999.dp),
                ) { SkinGlyph() }
                /* 右：日夜 —— 照早先那一版 #btnDN：深色套亮太阳（点了回浅色），浅色套亮月亮（点了进黑夜） */
                GlassSurface(
                    modifier = Modifier.width(43.dp).height(40.dp).tapNoIndication {
                        dismissIme()
                        Skin.toggleDayNight()
                    },
                    shape = RoundedCornerShape(topEnd = 999.dp, bottomEnd = 999.dp),
                ) { if (Skin.dark) SunGlyph() else MoonGlyph() }
            }
        }
    }
}
