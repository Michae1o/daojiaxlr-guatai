#!/usr/bin/env bash
# ============================================================
# 道家小六壬 · 卦台 —— iOS 版编译
#
# 口径：
#   · 手机端壳 = Capacitor 6.2.0（与安卓同一套，前端用 apps/mobile-shell/www 的**加密壳**）
#   · iOS 工程由 `cap add ios` 现场生成（不入库：仓库里没有 ios/，因为它是 mac-only 生成物）
#   · 本脚本产出：模拟器可跑的 .app + 一个能直接打开的 Xcode 工程（真机要选 team）
#
# ⚠ 真机安装需要 Apple 开发者账号（免费 ID 也行，7 天有效期）。
#   脚本能保证「编得过、模拟器跑得起来」；真机签名只能在 Xcode 里点。
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

APP="apps/mobile-shell"
echo "== 0. 环境检查 =="
command -v node >/dev/null 2>&1 || { echo "✗ 缺 node（要 20+）：brew install node"; exit 1; }
xcodebuild -version >/dev/null 2>&1 || {
  echo "✗ 缺 Xcode（不是命令行工具，要完整 App）："
  echo "    Mac App Store 搜 Xcode 安装，然后 sudo xcode-select -s /Applications/Xcode.app"
  exit 1
}
echo "  node       = $(node -v)"
echo "  $(xcodebuild -version | head -1 | sed 's/^/  /')"

if ! command -v pod >/dev/null 2>&1; then
  echo ""
  echo "  ⚠ 没有 CocoaPods（Capacitor 6 的 iOS 工程靠它拉依赖）"
  echo "    装：brew install cocoapods"
  echo "    （装完重跑本脚本；没有它 cap add ios / cap sync ios 会失败）"
  exit 1
fi
echo "  pod        = $(pod --version)"

echo ""
echo "== 1. 依赖 =="
if [ ! -d node_modules ]; then
  npm ci
else
  echo "  根 node_modules 已在"
fi
node -e 'require.resolve("@capacitor/ios",{paths:[require("path").resolve("apps/mobile-shell")]})' >/dev/null 2>&1 || {
  echo "✗ 缺 @capacitor/ios（Capacitor CLI 解析不到）"
  echo "  装：npm install    # 它已在 apps/mobile-shell/package.json 里声明为 6.2.0"
  exit 1
}
echo "  @capacitor/ios 已就位"

echo ""
echo "== 2. 前端壳在场 + 自证（手机端加密壳，与安卓同一份）=="
[ -f "$APP/www/index.html" ] || { echo "✗ 缺 $APP/www/index.html"; exit 1; }
echo "  www/index.html  $(wc -c <"$APP/www/index.html" | tr -d ' ') B"
node -e '
  const fs=require("fs");
  const t=fs.readFileSync("apps/mobile-shell/www/index.html","utf8");
  const leak=["大安","留连","速喜","赤口","小吉","空亡","判据","落宫","类象"].filter(w=>t.includes(w));
  const isShell=t.includes("TextDecoder")&&t.includes("atob");
  console.log("  "+(isShell?"PASS":"FAIL")+"  仍是加密壳");
  console.log("  "+(leak.length===0?"PASS":"FAIL")+"  壳里无判据明文"+(leak.length?"  ["+leak.join(" ")+"]":""));
  if(!isShell||leak.length) process.exit(1);
'

echo ""
echo "== 3. iOS 工程（第一次会生成 apps/mobile-shell/ios/ 并跑 pod install，几分钟）=="
if [ -d "$APP/ios" ]; then
  echo "  已存在：$APP/ios"
else
  ( cd "$APP" && npx cap add ios )
fi
( cd "$APP" && npx cap sync ios )

echo ""
echo "== 3b. Info.plist：状态栏交给原生插件 =="
# ★ 2026-10-23（用户报「做成 app 之后用起来和网页一样」）：
#   @capacitor/status-bar 在 iOS 上靠 UIApplication.statusBarStyle 改样式，
#   而 Info.plist 里默认是 `UIViewControllerBasedStatusBarAppearance = YES`
#   ⇒ view controller 说了算 ⇒ 插件调 setStyle 无效（症状：深色皮肤下状态栏黑字压深底看不见）。
#   这两条是那个插件在 iOS 上能工作的前提，`cap sync` 不会替你写。
PLIST="$APP/ios/App/App/Info.plist"
if [ -f "$PLIST" ]; then
  /usr/libexec/PlistBuddy -c 'Delete :UIViewControllerBasedStatusBarAppearance' "$PLIST" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c 'Add :UIViewControllerBasedStatusBarAppearance bool false' "$PLIST" || exit 1
  /usr/libexec/PlistBuddy -c 'Delete :UIStatusBarStyle' "$PLIST" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c 'Add :UIStatusBarStyle string UIStatusBarStyleDarkContent' "$PLIST" || exit 1
  echo "  UIViewControllerBasedStatusBarAppearance = false"
  echo "  UIStatusBarStyle = UIStatusBarStyleDarkContent"
else
  echo "  ⚠ 没找到 $PLIST（cap add ios 没成功？）"
fi

echo ""
echo "== 4. 编模拟器版（不需要签名证书）=="
DERIVED="$APP/ios/build"
cd "$APP/ios/App"
xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  -derivedDataPath "$DERIVED" \
  CODE_SIGNING_ALLOWED=NO \
  build | tail -20
cd - >/dev/null

SIM_APP="$APP/ios/build/Build/Products/Debug-iphonesimulator/App.app"
[ -d "$SIM_APP" ] || { echo "✗ 没找到模拟器产物：$SIM_APP"; exit 1; }
echo ""
echo "== 5. 产物自证 =="
file "$SIM_APP/App" 2>/dev/null || file "$SIM_APP/$(ls "$SIM_APP" | grep -v '\.' | head -1)"
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$SIM_APP/Info.plist" 2>/dev/null | sed 's/^/  CFBundleIdentifier = /'
/usr/libexec/PlistBuddy -c 'Print :CFBundleDisplayName' "$SIM_APP/Info.plist" 2>/dev/null | sed 's/^/  CFBundleDisplayName = /'
echo "  包内前端：$(wc -c <"$SIM_APP/public/index.html" 2>/dev/null | tr -d ' ' || echo '?') B"

echo ""
echo "✅ iOS 编译完成"
echo "   模拟器产物：$(pwd)/$SIM_APP"
echo ""
echo "   跑模拟器："
echo "     open -a Simulator"
echo "     xcrun simctl boot 'iPhone 15' 2>/dev/null || true"
echo "     xcrun simctl install booted \"$SIM_APP\""
echo "     xcrun simctl launch booted cn.luoshen.xiaoliuren"
echo ""
echo "   真机 / 用 Xcode 打开："
echo "     open \"$APP/ios/App/App.xcworkspace\""
echo "     → 左侧选中 App target → Signing & Capabilities → Team 选你的 Apple ID"
echo "     → 连上 iPhone，Run"
echo ""
echo "   要给别人装（.ipa）：需要 Apple 开发者账号 + Profiling Profile，Xcode 里 Product → Archive → Distribute。"
