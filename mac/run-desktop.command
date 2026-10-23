#!/usr/bin/env bash
# 双击我 = 打开「道家小六壬 · 卦台」
cd "$(dirname "$0")/.." || exit 1
APP="apps/desktop-shell/src-tauri/target/release/bundle/macos/道家小六壬 卦台.app"
if [ ! -d "$APP" ]; then
  echo "还没编译。先双击 mac/build-desktop.command"
  echo ""
  echo "---- 按任意键关闭 ----"
  read -r -n 1 -s
  exit 1
fi
open "$APP"
