# -*- coding: utf-8 -*-
"""防解包：把整个应用 HTML 加密成一个 blob，外面只留一个极小的解密壳。
产物文件里**不含任何可读的理论文字**（全文只有 base64 与几十行壳代码）。

说明（必须如实告知用户）：
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

def _taiji_paths():
    """无鱼眼太极的两瓣（暗/亮），各 120 点：大圆弧 + 上下两个小圆凸；两瓣拼起来正好是整圆。"""
    import math

    CX = CY = 100.0
    R = 95.0

    def arc(cx, cy, r, a0, a1, n):
        out = []
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            out.append([cx + r * math.cos(a), cy + r * math.sin(a)])
        return out

    def resample(pts, n):
        loop = pts + [pts[0]]
        seg, total = [], 0.0
        for i in range(len(loop) - 1):
            d = math.dist(loop[i], loop[i + 1])
            seg.append(d)
            total += d
        out, acc, k = [], 0.0, 0
        for q in range(n):
            target = total * q / n
            while k < len(seg) - 1 and acc + seg[k] < target:
                acc += seg[k]
                k += 1
            t = 0.0 if seg[k] == 0 else (target - acc) / seg[k]
            (x0, y0), (x1, y1) = loop[k], loop[k + 1]
            out.append([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t])
        return out

    big = arc(CX, CY, R, -90, -270, 60)
    lo = arc(CX, CY + R / 2, R / 2, 90, 270, 30)
    up = arc(CX, CY - R / 2, R / 2, 90, -90, 30)
    dark = resample(big + lo[1:] + up[1:], 120)
    light = [[2 * CX - x, 2 * CY - y] for x, y in dark]      # 转 180° ⇒ 正好互补

    def d_of(pts):
        out = "M%.1f %.1f" % (pts[0][0], pts[0][1])
        for x, y in pts[1:]:
            out += "L%.1f %.1f" % (x, y)
        return out + "Z"

    return d_of(dark), d_of(light)


LOBE_D, LOBE_L = _taiji_paths()

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
  html,body{margin:0;height:100%;background:#f5f3ee;color:#1b1a17;
    font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
  /* ★ 开机占位必须是「浮层」而不是「占位块」：
     document.open()+write() 在 Chromium 里是替换，但在 WebView2（Tauri）里实测是**追加**。
     若用 height:100%，它会实打实占掉一整屏，把追加进来的应用顶到第二屏
     （用户第一眼只看到占位、还得往下拉）。改成 fixed 就不占布局空间，两种引擎都对。
     应用渲染出来后再由下面的脚本把它摘掉。 */
  .boot{position:fixed;top:0;right:0;bottom:0;left:0;inset:0;z-index:9999;background:#f5f3ee;
    display:flex;align-items:center;justify-content:center;flex-direction:column;
    transition:opacity .32s ease,visibility .32s ease}
  .boot.out{opacity:0;visibility:hidden}
  /* ⚠ 这条**留着**：给下面 catch 里的「打不开：…」用，别删。 */
  .boot i{font-style:normal;font-family:"Songti SC","STSong","Noto Serif SC","SimSun",serif;
    font-size:15px;letter-spacing:.42em;text-indent:.42em;color:#1b1a17;opacity:.88}

  /* ==================================================================================
     ★★ 加载动画（变更记录，原文：「这层相当于是加密壳的动画对吧，那索性直接
     改成一个动画咯，就是一黑一白两股似水流一样的东西在中间转成一个太极，随加载速度变化」）
     这段只在「解密 / 下载 6.8 MB 加密体」时露脸：真开屏 #xlrSplash（在加密包里，z-index 10000）
     一挂上来就把它盖住。
     · 时间轴 1.6s：两股水流对向绕心旋 → 0.5s 起收束、太极浮现 → 末帧**落在真开屏那颗珠子
       的位置与尺寸上**（实测：视口中心正上方 300px / 51px；短屏 239px / 45px）
       ⇒ 开屏接上来时不是「跳一下」，而是同一颗东西继续。
     · 转速随「已经等了多久」加快（真进度拿不到：主文档的下载进度浏览器不给 JS，只能用等待时长当代理）。
     壳是对外可读的那一层：这里只放加载逻辑。 */
  /* ★ 十改（：「算了，就搞一个太极在那转吧」）：不玩流体了 ——
     一颗无鱼眼的太极，匀速自转。形状是几何精确的两瓣（构建时算好写死在壳里，纯黑纯白），
     运行期零 JS；CSS 只负责转。 */
  .bt{width:200px;height:200px}
  .btSvg{display:block;width:100%;height:100%}
  .btSpin{transform-box:view-box;transform-origin:100px 100px;animation:btTurn 3.6s linear infinite}
  @keyframes btTurn{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  /* 「减弱动态效果」：不转，就一颗静止的太极 */
  @media (prefers-reduced-motion:reduce){ .btSpin{animation:none} }

  /* ==================================================================================
     ★★ 落地过渡态（变更记录，原文：「加密壳加载时候出现的大太极为什么没有缩小
     落到本项目的开屏太极上？而是在中间？」）
     开屏 #xlrSplash 是**不透明**的、z-index 10000 压住本层 9999 ⇒ 太极要能被看见地「飞过去」，
     这一态得把本层临时抬到 10002；底色同时转透明（开屏自己铺满整屏，不会露底）。
     只在开屏那颗珠子（.sl-orb）挂上来之后加，飞完就整层淡掉。 */
  .boot.land{background:transparent;z-index:10002;pointer-events:none}
  .boot.land .bt{transition:transform .42s cubic-bezier(.22,.72,.18,1)}
</style>
</head>
<body>
<div class="boot">
  <div class="bt" aria-hidden="true"><svg class="btSvg" viewBox="0 0 200 200">
    <g class="btSpin">
      <path fill="#000" d="@LOBE_D@"/>
      <path fill="#fff" d="@LOBE_L@"/>
    </g>
  </svg></div>

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
  /* ★ 变更记录：解密**之前**先把「加载层」的两块东西抓成引用 ——
     document.open() 会把整棵文档清掉（Chromium 是替换、WebView2 是追加），节点从树上掉了
     但 JS 引用还在；write 完再挂回去，它才能接着在开屏那颗珠子上「落地」。 */
  var bootEl = document.querySelector('.boot');
  var btEl = bootEl ? bootEl.querySelector('.bt') : null;
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
    // ★ 2026-10-07 修正：原先写完无条件补发一个合成 DOMContentLoaded。实测在
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
    // ★ 2026-10-08 质感改版：加「最短展示 700ms」，随后淡出 320ms 再摘——开屏要看得清，
    //   也不能久留（8 秒兜底强制淡出，绝不让它一直盖着应用）。
    function hideBoot() {
      var b = (bootEl && document.contains(bootEl)) ? bootEl : document.querySelector('.boot');
      if (!b) return;
      b.classList.add('out');
      setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 380);
    }
    /* ★★ 变更记录（：「大太极为什么没有缩小落到本项目的开屏太极上？而是在中间？」）
       加载那层不再「原地消失」，改成**落到开屏那颗珠子上**：开屏一挂上就量珠子的位置与尺寸，
       把太极缩小、挪上去与珠子重合，再随本层一起淡掉（珠子就在那儿继续转）。
       · 为什么非等 write 之后：珠子在加密体里，write 之前它根本不存在。
       · 为什么用 offset 链量、不用 getBoundingClientRect：珠子此刻正播入场动画
         （slOrb：scale .86 + 上移 10px），rect 会偏；offset 不受 transform 影响 = 拿到终位。
       · .land 这一态把本层抬到 10002、底色转透明（开屏不透明且铺满，不会露底）。 */
    function layCenter(el) {
      var x = 0, y = 0, n = el;
      while (n && n !== document.body && n !== document.documentElement) {
        x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent;
      }
      return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2, w: el.offsetWidth };
    }
    function reattach() {
      try {
        if (cssEl && !document.contains(cssEl) && document.head) document.head.appendChild(cssEl);
        if (bootEl && !document.contains(bootEl) && document.body) document.body.appendChild(bootEl);
      } catch (eRe) { }
    }
    function land() {
      var reduce = false;
      try { reduce = matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (eRm) { }
      if (!bootEl || !btEl || reduce) { hideBoot(); return; }
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
          var o = layCenter(orb), b = layCenter(btEl);
          var s = (o.w || 58) / (b.w || 200);
          var dx = o.x - b.x, dy = o.y - b.y;
          bootEl.classList.add('land');
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              btEl.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
            });
          });
          setTimeout(hideBoot, 470);   /* 飞 420ms，落定后整层淡出（320ms）—— 太极就在珠子上淡掉 */
        } catch (eL) { hideBoot(); }
      }, 40);
      setTimeout(function () { clearInterval(find); hideBoot(); }, 3000);   /* 兜底：珠子一直等不到 */
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
              .replace("@LOBE_D@", LOBE_D)
              .replace("@LOBE_L@", LOBE_L)
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
# ★ 2026-10-19（变更记录）：那行署名已从**看得见的开机占位层**挪到 `<meta name="author">`（屏幕上不画，
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
