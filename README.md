# 道家小六壬 · 卦台

一个在自己电脑上用的小六壬工具。按下时间、或者报几个数，把三宫排出来，给出六宫断辞、体用、应期和事类速断。

**起卦、排盘、断卦依据全在本机算**，不联网也能用；接不接大模型由你决定，不接就是纯本机速断。
源码全开放，判据是明文，想怎么改就怎么改 —— 见 [`README-判据.md`](README-判据.md)。

---

## 目录

- [能做什么](#能做什么)
- [界面](#界面)
- [技术栈](#技术栈)
- [跑起来](#跑起来)
- [手机端（安卓）](#手机端安卓)
- [判据在哪、怎么改](#判据在哪怎么改)
- [这个仓里有什么](#这个仓里有什么)
- [什么不在这个仓里](#什么不在这个仓里)
- [常见问题](#常见问题)
- [内容与免责](#内容与免责)
- [许可](#许可)

## 能做什么

| | |
|---|---|
| **起卦** | 时间取数、月日时三宫、报数（0 按 10 计）、单宫取象、多选一；起卦前可填所问之事 |
| **排盘** | 六神掌诀走位、天宫 / 地宫 / 人宫（落宫）定位、太极点转换 |
| **断卦** | 宫义、生克、三易、体用（体＝落宫，用＝起卦时辰）、应期取数，每条判据带出处 |
| **事类速断** | 婚姻、孕产、财运、工作、疾病、失物、行人、天气、官司、考试…本机直接出 |
| **卦例本** | 起过的卦自动存档，事后填应验、复盘、进回收站；可导出 / 导入带走 |
| **接模型** | 任何 OpenAI / Anthropic 兼容接口：OpenAI、DeepSeek、智谱、月之暗面、硅基流动、火山方舟、通义、MiniMax、Gemini，或本机 Ollama；预设一键切换 |
| **MCP** | 把判据做成工具挂给小智一类客户端：起卦、查典、解卦，由本机算完再回话 |
| **皮肤** | 十套：黑白、黑夜、梦幻、宣纸、青瓷、豆沙、卡通、敦煌、莫高窟、铜古；明暗随皮肤走 |
| **更新** | 装的是桌面版时，设置页可检查更新（可选，不填地址就不联网） |

## 界面

| 起卦 | 断卦 |
|---|---|
| ![起卦](docs/images/desktop-cast.png) | ![断卦](docs/images/desktop-divination.png) |

| 卦例本 | 皮肤 |
|---|---|
| ![卦例本](docs/images/desktop-records.png) | ![皮肤](docs/images/desktop-skins.png) |

## 技术栈

| 层 | 用什么 |
|---|---|
| 前端 | React 19、Vite 6、Tailwind 4、GSAP / Motion |
| 外壳 | Tauri 2（Rust），Windows 走 WebView2，macOS 走 WKWebView |
| 判据 | 纯 ES 模块（`apps/shared-judgment`），界面层 import，不含框架依赖 |
| 安卓 | Kotlin Multiplatform + Kuikly + Compose（`apps/android`），判据另有一份 Kotlin 实现 |
| 产物 | 前端用 `vite-plugin-singlefile` 打成单文件 HTML，再由 `protect.py` 上壳 |

## 跑起来

### 只想编译成品

需要 **Node 18+** 和 **Rust（cargo）**；Windows 另需 MSVC Build Tools。

```bash
npm install                      # 仓库根目录，一次

cd apps/desktop-shell
npx --yes @tauri-apps/cli@^2 build
```

产物：`apps/desktop-shell/src-tauri/target/release/xiaoliuren.exe`（单文件，双击即用）。
macOS 用 `bash mac/build-desktop.sh`，细节见 [`mac/README-MAC.md`](mac/README-MAC.md)。

> 双击没反应，八成是系统缺 WebView2 运行时（Win11 自带，Win10 到微软官网装一次即可）。

### 想改前端

```bash
npm install
cd apps/desktop-web
npm run dev                       # 浏览器里调界面，热更新
```

改完怎么重新打进加密壳、怎么出 exe：[`BUILD.md`](BUILD.md)。

## 手机端（安卓）

手机那一版是**另一套原生实现**（Kotlin Multiplatform + Kuikly + Compose），源码在 `apps/android/`，
与桌面前端不共用界面代码；判据在那边是 Kotlin 版（`kuikly/shared/.../judge/`）。

```bash
cd apps/android/kuikly
JAVA_HOME=<JDK 17> ANDROID_HOME=<Android SDK> ./gradlew :androidApp:assembleRelease
# → androidApp/build/outputs/apk/release/androidApp-release.apk
```

需要 JDK 17 与 Android SDK 34；仓里不带钥匙，没有签名配置时自动用调试签名。
签名、目录、注意事项见 [`apps/android/README.md`](apps/android/README.md)。

## 判据在哪、怎么改

判据只有一份真源，在 `apps/shared-judgment/`（安卓那份是它的 Kotlin 移植，语义要一致）：

```
corpus/00…08.md          九份体系文档（人读的真源）
      ↓ node tools/gen-corpus.mjs
src/corpus.js            打包成代码读的形式
      ├─ src/judgment.js     六宫固定层 / 通用判据 / 应期 / 事类
      ├─ src/prompt.js       解卦用的系统提示词
      └─ src/asks.js         本机速断的按问法素材
```

改 `corpus/*.md` → 跑一次 `node tools/gen-corpus.mjs` → 重新编前端。没有别的地方要同步。
语料里每一处引文都带材料名与行号，判据来源与分级见 [`README-判据.md`](README-判据.md)。

## 这个仓里有什么

| 目录 | 内容 |
|---|---|
| `apps/desktop-web/` | 桌面前端：`src/` 界面、`skins/` 皮肤、`styles/` 样式、`legacy/` 历史模块 |
| `apps/shared-judgment/` | 起卦 / 排盘 / 六宫 / 断辞 / 提示词 / 九份语料 |
| `apps/android/` | 安卓端：Kotlin + Kuikly 工程（`kuikly/`）、判据的 Kotlin 实现、构建说明 |
| `apps/desktop-shell/` | Tauri 2 壳；`web/index.html` 是入库的加密壳，`pkg/` 是 Windows 启动器 |
| `apps/desktop-web/build/` | 上壳链：`protect.py`（加密）、`prep_tauri_web.py`（生成壳） |
| `tools/` | 组装器、文档入口生成、语料打包 |
| `mac/` | macOS 构建脚本与说明 |
| `docs/images/` | README 里这几张截图 |

## 什么不在这个仓里

- 官网、部署脚本、更新清单服务端。
- 密钥、签名物料、任何人的账号与环境配置。
- 构建产物（`dist/`、`target/`、`build/`、编好的 exe / apk）与早期版本快照。

## 常见问题

**「Windows 已保护你的电脑」怎么办？**
点「更多信息 → 仍要运行」。没买代码签名证书的个人软件都这样。

**能把 exe 单独拷走吗？**
可以，单文件就是全部。但壳里的前端是加密的，改了源码要重新编才会生效。

**数据存在哪？换电脑能带走吗？**
存在应用自己的本地存储里。设置页有导出 / 导入，换机器拷一份就行；更新版本不会清掉卦例。

**不填 Key 能用吗？**
能。起卦、排盘、本机速断都不需要联网，模型只是把断辞说顺。

**手机上能用吗？**
能，安卓端就在 `apps/android/`（另一套原生实现，编译见那里的 README）。桌面网页版手机浏览器也能开，但那是桌面布局。

更多问题（Key 报错、拉模型列表、解到一半停住、接着问…）在应用内 **设置 → 关于 → 常见问题** 里有 18 条。

## 内容与免责

- 判据体系出自邵一尘先生所传的「道家小六壬」（卜法卷），应用内与语料中保留讲者署名与分级。
- 属中华传统民俗文化内容，**仅供学习与参考，不作预测、承诺或任何专业意见**，重大决定请自己做。

## 许可

[Apache License 2.0](LICENSE)：可自由使用、修改、分发、商用，保留版权声明与许可副本即可，不提供担保。
