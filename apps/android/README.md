# 安卓端（Kotlin Multiplatform · Kuikly + Compose）

手机上的那一版。和桌面前端**不是**同一套代码：界面、动画、交互各写各的，判据逻辑另有一份 Kotlin 实现
（`kuikly/shared/src/commonMain/kotlin/com/xlr/k/judge/`），语义与桌面那份对齐。

## 需要什么

| 项 | 版本 |
|---|---|
| JDK | 17 |
| Android SDK | Platform 34 + Build-Tools（`ANDROID_HOME` 指好即可，不需要 `local.properties`） |
| Gradle | 用仓里的 `gradlew`，不用另装 |

## 编一个安装包

```bash
cd apps/android/kuikly

# Linux / macOS
JAVA_HOME=/path/to/jdk17 ANDROID_HOME=/path/to/android-sdk \
  ./gradlew :androidApp:assembleRelease

# Windows
set JAVA_HOME=(upstream)
set ANDROID_HOME=(upstream)
gradlew.bat :androidApp:assembleRelease
```

产物：`kuikly/androidApp/build/outputs/apk/release/androidApp-release.apk`

**签名**：仓里不带任何钥匙。没有 `apps/android/keystore.properties` 时自动用调试签名，
编出来的包装得上、能跑。要用自己的钥匙：

```bash
cp keystore.properties.example keystore.properties   # 放在 apps/android/ 下
# 填 storeFile / storePassword / keyAlias / keyPassword
```

`keystore.properties` 已被 `.gitignore` 挡住，别提交。

## 目录

| 路径 | 内容 |
|---|---|
| `kuikly/shared/src/commonMain/kotlin/com/xlr/k/` | 界面与逻辑：`pages/` 页面、`judge/` 判据、`ui/` 组件 |
| `kuikly/androidApp/src/main/` | Android 宿主：Manifest、图标、`UpdHost.kt`（app 内更新、装 APK） |
| `kuikly/shared/src/commonMain/composeResources/` | 图片、字体等素材 |
| `scripts/gen-prompt.mjs` | 从 `apps/shared-judgment/src/prompt.js` 生成 `judge/PromptData.kt` |

## 需要注意

- **判据是 Kotlin 版**：`judge/` 下那些 `*Data.kt` / `*Cases.kt` 由脚本从判据表导出，别手改；
  改判据请改 `apps/shared-judgment/`，再重跑导出脚本（脚本不在本仓的部分就自己写一个）。
- **更新清单留空**：`UpdHost.kt` 里 `MANIFEST_URL` 默认为空 = 关掉 app 内更新；
  要用就填你自己的清单地址（格式写在那个文件里）。
- 包名 `cn.guatai.xiaoliuren`，minSdk 24（Android 7.0）。
