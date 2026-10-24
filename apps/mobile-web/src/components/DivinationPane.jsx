/*
 *
 *   · `renderRecap(c)`   L55–L67  → `.recap`（所问 / 背景（有才画）/ 卦·时 / 「结论」标题）
 *   · `renderLLMPane(c)` L70–L87  → `#llmPane`（头 + 复制按钮 + recap + `.llm-body`（`.llm-main > .doc#doc` / `.llm-side`））
 *      `.llm-body` 之后**（组装期把锚点 `#llmPane .bar` 改成 `#llmPane .llm-body`，见 变更记录）。
 *      ⇒ 本组件只摆结构；`#askBox` **故意不由 React 渲染**（由 legacy 照旧插入，位置/时序与早前的版本一致）。
 *
 * 多段文本一律写成**单个模板字符串**（`{`${a} · ${b}`}`）⇒ 一个文本节点，与 legacy 的字符串拼接同形；
 * 拆成多个 JSX 子节点会变成多个文本节点，结构判据会（正确地）判为不同。
 *
 *   逐字切片到 `src/data/resultCore.js`；本组件只负责**接线**（对应 legacy `bindResult()` 的 L369–389）。
 * 逐条对照：
 *   · `#btnCopyIco` 的 click（18-script L371–385）：正文逐字照抄，只把 `cb` 换成当前按钮的 React 态、
 *     把 `toast/copyClean/fallback` 换成 `ResultCore` 里**同一份切片**（不再读 legacy 的全局）。
 *   · `#btnSolve` 的 click（18-script L387–388）→ `askModel()`（26-script；**出网那条线本身不搬**，照旧按全局调）。
 *   · `if (window.__md) revealNewBtn()`（18-script L389）：照搬（幂等 —— 实测全仓没人把 `#btnNew` 置 hidden）。
 * ⚠ 为什么 `ok/no` 类用 **React 态**而不是 `classList`：React 只在「属性值与前一次不同」时才写 DOM
 *   ⇒ 直接改 classList 的话，新一卦重渲染时 React 认为 className 没变、不会把 `ok` 擦掉（两臂不一致）。
 *   用态管 = 与 legacy「`innerHTML` 重写 ⇒ 类自然消失」等价。
 */
import { useEffect, useRef, useState } from 'react';
import { zhi } from '@xlr/shared-judgment';
import { ResultCore } from '../data/resultCore.js';
import { askModel } from '../data/modelAskCore.js';   /* ★ 模型链本体（原先只读 window.askModel ⇒ 静默无反应） */

export default function DivinationPane({ c }) {
  const [copyState, setCopyState] = useState('');        /* '' | 'ok' | 'no' */
  const [seenC, setSeenC] = useState(c);
  const tRef = useRef(null);
  /* 新一卦 ⇒ 回到初始态（React 官方「渲染期按 props 重置 state」写法；提交前发生，不闪一帧） */
  if (seenC !== c) { setSeenC(c); setCopyState(''); }

  useEffect(function () {
    const mark = (k) => { try { const a = window.__xlrShell; if (a && a.fxOwn) a.fxOwn(k); } catch (e) { } };
    mark('resultBind');
    mark('copyClean');
    return function () { if (tRef.current) clearTimeout(tRef.current); };
  }, [c]);

  const onCopy = function () {
    const t = ResultCore.copyClean();                                        /* 源 L373 */
    const done = function (ok) {                                            /* 源 L374–381 */
      setCopyState(ok ? 'ok' : 'no');
      ResultCore.toast(ok ? '已复制' : '复制失败——请手动选中复制');
      if (tRef.current) clearTimeout(tRef.current);
      tRef.current = setTimeout(function () { setCopyState(''); }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {              /* 源 L382–384 */
      navigator.clipboard.writeText(t).then(function () { done(true); }, function () { ResultCore.fallback(t, done); });
    } else ResultCore.fallback(t, done);
  };
  const onSolve = function () { try { askModel(); } catch (e) { } };   /* ★ 直调模块（原先 typeof window.askModel 恒假） */
  /* ★★ （(会话)）现象：「新开一卦点了没用」：早前的版本 `newCast()`（上游 chunks/a10.html L488–500）
     搬过来时**漏了接线** —— `#btnNew` 上根本没有 onClick。此处逐字搬回：清空 q/bg/n1–n3、点步进条回第 1 步、聚焦回输入框。
     ⚠ 逐字 = 连那句 `.vstep button[data-k="q"]` 也照旧（早前的版本同样带 `if (st)` 守卫）。 */
  const onNew = function () {
    var q = document.getElementById('q'), bg = document.getElementById('bg');
    if (q) q.value = '';
    if (bg) bg.value = '';
    ['n1', 'n2', 'n3'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
    try { if (typeof clearErr === 'function') clearErr(); } catch (e) { }
    var st = document.querySelector('.vstep button[data-k="q"]');
    if (st) st.click();
    if (q) { try { q.focus({ preventScroll: true }); } catch (e2) { } }
  };

  return (
    <div className="pane llm" id="llmPane">
      <div className="pane-h">
        <b>断辞</b>
        <span className="sp"></span>
        <span className="d" id="llmWho">未接模型</span>
        <button className={'doc-copy' + (copyState ? ' ' + copyState : '')} id="btnCopyIco" type="button"
          title="复制这一卦（问题＋卦＋断辞）" aria-label="复制" onClick={onCopy}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2"></rect>
            <path d="M5 15V5a2 2 0 0 1 2-2h10"></path>
          </svg>
        </button>
      </div>
      <div className="recap">
        <div className="recap-q"><span className="lb">所问</span><b>{c.q}</b></div>
        {c.bg ? <div className="recap-bg"><span className="lb">背景</span>{c.bg}</div> : null}
        <div className="recap-row">
          <span className="rw"><i>卦</i>{`${c.g1} · ${c.g2} · ${c.g3}`}</span>
          <span className="rw"><i>时</i>{`${zhi[c.zi - 1]}时`}</span>
        </div>
        <div className="recap-sep"></div>
        <div className="recap-h">结论</div>
      </div>
      <div className="llm-body">
        <div className="llm-main"><div className="doc" id="doc"></div></div>
        <div className="llm-side">
          <button className="btn pri" id="btnSolve" type="button" onClick={onSolve}>让模型解卦</button>
          <button className="btn" id="btnNew" type="button" title="清空表单，接着起下一卦" onClick={onNew}>新开一卦</button>
          <div className="stat" id="stat"></div>
        </div>
      </div>
    </div>
  );
}
