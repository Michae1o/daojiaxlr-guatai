#!/usr/bin/env bash
# ============================================================
# 道家小六壬 · 卦台 —— macOS 版编译（产出 .app）
#
# 口径：
#   · 前端已有一份**入库的加密壳**（apps/desktop-shell/web/index.html），本脚本不重建前端；
#   · 用 Tauri 官方打包器出标准 `.app`（拖进「应用程序」就能用）；
#   · 注意：不要跑 tools/构建-桌面端.ps1（PowerShell 5.1 + Windows PE 专属）。
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

SHELL_DIR="apps/desktop-shell"
TAURI_DIR="$SHELL_DIR/src-tauri"
APP_NAME="道家小六壬 卦台"
APP_BUNDLE="$TAURI_DIR/target/release/bundle/macos/$APP_NAME.app"

echo "== 0. 环境检查 =="
command -v cargo >/dev/null 2>&1 || {
  echo "✗ 缺 cargo。装 Rust："
  echo "    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  echo "    source \"\$HOME/.cargo/env\""
  exit 1
}
xcode-select -p >/dev/null 2>&1 || { echo "✗ 缺 Xcode 命令行工具：xcode-select --install"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "✗ 缺 node（要 20+）。装：brew install node"; exit 1; }
echo "  arch   = $(uname -m)"
echo "  cargo  = $(cargo --version)"
echo "  node   = $(node -v)"
echo "  clt    = $(xcode-select -p)"

echo ""
echo "== 1. 工具链（本仓 rust-toolchain.toml 钉的是 Windows msvc，这里覆盖掉）=="
export RUSTUP_TOOLCHAIN="${RUSTUP_TOOLCHAIN:-stable}"
echo "  RUSTUP_TOOLCHAIN=$RUSTUP_TOOLCHAIN"

echo ""
echo "== 2. 前端壳在场 + 核对（这两份是入库的加密产物）=="
for f in "$SHELL_DIR/web/index.html" "$SHELL_DIR/web/shim.js"; do
  [ -f "$f" ] || { echo "✗ 缺 $f —— 这份仓里自带，别自己生成"; exit 1; }
  printf "  %-46s %s B\n" "$f" "$(wc -c <"$f" | tr -d ' ')"
done
node -e '
  const fs=require("fs");
  const t=fs.readFileSync("apps/desktop-shell/web/index.html","utf8");
  const leak=["大安","留连","速喜","赤口","小吉","空亡","判据","落宫","类象"].filter(w=>t.includes(w));
  const isShell=t.includes("TextDecoder")&&t.includes("atob");
  const hasShim=t.includes("<script src=\"shim.js\"></script>");
  console.log("  "+(isShell?"PASS":"FAIL")+"  仍是加密壳（TextDecoder + atob）");
  console.log("  "+(leak.length===0?"PASS":"FAIL")+"  壳里无判据明文"+(leak.length?"  ["+leak.join(" ")+"]":""));
  console.log("  "+(hasShim?"PASS":"FAIL")+"  已挂适配层 shim.js");
  if(!isShell||leak.length||!hasShim) process.exit(1);
'

echo ""
echo "== 3. 应用图标（.icns；mac 的 .app 只认它，仓里只有 .ico/.png）=="
SRC_ICON="$TAURI_DIR/icons/1024x1024.png"
ICNS="$TAURI_DIR/icons/icon.icns"
if [ -f "$ICNS" ]; then
  echo "  已存在：$ICNS（$(wc -c <"$ICNS" | tr -d ' ') B）"
else
  [ -f "$SRC_ICON" ] || { echo "✗ 缺源图 $SRC_ICON"; exit 1; }
  TMP=$(mktemp -d)
  ISET="$TMP/icon.iconset"
  mkdir -p "$ISET"
  # mac 的 iconset 规格（10 张，缺一张 iconutil 就拒）
  for spec in "16 icon_16x16" "32 icon_16x16@2x" "32 icon_32x32" "64 icon_32x32@2x" \
              "128 icon_128x128" "256 icon_128x128@2x" "256 icon_256x256" "512 icon_256x256@2x" \
              "512 icon_512x512" "1024 icon_512x512@2x"; do
    set -- $spec
    sips -z "$1" "$1" "$SRC_ICON" --out "$ISET/$2.png" >/dev/null 2>&1 \
      || { echo "✗ sips 生成 $2.png 失败"; rm -rf "$TMP"; exit 1; }
  done
  iconutil -c icns "$ISET" -o "$ICNS" || { echo "✗ iconutil 失败"; rm -rf "$TMP"; exit 1; }
  rm -rf "$TMP"
  echo "  已生成：$ICNS（$(wc -c <"$ICNS" | tr -d ' ') B）"
fi

echo ""
echo "== 4. 打包（tauri build + tauri.macos.conf.json；首次会下载 tauri CLI）=="
( cd "$SHELL_DIR" && npx --yes @tauri-apps/cli@^2 build --config src-tauri/tauri.macos.conf.json )

[ -d "$APP_BUNDLE" ] || {
  echo "✗ 没找到 .app：$APP_BUNDLE"
  echo "  （tauri 退出码 0 但无产物时，看上面有没有 bundle 段的报错）"
  exit 1
}

echo ""
echo "== 5. 产物核对 =="
BIN_IN_APP="$APP_BUNDLE/Contents/MacOS/xiaoliuren"
[ -x "$BIN_IN_APP" ] || { echo "✗ .app 里没有可执行文件"; ls -R "$APP_BUNDLE/Contents"; exit 1; }
file "$BIN_IN_APP"
echo "  Info.plist："
/usr/libexec/PlistBuddy -c 'Print :CFBundleName' "$APP_BUNDLE/Contents/Info.plist" 2>/dev/null | sed 's/^/    CFBundleName        = /'
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP_BUNDLE/Contents/Info.plist" 2>/dev/null | sed 's/^/    CFBundleIdentifier  = /'
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_BUNDLE/Contents/Info.plist" 2>/dev/null | sed 's/^/    CFBundleVersion     = /'
echo "  图标：$(ls "$APP_BUNDLE/Contents/Resources/"*.icns 2>/dev/null | xargs -n1 basename 2>/dev/null || echo '（未找到 icns）')"

# arm64 上「必须有签名」（至少 ad-hoc），否则根本起不来
echo ""
echo "== 6. 签名（ad-hoc；本机自用足够，分发给别人要开发者证书 + 公证）=="
if codesign --verify --deep --strict "$APP_BUNDLE" >/dev/null 2>&1; then
  echo "  已有有效签名，跳过"
else
  codesign --force --deep --sign - "$APP_BUNDLE" && echo "  已做 ad-hoc 签名"
fi
codesign -dv "$APP_BUNDLE" 2>&1 | sed -n '1,4p' | sed 's/^/  /'

echo ""
echo "✅ 编译完成"
echo "   $(pwd)/$APP_BUNDLE"
echo ""
echo "   打开：open \"$APP_BUNDLE\""
echo "   安装：拖进「应用程序」文件夹"
echo ""
echo "⚠ 从 zip 解压或用 U 盘拷来的 .app 会被 Gatekeeper 拦。处理："
echo "   xattr -dr com.apple.quarantine \"$APP_BUNDLE\""
