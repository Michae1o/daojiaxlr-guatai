package com.xlr.k.pages

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.xlr.k.judge.Cast
import com.xlr.k.judge.Context

/* 一卦的会话状态：问句、背景、起卦方式与取数、起卦结果、判据上下文。
   早先的实现挂在 window.__ctx / AskUi 上，这里换成同一进程内的单例。 */
internal object Session {
    var q by mutableStateOf("")
    var bg by mutableStateOf("")
    /* 补充背景是否展开（旧 #bgDet 的 details 开合） */
    var bgOpen by mutableStateOf(false)

    /* 起卦方式：clock 时间取数 / time 月日时 / num 报数（旧 window.__mode） */
    var mode by mutableStateOf("clock")

    /* 详情面板（旧 #castFields 的 off 类；「详情」按钮开合） */
    var detailOpen by mutableStateOf(false)
    /** 壹页卡片的「更多选项」面板（补充背景 / 取数细节 / 事类）——从卡里挪出去，卡变矮 */
    var moreOpen by mutableStateOf(false)
    /** 「报数」那一格的中心（dp，相对取数方式那条药丸的左缘）：报数便捷格要对着它的中轴排。
     *  由 ModeSeg 量出来写这里（：「放到卡片正中间，以报数那两个字为中心轴的正下方」）。 */
    var numAxisRelDp by mutableStateOf(0f)
    /** 详情是不是「用户自己点开的」 */
    var detailManual by mutableStateOf(false)

    /* 三个数（旧 #n1/#n2/#n3 的 value）；手改过就 numManual=true，不再被时钟覆盖 */
    var n1 by mutableStateOf("")
    var n2 by mutableStateOf("")
    var n3 by mutableStateOf("")
    var numManual by mutableStateOf(false)
    /* 离开「报数」时暂存的三个数（旧 window.__numStash） */
    var numsStash: List<String>? = null

    /* 月日时那一路的日期（公历，YYYY-MM-DD） */
    var dtYear by mutableStateOf(2026)
    var dtMonth by mutableStateOf(10)
    var dtDay by mutableStateOf(28)

    /* 两个时辰选择：h2 给时间取数/报数用，h1 给月日时用（旧 #h2 / #h1）。
       ziTouch* = 用户自己点过（点过就按他选的，没点过按当前时辰）。 */
    var ziH2 by mutableStateOf(0)
    var ziTouchH2 by mutableStateOf(false)
    var ziH1 by mutableStateOf(0)
    var ziTouchH1 by mutableStateOf(false)

    /* 事类：auto 或 CATS 的 key（旧 #cat 的 value） */
    var catSel by mutableStateOf("auto")

    /* 当前弹着的选择面板：null / "zi" / "cat" / "year" / "month" / "day" */
    var picker by mutableStateOf<String?>(null)

    /* 起卦前的当场报错（旧 #err 的文案 + errOn） */
    var err by mutableStateOf("")
    var errOn by mutableStateOf(false)

    var cast: Cast? by mutableStateOf(null)
    var ctx: Context? by mutableStateOf(null)

    /** 第几卦（旧 window.__askSeq）：追问还在路上时又起了一卦，答案就不算新的那一卦的 */
    var castSeq by mutableStateOf(0)

    /* 断卦依据整屏浮层是否打开 */
    var evidenceOpen by mutableStateOf(false)

    /* ---- 滑动切页时顶栏步进条的临时字（旧 phoneAnim.js 的 drawBagua / stepSetGlyph）----
       起手抽 4 个不重复卦名，拖到 0/25/50/75% 各换一个；松手或取消即还原成 壹/贰/叁。 */
    var stepGlyphOverride by mutableStateOf<String?>(null)
    /* 手势期强行收起步进条标题（旧 stepCollapseAll；换步后由 StepBadge 自己重新展开 3 秒） */
    var stepLabelClosed by mutableStateOf(false)
    /* 本次手势抽到的卦名（旧 grp） */
    var baguaGrp: List<String> = emptyList()

    /* 「断卦依据」那条在屏幕上的 Y（px），浮层从这里升上去 */
    var evBarY by mutableStateOf(0f)

    /* ---- 模型解卦 / 设置 ---- */
    var settingsOpen by mutableStateOf(false)
    /** 顶栏那颗皮肤按钮弹出的浮层菜单（早先那一版 .skinmenu：贴在按钮下方，点外面关掉） */
    var skinMenuOpen by mutableStateOf(false)

    /* ---- 配置引导（旧 #onbLayer）---- */
    var guideOn by mutableStateOf(false)
    var guideStep by mutableStateOf(0)
    /** 引导里点开的那张配图（null = 没放大） */
    var guideZoom by mutableStateOf<String?>(null)
    /* 记录抽屉 */
    var recordsOpen by mutableStateOf(false)
    /** 「取数方式」那一排在 root 坐标系里的上下边（设计坐标）：根手势判断要不要让位给药丸拖拽用 */
    var segY0 by mutableStateOf(-1f)
    var segY1 by mutableStateOf(-1f)
    /** 抽屉滑出进度 0..1：手指拖着时由手势直接写它（跟手），点开/点关时由 RecDrawer 缓动写它 */
    var recProg by mutableStateOf(0f)
    /** 手指正按着抽屉在拖（拖的时候不许别的缓动抢着改 recProg） */
    var recDragging by mutableStateOf(false)
    /* 当前这一卦在卦例本里的 id（'' = 还没记） */
    var recId by mutableStateOf("")
    /* 设置里的子页："" = 设置总览（六栏列表）；否则是某一栏的 k */
    var settingsPage by mutableStateOf("")
    /* 设置顶栏 tab 选中项（llm/skin/data/about/faq/note）
       ⚠ 别改成 SettingsOverlay 里的局部 remember：这个壳里局部 state 写完不触发重组（实测 ） */
    var settingsTab by mutableStateOf("llm")
    var askBusy by mutableStateOf(false)
    var askErr by mutableStateOf("")
    var askAnswer by mutableStateOf("")
    var askModelLabel by mutableStateOf("")
    /** 状态行：早先那一版 `模型 <model> · 用时 <sec> 秒 · 连接方式：<…>` */
    var askStat by mutableStateOf("")
    /** 「接着问」只有在**模型解卦完**之后才露出来（旧 modelAskCore L139 `FollowUi.set({show:true})`） */
    var followReady by mutableStateOf(false)

    /* 全局小提示（导出/导入/复制之后的那个浮出来的一句话）。空串＝不显示 */
    var toast by mutableStateOf("")
    fun say(msg: String) {
        toast = msg
    }

    /* ---- 开屏 ---- */
    /** 开屏还在（true 时 SplashOverlay 盖着整屏；点「进入」跑完动画才置 false） */
    var splashOn by mutableStateOf(true)
    /** 壹页输入卡在根坐标里的 x/y/w/h（px）。开屏那颗球要落到它身上，得先量到 */
    var cardRect by mutableStateOf<FloatArray?>(null)
    /** 两拍浮现（早先那一版 sl-cinew / sl-late）：先卡里的内容，再顶栏与问候语 */
    var cardReveal by mutableStateOf(false)
    var chromeReveal by mutableStateOf(false)
    /** 卡的壳：飞行的那团东西长到与卡重合（1346ms）之前不露（早先那一版 html.sl-shell） */
    var cardShellOn by mutableStateOf(false)
    /** 壹页提交键（42dp 那枚）在根坐标里的位置：开屏剥出来的小球要滑到它身上 */
    var sendRect by mutableStateOf<FloatArray?>(null)

    val hasGua: Boolean get() = cast != null

    /** 起过至少一卦（本进程内）⇒ 三页从此随便切，哪怕又点了「新开一卦」。
     *  别拿 hasGua 当切页闸门：clear()（新开一卦）会把 cast 清掉，
     *     于是回到壹页又切不动了 —— 报的就是这个 bug。 */
    var swipeUnlocked by mutableStateOf(false)

    fun nums(): List<String> = listOf(n1, n2, n3)

    fun setNums(v: List<String>) {
        n1 = v.getOrElse(0) { "" }
        n2 = v.getOrElse(1) { "" }
        n3 = v.getOrElse(2) { "" }
    }

    fun clear() {
        q = ""
        bg = ""
        cast = null
        ctx = null
        errOn = false
        err = ""
    }
}
