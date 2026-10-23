/* Splash.jsx —— 开屏组件
 *
 *
 *   dangerouslySetInnerHTML ⇒ 想把任何一段字符串换成 JSX 元素，**它的祖先骨架必须先写成 JSX**
 * 已做（每步都过两把尺子：结构逐节点比对 + 轻量像素交叉比对）：
 *   第 1 步（骨架）—— `#xlrSplash` 以下的外层骨架（span/div/b/button 与全部文本）写成真 JSX，
 *     属性、class、顺序、文本逐字照抄；
 *   第 2 步（渐变）—— `<defs>`（5 linearGradient + 7 radialGradient + 40 stop）由 `SplashDefs.jsx` 渲染
 *     （由 tools/gen-splash-jsx.mjs **机械生成**，零转录误差）；
 *   第 3 步（图形）—— 图形与路径（3 ellipse + 14 circle + 12 path + 1 g）由 `SplashShapes.jsx` 渲染；
 *     **宿主元素已全部清除**。
 * 判据①②（React 完全接管）：静态 0 处 `dangerouslySetInnerHTML`；运行时开屏子树 **0 次**字符串注入；
 *   只换"挂载方式"。
 *
 * 行为归属（不变）：退场/珠子飞走仍由 legacy 逻辑驱动 —— legacy 的 `out()` / `killSplash()` 用
 */
import { IS_PHONE } from '../platform.js';
import SplashDefs from './SplashDefs.jsx';
import SplashShapes from './SplashShapes.jsx';

export default function Splash() {
  /*
     legacy 的两条点击监听器分别绑在**它自己那颗按钮**上（38-script.txt L2209）与**它自己的开屏层**上
     （L2210-2213：宽屏点层内任意处都退场；窄屏只认那颗按钮）；而外壳 `mountSplash()` 把那一层
     `remove()` 掉了（shell/main.jsx L123）⇒ 两条监听器全死 ⇒ 点了没反应。
     退场动作**仍调用 legacy 现有的 `out()`**（由 tools/assemble-desktop.mjs 组装期注入到
     `window.__xlrSplashOut`，legacy 源码一行未改）——**不复制退场逻辑**。
     `out()` 自带幂等（38-script.txt L2144 `if (gone) return;`）⇒ 点过之后再被倒计时叫到不会重复退场。 */
  const exit = (e) => {
    const btn = e && e.target && typeof e.target.closest === 'function' ? e.target.closest('.sl-go') : null;
    const narrow = IS_PHONE;   /* 平台常量判定，不看屏幕宽度 */
    if (narrow && !btn) return;                                      /* legacy L2212：窄屏只认按钮 */
    if (btn && e && typeof e.stopPropagation === 'function') e.stopPropagation();  /* legacy L2209 */
    try { if (typeof window.__xlrSplashOut === 'function') window.__xlrSplashOut(); } catch (errExit) { }
  };
  return (
    <div id="xlrSplash" onClick={exit}>
      <span className="sl-axis sl-axis-t" aria-hidden="true" />
      <div className="sl-in">
        <div className="sl-orbwrap">
          <span className="sl-line" />
          <span className="sl-dot" />
          <span className="sl-orb">
            <svg className="sl-taiji" viewBox="0 0 120 120" aria-hidden="true">
              <SplashDefs />
              <SplashShapes />
            </svg>
            <b />
          </span>
          <span className="sl-dot" />
          <span className="sl-line" />
        </div>
        <div className="sl-title">道家小六壬</div>
        <div className="sl-sub">基于邵一尘老师 · 道家小六壬所作</div>
        <div className="sl-sep" />
        <div className="sl-motto">无事不卦 · 心动即卦 · 一事不二卦</div>
        <div className="sl-notes"><div>问题要具体：问什么，卦就答什么</div><div>越拆细越容易错 —— 够用即止</div><div>结果只到「参考」层级，决定权在你</div></div>
        <span className="sl-axis sl-axis-b" aria-hidden="true" />
        <button className="sl-go" type="button" aria-label="点击进入" onClick={exit}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h14.5" /><path d="M12.8 6.2 18.6 12l-5.8 5.8" /></svg></button>
        <div className="sl-hint"><span />点击进入<span /></div>
      </div>
    </div>
  );
}
