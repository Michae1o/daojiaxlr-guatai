# -*- coding: utf-8 -*-
"""apps/mobile-web 的路径常量 —— 全部相对本目录，不含「旧目录」写死路径。

本前端独立自足：chunks/ 是手机形态的应用本体分块，src/ 是手机形态的覆盖层源码。
它不读 _tools/、不读 _build2/、不读 _sketch/，**也不读 apps/desktop-web/** —— 两个前端零交叉。
"""
import os
from pathlib import Path

APP = Path(__file__).resolve().parent.parent      # apps/mobile-web
BUILD = APP / "build"
SRC = APP / "src"                                  # 覆盖层源码（手机形态）
CHUNKS = APP / "chunks"                            # 应用本体分块 + 农历表 + 离线自检
DIST = APP / "dist"                                # 产物（不入库）
GEN = BUILD / "generated"                          # 生成物（不入库）

DIST.mkdir(parents=True, exist_ok=True)
GEN.mkdir(parents=True, exist_ok=True)

# 安卓工程（gradle）与 SDK/JDK 也都在这套目录里，可用环境变量覆盖。
ANDROID_PROJ = Path(os.environ.get("XLR_ANDROID_PROJ", str(APP.parent / "mobile-shell" / "android")))
JDK = Path(os.environ["XLR_JDK"]) if os.environ.get("XLR_JDK") else Path()
SDK = Path(os.environ["XLR_SDK"]) if os.environ.get("XLR_SDK") else Path()
GRADLE_HOME = Path(os.environ["XLR_GRADLE_HOME"]) if os.environ.get("XLR_GRADLE_HOME") else Path()

# 旧共用源的工作区根（**只有一次性迁移脚本 derive_mobile_src.py 会用它**，见该脚本说明）
LEGACY = None
