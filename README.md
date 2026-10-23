# 道家小六壬 · 卦台

本地跑的小六壬排盘与断卦工具：起卦、掌诀走宫、六宫断辞、体用与应期，全在你自己的机器上算完；
要不要接大模型由你决定。源码开放，随便改。

| 端 | 技术栈 |
|---|---|
| 桌面（Windows / macOS） | React 19 · Vite 6 · Tauri 2 |
| 手机（Android） | React 19 · Vite 6 · Capacitor 6 |
| 判据 | 纯 JS 共享包，两端 `import` 同一份 |

## 界面

**起卦 · 三宫排盘**

![起卦](docs/images/desktop-cast.png)

**断卦结果 · 六宫类象与应期**

![断卦](docs/images/desktop-divination.png)

**卦例本 · 记录与应验**

![卦例本](docs/images/desktop-records.png)

**皮肤**

![皮肤](docs/images/desktop-skins.png)

**手机端（明 / 暗）**

| 明 | 暗 |
|---|---|
| ![手机明](docs/images/mobile-light.jpg) | ![手机暗](docs/images/mobile-dark.jpg) |

## 能做什么

- **起卦**：时间取数、月日时三宫、报数、单宫取象、多选一；报 0 按 10 计。
- **排盘**：六神掌诀走位、天宫 / 地宫 / 人宫（落宫）定位、太极点转换。
- **断卦**：宫义、生克关系、三易、体用（体＝落宫，用＝起卦时辰）、应期取数。
- **事类速断**：婚姻、孕产、财运、工作、疾病、失物、行人、天气、官司、考试。
- **卦例本**：把起过的卦存下来，事后填应验，回头校准自己。
- **十套皮肤 + 明暗主题**；界面适配桌面与手机两套布局。
- **接不接模型都行**：不接就是纯本机速断；接了（OpenAI / Anthropic 兼容端点）可以让模型照判据组织语言。

## 编译

```bash
npm install                     # 仓库根目录，一次就够

# 桌面端
cd apps/desktop-shell
npx --yes @tauri-apps/cli@^2 build
# → src-tauri/target/release/xiaoliuren.exe，双击即用
```

```bash
# 安卓端
cd apps/mobile-web && npm run build
cd ../.. && node tools/stage-android-www.mjs
cd apps/mobile-shell && npx cap sync android
cd android && ./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

没配签名也能编 —— 不填钥匙就走 Android 自带的调试签名。前端改完怎么重新打进产物、每个目录干什么，
都写在 [BUILD.md](BUILD.md)。

## 判据在哪、怎么改

判据全在 `apps/shared-judgment/`，两端都引用它，改一处两端都生效。

```
corpus/00…08.md          九份体系文档（人读的真源，约 23 万字）
      ↓ node tools/gen-corpus.mjs
src/corpus.js            打包成代码读的形式
      ├─ src/prompt.js       解卦用的系统提示词
      ├─ src/judgment.js     六宫固定层 / 通用判据 / 应期 / 十类事类
      └─ src/asks.js         本机速断的按问法素材
```

想换一套判据、或者把某几条改成你自己的理解：直接改 `corpus/` 里的 Markdown，再跑一次
`node tools/gen-corpus.mjs` 就行，没有别的地方要同步。判据来源与口径说明见
[README-判据.md](README-判据.md)。

## 目录

| 目录 | 内容 |
|---|---|
| `apps/desktop-web/` | 桌面前端（React + Tailwind） |
| `apps/desktop-shell/` | Tauri 2 壳工程与加密后的前端壳 |
| `apps/mobile-web/` | 手机前端（与桌面端各自独立） |
| `apps/mobile-shell/` | Capacitor 6 壳 + 安卓工程 |
| `apps/shared-judgment/` | 判据与语料 |
| `apps/*/build/` | 打包用的加密脚本 |
| `tools/` | 组装器、语料打包、安卓 stage |
| `mac/` | macOS / iOS 构建脚本 |
| `docs/images/` | 上面那些截图 |

## 说明

- 判据体系出自邵一尘先生的「道家小六壬」，应用内保留署名。
- 属中华传统民俗文化内容，仅供娱乐参考，不作决策依据。
- 仓库里不含签名物料、密钥与构建产物；`.gitignore` 已挡住。
