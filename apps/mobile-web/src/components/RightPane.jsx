/* RightPane.jsx —— 结果栏容器：`#right` 的**唯一**子节点来源（C4 + C6 + C7 三块 + 空态）
 *
 * 为什么要有这一层：`#right` 的内容由 legacy 的 `show(c, B)` 一次性 innerHTML 出来
 *   —— `right.innerHTML = renderGua(c) + renderLLMPane(c) + renderEvidence(B)`
 *   · `#right` 的子节点**全部由 React 渲染**（三个面板 = C6 / C7 / C4）；
 *   · legacy 的 `show` 链**逐字照跑**（`window.__ctx`/`__blocks`、`bindResult()`、`playWalk(c)`、
 *     `updateSetDot()`、`addCase()`、「接着问」区……），只是 DOM 写入那一步落空（React 已渲染同一份结构）。
 *
 * 空态 = `#blank`（`11-text.txt` L109–L113 的静态骨架 + 38-script `numberBlankBand()` 给每个宫名补的 `<i>序号</i>`）。
 *   ⚠ `<i>序号</i>` 由本组件**直接渲染**：React 接管后 legacy 那个原始节点已被摘掉，
 *     `numberBlankBand()` 是幂等的（有 `<i>` 就跳过），两边谁先跑都得到同一棵树。
 */
import { GONG } from '@xlr/shared-judgment';
import GuaCard from './GuaCard.jsx';
import DivinationPane from './DivinationPane.jsx';
import EvidencePane from './EvidencePane.jsx';

function BlankPane() {
  return (
    <div className="pane blank" id="blank">
      <div className="blank-band">
        {GONG.map((g, i) => (<span key={g}><i>{i + 1}</i>{g}</span>))}
      </div>
      <div className="blank-body">
        <p className="k">左边写好问题 → 起卦。<br />六宫会从大安起数，一格一格走到落宫。</p>
        <p className="r">起卦与断卦依据在本机算，不联网。<br />断辞那一步可以接模型。</p>
      </div>
    </div>
  );
}

export default function RightPane({ c, B }) {
  if (!c) return <BlankPane />;
  return (
    <>
      <GuaCard c={c} />
      <DivinationPane c={c} />
      <EvidencePane B={B} />
    </>
  );
}
