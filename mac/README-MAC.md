# 在 Mac 上编「道家小六壬 · 卦台」—— macOS 版 与 iOS 版

这是一个 **编译验证包**，不是完整开发仓。前端已经**加密好**（判据看不到明文，这是设计），你只需要把它编成两个平台的 App。

| 要什么 | 跑哪条 | 出什么 |
|---|---|---|
| **macOS 版** | `bash mac/build-desktop.sh` | `道家小六壬 卦台.app`（能拖进「应用程序」） |
| **iOS 版** | `bash mac/build-ios.sh` | Xcode 工程 + 模拟器 `.app`（真机要选 Team） |

---

## 零、先做这两件事（各一次）

```bash
# 1) 编译工具链
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh && source "$HOME/.cargo/env"

# 2) 解压后给脚本执行权限（zip 不带权限位）
cd <解压后的目录>
chmod +x mac/*.sh mac/*.command
```

要走 iOS，另外需要：

```bash
# 完整 Xcode（不是命令行工具）—— Mac App Store 搜 Xcode
sudo xcode-select -s /Applications/Xcode.app
# CocoaPods（Capacitor 6 的 iOS 工程靠它拉依赖）
brew install cocoapods
# Node 20+（Tauri 打包器 + Capacitor CLI 都要）
brew install node
```

---

## 一、macOS 版

```bash
bash mac/build-desktop.sh
```

或者双击 `mac/build-desktop.command`。

脚本干的六件事：查环境 → 覆盖 Windows 工具链 → 验前端加密壳 → **生成 `.icns` 图标**（仓里只有 `.ico`/`.png`，mac 的 `.app` 只认 icns）→ `tauri build` 打包 → ad-hoc 签名。

产物：

```
apps/desktop-shell/src-tauri/target/release/bundle/macos/道家小六壬 卦台.app
```

- 打开：`open "apps/desktop-shell/src-tauri/target/release/bundle/macos/道家小六壬 卦台.app"`
- 或者双击 `mac/run-desktop.command`
- 安装：把 `.app` 拖进「应用程序」

**第一次打不开、提示「无法验证开发者」**（从网上下载的包会带隔离属性）：

```bash
xattr -dr com.apple.quarantine "apps/desktop-shell/src-tauri/target/release/bundle/macos/道家小六壬 卦台.app"
```

> 本机自己编出来的 `.app` 没有隔离属性，直接就能开。上面这条只在你把 `.app` 拷给别人 / 从 zip 解压时才需要。
> 要正式分发给别人（不弹任何警告），需要 Apple 开发者账号做 **Developer ID 签名 + 公证**（notarization），这一步脚本不做。

---

## 二、iOS 版

```bash
bash mac/build-ios.sh
```

或者双击 `mac/build-ios.command`。

脚本干的五件事：查 Xcode/pod → `cap add ios` 生成 iOS 工程（第一次会 `pod install`，几分钟）→ `cap sync ios` 把加密壳灌进去 → `xcodebuild` 编模拟器版 → 打印怎么跑。

产物：

```
apps/mobile-shell/ios/build/Build/Products/Debug-iphonesimulator/App.app
apps/mobile-shell/ios/App/App.xcworkspace      ← 用 Xcode 打开这个
```

### 跑模拟器

```bash
open -a Simulator
xcrun simctl install booted "apps/mobile-shell/ios/build/Build/Products/Debug-iphonesimulator/App.app"
xcrun simctl launch booted cn.xiaoliuren.guatai
```

### 跑真机

```bash
open "apps/mobile-shell/ios/App/App.xcworkspace"
```

Xcode 里：左侧选 `App` target → **Signing & Capabilities** → **Team** 选你的 Apple ID（没有就 Add an Account，免费 ID 就行）→ 连上 iPhone → Run。

> 免费 Apple ID：能装自己手机，7 天过期要重装。
> 出 `.ipa` 给别人装：需要付费开发者账号，Xcode 里 Product → Archive → Distribute。

### iOS 侧的已知差异（不是 bug）

| 项 | 说明 |
|---|---|
| `ios/` 不在仓库里 | 它是 `cap add ios` 现场生成的 mac-only 工程，跟 `android/` 不一样（`android/` 是入库的） |
| 应用名 | 沿用 `capacitor.config.json` 的「道家小六壬 · 卦台」，bundle id `cn.xiaoliuren.guatai` |
| 加密壳 | 预期与安卓同一套逻辑：WebKit 的 `document.open()` 按规范是**替换整页**（Windows 的 WebView2 实测是追加，两端壳代码都兜了这两种）。⚠ 我这边没有 iOS 设备，**这条未经真机验证**，打开后若白屏请看排错表 |
| 前端兼容地板 | 手机端产物是 `target: esnext`（不降级语法）⇒ **建议 iOS 16 及以上**；老机型可能白屏 |

---

## 三、编译不过怎么办

| 看到的错误 | 原因 | 怎么办 |
|---|---|---|
| `toolchain 'stable-x86_64-pc-windows-msvc' is not installed` | 仓里 `rust-toolchain.toml` 钉的是 Windows 工具链 | 脚本已用 `RUSTUP_TOOLCHAIN=stable` 覆盖。仍报就 `mv apps/desktop-shell/rust-toolchain.toml apps/desktop-shell/rust-toolchain.toml.win` |
| `xcrun: error: invalid active developer path` | 没装命令行工具 | `xcode-select --install` |
| `linker command failed` / `ld: library not found` | 同上 | 同上 |
| `sips: command not found` | 不在 macOS 上跑 | 这个脚本只能在 Mac 上跑 |
| `iconutil` 报 `Invalid Iconset` | 源图不是正方形或损坏 | 确认 `apps/desktop-shell/src-tauri/icons/1024x1024.png` 是 1024×1024 |
| `error: failed to run custom build command for 'tauri-build'` 提到 icon | bundle 段要 icns | 删掉 `apps/desktop-shell/src-tauri/icons/icon.icns` 重跑一次，让脚本重新生成 |
| `warning: unused attribute 'windows_subsystem'` | Windows 专用属性，mac 上被忽略 | 忽略 |
| `xcodebuild: error: ... requires a development team` | 没选 Team 编了真机 target | 脚本默认编模拟器（`CODE_SIGNING_ALLOWED=NO`）。真机走 Xcode 界面 |
| `pod: command not found` | 没装 CocoaPods | `brew install cocoapods` |
| `[!] Unable to find a specification for 'Capacitor'` | pod 仓库太久没更新 | `pod repo update` 后重跑 |
| 第一次 `tauri build` 很慢（10 分钟+） | 要编 tauri + reqwest（rustls）+ 下载 tauri CLI | 正常，等 |

改过 `mac/*.sh` 之后想确认行尾没被编辑器改成 CRLF（CRLF 的 bash 脚本会报 `$'\r': command not found`）：

```bash
python3 mac/check-eol.py
```

---
