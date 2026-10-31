# 编译与改造

克隆下来照下面做就行。**没有任何校验、没有对照、没有需要你签字的步骤** —— 编出来能不能用，自己开着看。
改代码完全自由：皮肤、布局、判据、提示词，想怎么改都行。

---

## 桌面端（Windows / macOS）

**需要**：Node 18+ · Rust（`cargo`）；Windows 还要 MSVC Build Tools（Win10/11 都自带 WebView2 运行时）。

```bash
npm install                    # 仓库根目录，一次就够

cd apps/desktop-shell
npx --yes @tauri-apps/cli@^2 build
```

| 平台 | 产物 |
|---|---|
| Windows | `src-tauri/target/release/xiaoliuren.exe` —— 单个文件，双击即用 |
| macOS | `bash mac/build-desktop.sh` → `*.app`（细节见 `mac/README-MAC.md`） |

前端**不用**先构建：`apps/desktop-shell/web/index.html` 是入库的加密壳，`tauri build` 直接拿它。

万一双击没反应，八成是系统缺 WebView2 运行时（Win11 自带；Win10 到微软官网装「WebView2 Runtime」，免费）。

---

## 我要改东西

| 改什么 | 改哪儿 |
|---|---|
| 界面 / 交互 / 动画 | `apps/desktop-web/src/` |
| 皮肤 | `apps/desktop-web/src/skins/`（每套一个目录，配 `skinExtra.json`） |
| 起卦 / 排盘 / 六宫 / 断辞 | `apps/shared-judgment/`（界面层 import 它） |
| 模型提示词 | `apps/shared-judgment/src/prompt.js` |
| 判据语料（九份体系文档） | `apps/shared-judgment/corpus/`，改完跑 `node tools/gen-corpus.mjs` 重新打包成 `src/corpus.js` |
| 版本号 | `apps/desktop-shell/src-tauri/tauri.conf.json`、同目录 `Cargo.toml` |
| 图标 | `apps/desktop-shell/src-tauri/icons/` |

### 改完前端怎么重新进产物

**桌面**（五步，按顺序）：

```bash
cd apps/desktop-web
npm run build:shell               # → shell-dist/shell.js（外壳模块）

cd ../.. && node tools/assemble-desktop.mjs --append apps/desktop-web/shell-dist/shell.js
                                  # → apps/desktop-web/dist/新版-现代.html（明文，别提交）
node tools/make-doc-entry.mjs     # → apps/desktop-web/doc-entry.html（Vite 入口）

cd apps/desktop-web
npx vite build --config vite.doc.config.mjs   # → 成品明文单页（单文件，素材全内联）
python build/protect.py                       # → dist/新版-现代-加密.html
python build/prep_tauri_web.py                # → apps/desktop-shell/web/index.html（入库的那份壳）

cd ../desktop-shell && npx --yes @tauri-apps/cli@^2 build   # → exe / .app
```

顺序别换：`make-doc-entry` 必须在 `vite build` 之前（它生成入口），`protect` 必须在 `prep` 之前。

**安卓**：这一版的开源包不含安卓端（安卓那一侧是另一套技术栈，不在本仓）。

---

## 包里有什么

| 目录 | 内容 |
|---|---|
| `apps/desktop-web/` | 桌面前端（React 19 + Vite 6 + Tailwind 4） |
| `apps/shared-judgment/` | 起卦 / 排盘 / 六宫 / 断辞 / 提示词 / 九份语料 |
| `apps/desktop-shell/` | Tauri 2 壳；`web/` 是入库的加密壳 |
| `apps/*/build/` | 加密脚本（`protect.py` / `prep_tauri_web.py` / `shim.js`） |
| `tools/` | 组装器、文档入口生成、语料打包 |
| `mac/` | macOS 构建脚本与说明 |
| `docs/images/` | README 里的截图 |

不含：安卓端、网站、密钥、签名物料、构建产物、早期版本快照。

---

## 几个提醒（都不挡你，只是省踩坑）

1. **判据**在 `apps/shared-judgment/`，界面层 import。想复制一份到界面里直接用也完全没问题，
   只是以后改判据记得两边都改。
2. **语料与判据是两层**：`corpus/*.md` 是九份体系文档（人读），`tools/gen-corpus.mjs` 把它们打包成
   `src/corpus.js`（代码读）。改了 md 一定重跑一次，否则界面里还是旧的。
3. **加密链**（`protect.py` / `prep_tauri_web.py` / `shim.js`）负责把前端打进壳里，改它们的输入输出格式要自己兜住。
4. `dist/` · `target/` 都是生成物，`.gitignore` 已经挡住。
5. **样式**：`apps/desktop-web/src/styles/legacy.css` 是整份历史样式，包在 `@layer components` 里。
   组装器会找 `/*@xlrblk:N@*/` 分段标记按段插入；没有标记就整份放进 `<head>`（现在就是这条路）。

---

## 版本号 / 图标

| 改什么 | 改哪儿 |
|---|---|
| 版本号 | `apps/desktop-shell/src-tauri/tauri.conf.json` 的 `version`，以及同目录 `Cargo.toml`（两处要一致） |
| 应用标识 | `apps/desktop-shell/src-tauri/tauri.conf.json` 的 `identifier`（改了等于换一个 App，本地数据不互通） |
| 图标 | `apps/desktop-shell/src-tauri/icons/`（`icon.ico` 给 Windows，`1024x1024.png` 给 macOS 生成 icns） |
| 应用名 | `tauri.conf.json` 的 `productName`；Windows 启动器的文件名在 `pkg/` 里，改名要连 `使用说明.txt` 一起改 |
