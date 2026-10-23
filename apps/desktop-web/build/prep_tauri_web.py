# -*- coding: utf-8 -*-
"""准备 Tauri 版的前端：加密壳 + 网络适配层。
不解密就看不到判据；shim 在解密之前挂上 fetch，所以解密后的页面也用它。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from paths import DIST, WEB_SHELL   # noqa: E402

WEB = WEB_SHELL                                  
TAURI = WEB_SHELL.parent
WEB.mkdir(parents=True, exist_ok=True)

# 源：默认用当前判据产的加密壳；可传 --src <html> 指定别的
_args = [a for a in sys.argv[1:] if not a.startswith("--")]
PLAIN = DIST / "新版-现代.html"
SHELL = Path(_args[0]) if _args else (DIST / "新版-现代-加密.html")

# ★ 修坑：build_all.py 不会重新生成「新版-清爽-加密.html」，
#   所以这里一旦发现它比明文旧（或不存在），就现加密一份，免得嵌进去的是旧界面。
if not _args:
    need = (not SHELL.exists()) or (SHELL.stat().st_mtime < PLAIN.stat().st_mtime)
    if need:
        import subprocess as _sp
        print("加密壳不存在或比明文旧 → 现场重新加密:", SHELL.name)
        r = _sp.run([sys.executable, str(Path(__file__).resolve().parent / "protect.py"),
                     str(PLAIN), str(SHELL)], capture_output=True, text=True,
                    encoding="utf-8", errors="replace")
        if r.returncode != 0:
            sys.exit("现场加密失败：" + (r.stdout or r.stderr))

if not SHELL.exists():
    sys.exit("没有加密壳，先跑 build_all.py")

html = SHELL.read_text(encoding="utf-8")
print("前端来源:", SHELL.name, "%.1f KB" % (SHELL.stat().st_size / 1024))

# 在解密脚本之前插入适配层（document.write 不会换窗口，挂上的 fetch 会存活）
MARK = "<script>\n(function () {\n  var M ="
if MARK not in html:
    sys.exit("找不到解密脚本的插入点，protect.py 的壳结构可能变了")

inject = '<script src="shim.js"></script>\n' + MARK
html = html.replace(MARK, inject, 1)

(WEB / "index.html").write_text(html, encoding="utf-8")

import shutil
shutil.copy2(TAURI / "shim.js", WEB / "shim.js")

print("已准备:", WEB / "index.html", "%.1f KB" % ((WEB / "index.html").stat().st_size / 1024))
print("       ", WEB / "shim.js")

# 自检
t = (WEB / "index.html").read_text(encoding="utf-8")
# 「邵一尘」不在泄露词表里——署名是要求印的，属正当标注
# ★ 2026-10-19（变更记录）：那行署名从可见的开机占位层挪到了 `<meta name="author">`
leak = [w for w in ["大安", "留连", "速喜", "赤口", "小吉", "空亡", "落宫", "判据"] if w in t]
sc = (WEB / "shim.js").read_text(encoding="utf-8")
print()
print("OK  含适配层 =", 'shim.js' in t)
print("OK  仍是加密壳 =", "TextDecoder" in t)
print("OK  署名正当（出现 1 次）=", t.count("邵一尘") == 1)
print("OK  无理论明文 =", "无 ✓" if not leak else leak)
# ★ 2026-10-07 雷：适配层曾在运行时 setTitle() 覆写窗口标题，改名后 UI 看不出
print("OK  适配层无覆写标题 =", ("setTitle" not in sc and "起卦解卦台" not in sc))
sys.exit(1 if (leak or t.count("邵一尘") != 1 or "setTitle" in sc or "起卦解卦台" in sc) else 0)
