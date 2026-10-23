# 道家小六壬 · 卦台

道家小六壬（邵一尘体系）的桌面端 / 安卓端应用 —— 起卦、排盘、六宫断辞、体用应期、取数全部在本机算完；
接不接模型由你决定。源码开放，随便改。

![解卦结果](docs/images/desktop-divination.png)

## 界面

**起卦 · 三宫排盘**

![起卦](docs/images/desktop-cast.png)

**十套皮肤**

![十套皮肤](docs/images/desktop-skins.png)

**卦例本（记录 / 应验校准）**

![卦例本](docs/images/desktop-records.png)

## 三个端、一份判据

| 部分 | 技术栈 | 目录 |
|---|---|---|
| 桌面端前端 | React 19 · Vite 6 · Tailwind 4 | `apps/desktop-web` |
| 桌面端壳 | Tauri 2（Rust） | `apps/desktop-shell` |
| 安卓端前端 | 与桌面端各自独立的一套 | `apps/mobile-web` |
| 安卓端壳 | Capacitor 6（含安卓工程） | `apps/mobile-shell` |
| 判据 | 纯 JS 共享包，两端 `import` 引用 | `apps/shared-judgment` |

起卦 / 排盘 / 六宫 / 断辞 / 提示词都在 `apps/shared-judgment`；判据背后的九份体系文档在
`apps/shared-judgment/corpus/`（改动方式见 [README-判据.md](README-判据.md)）。

## 编译

```bash
npm install                    # 仓库根目录，一次就够

# 桌面端（Windows / macOS）→ 单个 exe / .app
cd apps/desktop-shell && npx --yes @tauri-apps/cli@^2 build

# 安卓 APK → app/build/outputs/apk/debug/app-debug.apk
cd apps/mobile-web && npm run build
cd ../.. && node tools/stage-android-www.mjs
cd apps/mobile-shell && npx cap sync android
cd android && ./gradlew assembleDebug        # Windows: .\gradlew.bat assembleDebug
```

签名怎么配、改完前端怎么重新打进产物、包里每个目录干什么 —— 都在 [BUILD.md](BUILD.md)。

## 文档

| 文档 | 内容 |
|---|---|
| [BUILD.md](BUILD.md) | 编译步骤、签名、包结构、改代码从哪下手 |
| [README-判据.md](README-判据.md) | 判据从哪来、语料怎么进代码、口径说明 |
| `mac/README-MAC.md` | macOS / iOS 构建 |

---

本项目基于邵一尘老师「道家小六壬」所作，属中华传统民俗文化内容，仅供娱乐参考。
