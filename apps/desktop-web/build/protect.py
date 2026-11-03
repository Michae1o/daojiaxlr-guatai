# -*- coding: utf-8 -*-
"""防解包：把整个应用 HTML 加密成一个 blob，外面只留一个极小的解密壳。
产物文件里**不含任何可读的理论文字**（全文只有 base64 与几十行壳代码）。

说明（必须如实告知用户）：
  这是「抬高门槛」，不是数学上不可破。密钥必须在客户端才能离线运行，
  所以理论上仍可被逆向。要真正杜绝，只能把判据放服务器上（那样就要求联网）。
"""
import base64
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from paths import DIST   # noqa: E402

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else DIST / "新版-现代.html"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else DIST / "新版-现代-加密.html"
KEY = "xlr.2026.shaoyichen.bufajuan"     # 会以混淆形式嵌进壳里
MASK = 0x5A

if not SRC.exists():
    sys.exit("找不到源文件: %s" % SRC)

raw = SRC.read_text(encoding="utf-8").encode("utf-8")
print("源文件 %s  %.1f KB" % (SRC.name, len(raw) / 1024))


def rc4(key: bytes, data: bytes) -> bytes:
    S = list(range(256))
    j = 0
    klen = len(key)
    for i in range(256):
        j = (j + S[i] + key[i % klen]) & 255
        S[i], S[j] = S[j], S[i]
    out = bytearray(len(data))
    i = j = 0
    for n, b in enumerate(data):
        i = (i + 1) & 255
        j = (j + S[i]) & 255
        S[i], S[j] = S[j], S[i]
        out[n] = b ^ S[(S[i] + S[j]) & 255]
    return bytes(out)


ct = rc4(KEY.encode("utf-8"), raw)
b64 = base64.b64encode(ct).decode("ascii")
print("密文 %.1f KB（base64 后）" % (len(b64) / 1024))

# 密钥以「异或掩码后的码点数组」形式嵌入，避免明文关键词被 grep 到
ks = ",".join(str(ord(c) ^ MASK) for c in KEY)

SPLASH_SRC = Path(__file__).resolve().parents[1] / "src" / "components" / "splashMarkup.js"


def _splash_taiji() -> str:
    """开屏那颗太极的 SVG 内层（**逐字取自** splashMarkup.js）。

    ⚠ 2026-11-02 起**加载层不再用它**；
       函数与自检保留在这里，回退时把 SHELL 里的 @STARMAP@ 换回 @TAIJI@ 即可。

    ★★ （用户：「加密壳的加载动画不要大太极变小了，就改成开屏页的太极，
       原样式，原位置，只是在转」）：
       以前这层画的是一颗**自己现算几何**的无鱼眼太极（200px，纯黑纯白），落定时再缩到开屏那颗珠子上；
       用户要的是「就是开屏那颗，别缩」。⇒ 直接从**开屏的源**里把那份 SVG 抠出来用，
       保证样式不是「照着做的」，而是**同一份**（`tools/gen-splash-jsx.mjs` 也是拿它生成 Splash 组件的）。
       自检：材质那几个渐变 id 必须全在，长度也不能明显缩水 —— 抠歪了就停下，不外抛一个空壳。
    """
    s = SPLASH_SRC.read_text(encoding="utf-8")
    m = re.search(r'<svg class=\\?"sl-taiji\\?"[^>]*>(.*?)</svg>', s, re.S)
    if not m:
        sys.exit("找不到开屏太极的 SVG（%s）" % SPLASH_SRC)
    inner = m.group(1).replace('\\"', '"')
    need = ["tjYang", "tjYin", "tjCres", "tjGloss", "tjEyeY", "tjEyeD", "tjRing", "tjShadow"]
    miss = [k for k in need if k not in inner]
    if miss or len(inner) < 4000:
        sys.exit("开屏太极 SVG 提取不完整：缺 %s / 长度 %d" % (miss, len(inner)))
    # 壳里这份用 bt 前缀：开屏解出来之后 #xlrSplash 里还有一份同名 id，
    # 两份同时留在文档里（壳淡出前）⇒ 不换前缀会互相抢 gradient。
    inner = (inner.replace('id="tj', 'id="bt').replace('url(#tj', 'url(#bt'))
    return inner


def _starmap_svg() -> str:
    """加载层的星图（外环二十四簇星宿 + 中间一柄北斗），与开屏星空同一套视觉语言。

    ★★ ：
       开屏的星图是 React 的 .sl-orbit + 九套 webp 贴图（9×49 张）；壳里没有 React，
       也不该把整套贴图再内联一遍。这里按它的构图**矢量复刻**：一圈星宿连线的暗点、
       中间一盏暖金的北斗。壳不认皮肤，所以走中性色（灰褐星点 + 暖金北斗），
       在 #f5f3ee 底色上可见，抬到开屏（深色）上还认得出是同一片天。
       自检：星数不对或光晕滤镜丢了就退出，不外抛一个空壳。
    """
    import math

    cx, cy, rx, ry = 600.0, 460.0, 520.0, 350.0
    out = ['<defs><filter id="btGlow" x="-60%" y="-60%" width="220%" height="220%">'
           '<feGaussianBlur stdDeviation="7" result="b"/>'
           '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
           '</filter></defs>']

    # 外环：二十四簇星宿，每簇三点折线（长度与偏移按序号算，固定不随机）
    for i in range(24):
        a = math.radians(i * 15.0 - 90.0)
        px, py = cx + rx * math.cos(a), cy + ry * math.sin(a)
        tl = 24.0 + (i * 37 % 20)
        tx, ty = -math.sin(a) * tl, math.cos(a) * tl * 0.62
        pts = []
        for f in (-0.5, 0.1, 0.66):
            pts.append((px + tx * f + (i * 13 % 17) - 8, py + ty * f + (i * 11 % 15) - 7))
        poly = " ".join("%.1f,%.1f" % p for p in pts)
        dots = "".join('<circle cx="%.1f" cy="%.1f" r="2.1"/>' % p for p in pts)
        out.append('<g class="bs d%d"><polyline points="%s"/>%s</g>' % (i % 3, poly, dots))

    # 背景散星：固定伪随机（线性同余，每次构建同一片天），给外环与中心之间补层次
    seed = 20261102
    for _k in range(120):
        seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
        fx = (seed % 100000) / 100000.0
        seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
        fy = (seed % 100000) / 100000.0
        seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
        fr = 0.6 + (seed % 100) / 100.0 * 1.3
        fo = 0.16 + (seed % 7) / 7.0 * 0.30
        out.append('<circle class="bsx" cx="%.1f" cy="%.1f" r="%.2f" opacity="%.2f"/>'
                   % (fx * 1200, fy * 900, fr, fo))

    # 北斗：八点（四段斗柄 + 闭合斗身），暖金描线 + 光晕
    dip = [(288, 556), (356, 500), (430, 470), (508, 466),
           (566, 528), (516, 592), (442, 588), (386, 556)]
    dline = " ".join("%d,%d" % p for p in dip)
    ddots = "".join('<circle cx="%d" cy="%d" r="3.6"/>' % p for p in dip)
    out.append('<g class="bn" filter="url(#btGlow)"><polyline points="%s"/>%s</g>' % (dline, ddots))

    svg = "".join(out)
    if svg.count("<circle") < 24 * 3 + 8 or "btGlow" not in svg or "polyline" not in svg:
        sys.exit("加载层星图生成不完整（circle=%d）" % svg.count("<circle"))
    return svg


STARMAP_INNER = _starmap_svg()

# ======================================================================================
# ★★ （用户：「我只是想让加密壳看起来只剩下屏幕左侧还在动的星图而已，
#   和真正开屏相比没有右边的文字、太极、入口」）：
#   加载层 = **开屏左侧那片星图在跑**。做法：把 SplashOrbit.jsx 那套逐帧逻辑原样搬到壳里。
#   · 数据+贴图：tools/build-boot-sky.py 生成 boot-sky.json（9 套 × 轨道数据 + 49 张 base64）
#   · 几何：照开屏**宽屏**那一组（left:-8% / top:50% / min(66vw,94vh) / opacity .55）。
#     ⚠ 上一版用错成窄屏那套（120vw 铺满）⇒ 星点被放大到粗大、边缘被裁，用户当场指出。
#   · 动画参数与 SplashOrbit 一字不差：24s 一圈、弧长采样 1440、起伏 8~11 画布像素、
#     周期 3/4/4.8/6 秒、黄金角错峰、星芒 sin 三次方、北斗浮动 0.0115×内容长边。
#   ⛔ 合成整图那套（splash-orbit-flat）与 _starmap_svg 都留着没删，回退用。
# ======================================================================================
SKY_JSON_PATH = Path(__file__).resolve().parent / "boot-sky.json"
if not SKY_JSON_PATH.exists():
    # 生成物不进 git（2.2 MB base64）；缺了就现跑一次生成器，保证新克隆的仓也能直接构建
    import subprocess
    gen = Path(__file__).resolve().parents[3] / "tools" / "build-boot-sky.py"
    if not gen.exists():
        sys.exit("缺 %s 与生成器 %s" % (SKY_JSON_PATH, gen))
    subprocess.run([sys.executable, str(gen)], check=True)
SKY_JSON = SKY_JSON_PATH.read_text(encoding="utf-8")

SHELL = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>道家小六壬 · 卦台</title>
<!-- 署名/来源标注（变更记录）：原来印在开机占位层上（一行字 + 朱砂细线 + 小字署名），
     报「每次打开先跳出这个页面…然后才跳到正儿八经开屏」⇒ 占位层只留底色，
     署名挪到这里（屏幕不画、来源照留）。自检那条「署名恰好 1 次」的读数因此不变。 -->
<meta name="author" content="基于邵一尘老师 · 道家小六壬所作">
<style id="xlrBootCss">
  /* 加载层的底色/星色跟着皮肤走（开屏也是同一片天）：壳里读不到 CSS 变量，
     只能把九套（含 jin/mo/term/ye 四套后加的）的 --bg/--ink 在这里列一份。
     ★ 皮肤改了色值要回来同步这张表（就这两列）。 */
  html{--btBg:#f5f3ee;--btInk:#1b1a17}
  html[data-sk="bw"]{--btBg:#f4f4f5;--btInk:#0b0b0c}
  html[data-sk="bru"]{--btBg:#ffffff;--btInk:#0d0d0d}
  html[data-sk="dh"]{--btBg:#FBF2DE;--btInk:#3A2A1C}
  html[data-sk="dou"]{--btBg:#f6f1ea;--btInk:#2a2320}
  html[data-sk="glass"]{--btBg:#e9edf6;--btInk:#151a24}
  html[data-sk="hei"]{--btBg:#131316;--btInk:#ededf1}
  html[data-sk="jin"]{--btBg:#100e0b;--btInk:#efe6d5}
  html[data-sk="mg"]{--btBg:#2A1A12;--btInk:#F2E6D0}
  html[data-sk="mo"]{--btBg:#121110;--btInk:#eae6de}
  html[data-sk="qing"]{--btBg:#eef2f1;--btInk:#15201e}
  html[data-sk="term"]{--btBg:#070a09;--btInk:#cfe9da}
  html[data-sk="xuan"]{--btBg:#f5f3ee;--btInk:#1b1a17}
  html[data-sk="ye"]{--btBg:#0d1220;--btInk:#dde5f2}
  html,body{margin:0;height:100%;background:var(--btBg);color:var(--btInk);
    font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
  /* ★ 开机占位必须是「浮层」而不是「占位块」：
     document.open()+write() 在 Chromium 里是替换，但在 WebView2（Tauri）里实测是**追加**。
     若用 height:100%，它会实打实占掉一整屏，把追加进来的应用顶到第二屏
     （用户第一眼只看到占位、还得往下拉）。改成 fixed 就不占布局空间，两种引擎都对。
     应用渲染出来后再由下面的脚本把它摘掉。 */
  .boot{position:fixed;top:0;right:0;bottom:0;left:0;inset:0;z-index:9999;background:var(--btBg);
    display:flex;align-items:center;justify-content:center;flex-direction:column;
    transition:opacity .32s ease,visibility .32s ease}
  .boot.out{opacity:0;visibility:hidden}
  /* ⚠ 这条**留着**：给下面 catch 里的「打不开：…」用，别删。 */
  .boot i{font-style:normal;font-family:"Songti SC","STSong","Noto Serif SC","SimSun",serif;
    font-size:15px;letter-spacing:.42em;text-indent:.42em;color:#1b1a17;opacity:.88}

  /* ==================================================================================
     ★★ 加载层（2026-11-02 用户：「加密壳加载的时候还是一个太极，能不能换成我们开屏
     动画的星图」）⇒ 从「一颗转太极」换成「一片缓慢转的星图」：外环二十四簇星宿
     （灰褐、错峰呼吸）+ 中间一柄暖金北斗（带光晕），构图照开屏的 .sl-orbit。
     · 尺寸放 145% 是为了旋转时不露四角（对角半径 ≈0.707 屏宽 < 0.725 屏宽）。
     · 交接不变：开屏挂上来之后本层抬到 z10002、底色转透明再淡掉。
     ⛔ 这里不许出现任何理论文字（壳是对外可读的那层，见下面自检）。 */
  .btwrap{position:fixed;inset:0;pointer-events:none;overflow:hidden}
  /* 开屏左侧那片星图（真的在跑）。几何照开屏**宽屏**那一组：
     left:-8% / top:50% / min(66vw,94vh) / 0.55 —— 与开屏同一个落点、同一个大小。 */
  .btOrbit{position:absolute;left:-8%;top:50%;width:min(66vw,94vh);aspect-ratio:1/1;
    translate:0 -50%;opacity:.55;pointer-events:none;z-index:0}
  .btCv,.btMap{position:absolute;left:0;top:0;width:1254px;height:1254px;transform-origin:0 0}
  .btO{position:absolute;display:block;background-repeat:no-repeat;background-size:100% 100%;
    will-change:transform;pointer-events:none}
  .btO.f{will-change:transform,opacity}
  /* 窄窗口与开屏同步退回铺满 */
  @media (max-width:900px){
    .btOrbit{left:50%;top:0;translate:-50% 0;width:120vw;opacity:.35}
  }

  /* ==================================================================================
     ★★ 交接态（2026-10-23）：开屏 #xlrSplash 不透明、z-index 10000 压住本层 9999
     ⇒ 要把本层临时抬到 10002、底色转透明（开屏自己铺满整屏，不会露底），
       同一颗太极在两份里重合，等珠子入场走完再整层淡掉。只在开屏挂上来之后加。 */
  .boot.land{background:transparent;z-index:10002;pointer-events:none}
</style>
</head>
<body>
<div class="boot">
  <div class="btwrap" aria-hidden="true"><div class="btOrbit" id="btOrbit"><div class="btCv" id="btCv"><div class="btMap" id="btMap"></div></div></div></div>
</div>
<script>
(function () {
  var M = @MASK@;
  var K = [@KS@];
  var P = "@PAYLOAD@";
  /* ===== 加载层：开屏左侧那片星图（在跑），几何与动画跟 SplashOrbit.jsx 同一套 =====
     ⚠ 只能放在 var M 之后：prep_tauri_web.py 用 "<script>\n(function () {\n  var M =" 定位插入点。 */
  var SKY = @SKYJSON@;
  window.__btStop = 0;
  function bootSky() {
    var el = document.getElementById("btOrbit");
    var cv = document.getElementById("btCv");
    var map = document.getElementById("btMap");
    if (!el || !cv || !map) return;
    var sk = "bw";
    try { sk = localStorage.getItem("xlr-skin") || "bw"; } catch (eSk) {}
    try { if (sk) document.documentElement.setAttribute("data-sk", sk); } catch (eSk2) {}
    var set = SKY[sk] || SKY.bw;
    var n = set.g.length / 7, ARC = 1440, TP = Math.PI * 2, CANVAS = 1254, CW = 1130, CB = 1206;
    var th = set.tilt * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th);
    var ar = new Float32Array(ARC + 1), acc = 0, qx = 0, qy = 0, i, t, x, y;
    for (i = 0; i <= ARC; i++) {
      t = i * TP / ARC;
      x = set.cx + set.a * Math.cos(t) * cs - set.b * Math.sin(t) * sn;
      y = set.cy + set.a * Math.cos(t) * sn + set.b * Math.sin(t) * cs;
      if (i > 0) acc += Math.sqrt((x - qx) * (x - qx) + (y - qy) * (y - qy));
      qx = x; qy = y; ar[i] = acc;
    }
    var total = acc;
    function arcAt(ph) {
      var p = ph % TP; if (p < 0) p += TP;
      var q = p / TP * ARC, i2 = Math.min(ARC - 1, Math.max(0, Math.floor(q))), f = q - i2;
      return ar[i2] + (ar[i2 + 1] - ar[i2]) * f;
    }
    function angleAt(pos) {
      var v = pos % total; if (v < 0) v += total;
      var lo = 0, hi = ARC, m;
      while (hi - lo > 1) { m = (lo + hi) >> 1; if (ar[m] < v) lo = m; else hi = m; }
      var d = ar[hi] - ar[lo], f = d > 0 ? (v - ar[lo]) / d : 0;
      return (lo + f) * TP / ARC;
    }
    var s0 = [], j;
    for (j = 0; j < n; j++) s0[j] = arcAt(set.g[j * 7 + 6]);
    var cw = set.bx1 - set.bx0, ch = set.by1 - set.by0;
    var kk = CW / Math.max(cw, ch);
    map.style.transform = "translate(" + (CANVAS / 2 - (set.bx0 + set.bx1) / 2 * kk) + "px,"
      + (CB - set.by1 * kk) + "px) scale(" + kk + ")";
    var nodes = [], i3, gi, sp, half;
    for (i3 = 0; i3 < n; i3++) {
      gi = i3 * 7;
      for (half = 0; half < 2; half++) {
        sp = document.createElement("span");
        sp.className = "btO" + (half ? " f" : "");
        sp.style.left = set.g[gi] + "px"; sp.style.top = set.g[gi + 1] + "px";
        sp.style.width = set.g[gi + 2] + "px"; sp.style.height = set.g[gi + 3] + "px";
        sp.style.backgroundImage = "url(" + set.tiles[half * 24 + i3] + ")";
        map.appendChild(sp); nodes.push(sp);
      }
    }
    var north = document.createElement("span");
    north.className = "btO";
    north.style.left = set.nx + "px"; north.style.top = set.ny + "px";
    north.style.width = set.nw + "px"; north.style.height = set.nh + "px";
    north.style.backgroundImage = "url(" + set.tiles[48] + ")";
    map.appendChild(north);
    var bobAmp = 0.0115 * Math.max(cw, ch), PHI = 2.399963229728653,
        PER = [3000, 4000, 4800, 6000], TURN = 24000;
    function fit() { cv.style.transform = "scale(" + ((el.clientWidth || 1) / CANVAS) + ")"; }
    fit(); window.addEventListener("resize", fit);
    /* ★ 相位基准用 performance.now() 的绝对值 —— 与开屏 SplashOrbit.jsx 同一口径，
       交接时两层星图逐帧重合（各算各的会让用户看到两片星错开成重影）。 */
    function tick(now) {
      if (window.__btStop) return;
      /* 解密时 document.write 会把本层摘下来，写完由 reattach() 挂回 —— 期间只是空排帧 */
      if (!map.isConnected) { requestAnimationFrame(tick); return; }
      var p = ((now % TURN) + TURN) % TURN / TURN, i4, gi4, id, ang, xx, yy, bob, tr, w, w3;
      for (i4 = 0; i4 < n; i4++) {
        gi4 = i4 * 7; id = set.ids[i4];
        ang = angleAt(s0[i4] + total * p);
        xx = set.cx + set.a * Math.cos(ang) * cs - set.b * Math.sin(ang) * sn;
        yy = set.cy + set.a * Math.cos(ang) * sn + set.b * Math.sin(ang) * cs;
        bob = (8 + (id % 3) * 1.5) * Math.sin(p * TURN * TP / PER[id % 4] + id * PHI);
        tr = "translate(" + (xx - set.g[gi4 + 4]).toFixed(2) + "px,"
          + (yy - set.g[gi4 + 5] + bob).toFixed(2) + "px)";
        nodes[i4 * 2].style.transform = tr;
        nodes[i4 * 2 + 1].style.transform = tr;
        w = (1 + Math.sin(p * TP * (4 + id % 3) + id * 2.3999632)) * 0.5;
        w3 = w * w * w;
        nodes[i4 * 2 + 1].style.opacity =
          (set.key === "hei" || set.key === "mg" ? 0.45 + 0.55 * w3 : 0.12 + 0.88 * w3).toFixed(3);
      }
      north.style.transform = "translateY(" + (bobAmp * Math.sin(p * TP * 6)).toFixed(2) + "px)";
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  bootSky();
  function key() {
    var s = "";
    for (var i = 0; i < K.length; i++) s += String.fromCharCode(K[i] ^ M);
    return s;
  }
  function rc4(k, d) {
    var S = [], i, j = 0, n, t, o = new Uint8Array(d.length);
    for (i = 0; i < 256; i++) S[i] = i;
    for (i = 0; i < 256; i++) { j = (j + S[i] + k.charCodeAt(i % k.length)) & 255; t = S[i]; S[i] = S[j]; S[j] = t; }
    i = 0; j = 0;
    for (n = 0; n < d.length; n++) {
      i = (i + 1) & 255; j = (j + S[i]) & 255;
      t = S[i]; S[i] = S[j]; S[j] = t;
      o[n] = d[n] ^ S[(S[i] + S[j]) & 255];
    }
    return o;
  }
  /* ★ 解密**之前**先把「加载层」的两块东西抓成引用 ——
     document.open() 会把整棵文档清掉（Chromium 是替换、WebView2 是追加），节点从树上掉了
     但 JS 引用还在；write 完再挂回去，它才能接着在开屏那颗太极上换手。 */
  var bootEl = document.querySelector('.boot');
  var btEl = bootEl ? bootEl.querySelector('.btwrap') : null;
  var cssEl = document.getElementById('xlrBootCss');
  try {
    var bin = atob(P);
    var buf = new Uint8Array(bin.length);
    for (var i2 = 0; i2 < bin.length; i2++) buf[i2] = bin.charCodeAt(i2);
    var txt = new TextDecoder("utf-8").decode(rc4(key(), buf));

    // 不要在写入前动 DOM——实测在 WebView2 里那样会让 document.body 变 null、页面直接不出来。
    // 占位块已改成 position:fixed（不占布局空间），这里只负责写完把它摘掉。
    document.open();
    document.write(txt);
    // ★ 修正：原先写完无条件补发一个合成 DOMContentLoaded。实测在
    //   Chromium/Tauri 里**真实事件也会来** ⇒ 挂在它上面的初始化跑两遍；对
    //   「开关式」监听（皮肤面板：点一下开、再点一下关）就是瞬间开→关互相抵消，
    //   用户看到的现象＝「外观按钮点了没反应」。改为「真实事件没来才补」：
    //   先挂标记监听（真实事件一到就置位），80ms 后仍未置位才补发合成事件。
    //   两个引擎都只跑一遍；各初始化另有幂等守卫兜底。
    try {
      document.addEventListener('DOMContentLoaded', function () { window.__xlrDCL = 1; });
    } catch (e1) { }
    document.close();
    setTimeout(function () {
      if (!window.__xlrDCL) {
        try {
          document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
        } catch (e2) { }
      }
    }, 80);

    // 应用渲染出来后摘掉开机占位（Chromium 下 write 已替换整页，这里找不到也是正常的）
    // ★ 质感改版：加「最短展示 700ms」，随后淡出 320ms 再摘——开屏要看得清，
    //   也不能久留（8 秒兜底强制淡出，绝不让它一直盖着应用）。
    function hideBoot() {
      window.__btStop = 1;   /* 停了 rAF：节点马上就摘，别继续空转 */
      var b = (bootEl && document.contains(bootEl)) ? bootEl : document.querySelector('.boot');
      if (!b) return;
      b.classList.add('out');
      setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 380);
    }
    /* ★★ （用户：「不要大太极变小了，就改成开屏页的太极，原样式，原位置，只是在转」）
       交接改成**原地换手**：不缩、不飞、不改尺寸 —— 开屏一挂上就把本层抬到它上面
       （`.land`：底色转透明、z-index 10002），同一颗太极在两份里重合；
       等珠子自己的入场动画走完（slOrb：.95s）再整层淡掉（.32s），看不出接缝。
       · 为什么非等 write 之后：珠子在加密体里，write 之前它根本不存在。
       · 「减弱动态效果」：珠子没有入场动画 ⇒ 立刻淡掉。 */
    function reattach() {
      try {
        if (cssEl && !document.contains(cssEl) && document.head) document.head.appendChild(cssEl);
        if (bootEl && !document.contains(bootEl) && document.body) document.body.appendChild(bootEl);
      } catch (eRe) { }
    }
    function land() {
      var reduce = false;
      try { reduce = matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (eRm) { }
      if (!bootEl || !btEl) { hideBoot(); return; }
      reattach();
      var t0 = Date.now();
      var find = setInterval(function () {
        var orb = document.querySelector('#xlrSplash .sl-orb') || document.querySelector('.sl-orb');
        if (!orb) {
          if (Date.now() - t0 > 1500) { clearInterval(find); hideBoot(); }
          return;
        }
        clearInterval(find);
        if (!document.contains(btEl)) { hideBoot(); return; }
        try {
          bootEl.classList.add('land');
          setTimeout(hideBoot, reduce ? 0 : 980);   /* 珠子的入场 0.95s 走完再淡，期间同一颗 */
        } catch (eL) { hideBoot(); }
      }, 40);
      setTimeout(function () { clearInterval(find); hideBoot(); }, 4000);   /* 兜底：珠子一直等不到 */
    }
    land();
    setTimeout(hideBoot, 8000);
  } catch (e) {
    document.body.innerHTML = '<div class="boot"><i>打不开：' + e.message + '</i></div>';
  }
})();
</script>
</body>
</html>
"""
SHELL = (SHELL.replace("@MASK@", str(MASK))
              .replace("@SKYJSON@", SKY_JSON)
              .replace("@STARMAP@", STARMAP_INNER)
              .replace("@KS@", ks)
              .replace("@PAYLOAD@", b64))

OUT.write_text(SHELL, encoding="utf-8")
print("已写出 %s  %.1f KB" % (OUT.name, OUT.stat().st_size / 1024))

# --- 自检：壳里不该出现任何理论字样 ---
txt = SHELL
leak = []
for w in ["大安", "留连", "速喜", "赤口", "小吉", "空亡", "落宫", "判据", "类象",
          "三宫", "掌诀", "体用", "起卦方式", "断卦", "月日时"]:
    if w in txt:
        leak.append(w)
print()
print("=== 自检 ===")
print("  壳里出现的理论字样 =", leak or "无 ✓")

# 署名核对：壳里只该出现一次，且必须是那行正当署名
# ★ （变更记录）：那行署名已从**看得见的开机占位层**挪到 `<meta name="author">`（屏幕上不画，
#   否则用户看到的是「先跳出一个假开屏，再跳到真开屏」）⇒ 这条判据的读数不变（仍是 1 次）。
_n = txt.count("邵一尘")
_ok = (_n == 1 and "基于邵一尘老师" in txt)
print("  「邵一尘」出现次数 = %d（应为 1，且在 meta author 那行署名里）%s" % (_n, " ✓" if _ok else " ✗"))
if not _ok:
    leak.append("邵一尘署名异常")
# 追加（只加不减）：署名从壳的「可见层」挪走后，必须仍在**包内**的真开屏里
_src = raw.decode("utf-8")
_pok = ("基于邵一尘老师 · 道家小六壬所作" in _src)
print("  包内明文开屏署名在场 = %s（在 Splash 的 .sl-sub 上；壳里不画不等于没署名）" % ("✓" if _pok else "✗"))
if not _pok:
    leak.append("包内开屏署名缺失")
print("  密文长度（base64）= %d 字符" % len(b64))
print("  壳文件总长 = %d 字符" % len(txt))
print("  含 script 标签闭合风险（base64 里不可能有 '</'）= ", "</" in b64)
if leak:
    sys.exit(1)
