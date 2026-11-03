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

## 六、iOS 版：现在没有，这是从零做出来的路线

先讲清楚：**这个仓库里没有 iOS 工程**。手机端已经从 Capacitor 换成了 Kuikly，而本仓的 Kuikly 工程只开了 Android target。下面是从零加 iOS 的完整路线，照着走能在 Mac 上做出来——但注意我们手上没有 Mac，这份路线是照腾讯官方文档 <https://kuikly.tds.qq.com/QuickStart/iOS.html> 整理的，**没有实测过**，真做的时候以官方文档为准。

### 第 1 步 KMP 侧开 iOS target

`apps/android/kuikly/shared/build.gradle.kts`：

```kotlin
kotlin {
    androidTarget()
    iosArm64()              // 实机
    iosSimulatorArm64()     // Apple Silicon 的模拟器
    iosX64()                // Intel Mac 的模拟器

    sourceSets {
        // ... commonMain 等保持原样

        val iosMain by creating {
            dependsOn(commonMain.get())
            dependencies {
                api("com.tencent.kuikly-open:core-render-ios:2.30.0")
            }
        }
        val iosArm64Main by getting { dependsOn(iosMain) }
        val iosSimulatorArm64Main by getting { dependsOn(iosMain) }
        val iosX64Main by getting { dependsOn(iosMain) }
    }
}
```

⚠ **版本号有个坑，官方文档特别提过**：

| 制品 | 版本号格式 | 我们该填 |
|---|---|---|
| `core`、`core-ksp`、`core-annotations`、`compose`、`core-render-android` | Kuikly 版本**-Kotlin 版本** | `2.30.0-2.1.21`（现在这份） |
| `core-render-ios`、鸿蒙渲染层 | **只有 Kuikly 版本** | `2.30.0` ← 去掉后缀 |

填错会编译失败或者运行期行为不对。

### 第 2 步 编出 xcframework

```bash
cd apps/android/kuikly
./gradlew :shared:linkReleaseFrameworkIosArm64          # 实机
./gradlew :shared:linkReleaseFrameworkIosSimulatorArm64 # 模拟器
```

产物在 `shared/build/bin/iosArm64/releaseFramework/shared.framework`（或 `.xcframework`）。

### 第 3 步 建 Xcode 工程，接入渲染器

新建一个 iOS App 工程（Swift 或 Objective-C 都行），然后二选一：

**方式 A：CocoaPods（官方推荐）**

```ruby
# Podfile
platform :ios, '14.1'
target 'Guatai' do
  inhibit_all_warnings!
  pod 'OpenKuiklyIOSRender', '2.30.0'
end
```

```bash
pod install --repo-update
```

**方式 B：SPM**

Xcode → Package Dependencies → `+` → 填 `https://github.com/Tencent-TDS/KuiklyUI.git` → 版本选 `2.30.0`。

然后把第 2 步的 `shared.xcframework` 接进去：SPM 用 `.binaryTarget(name: "shared", path: "./shared.xcframework")`，CocoaPods 可以手动拖进工程并设成 `Embed & Sign`。

⚠ **图片等资源要单独处理**：Kuikly 默认从 `mainBundle` 按路径加载，资源文件要么直接拖进工程（保持目录结构），要么单独建一个 resource target 用 `.copy` 保留目录（不能用 `.process`，会把目录压平）。用 SPM 时还要实现这个回调告诉框架资源在哪：

```swift
func resourceFolderUrl(forKuikly pageName: String) -> URL {
    Bundle.main.bundleURL.appendingPathComponent("shared_SharedResource.bundle/KuiklyResources")
}
```

### 第 4 步 写承载容器

Kuikly 页面跑在一个 `UIViewController` 里。核心是一个委托类，关键方法是 `fetchContextCodeWithPageName:` ——它返回业务 framework 的名字（我们这份是 `"shared"`）：

```objc
@implementation KuiklyRenderViewController
- (void)viewDidLoad {
    [super viewDidLoad];
    _delegator = [[KuiklyRenderViewControllerBaseDelegator alloc]
                   initWithPageName:pageName pageData:pageData];
    _delegator.delegate = self;
    [_delegator viewDidLoadWithView:self.view];
}

// 这一句告诉 Kuikly 去哪找业务代码
- (void)fetchContextCodeWithPageName:(NSString *)pageName
                      resultCallback:(KuiklyContextCodeCallback)callback {
    if (callback) callback(@"shared", nil);
}
@end
```

生命周期要一一转给 delegator（`viewDidLayoutSubviews`、`viewWillAppear`、`viewDidAppear`、`viewWillDisappear`、`viewDidDisappear`），官方文档的示例里有完整代码，照抄即可。

### 第 5 步 重写平台能力（这是真正的工作量）

现在所有平台相关的实现都在 `apps/android/kuikly/androidApp/` 里，是**纯 Android 代码**，`shared` 里没有 `expect/actual` 抽象。所以 iOS 侧得一项一项重写：

| Android 侧文件 | 干什么 | iOS 要换成 |
|---|---|---|
| `BackupHost.kt` 8.3 KB | 备份到 `下载/道家小六壬/卦台备份.json`，卸载重装后恢复 | iOS 沙盒 Documents + Files app 共享，或 iCloud Drive |
| `LlmHost.kt` 16.3 KB | API Key、模型配置、卦例记录（SharedPreferences `xlr-k-llm`） | `NSUserDefaults` 或 Keychain（Key 建议进 Keychain） |
| `RealtimeFogView.kt` 16.0 KB | 实时雾气（Android 用 AGSL/Shader 渲染） | Metal shader，或用 Core Image 近似 |
| `dismissIme()` | 收起键盘 | `resignFirstResponder` |
| `WebViewActivity.kt` 2.2 KB | 内置浏览器（看链接） | `SFSafariViewController` 或 `WKWebView` |
| `UpdHost.kt` 5.2 KB | 检查更新、下载新 APK | ⚠ **iOS 不能这么做**，App Store 不允许自更新，只能跳 App Store |
| `KRImageAdapter.kt` | 图片加载 | SDWebImage 适配器 |
| `KRRouterAdapter.kt` / `KRThreadAdapter.kt` / `KRLogAdapter.kt` | 路由、线程、日志 | 官方都有对应的 iOS 协议，各自实现一遍 |

**建议做法**：先在 `shared` 里把这几项抽成 `expect` 声明，让 `androidMain` 提供 `actual`（现有实现搬过去），再让 `iosMain` 提供 iOS 的 `actual`。这样 common 代码不用改，两端各管各的。这一步做完，后面加鸿蒙/Web 也顺。

### 其他绕不开的

- **最低版本**：Kuikly 渲染器要求 iOS 12+，官方 Podfile 示例写的是 `platform :ios, '14.1'`
- **Xcode 27 之后**：iOS SDK 最低部署目标被抬到 15.0，所有依赖的 Deployment Target 要跟着调
- **签名**：要有 Apple 开发者账号（个人免费账号只能装到自己的设备，且 7 天过期）
- **图标**：iOS 要 `AppIcon.appiconset`（一套 PNG），跟 Mac 的 `.icns` 不是一回事
- **深色模式**：九套皮肤是我们自己在 Kuikly 里画的，不受系统深色模式影响，但要确认状态栏、安全区在 iOS 上表现正常

### 工作量估计

| 阶段 | 估时 |
|---|---|
| 第 1–2 步（开 target、编出 framework） | 半天，主要是第一次编 Kotlin/Native 慢 |
| 第 3–4 步（Xcode 工程、容器跑起来看到页面） | 1 天 |
| 第 5 步（平台能力重写） | 3–5 天，雾气和备份是大头 |
| 联调、适配刘海/安全区、签名上架 | 2–3 天 |

合计 **一周到两周**，前提是有台 Mac 和 Apple 开发者账号。

---

## 七、这个包里没有什么（不是遗漏）

| 缺的 | 为什么 |
|---|---|
| iOS 版 | 仓库里没有 iOS 工程。手机端已改用 **Kuikly**，但本仓的 Kuikly 工程只开了 Android target；要从零做出来，见第六节的完整路线 |
| 安卓工程 | 在 `apps/android/`，用 Gradle 编，不在这条链里 |
| 明文前端源码 | `apps/desktop-web/src/` 是有的；但打进 App 的是加密后的壳，运行时前端是解密出来的，所以反编译 exe/app 看不到明文——设计如此 |

---

## 七、只想看界面，不想编

打开 <(你的站点) —— 网页版跟桌面版是同一份前端，Mac 上照样能用。
