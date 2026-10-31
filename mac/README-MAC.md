# 在 Mac 上编「道家小六壬 · 卦台」—— macOS 版

这是一个 **编译验证包**，不是完整开发仓。前端已经**加密好**（判据看不到明文，这是设计），你只需要把它编成 macOS App。

| 要什么 | 跑哪条 | 出什么 |
|---|---|---|
| **macOS 版** | `bash mac/build-desktop.sh` | `道家小六壬 卦台.app`（能拖进「应用程序」） |

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

## 二、编译不过怎么办

| 看到的错误 | 原因 | 怎么办 |
|---|---|---|
| `toolchain 'stable-x86_64-pc-windows-msvc' is not installed` | 仓里 `rust-toolchain.toml` 钉的是 Windows 工具链 | 脚本已用 `RUSTUP_TOOLCHAIN=stable` 覆盖。仍报就 `mv apps/desktop-shell/rust-toolchain.toml apps/desktop-shell/rust-toolchain.toml.win` |
| `xcrun: error: invalid active developer path` | 没装命令行工具 | `xcode-select --install` |
| `linker command failed` / `ld: library not found` | 同上 | 同上 |
| `sips: command not found` | 不在 macOS 上跑 | 这个脚本只能在 Mac 上跑 |
| `iconutil` 报 `Invalid Iconset` | 源图不是正方形或损坏 | 确认 `apps/desktop-shell/src-tauri/icons/1024x1024.png` 是 1024×1024 |
| `error: failed to run custom build command for 'tauri-build'` 提到 icon | bundle 段要 icns | 删掉 `apps/desktop-shell/src-tauri/icons/icon.icns` 重跑一次，让脚本重新生成 |
| `warning: unused attribute 'windows_subsystem'` | Windows 专用属性，mac 上被忽略 | 忽略 |
| 第一次 `tauri build` 很慢（10 分钟+） | 要编 tauri + reqwest（rustls）+ 下载 tauri CLI | 正常，等 |

改过 `mac/*.sh` 之后想确认行尾没被编辑器改成 CRLF（CRLF 的 bash 脚本会报 `$'\r': command not found`）：

```bash
python3 mac/check-eol.py
```

---

> 手机端（电容壳 Capacitor）那一套已经不在本仓：安卓改用了另一套原生技术栈，iOS 版随之停掉。
> 想在手机上用，直接开桌面网页版即可 —— 前端是同一份，手机浏览器照样能开（按 F11 或横屏看更舒服）。
