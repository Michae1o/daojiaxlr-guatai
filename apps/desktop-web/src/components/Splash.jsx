/* Splash.jsx —— 开屏组件
 *
 * （已完成）：先以**同源 markup** 渲染（`splashMarkup.js` + dangerouslySetInnerHTML），保证像素一致、把整条链打通。
 * （进行中）：在**同一判据（轻量比对 ≤0.01% 且 maxΔ≤32）**保护下逐段转成真 JSX。
 *   口径与步骤见 `开发计划`「 范围与验收」与执行记录 `历史记录`。
 *
 * ---- 当前进度： **已完成**（3 步走完，脚手架已清除）----
 * 为什么第 1 步是"骨架"而不是口径里的 G1 defs：React 里一个元素**不能同时**用 children 与
 *   dangerouslySetInnerHTML ⇒ 想把任何一段字符串换成 JSX 元素，**它的祖先骨架必须先写成 JSX**
 *   （见 历史记录 原记录；步骤切分已定为 3 步）。
 * 已做（每步都过两把尺子：结构逐节点比对 + 轻量像素交叉比对）：
 *   第 1 步（骨架）—— `#xlrSplash` 以下的外层骨架（span/div/b/button 与全部文本）写成真 JSX，
 *     属性、class、顺序、文本逐字照抄；
 *   第 2 步（渐变）—— `<defs>`（5 linearGradient + 7 radialGradient + 40 stop）由 `SplashDefs.jsx` 渲染
 *     （由 tools/gen-splash-jsx.mjs **机械生成**，零转录误差）；
 *   第 3 步（图形）—— 图形与路径（3 ellipse + 14 circle + 12 path + 1 g）由 `SplashShapes.jsx` 渲染；
 *     **宿主元素已全部清除**。
 * 判据①②（React 完全接管）：静态 0 处 `dangerouslySetInnerHTML`；运行时开屏子树 **0 次**字符串注入；
 *   `#xlrSplash` 子树节点数 = **109**（与 legacy 逐字一致）。详见 历史记录 原记录。
 * 规矩（口径：）：**等价翻译，不是重画** —— 不许顺手改样式、改结构、改命名、改顺序；
 *   只换"挂载方式"。
 *
 * 行为归属（不变）：退场/珠子飞走仍由 legacy 逻辑驱动 —— legacy 的 `out()` / `killSplash()` 用
 *   `getElementById('xlrSplash')`，作用到的就是本组件渲染的节点（见 shell/main.jsx 的  段）。
 */
import { useLayoutEffect } from 'react';
import { SkinsCore } from '../data/skinsCore.js';
import SplashDefs from './SplashDefs.jsx';
import SplashShapes from './SplashShapes.jsx';
import SplashOrbit from './SplashOrbit.jsx';

/* ---------------- 开屏的「画」（2026-11-02 从安卓端移植的环绕动效） ----------------
 * 原来是九张静态星图（#xlrSplash::after + splash-art.css 里九条 data URI）；
 * 现在换成安卓 2.261102.2 的「二十四宿沿倾斜椭圆环绕北斗」：
 *   · 舞台盒子（left:-8% / top:50% / min(66vw,94vh) / opacity .55）在 splash-art.css，
 *     与旧静态星图**同一组数** ⇒ 构图、位置、大小、透明度都不变；
 *   · 宿组/星芒/北斗的贴图与运行时在 SplashOrbit.jsx + splash-orbit-tiles.css（生成物）。
 * 本组件只负责这件事之外的部分：背景星点 + 文字 + 退场路由。
 */
/* 背景星点：固定种子的伪随机（每次重绘一模一样，不会闪），150 颗，
   深色皮肤＝白点、浅色＝墨点，约两成用该皮肤的 accent 点睛——与安卓 StarField 同参。 */
function buildStarField(dark, accent) {
  const dots = [];
  let s = 0x5EED20261031;              /* 与安卓端同一个种子，跨端看起来是同一片天 */
  const rnd = () => {
    s = (s * 6364136223846793005 + 1442695040888963407) % 0x7fffffffffffffff;
    return ((s / 0x7fffffffffffffff) % 1);
  };
  for (let i = 0; i < 150; i++) {
    const x = rnd() * 100;
    const y = rnd() * 100;
    const t = rnd();
    dots.push({
      x, y,
      r: 0.5 + t * 1.2,
      a: 0.07 + t * 0.28,
      c: t > 0.82 ? accent : (dark ? '#ffffff' : '#0f1013'),
    });
  }
  return dots;
}

export default function Splash() {
  /* 开屏挂上之前，把整页藏住（样式在 make-doc-entry 注入的 <head> 里）。
     页面现在 ~9.7 MB、440 多张贴图，React 挂载要几十到几百毫秒；不挡的话这段时间会先画一遍
     问卦页骨架再被开屏盖住 ⇒ 用户看到的就是「一打开闪一下」。data-sl 在 layout effect 里设，
     和开屏同一次绘制，等于「先黑/先底色，然后直接是开屏」，中间没有别的东西。 */
  useLayoutEffect(() => {
    try { document.documentElement.setAttribute('data-sl', '1'); } catch (e) { }
  }, []);
  const skinKey = SkinsCore.cur();
  const skinDef = SkinsCore.SKINS.filter((x) => x.k === skinKey)[0] || { ac: '#0f1013' };
  const dark = !!SkinsCore.DARK[skinKey];
  const dots = buildStarField(dark, skinDef.ac);
  /* ★ 变更记录（口径：选 A）：补回 legacy 的「点击退场」接线。
     legacy 的两条点击监听器分别绑在**它自己那颗按钮**上（38-script.txt L2209）与**它自己的开屏层**上
     （L2210-2213：宽屏点层内任意处都退场；窄屏只认那颗按钮）；而外壳 `mountSplash()` 把那一层
     `remove()` 掉了（shell/main.jsx L123）⇒ 两条监听器全死 ⇒ 点了没反应。
     这里**按 legacy 同一口径复原「路由」**（宽屏：层内任意处；窄屏：只认按钮），
     退场动作**仍调用 legacy 现有的 `out()`**（由 tools/assemble-desktop.mjs 组装期注入到
     `window.__xlrSplashOut`，legacy 源码一行未改）——**不复制退场逻辑**。
     `out()` 自带幂等（38-script.txt L2144 `if (gone) return;`）⇒ 点过之后再被倒计时叫到不会重复退场。 */
  const exit = (e) => {
    const btn = e && e.target && typeof e.target.closest === 'function' ? e.target.closest('.sl-go') : null;
    if (!btn) return;   /* 2026-11-01：只有那枚箭头按钮能退场，点层内其他地方无效（两端一致） */
    if (btn && e && typeof e.stopPropagation === 'function') e.stopPropagation();  /* legacy L2209 */
    /* 问候语跟着开屏退场浮现（2026-11-02 从安卓端移植）：安卓那版在 chromeReveal（点下去 990ms）
       才放顶栏与问候语 —— opacity .35s ease ＋ translateY(-6px)→0，transform 曲线 (.2,.7,.25,1)。
       · PC 宽屏原来没有这一步（问候语一直亮着，只是被开屏盖住）⇒ 这里只补**问候语**一块，
         顶栏 / 输入卡 / 步进条一概不动。
       · ⚠ 用 WAAPI 而不是 CSS transition：本机 Windows 关了「显示动画」，WebView2 报
         prefers-reduced-motion:reduce，legacy 那条 `*{transition:none!important}` 会把
         所有 CSS 过渡压掉（实测：写了 transition 也一律 "none 0s"）。开屏的珠子飞行本来就
         走 WAAPI（splashCore 的 orb.animate）⇒ 这里跟它同一条路，动效才真的跑得起来。 */
    try {
      const wrap = document.getElementById('greetWrap');
      if (wrap && wrap.animate) {
        wrap.style.opacity = '0';
        wrap.style.transform = 'translateY(-6px)';
        setTimeout(() => {
          const a1 = wrap.animate([{ opacity: 0 }, { opacity: 1 }],
            { duration: 350, easing: 'ease', fill: 'none' });
          const a2 = wrap.animate([{ transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }],
            { duration: 350, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'none' });
          setTimeout(() => {
            wrap.style.opacity = '';
            wrap.style.transform = '';
          }, 380);
          if (a1 && a1.finished && a1.finished.catch) a1.finished.catch(() => { });
          if (a2 && a2.finished && a2.finished.catch) a2.finished.catch(() => { });
        }, 990);
      }
    } catch (errGreet) { }
    try { if (typeof window.__xlrSplashOut === 'function') window.__xlrSplashOut(); } catch (errExit) { }
  };
  return (
    <div id="xlrSplash" onClick={exit}>
      {/* 背景星点（固定种子、静态，只铺气氛）*/}
      <svg className="sl-field" width="100%" height="100%" aria-hidden="true">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x + '%'} cy={d.y + '%'} r={d.r} fill={d.c} opacity={d.a} />
        ))}
      </svg>
      {/* 开屏的「画」：二十八宿环绕北斗（安卓端同一套轨道与素材；点了圆钮随开屏一起淡出）*/}
      <SplashOrbit />
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
