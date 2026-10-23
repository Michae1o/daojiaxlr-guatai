/*
 *
 *   + `20-script.txt` 的渲染函数（`renderCases` L292–360 · `caseDetailHtml` L362–407 ·
 *     `rvHtml` L409–424 · `sdbFootHtml` L162–191 · `renderRules` L426–450）。
 *
 * 分工（见 开发笔记 早期实现/早期实现）：
 *   · **读/写存储**：走 React 侧的 `data/recordsStore.js`（**A4① 2026-10-13 搬来**，是 `20-script.txt`
 *     L9–122 的逐字切片；外壳同时把 `window.load*`/`save*`/动词收到同一份上 ⇒ 全应用一份真相）
 *   · **复盘 / 准则**：走 React 侧的 `data/reviewCore.js`（**A4③ 2026-10-13 搬来**，是 22-script 的
 *     复盘主流程 + 20-script 的 `reviewBlock`/`ruleBlock`/`confirmRule` 逐字切片）。
 *   · **照抄** 渲染与接线（legacy 那批自己写 `innerHTML`，不能复用）
 *
 * Step 2 落**静态 DOM**（结构与文案逐字等价）；**Step 4 落交互**（本地 16 项，见下）。
 *
 * ===== Step 4：交互（本地 16 项；出网 3 项按 早期实现 / 早期实现① **留待**，按钮 DOM 保留、功能不接）=====
 * 逐条对应早前的版本监听器（源行号 = `20-script.txt` / `22-script.txt`，均逐字照抄语义）：
 *   · 关：`#sdbClose` / `#sdbMask`（22 L159-160）· Esc（22 L170，早前的版本就绑在 `#sdb` 上）
 *   · 标签 `.stab`（22 L167-169 → `sdbTab` L138-147）
 *   · 搜索 `#sdbQ`（22 L162-166；早前的版本写 `window.__sdbQ`，这边**镜像**着写）
 *   · 行点击→详情 / `[data-back]`（`bindCaseBox` L454-467）
 *   · `[data-fb]`（L468-470 → `setFb`）· `[data-del]`（`sdbFootDel` L231-243 + L471-473）
 *   · `[data-note]`（L474-478，**原生 `change`**，不是 `input`）
 *   · `[data-okrule]`（L479-481 → `confirmRule`，末尾照抄 `sdbTab('rules')` L533）
 *   · `[data-norule]`（L482-488 **逐字照抄**）· `[data-delrule]`（`renderRules` L447-449 → `delRule`）
 *   · 底栏六分支（`sdbFootAct` L244-280，**分支顺序照抄**）：`[data-set]` / `[data-restore]` /
 *     `[data-purge]` / `[data-purgeall]` / `[data-open]` / `[data-clear]`（两段式 `data-armed` 4 秒）
 * 事件挂法：早前的版本是"按元素各挂一遍"，这边改成**根节点上一处捕获 + 一处冒泡**；
 *   分支判据与早前的版本**同序、同选择器**（`sdbFootDel` 是捕获阶段 ⇒ `onClickCapture`）。
 * 出网三条的现状（2026-10-13 A4③ 更新）：
 *   ③ 复盘的流式渲染（`RV_SYS` + `readSSE`）—— **已接**（同一份切片）
 *   ② `[data-ask]`（接着问）—— **仍未接**：早前的版本由 `26-script.txt` L762-763 的 document 委托 → `openRecAsk`
 */
import { useEffect, useRef, useState } from 'react';
import { RecordsStore } from '../data/recordsStore.js';
import SafeZone from './SafeZone.jsx';
import { ReviewCore } from '../review/reviewCore.js';
import { recAskHtml } from '../data/modelAskCore.js';   /* ★ 2026-10-15：记录行「接着问」区（原先只读 window.recAskHtml ⇒ 渲染成空） */
import { htmlEsc as esc } from '../data/docRender.js';   /* ★ 2026-10-15：收敛到唯一一份转义实现（原先降级成不转义的 String()） */

/* legacy 全局取值（装载顺序：classic 脚本段在前、外壳 module 在后 ⇒ 渲染期一定已在） */
const g = (k) => (typeof window !== 'undefined' ? window[k] : undefined);
/* ★ 2026-10-15：`esc` 不再本地降级——已改为上面从 docRender.js 导入的唯一一份 `htmlEsc`。 */

/* ★ 2026-10-15：`bold` / `renderDoc` 这两个 legacy 全局**在新产物里根本不在 window 上**
   （实测 `typeof window.bold === 'undefined'`；同批的 `esc` 早有守卫兜底，只剩这两个是裸调用）
   ⇒ 记录里只要有一条**带断辞**（`duanci` 非空），`CaseRow` 一渲染就抛 `TypeError: Xr(...) is not a function`
   （干净 profile 里 `xlr-cases` 是空的 ⇒ 走不到这句 ⇒ 之前的复现全是假阴性。）
   兜底正文**逐字取自上游** `(upstream)` L2302–2317（bold / renderDoc 两份）。
   */
const htmlEsc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]);
const boldStr = (s) => String(s == null ? '' : s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const bold = (s) => (typeof g('bold') === 'function' ? g('bold')(s) : boldStr(s));
const renderDoc = (t) => {
  if (typeof g('renderDoc') === 'function') return g('renderDoc')(t);
  let out = '';
  htmlEsc(t).split('\n').forEach((ln) => {
    const s = ln.trim();
    if (!s) { out += '<div style="height:7px"></div>'; return; }
    const m = s.match(/^【(.+?)】\s*(.*)$/);
    if (m) {
      out += '<h4>【' + m[1] + '】</h4>';
      if (m[2]) out += '<div>' + boldStr(m[2]) + '</div>';
      return;
    }
    out += '<div>' + boldStr(s) + '</div>';
  });
  return out;
};

/* 读数据（A4①：改走 React 侧存储层；语义与 legacy 同名函数逐字相同 —— `loadCases()` = 未删的，
   `loadCasesRaw()` = 全量含回收站） */
const readCases = () => { try { return RecordsStore.loadCases() || []; } catch (e) { return []; } };
const readCasesRaw = () => { try { return RecordsStore.loadCasesRaw() || []; } catch (e) { return []; } };
const readRules = () => { try { return RecordsStore.loadRules() || []; } catch (e) { return []; } };

/* `sdbDayOf`（20-script.txt L282–291）：'2026-10-09 14:32' → 今天/昨天/7 天内/更早 + MM-DD */
function dayOf(t) {
  const s = String(t || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { k: '更早', md: '' };
  const d = new Date(s + 'T00:00:00');
  const now = new Date();
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((t0.getTime() - d.getTime()) / 86400000);
  return { k: diff <= 0 ? '今天' : diff === 1 ? '昨天' : diff <= 7 ? '7 天内' : '更早', md: s.slice(5) };
}

/* 回收站行（`sdbFootHtml` L169–181 里的 `.tr-list` 分支）
   ★ 2026-10-22（要求）：多选态时前面出现圆形选框（选中＝主题色渐变填满），
     并且这一行的「点开看」让位给「点一下选中」——所以多选态不挂 data-open。 */
function TrashRows({ dead, msMode, msSel }) {
  const sel = msSel || [];
  return (
    <>
      <div className="tr-list">
        {dead.slice().reverse().map((r) => {
          const on = sel.indexOf(r.id) >= 0;
          return (
            <div className={'tr-row' + (msMode ? ' ms' : '')} key={r.id}
              data-msrow={r.id} {...(msMode ? {} : { 'data-open': r.id })}
              title={msMode ? '点一下选中／取消' : '点开看这一卦'}>
              {msMode ? <span className="msbox" role="checkbox" aria-label="选中这一条"
                aria-checked={on ? 'true' : 'false'} data-msid={r.id} /> : null}
              <span className="tr-q">{esc(String(r.q || '').slice(0, 30))}</span>
              <button type="button" className="btn sm" data-restore={r.id}>还原</button>
              <button type="button" className="btn sm dang" data-purge={r.id}>彻底删</button>
            </div>
          );
        })}
      </div>
      <button type="button" className="btn sm dang wide" data-purgeall="1">清空回收站</button>
    </>
  );
}

/* 底栏（`sdbFootHtml` L162–191，逐字照抄；`n` = 当前可见条数）
   `armed` = 早前的版本 `[data-clear]` 的 `data-armed` 两段式（`sdbFootAct` L267-279）：
   第一下只改属性+文案、4 秒内再点才真清空。早前的版本是**直接改 DOM**（`setAttribute`/`textContent`），
   这边进 state 由 React 渲染 —— 终态 DOM 等价（`data-armed="1"` + 文案「再点一次：清空记录」）。 */
function Foot({ n, dead, armed, trashOpen, onTrashToggle, msMode, msSel }) {
  const sel = msSel || [];
  const allOn = dead.length > 0 && sel.length >= dead.length;
  return (
    <div className="sdb-foot">
      {/* L167–168：先次要操作（清空记录 / 回收站），最底才是「设置」那一条 */}
      <button type="button" className="btn sm wide" data-clear="1" disabled={!n}
        {...(armed ? { 'data-armed': '1' } : {})}>{armed ? '再点一次：清空记录' : '清空记录'}</button>
      <details className={'trash' + (msMode ? ' ms-on' : '')} open={!!trashOpen}
        onToggle={(e) => { if (onTrashToggle) onTrashToggle(e.currentTarget.open); }}>
        <summary>{'回收站 · ' + dead.length + ' 则'}</summary>
        {dead.length ? (
          <>
            {/* ★ 2026-10-22（要求）：多选按钮 → 点开后出现 全选 / 删除 / 还原（外加「完成」退出） */}
            <div className="tr-tools">
              {!msMode ? (
                <button type="button" className="btn sm" data-msenter="1">多选</button>
              ) : (
                <>
                  <button type="button" className="btn sm" data-msall="1">{allOn ? '取消全选' : '全选'}</button>
                  <button type="button" className="btn sm dang" data-msdel="1" disabled={!sel.length}>删除</button>
                  <button type="button" className="btn sm" data-msrest="1" disabled={!sel.length}>还原</button>
                  <button type="button" className="btn sm" data-msdone="1">完成</button>
                </>
              )}
            </div>
            <TrashRows dead={dead} msMode={msMode} msSel={msSel} />
          </>
        ) : <div className="tr-empty">回收站是空的。删掉的记录会先来这里，可以还原。</div>}
      </details>
      {/* L185–189：抽屉最底那条「设置」（图标照抄稿3 的 sliders） */}
      <button type="button" className="sdb-set" data-set="1">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7.4h8.4M17 7.4h3M4 12h3.4M11.6 12h8.4M4 16.6h11.4M20.6 16.6h0" />
          <circle cx="14.7" cy="7.4" r="2.1" /><circle cx="9.3" cy="12" r="2.1" /><circle cx="18.4" cy="16.6" r="2.1" />
        </svg><span>设置</span>
      </button>
    </div>
  );
}

/* 一条卦例（`renderCases` L335–354 的单条分支）
   `going` = 早前的版本 `sdbFootDel` 在行上打的退场标记（L241 `.case-row.going`）；
   CSS 命中 `#sdbCases .case-row.going`（`28-style.txt` L2447）⇒ 260ms 退场后 250ms 真删。 */
function CaseRow({ r, first, going }) {
  const dd = dayOf(r.t);
  const du = r.duanci ? bold(esc(String(r.duanci).replace(/<b>(.*?)<\/b>/g, '**$1**').replace(/<[^>]*>/g, '').slice(0, 140))) : '';
  return (
    <div className={'case-row' + (r.fb === '错' ? ' bad' : '') + (first ? ' on' : '') + (going ? ' going' : '')} data-row={r.id} title="点开看这一卦">
      <div className="cr-h">
        <span className="cr-t">{esc(r.t)}</span>
        <span className="cr-g">{esc(r.gua)}</span>
        <span className="cr-md">{dd.md}</span>
        <span className="cr-x">›</span>
      </div>
      <div className="cr-q">{esc(r.q)}{r.thread && r.thread.length ? <span className="mini">{'（续问 ' + r.thread.length + '）'}</span> : null}</div>
      <div className="cr-a">
        <button type="button" className={'btn sm' + (r.fb === '对' ? ' on' : '')} data-fb="对" data-id={r.id}>应验</button>
        <button type="button" className={'btn sm dang' + (r.fb === '错' ? ' on' : '')} data-fb="错" data-id={r.id}>没应验</button>
        {r.ans === 'model' ? <button type="button" className="btn sm" data-ask={r.id}>接着问</button> : null}
        <span className="sp" />
        <button type="button" className="btn sm" data-del={r.id}>删</button>
      </div>
      <div className="cr-note"><span>实际情况</span>
        <input type="text" data-note={r.id} defaultValue={r.note} placeholder="后来到底怎么着了？写一句，复盘要用它" />
      </div>
      <div className="cr-askbox" data-askbox={r.id} hidden />
      {r.fb === '错' ? <Rv r={r} /> : null}
      {du ? <div className="cr-d" dangerouslySetInnerHTML={{ __html: du }} /> : null}
    </div>
  );
}

/* 复盘区（`rvHtml` L409–424）：本批**不出网** ⇒ `!r.rv` 时停在既有「准备中…」分支 */
function Rv({ r }) {
  if (!r.rv) {
    return (
      <div className="rv on" id={'rv-' + r.id}><div className="rv-h">复盘 · <span className="rv-s">准备中…</span></div>
        <div className="rv-b" /></div>
    );
  }
  return (
    <div className="rv on" id={'rv-' + r.id}>
      <div className="rv-h">复盘 · <span className="rv-s">待你确认</span></div>
      <div className="rv-b" dangerouslySetInnerHTML={{ __html: r.rv }} />
      <div className="rv-f">
        <button type="button" className="btn pri sm" data-okrule={r.id}>写入准则</button>
        <button type="button" className="btn sm" data-norule={r.id}>算了，不记</button>
        <span className="mini">写入后，以后每次解卦都会一并交给模型</span>
      </div>
    </div>
  );
}

/* 空态文案（`renderCases` L307–310，逐字） */
function EmptyCases() {
  return (
    <div className="mini" style={{ padding: '16px 18px' }}>还没有记录。<br />每起一卦都会自动记进这里。事后回来标一下准不准——<b>错的卦才值钱</b>。<br /><br />标了「没应验」，这里会出现复盘：它得说清凭什么、错在哪、怎么修，你点「写入准则」才算数。</div>
  );
}

/* 一条准则（`renderRules` L437–444） */
function RuleRow({ r }) {
  return (
    <div className="rule-row">
      <div className="rr-h"><span className="rr-t">{esc(r.at)}</span>
        <span className="cr-g">{esc(r.gua || '')}</span>
        <span className="sp" /><button type="button" className="btn sm" data-delrule={r.id}>删</button></div>
      <div className="rr-b" dangerouslySetInnerHTML={{ __html: r.rule || '' }} />
      {r.why ? <div className="rr-w" dangerouslySetInnerHTML={{ __html: '依据：' + r.why }} /> : null}
      {r.q ? <div className="mini">{'来自卦例：' + esc(r.q)}</div> : null}
    </div>
  );
}

export default function Records({ open = false, onClose }) {
  const [cases, setCases] = useState(() => readCases());
  const [dead, setDead] = useState(() => readCasesRaw().filter((r) => r.deleted));
  const [rules, setRules] = useState(() => readRules());
  const [tab, setTab] = useState('cases');
  const [q, setQ] = useState(() => String((typeof window !== 'undefined' && window.__sdbQ) || ''));
  const [detailId, setDetailId] = useState('');   /* ⇔ 早前的版本 `window.__sdbDetail`（bindCaseBox L458 / L464-465） */
  const [trashId, setTrashId] = useState('');     /* ⇔ 早前的版本 `[data-open]` 那条「直接写 box」的临时详情（L264） */
  /* ★ 2026-10-22（现象：「点了彻底删就返回到列表去了、回收站收起来，不能连着删」）：
     回收站那一栏改成 **受 state 控制**（原来 open 只住在 DOM 上，任何一次刷新就没了）。
     `keepTrash` = 「这次刷新是回收站里的动作引起的」⇒ 刷新后照样展开，人留在回收站里连着删。 */
  const [trashOpen, setTrashOpen] = useState(false);
  const keepTrash = useRef(false);
  /* ★ 2026-10-22（要求）：回收站多选 —— msMode=多选态，msSel=选中的 id 列表 */
  const [msMode, setMsMode] = useState(false);
  const [msSel, setMsSel] = useState([]);
  const [armed, setArmed] = useState(false);      /* ⇔ 早前的版本 `[data-clear]` 的 `data-armed`（L270-277） */
  /* ★ A4③：待复盘的记录 id —— 点「没应验」后**不能当场调** `reviewCase`（React 的 setState 是异步的，
     那一刻 `#rv-<id>` 还没渲染出来；早前的版本是 setFb → renderSdb 同步重建 DOM 后再调）。
     所以先记下 id，等下面那个 effect（跑在渲染提交之后）再跑 ⇒ 与早前的版本的先后顺序一致。 */
  const [rvPending, setRvPending] = useState('');
  const [goingId, setGoingId] = useState('');     /* ⇔ 早前的版本 `.case-row.going`（L241） */
  const alive = useRef(true);
  const rootRef = useRef(null);
  const timers = useRef([]);
  const detailIdRef = useRef('');                 /* 给 `refresh()` 用（那个 effect 的 deps 是 []，读不到最新 state） */
  const footSnap = useRef({ n: 0, dead: [] });    /* 详情态下底栏 = 上一轮列表渲染的快照（见下面「底栏始终在」） */
  const everOnRef = useRef(false);                /* 抽屉**开过一次**之后，关闭态的 `class` 属性要**留着空串**（见渲染处注释） */
  useEffect(() => { detailIdRef.current = detailId; }, [detailId]);

  const delNow = (id) => { RecordsStore.delCase(id); };   /* L101 `delCase` = markCase(id,true)；A4② 起走 store */
  const close = () => { if (typeof onClose === 'function') onClose(); };                   /* `sdbClose` L133-137 的 React 等价物（外壳摘 `.on` + `sdb-lock`） */

  /* 唯一刷新源：重读 legacy 数据 ⇒ `#sdbN`/`#ruleN` 两个计数与两个列表全部由 state 派生。
     外壳把 legacy 的 `window.renderSdb` 重定向到这里；未注册时 legacy 侧静默早退。 */
  useEffect(() => {
    const refresh = () => {
      if (!alive.current) return;
      setCases(readCases());
      setDead(readCasesRaw().filter((r) => r.deleted));
      setRules(readRules());
      /* 下面三个在早前的版本是「住在 DOM 上」的临时态，一次重渲染（innerHTML 重建）就没了 ⇒ 同步清掉：
         ⚠ 但**详情态例外**：早前的版本详情分支（L297-305）只重写 `#sdbCases`，**不动底栏**（`sdbFootWire`
           只在列表渲染里被调）⇒ 那时底栏还是上一轮列表留下的旧节点，`data-armed` / 展开的回收站
           都还留在它上面。所以这两项按 `detailIdRef` 分叉。 */
      setTrashId('');   /* `renderCases` 会重写 box ⇒ 临时详情被抹（L292-305）—— 这条**不分叉** */
      setGoingId('');   /* 底栏/行节点被替换 ⇒ `going` 随节点走（L201-209） */
      if (!detailIdRef.current) {
        setArmed(false);  /* 底栏随 innerHTML 重建 ⇒ `data-armed` 不保留（L168 + L357） */
        /* 同理：早前的版本重建底栏 ⇒ 展开着的「回收站」`<details>` 会跟着合上（`open` 随旧节点消失）；
           React 复用同一个 `<details>` 节点、不会自己合 ⇒ 这里照早前的版本的时机手动合上。
             回收站里的动作（彻底删 / 还原 / 清空回收站）打 keepTrash 标 ⇒ 这一次刷新**保持展开**。 */
        if (keepTrash.current) { keepTrash.current = false; setTrashOpen(true); }
        else setTrashOpen(false);
      }
    };
    window.__xlrRecordsRefresh = refresh;
    refresh();
    return () => {
      alive.current = false;
      timers.current.forEach((t) => clearTimeout(t));
      if (window.__xlrRecordsRefresh === refresh) delete window.__xlrRecordsRefresh;
    };
  }, []);

  /* 打开抽屉：早前的版本入口是 `sdbOpen('cases')`（22-script L177）⇒ `sdbTab('cases')` + 末尾一次 `renderSdb()`（20 L126-132）*/
  useEffect(() => {
    if (!open) return;
    setTab('cases');
    setCases(readCases());
    setDead(readCasesRaw().filter((r) => r.deleted));
    setRules(readRules());
  }, [open]);

  /* `[data-clear]` 第二段的 4 秒回退（L272-277 的 setTimeout 4000） */
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  /* `[data-note]`：早前的版本绑的是**原生 change**（`bindCaseBox` L474-478），不是 input。
     ⇒ 这边也用原生 change（React 的 `onChange` 映射到 input 事件，语义不同，不能拿来顶替）。 */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onChange = (ev) => {
      const t = ev.target;
      if (!t || typeof t.closest !== 'function') return;
      const n = t.closest('[data-note]');
      if (!n) return;
      const v = String(n.value || '').trim();
      RecordsStore.setNote(n.getAttribute('data-note'), v);   /* A4②：动词走 store（原来 g('setNote')） */
      /* 早前的版本紧接着还有一句 `renderSdb()`；`setNote` → `saveCases` → `renderSdb`（已被重定向到 refresh）⇒ 不必再调。
         ⚠ 但早前的版本那次重渲染会把整行 innerHTML **重建** ⇒ 输入框的显示值也被归一成存档里的 trim 结果；
           React 复用同一个节点、不会回写未受控输入的 live value ⇒ 这里照早前的版本那样补一次回写。 */
      if (n.value !== v) n.value = v;
    };
    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  }, []);

  /* 详情态失效：早前的版本 `renderCases` L297-305 —— 详情那条取自 `recById()`（= `loadCases()`，不含已删）
     ⇒ 一旦它被删，就清空详情态、回列表。 */
  useEffect(() => { if (detailId && !cases.some((r) => r.id === detailId)) setDetailId(''); }, [detailId, cases]);

  /* ★ A4③ 复盘主流程（**会出网**）：跑在**渲染提交之后** ⇒ 那一刻 `#rv-<id>`（含 `.rv-b`/`.rv-s`）
     已经由上面的 `<Rv>` 渲染出来，`reviewCase` 里的 `say()` 才有地方落笔（与早前的版本「先重建 DOM 再复盘」同序）。
     ⚠ 只在这里跑一次；`reviewCase` 自己会判「没接模型就只提示」「已复盘过就不再跑」。 */
  useEffect(() => {
    if (!rvPending) return;
    const id = rvPending;
    setRvPending('');
    ReviewCore.reviewCase(id);
  }, [rvPending]);

  /* ── 早前的版本 `sdbFootDel`（L231-243）：**捕获阶段**拦下 `.case-row` 里的 `[data-del]` ⇒
     先播 260ms 退场动画、250ms 后才真删，并 `stopPropagation()` 让「立即删」那条收不到。
     ⚠ 早前的版本怪癖**照抄**：行已是 `going` 时它在最前面就 `return`（L240，在 preventDefault/stopPropagation **之前**）
     ⇒ 事件继续走到 `bindCaseBox` 的「立即删」（L471-473）⇒ **二次点击 = 立刻删**。 */
  const onDelCapture = (e) => {
    const t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    const db = t.closest('[data-del]');
    if (!db) return;
    const row = db.closest('.case-row');
    if (!row) return;                          /* 详情态（`[data-del]` 不在 `.case-row` 里）⇒ 交给下面的「立即删」 */
    e.preventDefault();
    e.stopPropagation();
    const id = db.getAttribute('data-del');
    if (goingId === id) { delNow(id); return; }   /* L240 的早退 + L471-473 的立即删 */
    setGoingId(id);
    timers.current.push(setTimeout(() => { delNow(id); }, 250));   /* L242 `setTimeout(…, 250)` */
  };

  /* `[data-fb]`（L468-470 → `setFb` L84-95）。
     ★ A4③（2026-10-13）：**复盘接上了**。早前的版本「没应验」会顺手触发 `reviewCase()`（出网，20 L94 →
     22-script L43 的复盘主流程）。这里照早前的版本语义走，只把**时机**改成「等渲染提交之后再跑」：
       ① 先在 setFb 里把复盘钩子**临时挂空** ⇒ 只做本地标记（等价于早前的版本 setFb 里那一步 saveCases）；
       ② 记下 `rvPending`，由上面的 effect 在 `#rv-<id>` 渲染出来之后跑 `reviewCase`（早前的版本是先
          renderSdb 同步重建 DOM 再调 ⇒ 先后顺序一致）。
     条件与早前的版本逐字相同：`fb === '错'` 且这一条**还没复盘过**（`!rec.rv`）才跑。
     ★ 仍然**只有一份** setFb / reviewCase 实现（不复制数据逻辑）。 */
  const markFb = (id, fb) => {
    if (fb !== '错') { RecordsStore.setFb(id, fb); return; }        /* 「应验」不碰复盘（L94 条件不成立） */
    const prev = RecordsStore.setReviewHook(null);
    try { RecordsStore.setFb(id, fb); } finally { RecordsStore.setReviewHook(prev); }
    const rec = readCases().find((r) => r.id === id);
    if (rec && !rec.rv) setRvPending(id);                          /* ⇔ 早前的版本 L94 的条件 */
  };

  /* `[data-norule]`（L482-488 照抄：把该条的复盘清掉。早前的版本这段是内联的，没有对应的全局函数）
     ⇒ **写一次就把回收站里那些已删记录永久写没**。本组件改为取 `loadCasesRaw()`（含已删），
     其余逐字照抄（`rv=''` / `rvWhy=''` 两处清空语义不变）。
     ⚠ 同族另 4 处在 legacy 段里（`setFb`/`setNote`/`updateCaseDuanci`/`markModelAnswered` + `addCase`），
       那些是**只读照抄对象**不能改 ⇒ 由外壳 `mountRecords()` 的写入者包装统一兜住（见 main.jsx 变更记录 注释）。 */
  const noRule = (id) => {
    const a = RecordsStore.loadCasesRaw();   /* A4①：读写都直接走存储层（原来是 g('loadCasesRaw')/g('saveCases')） */
    for (let i = 0; i < a.length; i++) if (a[i].id === id) { a[i].rv = ''; a[i].rvWhy = ''; }
    RecordsStore.saveCases(a);
  };

  /* `[data-okrule]`（L479-481 → `confirmRule`）：早前的版本末尾还会 `sdbTab('rules')`（L533）⇒ 这边同步切页 */
  const confirmRuleById = (id) => {
    ReviewCore.confirmRule(id);   /* A4③：准则那条线走 React 侧切片（原来 g('confirmRule')） */
    setTab('rules');
  };

  /* 冒泡阶段：早前的版本三处监听器（`bindCaseBox` L452-489 / `renderRules` L447-449 / `sdbFootAct` L244-280）
     合并成一处。**分支顺序与早前的版本一致**：行内按钮在「行点击」之前；底栏六分支照 `sdbFootAct` 自己的顺序
     （`[data-open]` 那行里还嵌着「还原/彻底删」⇒ 必须先判它们，与早前的版本 `closest` 的先后完全一样）。 */
  const onClick = (e) => {
    const t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    let b;
    /* ① 行内按钮（`bindCaseBox`） */
    if ((b = t.closest('[data-back]'))) {                                                                   /* L462-467 */
      setDetailId(''); setTrashId('');
      /* 早前的版本这句后面是 `renderSdb()` ⇒ 走的是**列表渲染** ⇒ 底栏被重建（展开的回收站跟着合上）。 */
      setTrashOpen(false);
      return;
    }
    if ((b = t.closest('[data-fb]'))) { markFb(b.getAttribute('data-id'), b.getAttribute('data-fb')); return; }  /* L468-470 */
    if ((b = t.closest('[data-del]'))) { delNow(b.getAttribute('data-del')); return; }                      /* L471-473（详情态走这条） */
    if ((b = t.closest('[data-okrule]'))) { confirmRuleById(b.getAttribute('data-okrule')); return; }        /* L479-481 */
    if ((b = t.closest('[data-norule]'))) { noRule(b.getAttribute('data-norule')); return; }                /* L482-488 */
    if ((b = t.closest('[data-delrule]'))) {                                                                /* `renderRules` L447-449 */
      RecordsStore.delRule(b.getAttribute('data-delrule')); return;
    }
    /* ② 底栏六分支（`sdbFootAct` L244-280，**顺序照抄**） */
    if ((b = t.closest('[data-set]'))) {                                                                    /* L251-257 */
      close();
      const st = document.getElementById('btnSet');
      if (st) st.click();
      return;
    }
    /* ★ 2026-10-22（要求）：回收站多选 —— 进入 / 退出 / 全选 / 单条勾选 / 批量删除 / 批量还原 */
    if ((b = t.closest('[data-msenter]'))) { setMsMode(true); setMsSel([]); return; }
    if ((b = t.closest('[data-msdone]'))) { setMsMode(false); setMsSel([]); return; }
    if ((b = t.closest('[data-msall]'))) {
      const ids = readCasesRaw().filter((r) => r.deleted).map((r) => r.id);
      setMsSel((cur) => (cur.length >= ids.length ? [] : ids));
      return;
    }
    if ((b = t.closest('[data-msid]'))) {
      const id = b.getAttribute('data-msid');
      /* ⚠ 用函数式更新：连点几下的 setState 会被批处理，读闭包里的 msSel 只会留下最后一下 */
      setMsSel((cur) => (cur.indexOf(id) >= 0 ? cur.filter((x) => x !== id) : cur.concat([id])));
      return;
    }
    if ((b = t.closest('[data-msdel]'))) {
      if (!msSel.length) return;
      keepTrash.current = true;                      /* 删完还留在回收站里 */
      RecordsStore.purgeMany(msSel);
      setMsSel([]);
      if (!readCasesRaw().filter((r) => r.deleted).length) setMsMode(false);   /* 空了自己退出去 */
      return;
    }
    if ((b = t.closest('[data-msrest]'))) {
      if (!msSel.length) return;
      keepTrash.current = true;
      RecordsStore.restoreMany(msSel);
      setMsSel([]);
      return;
    }
    /* */
    if ((b = t.closest('[data-restore]'))) { keepTrash.current = true; RecordsStore.restoreCase(b.getAttribute('data-restore')); return; }   /* L258 */
    if ((b = t.closest('[data-purge]'))) { keepTrash.current = true; RecordsStore.purgeCase(b.getAttribute('data-purge')); return; }         /* L259 */
    if ((b = t.closest('[data-purgeall]'))) { keepTrash.current = true; RecordsStore.purgeAllDeleted(); return; }                            /* L260 */
    if ((b = t.closest('[data-open]'))) {                                                                   /* L261-266 */
      const oid = b.getAttribute('data-open');
      const rec = readCasesRaw().find((r) => r.id === oid);
      if (rec) setTrashId(oid);
      return;
    }
    if ((b = t.closest('[data-clear]'))) {                                                                  /* L267-279 */
      if (b.disabled || b.hasAttribute('disabled')) return;
      if (armed) { RecordsStore.clearCases(); return; }   /* `clearCases` L115-119（A4② 起走 store） */
      setArmed(true);
      return;
    }
    /* ★ 2026-10-22：多选态里点行 ＝ 选中／取消（点「还原/彻底删」那种按钮的照常走上面的分支） */
    if (msMode && !t.closest('button') && (b = t.closest('.tr-row'))) {
      const id = b.getAttribute('data-msrow');
      setMsSel((cur) => (cur.indexOf(id) >= 0 ? cur.filter((x) => x !== id) : cur.concat([id])));
      return;
    }
    /* ③ 行点击 → 详情（`bindCaseBox` L454-461，排除按钮/输入/复盘区/追问区） */
    if ((b = t.closest('.case-row[data-row]'))) {
      if (t.closest('button, input, textarea, select, .rv, .cr-askbox')) return;
      setTrashId('');
      setDetailId(b.getAttribute('data-row'));
    }
  };

  const done = cases.filter((r) => r.fb).length;
  const kw = String(q || '').toLowerCase();
  const rows = cases.slice().sort((x, y) => String(y.t).localeCompare(String(x.t))).filter((r) => {
    if (!r || typeof r !== 'object') return false;
    if (!kw) return true;
    return ((r.q || '') + ' ' + (r.gua || '') + ' ' + (r.note || '') + ' ' + (r.cat || '')).toLowerCase().indexOf(kw) >= 0;
  });

  /* 详情（`renderCases` L297-305 的入口 + `caseDetailHtml` L362-407）
     · `trashId`（早前的版本 `[data-open]`，L261-266）：从 `loadCasesRaw()` 里找 —— 回收站那条**本来就是已删的**
     · `detailId`（早前的版本 `window.__sdbDetail`）：从 `loadCases()` 里找（`recById`）
     两者同时存在时 `trashId` 优先（早前的版本 `[data-open]` 是**直接写 box**，覆盖掉先前详情），
     而任何一次 `renderSdb` 都会把 `trashId` 抹掉（见上面的 `refresh()`）⇒ 优先级与早前的版本一致。 */
  const all = cases.concat(dead);
  let detail = null;
  if (trashId) detail = all.find((r) => r.id === trashId) || null;
  else if (detailId) detail = cases.find((r) => r.id === detailId) || null;
  /* 底栏条数：照抄 legacy 三个调用点（L310 空态 0 / L324 无匹配 0 / L357 `rows.length`）。
     ★★ **底栏始终在**：早前的版本详情分支虽然自己
     **不渲染**底栏，但它**也不删**上一轮列表渲染留下的那个旧底栏节点（`sdbFootWire` 把它挂成
     「清空记录 / 回收站 / 设置」。⇒ React 这边必须同样**始终渲染**底栏；详情态取**上一轮列表渲染
     的快照**（`footSnap`）——条数与回收站列表都停在上一次列表渲染的时刻，与那个"旧节点"一致。 */
  const listFootN = cases.length ? (rows.length ? rows.length : 0) : 0;
  if (!detail) footSnap.current = { n: listFootN, dead };
  const footView = detail ? footSnap.current : { n: listFootN, dead };

  /* 关闭态的 `class` 属性有两种形态，取决于"开没开过"：
     · 从没开过 ⇒ **没有 class 属性**（`mk()` 建节点时只设了 id，22-script L130）
     · 开过一次又关掉 ⇒ **有 `class=""`**（`sdbClose()` 是 `el.classList.remove('on')`，20-script L135；
       摘掉最后一个类之后属性保留、值为空串）
     ★ Step 2 的静态比对看到的是第一种（所以当时把 `className` 改成"开时才给"）；本条把第二种也复现。
       只读地记一个"开过"标志（写 ref 幂等、不影响渲染结果）。 */
  if (open) everOnRef.current = true;
  const rootCls = open ? { className: 'on' } : (everOnRef.current ? { className: '' } : {});

  return (
    <div id="sdb" data-tab={tab} ref={rootRef} onClickCapture={onDelCapture} onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
      {...rootCls}>
      <div className="sdb-mask" id="sdbMask" onClick={close} />
      <aside className="sdb-p">
        <div className="sdb-h"><b>记录</b><span className="sp" />
          <span className="n" id="sdbN">{cases.length + ' 则' + (done ? '（已标 ' + done + '）' : '')}</span>
          <span className="sdb-qw">
            <svg className="sdb-qi" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.4" /><path d="M15.8 15.8L21 21" /></svg>
            <input className="sdb-s" id="sdbQ" type="search" placeholder="搜索卦例内容…" aria-label="搜索记录"
              onInput={(e) => {
                const v = String(e.target.value || '').trim();
                window.__sdbQ = v; setQ(v);
                /* 早前的版本这里是 `renderCases()`（22-script L163-166）⇒ 也是一次**列表渲染** ⇒ 底栏重建
                   （展开的回收站跟着合上）。⚠ 两者只在 561~820px 那一带同时可见（≥821 搜索框 display:none、
                   ≤560 回收站 display:none），但仍照早前的版本做。 */
                try { const td = rootRef.current && rootRef.current.querySelector('.trash'); if (td) td.open = false; } catch (eTd) { }
              }} />
          </span>
          <button className="x" id="sdbClose" type="button" aria-label="关闭" onClick={close}>×</button></div>
        <div className="sdb-t">
          <button className={'stab' + (tab === 'cases' ? ' on' : '')} type="button" data-tab="cases" onClick={() => setTab('cases')}>卦例</button>
          <button className={'stab' + (tab === 'rules' ? ' on' : '')} type="button" data-tab="rules" onClick={() => setTab('rules')}>准则 <b id="ruleN">{rules.length}</b></button>
        </div>
        <div className="sdb-b">
          <div id="sdbCases" hidden={tab !== 'cases'}>
            {/* ★ 2026-10-15：抽屉里的内容套一层 SafeZone —— 数据出问题时**只废掉这一块**，
                抽屉壳（标题/页签/底栏/遮罩）照旧在，里面显示一句「记录出错了」而不是整片失灵。 */}
            <SafeZone what="记录">
              {detail ? <Detail r={detail} /> : (cases.length
                ? (rows.length
                  ? <CaseList rows={rows} goingId={goingId} />
                  : <div className="sdb-empty2">没有匹配的记录。</div>)
                : <EmptyCases />)}
            </SafeZone>
          </div>
          <div id="sdbRules" hidden={tab !== 'rules'}>
            <SafeZone what="准则">
              {rules.length
                ? rules.slice().reverse().map((r) => <RuleRow r={r} key={r.id} />)
                : <div className="mini" style={{ padding: '16px 18px' }}>还没有准则。<br />准则只从【你确认过的复盘】里来——不自动写、不偷偷学。</div>}
            </SafeZone>
          </div>
          {/* ★ 底栏的位置：早前的版本 `renderCases` 先把底栏写在 `#sdbCases` **里面**，随后 `sdbFootWire`
              （20-script.txt L192–210）把它**搬出来**挂成 `.sdb-b` 的兄弟（避免内容从它底下穿过）。
              ⇒ 运行期终态 = `.sdb-b > [#sdbCases, #sdbRules, .sdb-foot]`，本组件**直接渲染终态**（不搬）。
              ★ 详情态**也照旧渲染**（值取自 `footView` 快照）—— 见上面「底栏始终在」的说明。 */}
          <Foot n={footView.n} dead={footView.dead} armed={armed} trashOpen={trashOpen} onTrashToggle={setTrashOpen}
            msMode={msMode} msSel={msSel.filter((id) => footView.dead.some((r) => r.id === id))} />
        </div>
        <div className="sdb-f">记下来 → 标准不准 → 没应验就复盘 → <b>你确认了才写进准则</b></div>
      </aside>
    </div>
  );
}

/* 分组 + 条目（`renderCases` L328–357 的分组分支；**底栏不在这里** —— 见上面"底栏的位置"注释） */
function CaseList({ rows, goingId }) {
  let curGrp = '';
  const out = [];
  rows.forEach((r, idx) => {
    const dd = dayOf(r.t);
    if (dd.k !== curGrp) { curGrp = dd.k; out.push(<div className="sdb-grp" key={'g' + idx}>{curGrp}</div>); }
    out.push(<CaseRow r={r} first={idx === 0} going={goingId === r.id} key={r.id} />);
  });
  return <>{out}</>;
}

/* 复盘详情（`caseDetailHtml` L365–406，逐字） */
function Detail({ r }) {
  const rd = (h) => (h ? <div className="cd-d" dangerouslySetInnerHTML={{ __html: renderDoc(String(h)) }} /> : null);
  return (
    <div className="cd">
      <div className="cd-bar"><button type="button" className="btn sm" data-back="1">‹ 返回列表</button>
        <span className="sp" /><span className="mini">复盘</span></div>
      <div className="cd-sec"><div className="cd-k">所问</div><div className="cd-q">{esc(r.q)}</div></div>
      {r.bg ? <div className="cd-sec"><div className="cd-k">背景</div><div className="cd-q">{esc(r.bg)}</div></div> : null}
      <div className="cd-sec"><div className="cd-k">起卦</div><div className="cd-gua">{esc(r.gua || '')}</div>
        <div className="mini">{'事类：' + esc(r.cat || '通用') + ' · 记于 ' + esc(r.t || '')}</div></div>
      <div className="cd-sec"><div className="cd-k">当时的断辞</div>
        {r.duanci ? rd(r.duanci) : <div className="mini">这一卦没出过断辞。</div>}</div>
      {Array.isArray(r.thread) && r.thread.length ? (
        <div className="cd-sec"><div className="cd-k">{'在这卦里的追问（' + r.thread.length + '）'}</div>
          {r.thread.map((it, i) => (it ? (
            <div className="ask-item" key={i}><div className="ask-q">{esc(it.q)}</div>
              <div className="ask-a" dangerouslySetInnerHTML={{ __html: renderDoc(it.a || '') }} /></div>
          ) : null))}
        </div>
      ) : null}
      <div className="cd-sec"><div className="cd-k">准不准 · 实际情况</div>
        <div className="cr-a" style={{ marginBottom: '8px' }}>
          <button type="button" className={'btn sm' + (r.fb === '对' ? ' on' : '')} data-fb="对" data-id={esc(r.id)}>应验</button>
          <button type="button" className={'btn sm dang' + (r.fb === '错' ? ' on' : '')} data-fb="错" data-id={esc(r.id)}>没应验</button>
          <span className="sp" />
          <button type="button" className="btn sm" data-del={esc(r.id)}>删掉这则</button>
        </div>
        <div className="cr-note"><span>实际情况</span>
          <input type="text" data-note={esc(r.id)} defaultValue={r.note} placeholder="后来到底怎么着了？写一句，复盘要用它" /></div>
      </div>
      {r.fb === '错' ? <div style={{ padding: '0' }}><Rv r={r} /></div> : null}
      {r.ans === 'model'
        ? <div className="cd-sec"><div className="cd-k">接着问（还是这一卦）</div>
            <div className="cr-askbox" data-askbox={esc(r.id)} dangerouslySetInnerHTML={{ __html: recAskHtml(r) }} /></div>
        : <div className="cd-sec"><div className="cd-k">接着问</div>
            <div className="mini">用模型解过这一卦之后，这里就能接着问。</div></div>}
    </div>
  );
}
