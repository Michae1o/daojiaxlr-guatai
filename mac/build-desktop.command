#!/usr/bin/env bash
# 双击我 = 编桌面端（编译窗口不会一闪就没）
cd "$(dirname "$0")" || exit 1
bash build-desktop.sh
echo ""
echo "---- 按任意键关闭 ----"
read -r -n 1 -s
