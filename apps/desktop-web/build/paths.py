# -*- coding: utf-8 -*-
"""apps/desktop-web 的路径常量 —— 全部相对本目录，不含任何「旧目录」写死路径。

本前端独立自足：chunks/ 是应用本体分块，src/ 是覆盖层源码，assets/ 是配图与图标。
它不读 _tools/、不读 _build2/、不读 _sketch/ —— 与手机端前端互不干扰。
"""
import os
from pathlib import Path

APP = Path(__file__).resolve().parent.parent      # apps/desktop-web
BUILD = APP / "build"
SRC = APP / "src"                                  # 覆盖层源码（css/js）
CHUNKS = APP / "chunks"                            # 应用本体分块 + 农历表 + 离线自检
ASSETS = APP / "assets"                            # 教程配图、图标
DIST = APP / "dist"                                # 产物（不入库）
GEN = BUILD / "generated"                          # 生成物（不入库）

DIST.mkdir(parents=True, exist_ok=True)
GEN.mkdir(parents=True, exist_ok=True)

# 唯一与外部耦合的点，可用环境变量 XLR_WEB_SHELL 覆盖。
WEB_SHELL = Path(os.environ.get("XLR_WEB_SHELL", str(APP.parent / "desktop-shell" / "web")))
