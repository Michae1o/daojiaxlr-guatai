package com.xlr.k.pages

/* 配置引导的八步（旧 apps/mobile-web/src/data/guideCore.js 的 GUIDE_STEPS，逐字搬）
   · body 里 <b>…</b> 统一写成 **…**（RichText_ 认这个），<br> 写成 \n
   · go = true 的那一步，按钮是「去配置」（跳到设置→大模型，光标送去 Key 那一栏）
   · 配图（register/keynav/keynew/keyname/keycopy）已抽到 androidApp/src/main/assets/guide/，
     这一步先用文字版（Kuikly 的 Image 只吃 Painter，取图另开一轮） */
internal class GStep(
    val t: String,
    val body: String,
    val img: String = "",
    val link: String = "",
    val go: Boolean = false,
)

internal val GUIDE_STEPS = listOf(
    GStep(
        t = "先配一个模型",
        body = "解卦台**本身不联网**——起卦、排盘、本机速断都在你电脑上算完。" +
            "配上模型，点「让模型解卦」，它才会按这套体系把这一卦解出来。",
    ),
    GStep(
        t = "先去注册智谱",
        body = "点下面这个链接打开智谱开放平台（控制台），手机号或微信扫码登录都行——" +
            "**新号送 2000 万 tokens 体验包**（见下图红字那行）。",
        img = "register",
        link = "https://open.bigmodel.cn/login",
    ),
    GStep(
        t = "进「API Key」这一页",
        body = "登录后进控制台，在左边那一栏里找到「**API Key**」点进去（下图红框处）。",
        img = "keynav",
    ),
    GStep(
        t = "新建一把钥匙",
        body = "点右上角「**+ 新建 API Key**」——下图红框处那个按钮。",
        img = "keynew",
    ),
    GStep(
        t = "给它起个名字",
        body = "弹出的窗口里给这把钥匙起个名字，随便写，比如「预测」，然后点确定。",
        img = "keyname",
    ),
    GStep(
        t = "复制下来 —— 只显示这一次",
        body = "弹窗里那串字符就是钥匙：点「**复制**」，再点「我已妥善保存」。\n" +
            "**它只在创建时明文显示一次**，关掉就再也看不到了，丢了只能重新生成一把。",
        img = "keycopy",
    ),
    GStep(
        t = "粘进来，测一下",
        body = "剩下的交给软件：点下面的「去配置」，它会给你把服务商选好（智谱 GLM），" +
            "光标停在要粘贴的地方。粘完点「**测试连接**」，通了就保存。",
        go = true,
    ),
    GStep(
        t = "配好了",
        body = "回主页，把问题写具体，点对话框右下角那个箭头。\n" +
            "想再走一遍这个引导：**设置 → 大模型 → 重新看配置引导**。",
    ),
)

/* 早先那一版存的是 localStorage 的 xlr-onboarded-2（'skip' / 'done' / 有值即算看过） */
internal const val GUIDE_KEY = "xlr-onboarded-2"
