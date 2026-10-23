/* platform.js —— **这条线是手机还是电脑，由构建期常量决定**。
 * 用户逐字：「为什么要以屏幕来判断手机和电脑？这都两条不一样的线，手机就是手机，电脑就是电脑，关屏幕大小什么事」
 *
 *    桌面窗口拉窄、模拟器 WebView 没吃到 viewport meta（实测 innerWidth=760，而本仓 viewport 写的是 390）
 *    都会把两条线判反 —— 手机端被当成桌面（3 秒自动跳过、走珠子飞向「壹」），桌面端被当成手机（必须点按钮）。
 *
 * 值来自构建期替换（vite `define` 里的 `__XLR_PLATFORM__`）：
 *    手机端产物 = 'phone'（apps/mobile-web 那条线）· 桌面端产物 = 'desktop'（apps/desktop-web 那条线）。
 *    经组装器产出的「早前的版本」没有这次替换 ⇒ 落到 'desktop'（它本来就属于桌面线）。
 */
export const PLATFORM = (typeof __XLR_PLATFORM__ !== 'undefined' && __XLR_PLATFORM__) || 'desktop';
export const IS_PHONE = PLATFORM === 'phone';
