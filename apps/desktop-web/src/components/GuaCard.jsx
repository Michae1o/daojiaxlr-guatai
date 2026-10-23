/*
 *
 *   · `renderWalk()`  L14–L25  → 掌诀盘（`.walk.ring#walk`：`.wring` / `.wdot#wDot` / 六个 `.wc` / `.wcore`）
 *   · `renderGua(c)`  L32–L51  → `#guaCard` 外框 + `.gua-top`（三宫名 + 时辰 + 所问）+ `.chips#guaChips`
 *
 * 与 legacy 的**两处刻意差异**（都是为了不改 legacy 文件）：
 *   ① 判据数据（`GONG` / `zhi`）走**包名入口** `@xlr/shared-judgment`；
 *      legacy 里它们是全局变量、内容同源 ⇒ 取值一致。
 *   ② `style={{padding:'17px 20px'}}` 由 React 写出（`style="padding: 17px 20px;"`），legacy 写的是
 *      `style="padding:17px 20px"` —— **计算样式相同**，只是属性文本多了空格（结构判据不比对 style 文本）。
 *
 * 走宫本体（`playWalk` / `calmWalk` / 瞬时化的收尾）由 `src/data/walkCore.js` 逐字切片提供，
 * 外壳在 `load` 时用 `WalkCore.installWalk()` 接管 `window.playWalk`（见 `shell/main.jsx`）。
 * 本组件负责两件**原来在 38-script 的 IIFE 里**、切不出来的收尾（做法与理由见 walkCore.js 注释）：
 *   · 光珠 `.walk-orb`：瞬时形态下它就是一枚静止的 `rest` 节点 —— legacy 的 `startOrb()` 唯一贡献就是
 *     建它（`.lit` 在瞬时形态下永不出现 ⇒ 跟帧循环什么也不做）。⇒ 直接**渲染**，位置照 legacy 的
 *     `appendChild`（`#walk` 的最后一个子节点）。
 *   · 「看断辞 · 结果 →」按钮：照 `watchReveal()` 的语义 —— 落定后**挂**一个 `.vnext`（内部一个 button，
 *     文案 `看断辞 · 结果 →`，点了切到「断辞」步）。时序取**原来的轮询间隔 350ms**
 *     （源里是 `setInterval(..., 350)` 轮询「胶囊有子节点」；落定是瞬时的 ⇒ 等价于落定后 350ms 出现）。
 *     ⚠ React 渲染而不是往 `#guaCard` 里 append：`#guaCard` 是 React 的容器，塞野节点会让「新一卦」
 *       的复用行为与早期版本不一致（早期版本是整块 innerHTML 重写 ⇒ 按钮跟着没了）。
 */
import { useEffect, useState } from 'react';
import { GONG, zhi } from '@xlr/shared-judgment';

export default function GuaCard({ c }) {
  const [vnext, setVnext] = useState(false);
  const [seenC, setSeenC] = useState(c);
  /* 新一卦 ⇒ 按钮回到「未出现」（等价 legacy `show()` 重写 innerHTML） */
  if (seenC !== c) { setSeenC(c); setVnext(false); }
  useEffect(function () {
    /* */
    try { const a = window.__xlrShell; if (a && a.s3bOwn) { a.s3bOwn('walkSettle'); a.s3bOwn('vnextButton'); } } catch (e) { }
    /* 外壳那条 `onSettle`（落定后 350ms）就调这里（`__xlrRecordsRefresh` 同族：未注册即静默） */
    window.__xlrVnext = function (on) { setVnext(!!on); };
    return function () { try { window.__xlrVnext = null; } catch (eC) { } };
  }, []);
  const onVnext = function () { try { if (typeof window.__xlrSetStep === 'function') window.__xlrSetStep('jie'); } catch (e) { } };
  return (
    <div className="pane gua" id="guaCard">
      <div className="walk ring" id="walk">
        <span className="wring" aria-hidden="true"></span>
        <span className="wdot" id="wDot" aria-hidden="true"></span>
        {GONG.map((g, i) => (
          <div className="wc" data-i={i} key={g}>
            <span className="wg">{g}</span>
            <span className="wm"></span>
          </div>
        ))}
        <div className="wcore" aria-hidden="true">
          <b id="wCount">0</b>
          <i id="wPhase">起卦</i>
        </div>
        <i className="walk-orb rest"></i>
      </div>
      <div style={{ padding: '17px 20px' }}>
        <div className="gua-top">
          <span className="g hold" id="gA"></span>
          <span className="ar hold" id="arA">·</span>
          <span className="g hold" id="gB"></span>
          <span className="ar hold" id="arB">·</span>
          <span className="g hold" id="gC"></span>
          <span className="sh" id="gSh">{`${zhi[c.zi - 1]}时`}</span>
          <span className="q" title={c.q}>{c.q}</span>
        </div>
        <div className="chips hold" id="guaChips"></div>
      </div>
      {vnext ? <div className="vnext"><button type="button" onClick={onVnext}>看断辞 · 结果 →</button></div> : null}
    </div>
  );
}
