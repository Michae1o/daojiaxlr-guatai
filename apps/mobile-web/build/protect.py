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

SHELL = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>道家小六壬 · 卦台</title>
<style>
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
  .boot i{font-style:normal;font-family:"Songti SC","STSong","Noto Serif SC","SimSun",serif;
    font-size:15px;letter-spacing:.42em;text-indent:.42em;color:#1b1a17;opacity:.88}
  /* ★ 动画名带前缀：壳在 WebView2 里是「追加」而非替换，样式表与应用并存，
     叫 bl 会和应用里 .cur 光标的 bl 撞名（后来者覆盖 ⇒ 开屏细线不动） */
  .boot s{display:block;width:150px;height:1px;margin:20px 0 18px;background:#9c3b28;
    text-decoration:none;transform:scaleX(0);transform-origin:center;
    animation:xlrbootLine .62s cubic-bezier(.16,1,.3,1) .1s forwards}
  .boot em{font-style:normal;font-size:11.5px;letter-spacing:.16em;color:#1b1a17;opacity:.42}
  @keyframes xlrbootLine{to{transform:scaleX(1)}}
</style>
</head>
<body>
<div class="boot"><i>道 家 小 六 壬</i><s></s><em>基于邵一尘老师 · 道家小六壬所作</em></div>
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
      var b = document.querySelector('.boot');
      if (!b) return;
      b.classList.add('out');
      setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 380);
    }
    var t0 = Date.now();
    var kill = setInterval(function () {
      if (!document.getElementById('btnGo')) return;
      clearInterval(kill);
      /* ★ 2026-10-08：这一层只是「解密前的占位」。真正的开屏（含使用纪律、3 秒、可跳过）
         在应用层（modern.js 的 #xlrSplash，z-index 更高）——所以这里尽快让位，别抢戏。 */
      var wait = 260 - (Date.now() - t0);
      if (wait > 0) setTimeout(hideBoot, wait); else hideBoot();
    }, 60);
    setTimeout(function () { clearInterval(kill); hideBoot(); }, 8000);
  } catch (e) {
    document.body.innerHTML = '<div class="boot"><i>打不开：' + e.message + '</i></div>';
  }
})();
</script>
</body>
</html>
"""
SHELL = (SHELL.replace("@MASK@", str(MASK))
              .replace("@KS@", ks)
              .replace("@PAYLOAD@", b64))

OUT.write_text(SHELL, encoding="utf-8")
print("已写出 %s  %.1f KB" % (OUT.name, OUT.stat().st_size / 1024))

# --- 自检：壳里不该出现任何理论字样 ---
txt = SHELL
leak = []
for w in ["大安", "留连", "速喜", "赤口", "小吉", "空亡", "落宫", "判据", "类象",
          "三宫", "掌诀", "体用", "起卦方式", "断卦", "月日时"]:
    # 注意：「邵一尘」**故意不在此列**——开机署名「基于邵一尘老师 · 道家小六壬所作」
    # 是要求印在开屏上的，属正当标注，不是泄露。见下面的单独核对。
    if w in txt:
        leak.append(w)
print()
print("=== 自检 ===")
print("  壳里出现的理论字样 =", leak or "无 ✓")
# 署名单独核对：全文只该出现一次，且必须在那行署名里
_n = txt.count("邵一尘")
_ok = (_n == 1 and "基于邵一尘老师" in txt)
print("  「邵一尘」出现次数 = %d（应为 1，且只在开机署名里）%s" % (_n, " ✓" if _ok else " ✗"))
if not _ok:
    leak.append("邵一尘署名异常")
print("  密文长度（base64）= %d 字符" % len(b64))
print("  壳文件总长 = %d 字符" % len(txt))
print("  含 script 标签闭合风险（base64 里不可能有 '</'）= ", "</" in b64)
if leak:
    sys.exit(1)
