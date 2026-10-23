/*
 *
 *   · `renderBlocks(B)`   L92–L110 → 每组一个 `.blk`（`.blk-h2`（n/t/d?/caret） + `.blkw > .blk-in > .blk-b > .it*`）
 *   · `renderEvidence(B)` L112–L124 → `.pane > .evi#evi`（`.evi-h#eviH`（caret/t/「N 组 · 每条带出处」/sp/「点开看」）
 *                                     + `.evi-b > .evi-bi`）
 *
 * `.tx` 的写法说明（唯一的 `dangerouslySetInnerHTML`）：legacy 把判据正文 `it.tx` **当 HTML 原样插入**，
 * 并且当有 `it.src` 时把 `<div class="src">出处：…</div>` **拼在 `.tx` 内部**（见 16-script L104–L105）。
 * ⇒ 这里同样拼成一整段 HTML 再插入（若拆成两个 JSX 子节点会多出一个包裹节点，结构就不再等价）。
 *   `escHtml()` = **逐字照抄** legacy 的 `esc()`（16-script L3–L7），只用于 `it.src` 这一处。
 *
 * 逐条对应 18-script 的 `bindResult()` L391–402：
 *   · 点 `#eviH`（整区）→ `#evi` 的 `open` 类取反（源里 `classList.toggle('open')`，**不碰 aria**）。
 *   · 点每组 `.blk-h2` → 该组 `.blk` 的 `open` 类取反，并把 `aria-expanded` 同步成 `'true'/'false'`（源 L400）。
 * ⚠ 两处**实测固住的细节**（判据会把它们钉住，别当成 bug 顺手改）：
 *   ① 整区收起时，**已展开的那一组保持展开**（源里是不清的：只切 `#evi` 一个类）。
 *   ② 新一卦 ⇒ 全部回到收起态（等价于 legacy `innerHTML` 重写；这里用「渲染期按 props 重置 state」实现）。
 * ⚠ 为什么用 React 态管 `open`：React 只在「属性值与前一次不同」时才写 DOM ⇒ 直接 `classList.toggle`
 *   的话，新一卦重渲染时 React 认为 className 没变、**不会**把 `open` 擦掉（两臂不一致）。
 */
import { useEffect, useState } from 'react';

function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m];
  });
}

function renderBlocks(B, openSet, onToggleBlk) {
  return (B || []).map((b, i) => {
    const open = !!openSet[i];
    return (
      <div className={'blk' + (open ? ' open' : '')} data-i={i} key={i}>
        <button className="blk-h2" type="button" aria-expanded={open ? 'true' : 'false'} onClick={() => onToggleBlk(i)}>
          <span className="n">{b.n}</span>
          <span className="t">{b.t}</span>
          {b.d ? <span className="d">{b.d}</span> : null}
          <span className="caret">▶</span>
        </button>
        <div className="blkw"><div className="blk-in"><div className="blk-b">
          {b.items.map((it, j) => (
            <div className="it" key={j}>
              <div className="lb">{it.lb}</div>
              <div className="tx" dangerouslySetInnerHTML={{
                __html: it.tx + (it.src ? '<div class="src">出处：' + escHtml(it.src) + '</div>' : '')
              }}></div>
            </div>
          ))}
        </div></div></div>
      </div>
    );
  });
}

export default function EvidencePane({ B }) {
  const n = (B || []).length;
  const [openAll, setOpenAll] = useState(false);
  const [openSet, setOpenSet] = useState({});
  const [seenB, setSeenB] = useState(B);
  /* 新一卦 ⇒ 回到收起态（React 官方「渲染期按 props 重置 state」写法；提交前发生，不闪一帧） */
  if (seenB !== B) { setSeenB(B); setOpenAll(false); setOpenSet({}); }
  useEffect(function () {
    try { const a = window.__xlrShell; if (a && a.s3bOwn) a.s3bOwn('eviFold'); } catch (e) { }
  }, []);
  const onToggleBlk = (i) => setOpenSet((s) => { const nx = Object.assign({}, s); nx[i] = !nx[i]; return nx; });
  return (
    <div className="pane">
      <div className={'evi' + (openAll ? ' open' : '')} id="evi">
        <div className="evi-h" id="eviH" onClick={() => setOpenAll((v) => !v)}>
          <span className="caret">▶</span>
          <span className="t">断卦依据</span>
          <span className="n">{`${n} 组 · 每条带出处`}</span>
          <span className="sp"></span>
          <span className="n">点开看</span>
        </div>
        <div className="evi-b"><div className="evi-bi">{renderBlocks(B, openSet, onToggleBlk)}</div></div>
      </div>
    </div>
  );
}
