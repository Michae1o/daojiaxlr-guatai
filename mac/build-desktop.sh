#!/usr/bin/env bash
# ============================================================
#  道家小六壬 · 卦台 —— macOS 桌面版编译
#
#  前提：Xcode 命令行工具 + Rust + Node 18+
#  产物：apps/desktop-shell/src-tauri/target/release/bundle/macos/*.app
#
#  前端不用先编：apps/desktop-shell/web/index.html 是入库的加密壳，
#  tauri build 直接拿它。
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
APP_DIR="$ROOT/apps/desktop-shell"
SHELL_HTML="$APP_DIR/web/index.html"
ICNS="$APP_DIR/src-tauri/icons/icon.icns"

step() { echo ""; echo "== $1 =="; }
die()  { echo ""; echo "✗ $1" >&2; echo "  $2" >&2; exit 1; }

echo "=============================================="
echo " 道家小六壬 · 卦台 —— macOS 构建"
echo " 仓库：$ROOT"
echo " 架构：$(uname -m)"
echo "=============================================="

# ---------- 1 环境 ----------
step "1/4 检查环境"

if ! xcode-select -p >/dev/null 2>&1; then
  die "缺 Xcode 命令行工具" "装：xcode-select --install    （弹窗点安装，几分钟）"
fi
echo "  ✓ Xcode 命令行工具：$(xcode-select -p)"

if ! command -v rustc >/dev/null 2>&1; then
  # rustup 装完不一定在当前 shell 的 PATH 里，试一下标准位置
  if [ -f "$HOME/.cargo/env" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.cargo/env"
  fi
fi
if ! command -v rustc >/dev/null 2>&1; then
  die "缺 Rust" "装：curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
     然后：source \"\$HOME/.cargo/env\""
fi
echo "  ✓ Rust：$(rustc --version)"

if ! command -v node >/dev/null 2>&1; then
  die "缺 Node" "装：官网下载，或 brew install node"
fi
NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
if [ "$NODE_MAJOR" -lt 18 ]; then
  die "Node 版本太低（当前 $(node -v)）" "Tauri 2 需要 Node 18 以上"
fi
echo "  ✓ Node：$(node -v)"

# ---------- 2 入库产物 ----------
step "2/4 检查前端壳与图标"

if [ ! -f "$SHELL_HTML" ]; then
  die "缺前端加密壳：$SHELL_HTML" "这个文件是入库的；没有它说明仓库不完整，重新 clone"
fi
echo "  ✓ 前端壳：$(du -h "$SHELL_HTML" | cut -f1)"

if [ ! -f "$ICNS" ]; then
  die "缺图标：$ICNS" "tauri.macos.conf.json 指向它；换图标见 mac/README-MAC.md 第四节"
fi
echo "  ✓ 图标：$(du -h "$ICNS" | cut -f1)"

# ---------- 3 依赖 ----------
step "3/4 安装依赖（首次较慢）"

if [ -d "$ROOT/node_modules" ]; then
  echo "  ✓ node_modules 已存在，跳过 npm install"
else
  ( cd "$ROOT" && npm install )
fi

# ---------- 4 编译 ----------
step "4/4 编译（首次编 Rust 依赖约 3–8 分钟）"

cd "$APP_DIR"
npx --yes @tauri-apps/cli@^2 build

BUNDLE="$APP_DIR/src-tauri/target/release/bundle/macos"
step "完成"

if [ -d "$BUNDLE" ]; then
  echo "  产物目录：$BUNDLE"
  ls -1 "$BUNDLE" | while read -r f; do echo "    · $f"; done
  echo ""
  echo "  双击 .app 即可打开。"
  echo "  发给别人后第一次打开要右键 → 打开（未签名应用的正常提示）。"
else
  echo "  ⚠ 编译报告成功但没找到 $BUNDLE"
  echo "  看 apps/desktop-shell/src-tauri/target/release/ 下有什么"
fi
