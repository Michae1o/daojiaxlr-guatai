# -*- coding: utf-8 -*-
"""防解包：把整个应用 HTML 加密成一个 blob，外面只留一个极小的解密壳。
产物文件里**不含任何可读的理论文字**（全文只有 base64 与几十行壳代码）。

说明（必须如实告知你）：
  这是「抬高门槛」，不是数学上不可破。密钥必须在客户端才能离线运行，
  所以理论上仍可被逆向。要真正杜绝，只能把判据放服务器上（那样就要求联网）。
"""
import base64
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

    ★★ （你：「加密壳的加载动画不要大太极变小了，就改成开屏页的太极，
       原样式，原位置，只是在转」）：
       以前这层画的是一颗**自己现算几何**的无鱼眼太极（200px，纯黑纯白），落定时再缩到开屏那颗珠子上；
       你要的是「就是开屏那颗，别缩」。⇒ 直接从**开屏的源**里把那份 SVG 抠出来用，
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


TAIJI_INNER = _splash_taiji()

SHELL = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>道家小六壬 · 卦台</title>
<!-- 署名/来源标注（）：原来印在开机占位层上（一行字 + 朱砂细线 + 小字署名），
     你 2026-10-19 报「每次打开先跳出这个页面…然后才跳到正儿八经开屏」⇒ 占位层只留底色，
     署名挪到这里（屏幕不画、来源照留）。自检那条「署名恰好 1 次」的读数因此不变。 -->
<meta name="author" content="基于邵一尘老师 · 道家小六壬所作">
<style id="xlrBootCss">
  html,body{margin:0;height:100%;background:#f5f3ee;color:#1b1a17;
    font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
  /* ★ 开机占位必须是「浮层」而不是「占位块」：
     document.open()+write() 在 Chromium 里是替换，但在 WebView2（Tauri）里实测是**追加**。
     若用 height:100%，它会实打实占掉一整屏，把追加进来的应用顶到第二屏
     应用渲染出来后再由下面的脚本把它摘掉。 */
  .boot{position:fixed;top:0;right:0;bottom:0;left:0;inset:0;z-index:9999;background:#f5f3ee;
    display:flex;align-items:center;justify-content:center;flex-direction:column;
    transition:opacity .32s ease,visibility .32s ease}
  .boot.out{opacity:0;visibility:hidden}
  /* ⚠ 这条**留着**：给下面 catch 里的「打不开：…」用，别删。 */
  .boot i{font-style:normal;font-family:"Songti SC","STSong","Noto Serif SC","SimSun",serif;
    font-size:15px;letter-spacing:.42em;text-indent:.42em;color:#1b1a17;opacity:.88}

  /* ==================================================================================
     原样式，原位置，只是在转」）
     · 现在：**就是开屏那颗**（SVG 逐字从 splashMarkup.js 抠来，与 Splash 组件同一份源），
       尺寸／位置照开屏那颗量出来的数：58×58、正中上方 290px；短屏（视口 ≤780 高）52×52、上方 229.6px。
       这里只做一件事：匀速自转（3.6s 一圈）。
     · 过渡：不缩不飞 —— 开屏挂上来之后本层抬到它上面、等珠子入场动画走完（≈0.98s）再淡出，
       同一位置同一尺寸换手，看不出接缝。
      */
  .btwrap{position:absolute;left:50%;top:calc(50% - 290px);width:58px;height:58px;
    margin:-29px 0 0 -29px;pointer-events:none}
  .btTaiji{display:block;width:58px;height:58px;overflow:visible;
    animation:btTurn 3.6s linear infinite}
  @keyframes btTurn{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  /* 短屏：与开屏那颗同步缩到 52px，位置也换成量到的那一档 */
  @media (max-height:780px){
    .btwrap{top:calc(50% - 229.6px);width:52px;height:52px;margin:-26px 0 0 -26px}
    .btTaiji{width:52px;height:52px}
  }
  /* 「减弱动态效果」：不转，就一颗静止的太极 */
  @media (prefers-reduced-motion:reduce){ .btTaiji{animation:none} }

  /* ==================================================================================
     ★★ 交接态（2026-10-23）：开屏 #xlrSplash 不透明、z-index 10000 压住本层 9999
     ⇒ 要把本层临时抬到 10002、底色转透明（开屏自己铺满整屏，不会露底），
       同一颗太极在两份里重合，等珠子入场走完再整层淡掉。只在开屏挂上来之后加。 */
  .boot.land{background:transparent;z-index:10002;pointer-events:none}
</style>
</head>
<body>
<div class="boot">
  <div class="btwrap" aria-hidden="true"><svg class="btTaiji" viewBox="0 0 120 120">@TAIJI@</svg></div>
</div>
<script>
(function () {
  var M = @MASK@;
  var K = [@KS@];
  var P = "@PAYLOAD@";
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
      var b = (bootEl && document.contains(bootEl)) ? bootEl : document.querySelector('.boot');
      if (!b) return;
      b.classList.add('out');
      setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 380);
    }
    /*
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
              .replace("@TAIJI@", TAIJI_INNER)
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
    print("  ℹ 上面只是提示，不影响编译。")
