/*
 *
 * ⚠ 这一块与前一块（`#right` 的 C4/C6/C7）**做法不同**，两条原因都是现场踩出来的：
 *
 * ① **不能「摘空 + React 摆骨架」**：`18-script.txt` 在**加载期**就把 `#h2/#h1/#mClock/#mTime/#mNum`
 *    抓成**顶层 var**（= window 属性，可读可写）**并给它们绑了监听**（L17/L46 · L161–163），
 *    还有一个每 2 秒写 `h1/h2.value` 的 interval（L33–37）。摘掉旧节点 = **丢监听、丢时钟同步**
 *    挂载后**重绑** `window.h1/h2/mClock/mTime/mNum` + 装**事件转发**（新节点 → 旧节点 ⇒ 旧监听器照常
 *    跑到 legacy 的全局函数，而那些函数内部一律按 id 取值 ⇒ 取到的就是 React 的节点）。
 *
 * ② **React 渲染的是「modern 重排之前」的那份骨架（= `11-text.txt` L29–L104 逐字）**，不是终态。
 *    上游 `_tools/modern.js`（在产物里 = `30-script` / `38-script` 两部分）会在 DCL 把它重排成
 *    `.cbar > .cmain + #castPanel + .cside + .gobar`、加 `.nwrap` 加减号、加 `data-nstep`/`data-xw`/`data-dp`/`data-gsel`、
 *    建 `.spill` 药丸、建 `.vstep` 步进条、给 `#btnGo` 挂 disabled 同步……
 *    （实测 `38-script.txt` L527–529 `wireSeg()`：`if (!seg || seg.querySelector('.spill')) return;`
 *      —— React 若自己渲染 `.spill`，守卫直接 return ⇒ 药丸**位置不摆、模式切换也不滑动**；
 *      同族的 `buildCastPanel` 也有「`#castPanel` 已存在 ⇒ return」）。
 *
 * 搬法照全仓老规矩：**原样搬运** —— `18-script.txt` 里 `setMode / setCastOpen / castOpen / refreshClock /
 * 归属（保证「每个状态只有一个写者」）：
 *   · **React 侧（本文）**：方式三键 → `setMode`；详情键 → `setCastOpen(!castOpen())`；
 *     九数手改 → 源里 `onEdit` 的语义；`#h1/#h2` 的 change → 置 `window.__ziTouchH1/H2`；
 *     `#dt` 今天初值；问候语 `renderGreet()`；每 2 秒 `refreshClock()`（源里 L164 那条 timer 的等价物）。
 *     ② `#h1/#h2` 的「每 2 秒跟钟」（18-script L33–37，按 id/变量写，作用在 React 的节点上）。
 *   · **中和**：外壳把 `window.refreshClock` 覆盖成 no-op（否则 legacy 那条每 2 秒的 timer 会与 React 争写
 *     `#castMini`/九数）。`window.__mode` / `window.__numManual` 仍由两边共用（起卦链要读）。
 *   「modern 的重排把节点搬来搬去」互不干扰，也避免 React 覆盖掉 legacy 写的类/文本。
 *
 * ⇒ 组件产出：`#h2/#h1` 的 12 个时辰 option（原本由 18-script 的加载期语句灌）＋「重排前的原骨架」。
 * 🔸 与早前的版本的**属性级差异（已知且无害）**：① 属性顺序由 React 归一化；② 原骨架里那三条 HTML 注释 React 不渲染
 *    （注释不进布局/样式，结构判据按「元素 + 文本」比对，不比对注释）。
 *
 * 旧实现整块在 `38-script` L162–275，**在 IIFE 里** ⇒ 拿不到函数引用；但源码自带三道口子，全都能用：
 *   ① `data-gsel` ——每个 select 带它就跳过（L233）；
 *   ② `window.__gselWired` ——置上就连 document 级监听都不装（L246）；
 *   ③ 整块只互相引用（不依赖 IIFE 里别的变量）⇒ 可**逐字切片**。
 *   ＋ 本文 JSX 上**静态**盖封条 `data-gsel="1"`（三处 select）＋ 切片内两处改自用名
 *   （`data-xgs` / `__xgsWired`，理由见 glassSelect.js 头注：照抄会把自己挡住、或让弹层收不到键盘）。
 * ⚠ **不是新功能**：legacy 本来就在管（它的看门狗每 125ms 扫一次 select，扫到 React 的 `#cat` 就接管）
 * ⚠ 补扫时机：切片保留了源里「`offsetWidth <= 0` 就跳过」⇒ `#h2` 初始隐藏，露出时要再扫一次
 *   （切方式 / 展开详情各补一次 = legacy 那个 125ms 轮询的**确定时机版**）。
 *
 * 同 B1-1 的配方：`38-script` L576–638 也**完全自包含**（只用 document/window/Date + 自己的内层函数）
 *   `#dt` **静态**盖封条 `data-dp="1"`；切片内入口闸 `data-dp` → 自用 `data-dpx`（同 B1-1 的坑）。
 * ⚠ 与 B1-1 的两点不同（都是实测过的）：① **不需要补扫**（入口闸没有 `offsetWidth` 那条）；
 *   ② **不需要改一次性闸**（「点外面关」是 capture `click`、每次调用都装；legacy 那份绑在**已被摘掉的旧节点**上 ⇒ 空转）。
 *
 * 同 B1-1/B1-2 的配方：`38-script` L91–156（`stepOnce` ＋ `syncAuto` ＋ `buildNumStep`）**三块连续自包含**
 *   三个数字框**静态**盖封条 `data-nstep="1"`；切片内两处改自用名（`data-nsx` / `window.__autoObsX`）。
 * ⚠ 与 B1-1/B1-2 的唯一不同：**必须轮询等 `#castPanel` 出现再接线** ——
 *   `buildNumStep` 开头就是 `if (!document.getElementById('castPanel')) return;`，而 `#castPanel` 是
 *   **B2 的 `buildCastPanel`** 建的（不归这一步）⇒ 不等它就整块空转。
 *   与本组件 effect 同一拍出现 ⇒ 50ms 一探、上限 100 次（≈5s）足够，且不留常驻定时器。
 *   ℹ 与 legacy 的关系：封条 + 自用标记 ⇒ **只有一个接线者（React）**；若两边都建 wrap 会嵌套
 *     ⇒ `.nwrap` 计数变 6、点一下加号值跳 2（主流程判据 `03-点两次加号` 抓的就是这个）。
 *   ℹ `window.__autoObsX`（自用名）是**必须**的：legacy 的看门狗先跑过且已把 `window.__autoObs` 占住，
 *     沿用同名时这份会走进 `!window.__autoObs` 那一行就 return ⇒ **不建自己的活 observer**
 *     （实测：过 20 秒窗口后断开 `__autoObs` ⇒ `#castPanel.auto` 当场不跟；改后由 React 那份跟）。
 *
 * 源 = `38-script` L277–301 `wireKeys()`：`n1→n2→n3→提交` 三条链 ＋ `#q` 回车提交。
 * ⚠ 这一件**不能用 B1 的「盖封条」配方** —— `wireKeys` 一道闸都没有，它只是"初始化那一刻把监听
 *   按一下起两次卦。⇒ 改用**window 捕获阶段 + 吃掉事件**（与外壳里设置页/皮肤面板/记录抽屉同一手法）：
 *   「要么 React 管、要么 legacy 管」，永远不会两个一起管。
 * ⚠ Tab 跳格不在本接管范围（浏览器天生，实测 `#q→补充背景→#n1→#n2→#n3→#h2→#cat`，加减钮 `tabindex=-1` 跳过）；
 * ⚠ 三条守卫逐字照抄源 L293–297：`isComposing` / `keyCode === 229` 不拦、`Shift+回车` 换行、其余回车提交。
 */
import { useEffect } from 'react';
import { zhi, clockNums } from '@xlr/shared-judgment';
import { AskCore } from '../data/askCore.js';
import { CastCore } from '../data/castCore.js';
import { CastFx } from '../data/castFx.js';
import { GlassSelect } from '../data/glassSelect.js';
import { DatePicker } from '../data/datePicker.js';
import { NumStep } from '../data/numStep.js';
import { CastPanel } from '../data/castPanel.js';

const Q_PH = '问具体的事。例如「我这次面试能过吗」「我的猫走丢三天了，还能找回来吗」\n' +
  '不要写「看看我最近运势」这类没有边界的问题——问题决定卦的取向。';
const BG_PH = '相关的实际情况。例如：已婚；对方是同事；面试是下周三；猫上次在阳台丢的。';

/*
   顺序与文案逐字不动。 */
const CAT_OPTS = [
  ['auto', '事类·自动'], ['marriage', '婚姻 · 感情'], ['preg', '求子 · 孕产'],
  ['money', '财运 · 投资 · 借贷'], ['work', '工作 · 事业 · 选择'], ['ill', '疾病 · 健康 · 灾祸'],
  ['lost', '失物 · 寻人'], ['travel', '出行 · 行人'], ['law', '官司 · 是非 · 骗局'],
  ['exam', '考试 · 比赛 · 名次'], ['weather', '天气 · 天象'],
];

/* `#h2/#h1` 的 12 个 option：原本由 `18-script.txt` L18–L23 的加载期语句灌进去，React 必须自己产出。
   */
const ZHI_OPTS = zhi.map((z, i) => <option value={String(i + 1)} key={z}>{`${z}时`}</option>);

/* */
function useAskCore() {
  useEffect(() => {
    const $ = (id) => document.getElementById(id);
    /* */
    const mark = (k) => { try { const a = window.__xlrShell; if (a && a.fxOwn) a.fxOwn(k); } catch (e) { } };

    /* ① 把 AskCore 需要的那 5 个节点注入（源里它们是 18-script 的全局 var） */
    AskCore.bind({ h1: $('h1'), h2: $('h2'), mNum: $('mNum'), mTime: $('mTime'), mClock: $('mClock') });
    /* ★ A2：起卦链（`goCast`）也要那两个方式按钮 —— 它靠 `aria-pressed` 判断走哪一路取数 */
    CastCore.bindCast({ mClock: $('mClock'), mNum: $('mNum') });

    /* ② 初值补齐（原本是 18-script 的加载期语句，写在被摘掉的旧节点上 ⇒ 这里按同一套规则重做）：
          · `#h1/#h2` 的选中值 = `clockNums().zi`（源 L25–26）
          · `#dt` = 今天（源 L39–43 的匿名 IIFE，拿不到 ⇒ 照它的格式写一遍）
          · `setMode(window.__mode || 'clock')`（源 L165；内部会对 clock 调 refreshClock ⇒ 九数/文案一起补齐）
          · `renderGreet()`（源 L214） */
    let cn = null;
    try { cn = clockNums(); } catch (eC) { }
    const ziVal = cn ? String(cn.zi) : '';
    ['h1', 'h2'].forEach((k) => { const el = $(k); if (el && ziVal) el.value = ziVal; });
    const dtEl = $('dt');
    if (dtEl && !dtEl.value) {
      const n = new Date(), p = (x) => (x < 10 ? '0' : '') + x;
      dtEl.value = n.getFullYear() + '-' + p(n.getMonth() + 1) + '-' + p(n.getDate());
    }
    /* ★ 变更记录（需求：「时间取数也少了时辰下拉选项，这个模式也是要支持时辰选择的」）：
       时间取数模式也露出时辰下拉 —— 把 `.rowh` 与 `#h2` 放开。它俩装在 `#castPanel` 里 ⇒
       依旧是「点详情才看得见」，与「月日时」的规矩一致 ⇒ 默认屏（详情收起）像素一个不动。 */
    const showClockZi = () => {
      if ((window.__mode || 'clock') !== 'clock') return;
      const r = document.querySelector('.rowh'); if (r) r.hidden = false;
      const s = $('h2'); if (s) s.hidden = false;
    };
    const setModeBound = (m) => { AskCore.setMode(m); showClockZi(); };
    setModeBound(window.__mode || 'clock');
    try { AskCore.renderGreet(); } catch (eG) { }
    mark('init');
    mark('clockZiRow');

    /* ③ 事件接线（源里这些监听绑在旧节点上、节点被摘掉即失效 ⇒ 在 React 的节点上重接） */
    const nodes = { mClock: $('mClock'), mTime: $('mTime'), mNum: $('mNum'), castToggle: $('castToggle'), n1: $('n1'), n2: $('n2'), n3: $('n3'), h1: $('h1'), h2: $('h2') };
    const on = (el, type, fn) => { if (el) el.addEventListener(type, fn); };
    /* ★ B1-1（2026-10-13）：玻璃下拉（自绘弹层）改由 React 这份接管
       三道口子（都是源码里现成的，legacy 一个字不动）：
         · 三个 `<select>` **静态**带 `data-gsel="1"`（见下面的 JSX）⇒ legacy 的 `buildGlassSelect` 扫到就 `continue`；
         · 切片里的幂等标记用自用名 `data-xgs`、一次性闸用自用名 `window.__xgsWired`
           ⇒ 与 legacy 那份互不误判（⚠ 沿用同名会被 legacy 已置上的闸挡死 ⇒ 弹层的 Esc/↑↓/回车全没人接）。
       ⚠ 必须**补扫**：切片保留了源里「`offsetWidth <= 0` 就跳过」那条判据 ⇒ `#h2` 初始是隐藏的，
         等它露出来（切「月日时」、或 clock 模式展开详情）要再扫一次 —— 这是 legacy 那个 125ms 看门狗的
         **时机确定版**等价物（不靠轮询）。 */
    const glassRescan = () => { try { GlassSelect.buildGlassSelect(); } catch (eGS) { } };
    /* ★ 02 屏 #cat 的宽度：早前的版本是在**运行期按当前选中项**的文本量宽（`modern.js` L377-383）——
         canvas `measureText` 量宽 + 36（12 左内距 + 三角与右内距）⇒ `Math.max(96, w)`，上限 `78vw`（= 304.2px @390）。
       新仓重写时这段 JS **没搬**，只剩 `styles/legacy.css` 里一条 `max-width:112px` 兜着 ⇒ 宽度恒 112、且
       不跟随选中项（早前的版本选「事类·自动」是 96，选长的会变宽）⇒ 02 屏那 16px 差 + 丢掉的行为都由这一条解释。
       */
    const catFit = () => {
      const s = $('cat'); if (!s || !s.options || !s.options.length) return;
      try {
        const cv = document.createElement('canvas');
        const ctx = cv.getContext('2d');
        const cs = window.getComputedStyle(s);
        ctx.font = (cs.fontWeight || '400') + ' ' + (cs.fontSize || '12.5px') + ' ' + (cs.fontFamily || 'sans-serif');
        const t = s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : '';
        const w = Math.ceil(ctx.measureText(t).width) + 36;
        s.style.width = Math.max(96, w) + 'px';     /* 稿3 的「事类·自动」就是 96px */
        s.style.maxWidth = '78vw';
      } catch (eCat) { }
    };
    catFit();
    const modeChanged = () => {
      /* 方式一变，`.spill` 药丸要跟着挪（38-script 的几何函数在外壳手里，用事件通知它重摆） */
      try { window.dispatchEvent(new Event('xlr:askmode')); } catch (e) { }
      glassRescan();   /* 方式一变，`.rowh/#h2` 可能刚露出来 ⇒ 补扫（同上） */
    };
    /* #cat 换选项 ⇒ 宽度跟着重算（早前的版本每次选完都重量，见上面 catFit） */
    on($('cat'), 'change', catFit);
    on($('cat'), 'input', catFit);
    on(nodes.mNum, 'click', function () { setModeBound('num'); modeChanged(); });
    on(nodes.mTime, 'click', function () { setModeBound('time'); modeChanged(); });
    on(nodes.mClock, 'click', function () { setModeBound('clock'); modeChanged(); });
    mark('modeKeys');
    on(nodes.castToggle, 'click', function () { AskCore.setCastOpen(!AskCore.castOpen()); glassRescan(); });
    mark('detailToggle');
    /* 九数手改：源 L168–182 的 `onEdit` 语义（只有「时间取数」下才是"手改"） */
    const onEdit = function () {
      if ((window.__mode || 'clock') !== 'clock') return;
      window.__numManual = true;
      const f = $('castFields'); if (f) f.classList.remove('auto');
      AskCore.refreshClock();
    };
    on(nodes.n1, 'input', onEdit); on(nodes.n2, 'input', onEdit); on(nodes.n3, 'input', onEdit);
    mark('numsManual');
    /* 时辰：手改过就不再被时钟覆盖（源 L30–32） */
    on(nodes.h1, 'change', function () { window.__ziTouchH1 = true; });
    on(nodes.h2, 'change', function () { window.__ziTouchH2 = true; });
    mark('ziTouch');

    /* ★ A2：整条起卦链改由 React 发起（`CastCore.goCast()` = 18-script 那段 handler 的逐字切片，见
       ⚠ 四拍动画仍由 38-script 的 `wireCastFx()` 播：它挂在 **document 捕获阶段**、按 `closest('#btnGo')`
       命中 ⇒ 与「按钮由谁渲染」无关；它拦下第一次点击、2400ms 后补发一次 click 放行给应用（= 这里）。 */
    on($('btnGo'), 'click', function () { CastCore.goCast(); });
    mark('castChain');

    /* ★ A2②：提交四拍也改由 React 播（`CastFx.castSeq` = 38-script 那一块的逐字切片）。
       外壳已把 `window.__xlrCasting` **常置 1** ⇒ legacy 那份拦截器整体空转；这里是唯一在播的一份
       （自己的旗子叫 `__xlrFxBusy`，与 legacy 不同名 ⇒ 两边不会互相误判）。每播一次报给外壳自报。 */
    /*
       做法 = **不重写校验**：把 `window.show` 临时换成一个「一到就抛」的哨兵，然后调**同一条**
       `CastCore.goCast()` ——
         · 校验过了 ⇒ 它一定会走到渲染那一步（`show(c,B)`）⇒ 哨兵把渲染**连同紧随其后的那次滚动**一起掐掉 ⇒ 返回 true。
       ⇒ 判定与 goCast 的校验**同源**（同一份代码跑两遍）⇒ 不存在「两边条件写歪」的漂移；
         干跑本身零副作用（校验之前只有 `clearErr()`，渲染之前只有纯计算 —— 见 `castCore.js` L28–82）。
       ⚠ 用**抛异常**而不是「把 show 换空」：换空的话切片末尾那句 `#right.scrollIntoView()` 还会照跑
         （起卦前先跳一下视图）。 */
    const canCast = function () {
      const orig = window.show;
      const SENTINEL = { __xlrDryShow: 1 };
      let reachedRender = false;
      window.show = function () { reachedRender = true; throw SENTINEL; };
      try { CastCore.goCast(); } catch (eDry) { if (eDry !== SENTINEL) throw eDry; } finally { window.show = orig; }
      return reachedRender;
    };
    CastFx.installCastFx({
      onPlay: function () { const a = window.__xlrShell; if (a && a.fxPlay) a.fxPlay(); },
      canCast: canCast
    });
    mark('castFx');

    /* ★ （）：「空框置灰」这条链**从来没接过线** —— 实测两个产物：
         旧 APK  `#btnGo` disabled=true  / opacity .3 / filter saturate(.15)   （标记里就写着 disabled=""）
         新 APK  `#btnGo` disabled=false / opacity 1    / filter none
       机制：规则在（`.cbar .go[disabled]{opacity:.3;cursor:default;filter:saturate(.15);box-shadow:none}`
       两版都在），差别只是**那个属性没人加**：
         · 早期产物把它写在 HTML 标记里（`<button class="go" id="btnGo" … disabled="">`）；
         · 本仓 `data/castFx.js` 里那份 `syncGo()` 是逐字切片搬过来的，但**零调用点**
           （全仓 grep `syncGo` 只有定义与 export —— “代码正确 ≠ 代码被执行”）；
           而早期实现那条 `#q` 的 input 监听随  删段一起没了 ⇒ 输入时也不同步。
       ⇒ 这里把调用点补上：**初始一次 + `#q` 的 input**，判定复用 castFx 那份 `syncGo`（不另写第二套）。
       ⚠ 幂等：按节点打旗（React 若换掉 `#q` 节点，本 effect 重跑会重新绑）。 */
    const qEl = document.getElementById('q');
    if (qEl && !qEl.__xlrGoSynced) {
      qEl.__xlrGoSynced = 1;
      try { CastFx.syncGo(); } catch (eGS) { }
      qEl.addEventListener('input', function () { try { CastFx.syncGo(); } catch (eGI) { } });
      mark('goSync');
    }

    /* ★ B1-1：玻璃下拉接线 —— 挂载后扫一次（此刻文档里已经是 React 的 `#h2/#h1/#cat`）。
       */
    glassRescan();
    mark('glassSelect');

    /* ★ B1-2（2026-10-13）：自绘日期选择器也改由 React 这份接管
       口子同 B1-1：`#dt` **静态**带封条 `data-dp="1"` ⇒ legacy 的 `buildDatePicker` 见到就 return（它一字不改）；
       切片内那处入口闸改自用名 `data-dpx`（照抄会把自己盖的封条当成「已接线」⇒ 日期点不开）。
        ℹ 它**不需要补扫**：入口闸没有 `offsetWidth` 那一条 ⇒ 隐藏时也照样接线（与 `#h2` 不同）。
        ℹ 它**不需要改一次性闸**：那条「点外面关」是 capture `click`、每次调用都装，legacy 那份绑在旧节点上 ⇒ 空转。 */
    try { DatePicker.buildDatePicker(); mark('datePicker'); } catch (eDP) { }

    /* ★ B2-⑤（2026-10-14）：**重排**（`#castPanel`）也改由本仓这份接管
       它干的事 = **搬节点**：把 `#castFields` 的子节点（标签 / 三个数字框 / 时辰 / 摘要）整批搬进新建的
       `<div id="castPanel">`，再把 panel 插到 `.cbar` 里 `.cmain` 的**下一个位置**。
       幂等闸是**共用的 `#castPanel` id** ⇒ 谁先建谁赢、后来者跳过 ⇒ 零改名（同光晕/脚注那一族）。
       ⚠ **必须等 `.cbar` 出现**：`.cbar / .cmain / .cside / .gobar` **不是 React 渲染的** —— 它们是早期实现
       ⚠ 抢在早期实现前面的手法：早期实现的**看门狗**每 125ms 也调 `buildCastPanel`（实测落在 133/170/189ms）
         另加 16ms 轮询兜底。让早期实现先建 DOM 也一样（同一段代码），但那样**归属不干净**（判据 `owned` 看不到 `castPanel`）。
       ⚠ 切片末尾那句 `setCastOpen(castOpen())` 在本仓**走成空操作**（那两个函数是早期实现全局）——
         `#castToggle aria-expanded="false"`、`#castFields` 已带 `off`）与实测落定态**逐项一致**；
         它少做的两件（`window.__numManual = false` / `refreshClock()`）在本仓也已被中和（A1 起 `refreshClock` = no-op）。 */
    const wireCastPanel = () => {
      if (document.getElementById('castPanel')) return false;      /* 已建（我们或早期实现）⇒ 不重复 */
      if (!document.querySelector('.cbar .cmain') || !$('castFields')) return false;
      const before = !!document.getElementById('castPanel');
      try { CastPanel.buildCastPanel(); } catch (eCP) { }
      const made = !before && !!document.getElementById('castPanel');
      if (made) {
        mark('castPanel');
        const a = window.__xlrShell;
        if (a) {
          a.castPanel = {
            owner: 'react', built: true,
            /*
             */
            build: function () { CastPanel.buildCastPanel(); },
          };
          const st = a.s2ask; if (st) st.castPanelBuilt = true;
        }
      }
      return made || !!document.getElementById('castPanel');
    };
    /* 已在场（理论上不会：`.cbar` 还没建）⇒ 当场接；否则 MO 盯 `.left` + 16ms 轮询兜底 */
    let cpTimer = null, cpTries = 0, cpMO = null;
    if (!wireCastPanel()) {
      try {
        /* */
        cpMO = new MutationObserver(function () {
          if (wireCastPanel()) { if (cpTimer) clearInterval(cpTimer); if (cpMO) { cpMO.disconnect(); cpMO = null; } }
        });
        const left = document.querySelector('.left');
        if (left) cpMO.observe(left, { childList: true, subtree: true });
      } catch (eMO) { }
      cpTimer = setInterval(function () {      /* 兜底：MO 不可用 / `.cbar` 建在别处 */
        if (wireCastPanel() || ++cpTries > 300) { clearInterval(cpTimer); if (cpMO) { cpMO.disconnect(); cpMO = null; } }
      }, 16);
    }

    /* ★ B1-3（2026-10-13）：九数步进（−/+ 那对玻璃钮）也改由 React 这份接管
       口子同 B1-1/B1-2：三个数字框 **静态**带封条 `data-nstep="1"`（见下面 JSX）⇒ legacy 的 `buildNumStep`
       扫到就 `continue`（它一字不改）；切片内两处改自用名（`data-nsx` 幂等标记 / `window.__autoObsX` 一次性闸）。
       ⚠ **必须轮询等 `#castPanel` 出现**：切片开头就是 `if (!#castPanel) return;`。
         ★ B2-⑤（2026-10-14）起，`#castPanel` **由本组件上面那段（`wireCastPanel`）建** —— 它排在前面 ⇒
           正常情况下这一段第一次检查就能命中；下面的轮询只是兜底（万一 `.cbar` 迟到 / MO 不可用）。
         上限 100 次（≈5s）只是兜底，命中即 `clearInterval` ⇒ 不留常驻定时器。
       ⚠ 封条 + 自用标记 ⇒ **只有一个接线者（React）**：两边都建 wrap 会嵌套 ⇒ `.nwrap` 计数 6、
         点一下加号值跳 2（主流程判据 `03-点两次加号` 抓这个）。 */
    const wireNumStep = () => {
      if (!document.getElementById('castPanel')) return false;
      try { NumStep.buildNumStep(); mark('numStep'); } catch (eNS) { }
      return true;
    };
    /* 已在场（实测同拍常见）⇒ 当场接上；还没出现 ⇒ 50ms 一探，上限 100 次（≈5s）只是兜底。 */
    let tNumStep = null, nsTries = 0;
    if (!wireNumStep()) {
      tNumStep = setInterval(function () {
        if (wireNumStep() || ++nsTries > 100) clearInterval(tNumStep);
      }, 50);
    }

    /* ★ B2-①（2026-10-13）：**键盘流**改由 React 接（源 = `38-script` L277–301 `wireKeys()`）。
       为什么必须换手法（不能像 B1 那样"盖封条让 legacy 跳过"）：`wireKeys` **一道闸都没有**，
       它只是"在页面初始化那一刻，把监听绑到当时存在的节点上"。而今天那批节点就是 **React 的**
       **两边都会响应回车 ⇒ 按一下起两次卦**。
       ⇒ 做法：React 在 **window 捕获阶段**接这一击（比节点上的监听更早），处理完立刻
       `preventDefault + stopPropagation` ⇒ legacy 那份（绑在节点上）**永远收不到**。
       结果：「要么 React 管、要么 legacy 管」，**永远不会两个一起管**（同族先例：外壳里的
       设置页 / 皮肤面板 / 记录抽屉三个拦截器都是 window 捕获 + 吃掉事件）。
         （`#q → 补充背景 → #n1 → #n2 → #n3 → #h2 → #cat`，加减钮 `tabindex="-1"` 被跳过）⇒ 不在本接管范围；
         本接管只管**回车**：n1→n2→n3→提交，以及 `#q` 回车提交。
       ⚠ 三条守卫**逐字照抄源 L293–297**：输入法选词中（`isComposing` / `keyCode === 229`）绝不拦、
         `Shift+回车` 是换行（不提交）、其余回车 `preventDefault` 后提交。 */
    const keysHit = function (where) {
      try { const st = window.__xlrShell && window.__xlrShell.s2ask; if (st) { st.keysHits = (st.keysHits || 0) + 1; st.keysLast = where; } } catch (eK0) { }
    };
    const onEnterKey = function (e) {
      if (e.key !== 'Enter') return;
      /*
         「弹层开着时那几下键盘必须先被我吃掉，否则回车会顺到问卦框去提交」）。
           （select 的 `mousedown` 被 preventDefault）⇒ 弹层那几下键盘的 `target` 就是 `#q`
           ⇒ 光看"目标是不是 #q"**根本分辨不出**这两种回车 ⇒ 必须显式让路。
         ⚠ 让路 = 直接 return（不 preventDefault、不 stopPropagation）⇒ 事件照旧往 document 走，
           由 `glassSelect` 那条 document 捕获监听接手（它自己会 stopPropagation）。 */
      if (document.querySelector('.glsel')) return;
      const id = (e.target && e.target.id) || '';
      /* 源 L290：`chain('n1','n2'); chain('n2','n3'); chain('n3', null);`（最后一格 ⇒ 提交） */
      if (id === 'n1' || id === 'n2' || id === 'n3') {
        e.preventDefault(); e.stopPropagation();
        keysHit(id);
        const to = id === 'n1' ? 'n2' : (id === 'n2' ? 'n3' : '');
        if (to) { const n = $(to); if (n) n.focus(); }
        else { const g = $('btnGo'); if (g) g.click(); }
        return;
      }
      if (id === 'q') {
        if (e.isComposing || e.keyCode === 229) return;   /* 源 L296：选词那一下不拦 */
        if (e.shiftKey) return;                            /* 源 L297：Shift+回车 = 换行 */
        e.preventDefault(); e.stopPropagation();
        keysHit('q');
        const g = $('btnGo'); if (g) g.click();
      }
    };
    window.addEventListener('keydown', onEnterKey, true);
    mark('keys');

    /* ④ 每 2 秒刷时钟（源 L164：只在「时间取数」下刷）。⚠ 外壳已把 legacy 的同名 timer 中和成 no-op，
          保证 `#castMini`/九数**只有一个写者**。 */
    const t = setInterval(function () { if ((window.__mode || 'clock') === 'clock') AskCore.refreshClock(); }, 2000);
    mark('clock2s');
    return function () { clearInterval(t); if (tNumStep) clearInterval(tNumStep); window.removeEventListener('keydown', onEnterKey, true); };
  }, []);
}

export default function AskPanel() {
  useAskCore();
  return (
    <div className="pane">
      <div className="pane-h"><b>所问之事</b><span className="sp"></span><span id="modeHint">报数</span></div>
      <div className="pane-b">
        <div className="f">
          <label htmlFor="q">问题<b>必填</b></label>
          <textarea id="q" placeholder={Q_PH}></textarea>
        </div>
        <div className="f">
          <details className="bgf" id="bgDet">
            <summary>补充背景（选填，越具体越准）</summary>
            <textarea id="bg" placeholder={BG_PH}></textarea>
          </details>
        </div>
        {/* ⚠ `.spill`（分段控件的滑动白药丸）**由 React 渲染**，这是被加密壳臂实测逼出来的一条：
            旧增强层的 `wireSeg()`（38-script L527）有幂等守卫 `if (seg.querySelector('.spill')) return;`，
            而**它可能在本项目的挂载之前就已经跑过一遍**（加密壳走 `document.open/write`，`readyState` 已不是 loading
            ⇒ 由 React 建它，位置/宽度交外壳按 `placeSpill`（38-script L515–526）那 4 行几何摆（见 `src/shell/main.jsx`）。 */}
        <div className="f">
          <label>起卦方式</label>
          <div className="seg" role="group" aria-label="起卦方式">
            <button type="button" id="mClock" aria-pressed="true">时间取数</button>
            <button type="button" id="mTime" aria-pressed="false">月日时</button>
            <button type="button" id="mNum" aria-pressed="false">报数</button>
            <span className="spill" aria-hidden="true"></span>
          </div>
          <button className="castsw" id="castToggle" type="button" aria-expanded="false" aria-controls="castFields">详情</button>
        </div>
        <div className="f" id="castFields">
          <label id="castLb" htmlFor="n1">随口报三个数（1–9，可重复）· 起卦时辰</label>
          <div className="row" id="rowNum">
            {/* ★ B1-3：`data-nstep="1"` 是**给 legacy 看的封条**（`38-script` L129 扫到就 continue、一个字不改）。
                必须是**静态**属性：legacy 的看门狗从加载起每 125ms 扫一次 `#castPanel` 里的数字框，
                静态盖上才是零时序风险（动态盖会有一段"两边都建 wrap"的窗口 ⇒ 嵌套、点一下跳 2）。 */}
            <input type="number" id="n1" data-nstep="1" min="0" max="99" placeholder="第一数" inputMode="numeric" />
            <input type="number" id="n2" data-nstep="1" min="0" max="99" placeholder="第二数" inputMode="numeric" />
            <input type="number" id="n3" data-nstep="1" min="0" max="99" placeholder="第三数" inputMode="numeric" />
          </div>
          <div className="row" id="rowTime" hidden>
            <span className="dtw wide3">
              {/* ★ B1-2：`data-dp="1"` 是**给 legacy 看的封条**（`38-script` L579 见到就 return，它一个字不改）。 */}
              <input type="text" id="dt" data-dp="1" readOnly autoComplete="off" aria-label="日期（公历）" />
              <i className="dtico" aria-hidden="true"></i>
              <span className="dppop" id="dppop" hidden></span>
            </span>
          </div>
          <div className="row rowh">
            {/* ★ B1-1：`data-gsel="1"` 是**给 legacy 看的封条**（`38-script` L233 见到就 continue，它一个字不改）。
                ⚠ 必须是**静态**属性：legacy 的看门狗从加载起每 125ms 扫一次 select，静态盖上才是零时序风险。 */}
            <select id="h2" data-gsel="1" aria-label="起卦时辰">{ZHI_OPTS}</select>
            <select id="h1" data-gsel="1" aria-label="起卦时辰（用）" hidden>{ZHI_OPTS}</select>
          </div>
          <div className="mini" id="castMini"><b>报完不要改</b>；报了 0 当 10 取，报了两位数也不重报。记得选起卦时辰。</div>
        </div>
        <div className="f" id="fCat">
          <label htmlFor="cat">事类</label>
          <select id="cat" data-gsel="1" title="用于匹配专门判据">
            {CAT_OPTS.map(([v, t]) => <option value={v} key={v}>{t}</option>)}
          </select>
        </div>
        <label className="chk" htmlFor="optXiang"><input type="checkbox" id="optXiang" /><i className="ck" aria-hidden="true"></i>
          <span><b>三宫具象</b></span></label>
        <div className="gobar">
          <button className="go" id="btnGo" type="button" aria-label="起卦" title="起卦">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h13M12.4 6.2l5.8 5.8-5.8 5.8"></path>
            </svg>
          </button>
          <div className="err" id="err"></div>
        </div>
      </div>
    </div>
  );
}
