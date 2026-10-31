package com.xlr.k.pages

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import androidx.compose.runtime.setValue
import com.tencent.kuikly.compose.foundation.selection.toggleable
import com.tencent.kuikly.compose.ui.semantics.Role
import com.tencent.kuikly.compose.foundation.background
import com.tencent.kuikly.compose.foundation.border
import com.tencent.kuikly.compose.foundation.layout.size
import com.tencent.kuikly.compose.foundation.layout.Box
import com.tencent.kuikly.compose.foundation.layout.Column
import com.tencent.kuikly.compose.foundation.layout.Row
import com.tencent.kuikly.compose.foundation.layout.Spacer
import com.tencent.kuikly.compose.foundation.layout.fillMaxSize
import com.tencent.kuikly.compose.foundation.layout.fillMaxWidth
import com.tencent.kuikly.compose.foundation.layout.height
import com.tencent.kuikly.compose.foundation.layout.padding
import com.tencent.kuikly.compose.foundation.clickable
import com.tencent.kuikly.compose.foundation.layout.width
import com.tencent.kuikly.compose.foundation.lazy.LazyColumn
import com.tencent.kuikly.compose.foundation.lazy.items
import com.tencent.kuikly.compose.foundation.shape.RoundedCornerShape
import com.tencent.kuikly.compose.ui.Alignment
import com.tencent.kuikly.compose.ui.Modifier
import com.tencent.kuikly.compose.ui.draw.clip
import com.tencent.kuikly.compose.ui.unit.dp
import com.tencent.kuikly.compose.animation.core.Animatable
import com.tencent.kuikly.compose.animation.core.animateFloatAsState
import com.tencent.kuikly.compose.animation.core.tween
import com.tencent.kuikly.compose.foundation.gestures.detectHorizontalDragGestures
import com.tencent.kuikly.compose.foundation.layout.offset
import com.tencent.kuikly.compose.ui.graphics.Color
import com.tencent.kuikly.compose.ui.graphics.graphicsLayer
import com.tencent.kuikly.compose.ui.input.pointer.pointerInput

/* 设置里剩下四栏（外观 / 数据 / 关于 / 常见问题 / 说明）
   正文照抄旧 SettingsScreen.jsx；K 版还没搬到的功能（卦例本、皮肤九套、更新）按钮留着但置灰。 */

/* ---------------- 外观 ---------------- */
@Composable
internal fun SkinPage() {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        item {
            SetLead("点一下立刻生效，会记住。每套不只是换颜色——底色、卡片、强调色、判词色整套跟着换。")

            /* 明暗：照早先那一版 #btnDN 的口径 —— 切到夜就是切到深色那套（黑夜 / 莫高窟），点亮则回上次的浅色套 */
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(veil(0.42f))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text_(text = "日夜", fontSize = 13f, lineHeight = 21f, weight = 500)
                    Text_(
                        text = if (Skin.dark) "现在是深色（" + Skin.def.name + "）" else "现在是浅色（" + Skin.def.name + "）",
                        fontSize = 11f,
                        lineHeight = 18f,
                        color = KY_DIM2,
                    )
                }
                SetBtn(label = if (Skin.dark) "切到白天" else "切到黑夜", small = true) { Skin.toggleDayNight() }
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                    .clip(RoundedCornerShape(12.dp)).background(veil(0.42f))
                    .toggleable(value = Skin.fogMotion, role = Role.Switch, onValueChange = { Skin.updateFogMotion(it) })
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text_("背景雾气动态", fontSize = 13f, lineHeight = 21f, weight = 500)
                    Text_("关闭后保留静态雾色，减少持续动画开销。", fontSize = 11f, lineHeight = 18f, color = KY_DIM2)
                }
                Spacer(Modifier.width(8.dp))
                GlassSwitch(checked = Skin.fogMotion, onChange = { Skin.updateFogMotion(it) })
            }

            var i = 0
            while (i < SKINS.size) {
                val a = SKINS[i]
                val b = SKINS.getOrNull(i + 1)
                Row(modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)) {
                    Box(modifier = Modifier.weight(1f)) { SkinTile(a) }
                    Spacer(modifier = Modifier.width(10.dp))
                    Box(modifier = Modifier.weight(1f)) {
                        if (b != null) SkinTile(b)
                    }
                }
                i += 2
            }
            SetHint("浅色九套都在这儿；「黑夜」「莫高窟」本来就是深色套，点上面「切到黑夜」就能过去。")
            Spacer(modifier = Modifier.height(30.dp))
        }
    }
}

/** 一格皮肤：底色当小块、强调色当点，名字 + 副标题照早先那一版清单 */
@Composable
private fun SkinTile(d: SkinDef) {
    val on = d.key == Skin.cur
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (on) KY_ACCENT_BG else veil(0.42f))
            .border(Skin.borderW, if (on) KY_ACCENT_LINE else KY_LINE, RoundedCornerShape(12.dp))
            .tapNoIndication { Skin.apply(d.key) }
            .padding(horizontal = 12.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        /* 小样：迷你卡（底色 / 卡 / 主色三件） */
        SkinSwatch(d, w = 22.dp, h = 26.dp)
        Spacer(modifier = Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            /* ⚠ 文字用**当前皮肤**的墨色（不是被预览那套的 ink）——否则在深色卡上，
               深色皮肤的深墨名字会看不见（敦煌在黑夜底上就是一片灰） */
            Text_(
                text = d.name,
                fontSize = 13f,
                lineHeight = 20f,
                weight = if (on) 600 else 500,
                color = if (on) KY_ACCENT else KY_INK,
            )
            Text_(text = d.tag, fontSize = 10.5f, lineHeight = 17f, color = KY_DIM2)
        }
        if (on) Text_(text = "当前", fontSize = 11f, lineHeight = 18f, color = KY_ACCENT)
    }
}

/* ---------------- 数据 ---------------- */
@Composable
internal fun DataPage() {
    var msg by remember { mutableStateOf("") }
    var ver by remember { mutableStateOf(0) }
    val caseN = androidx.compose.runtime.remember(ver) { RecStore.load().size }
    val ruleN = androidx.compose.runtime.remember(ver) { RecStore.loadRules().size }
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        item {
            SetDataRow(
                title = "卦例本",
                sub = "记下来的卦。标过「应验/没应验」的，会在下次解卦时一并交给模型作校准。",
                count = caseN.toString() + " 则",
                canExport = caseN > 0,
                onExport = {
                    val path = Platform.saveFile?.invoke("道家小六壬-卦例本.json", RecStore.exportCasesText())
                    msg = if (path == null) "导出失败：写不进「下载」。" else "✓ 已导出 " + caseN + " 则 → " + path
                    Session.say(msg)
                    ver++
                },
                onClear = {
                    RecStore.clearAll()
                    msg = "卦例本已清空（进了回收站，能捞回来）"
                    ver++
                },
                canClear = caseN > 0,
            )
            SetDataRow(
                title = "准则",
                sub = "复盘里你逐条确认过的修正，解卦时会一起交给模型。导得走，换机器不至于从零调教。",
                count = ruleN.toString() + " 条",
                canExport = ruleN > 0,
                onExport = {
                    val path = Platform.saveFile?.invoke("道家小六壬-准则.json", RecStore.exportRulesText())
                    msg = if (path == null) "导出失败：写不进「下载」。" else "✓ 已导出 " + ruleN + " 条准则 → " + path
                    Session.say(msg)
                    ver++
                },
                onClear = {
                    RecStore.clearRules()
                    msg = "准则已清空（卦例本不受影响）"
                    ver++
                },
                canClear = ruleN > 0,
            )
            SetDataRow(
                title = "旧数据导入",
                sub = "从早期版本或别的机器带来的备份。只往里加，不覆盖本机已有的，重复的自动跳过。",
                count = "",
                canExport = true,
                exportLabel = "导入",
                onExport = {
                    Platform.pickText?.invoke { txt ->
                        if (txt == null) {
                            msg = "没读到文件（可能取消了）。"
                        } else {
                            val plain = txt.trimStart('\uFEFF', ' ', '\n', '\r', '\t')
                            var cases: List<com.xlr.k.judge.Rec> = emptyList()
                            var rules: List<com.xlr.k.judge.Rec> = emptyList()
                            try {
                                if (plain.startsWith("[")) {
                                    for (r in com.xlr.k.judge.parseRows(plain)) {
                                        if ((r["rule"] ?: "").isNotEmpty()) rules = rules + r
                                        else if (r.containsKey("q") || r.containsKey("gua")) cases = cases + r
                                    }
                                } else {
                                    cases = com.xlr.k.judge.parseRows(com.xlr.k.judge.sliceArray(plain, "cases"))
                                    rules = com.xlr.k.judge.parseRows(com.xlr.k.judge.sliceArray(plain, "rules"))
                                }
                            } catch (e: Throwable) {
                                msg = "这个文件不是本应用导出的 JSON。"
                                ver++
                                return@invoke
                            }
                            if (cases.isEmpty() && rules.isEmpty()) {
                                msg = "这个文件里没有卦例，也没有准则。"
                            } else {
                                val nc = RecStore.mergeCases(cases)
                                val nr = RecStore.mergeRules(rules)
                                msg = "✓ 导入 " + nc + " 则卦例、" + nr + " 条准则（重复的跳过了）"
                                Session.say(msg)
                            }
                        }
                        ver++
                    }
                },
                onClear = {},
                hideClear = true,
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text_(text = "全部重置", fontSize = 13.5f, lineHeight = 22f, weight = 500)
                    Text_(
                        text = "清掉模型配置、主题选择和卦例本，回到刚装好的状态。",
                        fontSize = 11f,
                        lineHeight = 18f,
                        color = KY_DIM2,
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                /* 两段式确认（K 端没有系统对话框；点一下变「真的要重置？」，4 秒不动自动撤回） */
                var resetArm by remember { mutableStateOf(false) }
                LaunchedEffect(resetArm) {
                    if (resetArm) {
                        kotlinx.coroutines.delay(4000)
                        resetArm = false
                    }
                }
                SetBtn(if (resetArm) "真的要重置？" else "重置", danger = true) {
                    if (!resetArm) {
                        resetArm = true
                    } else {
                        LlmStore.clear()
                        RecStore.wipeCases()
                        resetArm = false
                        msg = "✓ 已重置：模型配置、卦例本都清空了"
                        Session.say(msg)
                        ver++
                    }
                }
            }
            if (msg.isNotEmpty()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text_(text = msg, fontSize = 11.5f, lineHeight = 19f, color = KY_ACCENT, weight = 500)
            }
            SetHint("导出落在「下载/道家小六壬/」里（系统的「文件」App 能看到）。导入从早期版本或别的机器带来的 .json 直接挑文件。")
            Spacer(modifier = Modifier.height(30.dp))
        }
    }
}

@Composable
private fun SetDataRow(
    title: String,
    sub: String,
    count: String,
    canExport: Boolean,
    onExport: () -> Unit,
    onClear: () -> Unit,
    exportLabel: String = "导出",
    hideClear: Boolean = false,
    canClear: Boolean = false,
) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text_(text = title, fontSize = 13.5f, lineHeight = 22f, weight = 500)
                Text_(text = sub, fontSize = 11f, lineHeight = 18f, color = KY_DIM2)
            }
            if (count.isNotEmpty()) {
                Spacer(modifier = Modifier.width(8.dp))
                Text_(text = count, fontSize = 11.5f, lineHeight = 20f, color = KY_DIM2)
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            SetBtn(exportLabel, enabled = canExport, onClick = onExport)
            if (!hideClear) {
                Spacer(modifier = Modifier.width(8.dp))
                SetBtn("清空", enabled = canClear, danger = true, onClick = onClear)
            }
        }
    }
    Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(KY_LINE))
}

/* ---------------- 关于 ---------------- */
@Composable
internal fun AboutPage() {
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var msg by remember { mutableStateOf("") }
    var ready by remember { mutableStateOf<UpdItem?>(null) }

    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        item {
            /* 旧 SettingsScreen.jsx L1194：一行 `<b>道家小六壬 · 卦台</b>　<span>v…</span>`，
               `.about p` 12.5 / line-height 2，名字走 ink、其余走 dim（不是两行、也不是 15 号大字） */
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text_(text = "道家小六壬 · 卦台", fontSize = 12.5f, lineHeight = 25f, color = KY_INK, weight = 500)
                Text_(
                    text = "　v" + (Platform.version ?: "0.1"),
                    fontSize = 12.5f,
                    lineHeight = 25f,
                    color = KY_DIM,
                )
            }
            Spacer(modifier = Modifier.height(10.dp))

            /* app 内更新（早先那一版这一栏只有版本号 + 更新入口；简介/免责已搬「说明」栏） */
            if (Upd.available) {
                Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(KY_LINE))
                Column(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
                    Text_(text = "版本更新", fontSize = 13.5f, lineHeight = 22f, weight = 500)
                    Text_(
                        text = "下好会弹出系统的安装提示，点「安装」就覆盖成新版；卦例和配置都保留。",
                        fontSize = 11f,
                        lineHeight = 18f,
                        color = KY_DIM2,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        SetBtn(
                            label = if (busy) "请稍等…" else if (ready != null) "立即更新" else "检查更新",
                            primary = ready != null,
                            enabled = !busy,
                            onClick = {
                                if (busy) return@SetBtn
                                val it = ready
                                if (it != null) {
                                    /* 第二次点：真下载，下完交系统安装器 */
                                    busy = true
                                    msg = ""
                                    scope.launch {
                                        try {
                                            val p = Upd.download(it)
                                            busy = false
                                            msg = "已下好，正在打开系统安装器…"
                                            try {
                                                Upd.install(p)
                                            } catch (e2: Exception) {
                                                msg = e2.message ?: "打不开系统安装器"
                                            }
                                        } catch (e: Exception) {
                                            busy = false
                                            msg = e.message ?: "下载失败，稍后再试"
                                        }
                                    }
                                } else {
                                    busy = true
                                    msg = ""
                                    scope.launch {
                                        try {
                                            val n = Upd.check()
                                            busy = false
                                            if (n == null) {
                                                msg = "已是最新版本（v" + (Platform.version ?: "?") + "）"
                                                ready = null
                                            } else {
                                                ready = n
                                                msg = "发现新版本 v" + (n.versionName.ifEmpty { "" + n.versionCode }) +
                                                    "　点「立即更新」下载"
                                            }
                                        } catch (e: Exception) {
                                            busy = false
                                            ready = null
                                            msg = e.message ?: "暂时连不上更新服务，稍后再试"
                                        }
                                    }
                                }
                            },
                        )
                    }
                    if (msg.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text_(text = msg, fontSize = 11.5f, lineHeight = 19f, color = KY_ACCENT, weight = 500)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))
            SetHint("起卦、排盘与断卦依据都在本机算；模型断辞由你自己配置的模型服务生成。")
            Spacer(modifier = Modifier.height(30.dp))
        }
    }
}

/* ---------------- 常见问题 ---------------- */
@Composable
internal fun FaqPage() {
    var openQ by remember { mutableStateOf("") }
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        item { SetLead("点一下问题，看怎么办。") }
        items(FAQ_ITEMS) { it ->
            val on = openQ == it.q
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .tapNoIndication { openQ = if (on) "" else it.q }
                    .padding(vertical = 11.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text_(
                        text = it.q,
                        fontSize = 13f,
                        lineHeight = 21f,
                        modifier = Modifier.weight(1f),
                    )
                    Text_(
                        text = if (on) "▾" else "▸",
                        fontSize = 12f,
                        lineHeight = 20f,
                        color = KY_DIM2,
                    )
                }
                if (on) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text_(text = it.a, fontSize = 11.5f, lineHeight = 21f, color = KY_DIM2)
                }
            }
            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(KY_LINE))
        }
        item { Spacer(modifier = Modifier.height(30.dp)) }
    }
}

/* ---------------- 说明 ---------------- */
@Composable
internal fun NotePage() {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        item {
            Text_(
                text = "本软件以邵一尘先生的小六壬神通·卜法卷为基础，部分功能及生成内容由人工智能技术辅助完成，结果仅供参考。所有内容仅供交流、学习使用，不用于商业用途；如涉及版权争议，请权利人联系删除，造成不便敬请谅解。",
                fontSize = 12f,
                lineHeight = 21f,
                color = KY_DIM,
            )
            Spacer(modifier = Modifier.height(10.dp))
            Text_(text = "三条前提：无事不卦、心动即卦、一事不二卦。", fontSize = 12f, lineHeight = 21f, weight = 500)

            Spacer(modifier = Modifier.height(22.dp))
            SetSecTitle("免责声明", top = 0)
            listOf(
                "本软件是传统术数文化的学习与自用工具。起卦、排盘、本机速断与模型断辞都只是按这套体系的推演，不构成预测、承诺或任何专业意见；请当作参考，不必据此替自己做重大决定。",
                "医疗、诉讼、投资、婚育、就业这类专业事项，请找有资质的专业人士；本软件的输出不能替代他们的判断，也不该被用来拖延就诊或决策。",
                "模型断辞由你自己配置的第三方模型服务生成，作者无法预知、也无法控制它写了什么；其中若有错漏、偏差或不当表述，作者不承担责任。",
                "请勿在「所问」「背景」里填身份证号、银行卡号、病历等敏感个人信息 —— 你填的内容会随请求发送给你自己配置的那家服务商。",
                "本软件按「现状」提供，不承诺无缺陷、不承诺永久可用。因使用本软件（含模型输出有误、服务中断、记录丢失）造成的任何直接或间接损失，由使用者自行承担。",
                "请在所在地法律与公序良俗的范围内使用；不得用它行骗、敛财，或做其他违法的事。",
            ).forEach { t ->
                Row(modifier = Modifier.fillMaxWidth().padding(bottom = 9.dp)) {
                    Text_(text = "·", fontSize = 12f, lineHeight = 21f, color = KY_DIM2, modifier = Modifier.width(10.dp))
                    Text_(text = t, fontSize = 12f, lineHeight = 21f, color = KY_DIM, modifier = Modifier.weight(1f))
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            SetSecTitle("联系作者", top = 0)
            Text_(text = "软件使用反馈：微信 Trick_Mage", fontSize = 12f, lineHeight = 21f, color = KY_DIM)
            Text_(text = "小六壬交流：微信 gny950107", fontSize = 12f, lineHeight = 21f, color = KY_DIM)
            Text_(text = "添加请注明来意。", fontSize = 12f, lineHeight = 21f, color = KY_DIM2)

            Spacer(modifier = Modifier.height(16.dp))
            SetSecTitle("开源仓库", top = 0)
            /* 早先那一版这里是 <a href> 走 openOut 交系统浏览器（SettingsScreen.jsx:1202）⇒ K 里必须可点，
               Platform.openUrl 早就接了（引导里的智谱链接在用），这里直接用 */
            Text_(
                text = "github.com/Michae1o/daojiaxlr-guatai  ↗",
                modifier = Modifier.tapNoIndication {
                    Platform.openUrl?.invoke("https://github.com/Michae1o/daojiaxlr-guatai")
                }.padding(vertical = 4.dp),
                fontSize = 12f,
                lineHeight = 21f,
                color = KY_ACCENT,
            )
            Spacer(modifier = Modifier.height(30.dp))
        }
    }
}

/* ── 开关（玻璃材质 + 跟手 + 非线性）─────────────────────────────────────────
   ：「背景雾气动态的开关没做到非线性动画和玻璃质感」。
   · 材质：与卡片/按钮同一套 glassMaterial（平涂面 + 上缘一道亮边 + 淡描边）——
     不用阴影、不用模糊、不加径向渐变（Kuikly 这几样都不落地）。
     轨道在玻璃面上再压一层半透明主色（0.58×p），底面那层玻璃仍透得出来。
   · 跟手：横拖时旋钮**拖多少给多少**（按手指位移 / 可走距离算进度，不吸附）；
     松手按当前位置过没过一半决定开/关，200ms 走 KY_EASE_OUT（cubic-bezier(.22,1,.36,1)）收尾。
   · 按下/拖动中旋钮放大 6%（120ms 非线性），松手回原尺寸。
   · 整行仍可点（父级 toggleable 管点击），拖动由这一层吃掉。 */
@Composable
internal fun GlassSwitch(checked: Boolean, onChange: (Boolean) -> Unit) {
    val trackW = 44.dp
    val trackH = 26.dp
    val padD = 3.dp
    val knobD = 20.dp
    /* 旋钮能走的距离：44 - 20 - 3×2 = 18dp */
    val travel = trackW - knobD - padD * 2
    val shape = RoundedCornerShape(999.dp)
    val p = remember { Animatable(if (checked) 1f else 0f) }
    var dragging by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val press by animateFloatAsState(if (dragging) 1f else 0f, tween(120, easing = KY_EASE_OUT))

    /* 只有「外部改值」（回读配置 / 别处写）才复位；拖动中不打断手 */
    LaunchedEffect(checked) {
        val t = if (checked) 1f else 0f
        if (!dragging && p.targetValue != t) p.animateTo(t, tween(200, easing = KY_EASE_OUT))
    }

    Box(
        modifier = Modifier
            .size(trackW, trackH)
            .clip(shape)
            .glassMaterial(shape, control = true, pressed = if (dragging) 1f else 0f)
            .background(KY_ACCENT.copy(alpha = 0.58f * p.value))
            .pointerInput(Unit) {
                val travelPx = travel.toPx().coerceAtLeast(1f)
                detectHorizontalDragGestures(
                    onDragStart = { dragging = true },
                    onDragEnd = {
                        dragging = false
                        val on = p.value >= 0.5f
                        if (on != checked) onChange(on)
                        else scope.launch { p.animateTo(if (on) 1f else 0f, tween(200, easing = KY_EASE_OUT)) }
                    },
                    onDragCancel = {
                        dragging = false
                        scope.launch { p.animateTo(if (checked) 1f else 0f, tween(200, easing = KY_EASE_OUT)) }
                    },
                    onHorizontalDrag = { _, amount ->
                        val next = (p.value + amount / travelPx).coerceIn(0f, 1f)
                        scope.launch { p.snapTo(next) }
                    },
                )
            },
        contentAlignment = Alignment.CenterStart,
    ) {
        Box(
            modifier = Modifier
                .offset(x = padD + travel * p.value)
                .size(knobD)
                .graphicsLayer {
                    scaleX = 1f + 0.06f * press
                    scaleY = 1f + 0.06f * press
                }
                .clip(shape)
                /* 旋钮不做纯白死面：深色皮肤上用近白，浅色皮肤上留一圈极淡墨边做「厚度」 */
                .background(if (Skin.dark) Color(0.93f, 0.93f, 0.94f) else Color.White)
                .border(
                    1.dp,
                    if (Skin.dark) Color.White.copy(alpha = 0.22f) else Skin.def.ink.copy(alpha = 0.12f),
                    shape,
                )
        )
    }
}
