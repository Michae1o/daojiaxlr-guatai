# 在 Mac 上编「道家小六壬 · 卦台」

桌面版是 **Tauri 2** 工程（Rust 外壳 + WebView 前端）。前端已经**加密好并入库**（`apps/desktop-shell/web/index.html`），判据看不到明文——这是设计如此，不需要、也不要试图解密。

你只需要在这台 Mac 上把它编成 `.app`。

---

## 一、先装这三样

| 需要 | 怎么装 | 检查 |
|---|---|---|
| **Xcode 命令行工具** | `xcode-select --install`（弹窗点安装，约 5 分钟） | `xcode-select -p` 有输出 |
| **Rust** | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh`，装完 `source "$HOME/.cargo/env"` | `rustc --version` |
| **Node 18+** | 官网装包，或 `brew install node` | `node --version` |

⚠ 只要**命令行工具**，不需要装完整的 Xcode（那个 10 多 GB 用不上）。

⚠ Apple Silicon（M 系列）和 Intel 都行，脚本会自动按当前架构编。

---

## 二、编

```bash
cd <你 clone 下来的仓库目录>
bash mac/build-desktop.sh
```

或者双击 `mac/build-desktop.command`（第一次可能要右键 → 打开，因为 Gatekeeper 会拦未签名脚本）。

脚本干的事：

1. 检查上面三样齐不齐，缺哪个直接告诉你装什么
2. `npm install`（仓库根目录，只有第一次慢）
3. `cd apps/desktop-shell` → `npx @tauri-apps/cli build`
4. 报告产物位置

第一次编译 Rust 依赖约 **3–8 分钟**，之后改前端只重编外壳、几十秒。

---

## 三、产物

```
apps/desktop-shell/src-tauri/target/release/bundle/macos/道家小六壬 · 卦台.app
```

双击就能开。想发给别人，压缩这个 `.app` 即可；对方第一次打开要右键 → 打开（未签名应用的正常提示，不是坏了）。

---

## 四、图标已经准备好了

`apps/desktop-shell/src-tauri/icons/icon.icns` 已入库（11 个尺寸，含 1024）。

**不要**再跑 `npx tauri icon` —— 那会重新生成一整套并覆盖现有的 `icon.ico`，把 Windows 那边的图标弄坏。

要改图标的话：换 `icons/1024x1024.png`，然后重新生成 `.icns`（在 Mac 上用 `iconutil`，或直接用仓库里 `tools/gen-icns.py` 的逻辑）。

---

## 五、编译不过怎么办

| 症状 | 原因 | 处理 |
|---|---|---|
| `xcrun: error: invalid active developer path` | Xcode 命令行工具没装好 | `xcode-select --install`，装完再跑一次 |
| `error: linker 'cc' not found` | 同上 | 同上 |
| `npm install` 卡住或超时 | 网络 | 换成国内镜像：`npm config set registry https://registry.npmmirror.com` |
| `cargo` 下载依赖极慢 | 没配镜像 | 在 `~/.cargo/config.toml` 里加 `[source.crates-io] replace-with = 'ustc'` 一节 |
| 编译过了但双击没反应 | 前端壳坏了 / 端口被拦 | 终端里直接跑 `.../卦台.app/Contents/MacOS/*`，看输出 |
| `"xxx.app" 已损坏，无法打开` | 未签名 + 隔离属性 | `xattr -cr "路径/道家小六壬 · 卦台.app"` |
| 白屏 | 前端产物没进包 | 确认 `apps/desktop-shell/web/index.html` 存在（约 12 MB） |

---

## 六、这个包里没有什么（不是遗漏）

| 缺的 | 为什么 |
|---|---|
| iOS 版 | 手机端已改用 **Kuikly**（Kotlin 跨端），本仓的 Kuikly 工程目前只配了 Android target；要出 iOS 得给 `apps/android/kuikly/shared` 加 iOS target + 建 Xcode 工程，那是另一件事 |
| 安卓工程 | 在 `apps/android/`，用 Gradle 编，不在这条链里 |
| 明文前端源码 | `apps/desktop-web/src/` 是有的；但打进 App 的是加密后的壳，运行时前端是解密出来的，所以反编译 exe/app 看不到明文——设计如此 |

---

## 七、只想看界面，不想编

打开 <(你的站点) —— 网页版跟桌面版是同一份前端，Mac 上照样能用。
