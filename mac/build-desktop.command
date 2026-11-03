#!/usr/bin/env bash
# 双击我 —— 在 Finder 里运行同目录的 build-desktop.sh
# 第一次双击若被 Gatekeeper 拦，右键 → 打开 → 仍要打开
cd "$(dirname "$0")" || exit 1
bash ./build-desktop.sh
echo ""
read -n 1 -s -r -p "按任意键关闭这个窗口…"
echo ""
