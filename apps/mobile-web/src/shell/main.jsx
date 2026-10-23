/* shell/main.jsx —— Phase 2 的 React 外壳（**只做启动 / 路由 / 加载状态**）
 *
 *   · 不碰旧界面的 DOM：不往 body 里加任何可见元素（React 根挂在**脱离文档**的容器上），
 *     不改 body/html 的属性，不设置样式，不注入 <style>。
 *   · 不碰旧界面的 CSS：本模块不 import 任何 css（构建配置里也不产出 css 产物）。
 *   · 不碰旧界面的动画：不调用 getAnimations / 不改 animation。
 *   · 不加载 Tailwind（Phase 2 桌面端样式唯一样源 = legacy.css）。
 *   · **不往 window 上挂判据名**：legacy 里 plainAll/clockNums/numsFilled 是零参实现，
 *     共享包只以**命名空间**形式暴露：window.__xlrShared（给 Phase 3 铺路，不产生同名冲突）。
 *
 * 职责（Phase 2 里它就该这么薄）：
 *   2 路由：跟踪 html[data-step]（旧界面的步进），对外给一个只读的步进 API
 *   3 加载状态：把「外壳就绪 / 界面就绪」报出来，供 Phase 3 与调试用
 */
/* ★★ 2026-10-17 产物身份（你逐字：「一个 exe 一个 apk 这么好区分，为什么还要用屏幕宽度区分？」）
   平台判定一律读这个常量，**不再用 innerWidth/matchMedia** —— 桌面窗口拉窄、模拟器 WebView
   没吃到 viewport meta（实测模拟器里 innerWidth=760，而本仓 viewport 写的是 390）都会让宽度判据
   把手机端错判成"宽屏"，于是开屏走了桌面那一套（自动退场 + 珠子飞向「壹」）。 */
import { createRoot } from 'react-dom/client';
import { createPortal, flushSync } from 'react-dom';
import { useEffect, useState } from 'react';
import Splash from '../components/Splash.jsx';
import SettingsScreen from '../components/SettingsScreen.jsx';
import SafeZone from '../components/SafeZone.jsx';
import SkinMenu from '../components/SkinMenu.jsx';
import Records from '../components/Records.jsx';
import RightPane from '../components/RightPane.jsx';
import AskPanel from '../components/AskPanel.jsx';
import { SkinsCore } from '../data/skinsCore.js';
import { applySkin } from '../data/skinApply.js';
import { ResultCore } from '../data/resultCore.js';
import { resetAskBox } from '../data/askBoxUi.js';   /* ★ 2026-10-23：每次起卦清「接着问」＋补小字 */
import { WalkCore } from '../data/walkCore.js';
import { RecordsStore } from '../data/recordsStore.js';
import { ReviewCore } from '../review/reviewCore.js';
import { Aura } from '../data/aura.js';
import { Footer } from '../data/footer.js';
import { Globals } from '../data/globals.js';
import { OpenOut } from '../data/openOut.js';
import { SetDot } from '../data/setDot.js';
import { SettingsCore } from '../data/settingsCore.js';
/* ★ D-⑤（砍段前置，2026-10-14 你放行第 1 条）：旧「设置对话框」两块列表的填充 ——
   `#presets`（10 个预设按钮）＋ `#modelMenu`（7 条模型）。旧层由 `24-script` 在**解析期**填；
   生成物（勿手改）：src/data/llmDialogCore.js ← tools/extract-llm-dialog.mjs（import 即执行，与旧层同款）。 */
import '../data/llmDialogCore.js';
/* ★ 引导配图（`window.XLR_GUIDE_IMG`）： 删段时 `34-script` 的 5 张 data-URI 跟着删了、
   import 即执行（旧层同款：解析期赋值）。 */
import '../data/guideImages.js';
import { Guide } from '../data/guideCore.js';
import { StepCore } from '../data/stepCore.js';
import { ShowCore } from '../data/showCore.js';
import { VariantC } from '../data/variantC.js';
import { SplashCore } from '../data/splashCore.js';
import { PhoneShims } from '../data/phoneShims.js';
import { PhoneAnim } from '../data/phoneAnim.js';
import { PhoneNav } from '../data/phoneNav.js';

const VERSION = '0.1.0-phase2';

/* ============ 「界面就绪」判据（D-③「乙」· 你 2026-10-14 定）============
 *   —— 那是判「**旧**界面就绪」。删段（D-⑤）之后那两个全局会消失 ⇒ 判据必须先换基准，
 *   否则删段当天它必红。
 *   ① 外壳在场（`window.__xlrShell`，本模块自己挂的）；
 *   ② 本仓各挂载块**已接管**（`api.<k>.owner === 'react'`）；
 *   ③ 四个**骨架节点**在场（静态骨架，源 `11-text`；骨架搬本仓属 D-⑤ ⇒ 本阶段照旧）。
 *   （`legacyGlobals`，D-⑤ 删段后应双双变 `'undefined'`，可据此见证「删段确实发生」）。
 * ⚠ 字段名 `legacyState` / `api.legacy()` 与判据里那个 `legacyReady` 读数**沿用不改**：
 *   `tools/结构检查.mjs` 读的就是它（改名会白白打断既有判据；「判据只加不减」）。 */
const READY_MOUNTS = ['skins', 'aura', 'footer', 'globals', 'openOut', 'guide', 'stepper'];
const SKELETON_NODES = ['#top', '#q', '#btnGo', '#right'];

function readyNow() {
  const missMounts = READY_MOUNTS.filter(k => !(api[k] && api[k].owner === 'react')).map(k => 'api.' + k);
  const missShell = (typeof window.__xlrShell === 'object') ? [] : ['window.__xlrShell'];
  const missNodes = SKELETON_NODES.filter(s => !document.querySelector(s));
  const missing = missShell.concat(missMounts, missNodes);
  return {
    ready: missing.length === 0,
    basis: 'self',
    missing,
    /* 信息项（不进判据）：旧层那两个全局还在不在 */
    legacyGlobals: { buildBlocks: typeof window.buildBlocks, renderGua: typeof window.renderGua },
  };
}

function Shell({ onState }) {
  const [step, setStep] = useState(() => document.documentElement.getAttribute('data-step') || '');
  const [legacy, setLegacy] = useState({ ready: false, basis: 'self', missing: READY_MOUNTS.map(k => 'api.' + k).concat(SKELETON_NODES) });

  useEffect(() => {
    /* 路由：只**读**旧界面的步进（html[data-step]），不改它 */
    const readStep = () => setStep(document.documentElement.getAttribute('data-step') || '');
    const mo = new MutationObserver(readStep);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-step'] });
    readStep();
    /* 加载状态：本仓各挂载块在**模块顶层**跑（通常早于 DOMContentLoaded）⇒ 仍给一个短轮询兜底 */
    let tries = 0;
    const t = setInterval(() => {
      const r = readyNow();
      setLegacy(r);
      if (r.ready || ++tries > 40) clearInterval(t);
    }, 50);
    const onLoad = () => setLegacy(readyNow());
    window.addEventListener('load', onLoad);
    setLegacy(readyNow());
    return () => { mo.disconnect(); clearInterval(t); window.removeEventListener('load', onLoad); };
  }, []);

  useEffect(() => { if (onState) onState({ step, legacy, version: VERSION }); }, [step, legacy, onState]);

  /* 渲染**脱离文档**的树：容器永远不 appendChild 到 document，所以 body.children 不变、无任何布局影响 */
  return null;
}

/* 容器故意不挂进文档 */
const host = document.createElement('div');
host.setAttribute('data-xlroot', '1');
const root = createRoot(host);

const api = {
  version: VERSION,
  getStep: () => document.documentElement.getAttribute('data-step') || '',
  legacy: () => readyNow(),
  _host: host
};
Object.defineProperty(window, '__xlrShell', { value: api, writable: false, configurable: true });

/* 「已接管项」登记表（ 批 A）：**定义在 api 上**，各挂载块按自己的顺序调用都能登记到。
   ⚠ 原先它定义在 S2/ASK 块里 ⇒ 更早跑的 S2/MAIN 块调不到（A3① 的 `bindResult` 就在那块里）。
   同一个数组被 `api.s2ask.owned` 引用 ⇒ 判据（`_probe-mainflow-interactions` 读 `sh.s2ask.owned`）不变。
   登记由**真正接线的那一处**现场做（组件 effect / 外壳的中和动作）⇒ 读到的是证据，不是声明。 */
api.owned = [];
api.markOwned = function (k) { if (k && api.owned.indexOf(k) < 0) api.owned.push(k); };

/* ===== （历史）bisect 臂：`VITE_BISECT=noreact` =====
 *   也不渲染 React 的**空白页** ⇒ 这个臂再无诊断价值；开关本身与它在各挂载块里的分支一并删除。
 *   （旧读数与用法留档：docs/s2-log.md · docs/known-differences.md 。） */
root.render(<Shell onState={(s) => { api.step = s.step; api.legacyState = s.legacy; }} />);

/* ============  批 B2-③：背景光晕（`#xlrAura`）改由本仓这套建 ============
 * 源：`38-script` L72–80 `buildAura()`（逐字切片在 `src/data/aura.js`，`tools/extract-aura.mjs` 生成）。
 * 幂等闸 = **共用的 `#xlrAura` id**（谁先建谁赢、后来者看到就跳过）⇒ 它对 legacy 与我们是同一道闸，
 *   所以**不需要改名**（与 B1 那几件的"闸名归 legacy 独用"是两码事）。
 * ⚠ **尽量早调**：legacy 只在看门狗里建（实测它那一份出现在 213–236ms），我们在模块顶层先建 ⇒ 通常是我们建的；
 *   谁建的 DOM 都一样（逐字切片），差别只在下面这个**只读的上报字段**里（`built`）。
 *   这条是确定性的（同步任务里看门狗插不进来）。
 */
function mountAura() {
  const before = document.getElementById('xlrAura');
  try { Aura.buildAura(); } catch (eAR) { api.aura = { owner: 'react', built: false, error: String((eAR && eAR.message) || eAR) }; return; }
  const now = document.getElementById('xlrAura');
  const built = !before && !!now;   /* 真由我们建出来的才登记（登记点就在真正动手的那一行旁边） */
  api.aura = {
    owner: 'react', built: built, nodeId: now ? now.id : null,
    /** 供判据做「删掉重建」实验：调它 = 再跑一遍源里那份 buildAura（幂等） */
    build: function () { Aura.buildAura(); },
  };
  if (built) api.markOwned('aura');
}
mountAura();

/* ============  批 B2-④：脚注（`.mfoot`）改由本仓这套建 ============
 * 源：`38-script` L35–56 `buildFooter()`（逐字切片在 `src/data/footer.js`，`tools/extract-footer.mjs` 生成）。
 * 幂等闸 = **共用节点判定**（`if (!wrap || document.querySelector('.mfoot')) return;`）——
 *   它对 legacy 与我们是同一道闸 ⇒ **不需要改名**（与 B1 那几件的"闸名归 legacy 独用"是两码事）。
 *   **载入期 `ready()` 回调**（`38-script` L1984，产物 html 内联栈：`at buildFooter ← at <html>:10989`），
 *   而那一刻 `window.__xlrShell` **已经定义**（新仓两臂 true）⇒ 本模块顶层先建，旧层那次必然看到 `.mfoot` 已在、直接 return。
 *   （看门狗那次调用（L2085）被它自己的 `!document.querySelector('.vstep')` 挡着，实测没轮到。）
 * ⚠ 只读实测（`tools/_diag-footer.mjs`，三臂逐项一致）：`.left` 里**只有一块** `.pane`（所问之事）
 *   ⇒ 源里「把**最后一个** `.left > .pane` 搬进脚注」那段至今是**死代码**（`.mfoot` 里只有 `.mf-bar`）；
 *   我们照旧逐字切片（将来那块 pane 真回来了，行为与旧版一致）。
 *   这条是确定性的（同步任务里看门狗/定时器插不进来）。实测**旧版摘掉后它不会自己回来**（三臂一致）⇒ 对照干净。
 */
function mountFooter() {
  const before = document.querySelector('.mfoot');
  try { Footer.buildFooter(); } catch (eFT) { api.footer = { owner: 'react', built: false, error: String((eFT && eFT.message) || eFT) }; return; }
  const now = document.querySelector('.mfoot');
  const built = !before && !!now;   /* 真由我们建出来的才登记（登记点就在真正动手的那一行旁边） */
  api.footer = {
    owner: 'react', built: built, cls: now ? now.className : null,
    /** 供判据做「删掉重建」实验：调它 = 再跑一遍源里那份 buildFooter（幂等） */
    build: function () { Footer.buildFooter(); },
  };
  if (built) api.markOwned('footer');
}
mountFooter();

/* ============  批 C-①：I 段的三个全局小函数改由本仓这套装 ============
 * 源与接管手法见 `src/data/globals.js` 头注（`tools/extract-globals.mjs` 生成，**提取不重写**）：
 *   ① 顶栏吸顶 `markTop`（`18-script` L11–14，**零声明差异**）：先按名摘掉旧层那条 scroll 监听，再装我们这份
 *      —— 旧层那份绑的是 18-script 的**全局函数**，所以「按名摘」是确定性的；摘完只剩我们这一条。
 *   ② 浮条 `toast`（`18-script` L356–368）：**不另切一份**（`resultCore.js` 里那份就是同源正文），
 *      只把 `window.toast` 指过去 ⇒ legacy 的调用者（如设置页 `say()`）自动走我们的实现。
 *   ③ 白天/黑夜按钮 `#btnDN`（`38-script` L546–566，**零声明差异**）：旧层那份监听是 IIFE 内的函数、
 *      按名摘不掉 ⇒ 接管手法 = **document 捕获阶段拦 `#btnDN`**（`stopPropagation` ⇒ 按钮自己那条监听
 *      永远收不到），由我们调切片里那个 `toggleDayNight`；再盖上旧层看的封条 `data-dnwired`
 *      （旧层看门狗每 125ms 会再调它自己的 `wireDayNight`；不盖就会再挂几条监听）。
 */
function mountGlobals() {
  const legacyMark = typeof window.markTop === 'function';
  const dn0 = document.getElementById('btnDN');
  let ran = false;
  try { ran = Globals.mount(); } catch (eG) {
    api.globals = { owner: 'react', ran: false, error: String((eG && eG.message) || eG) }; return;
  }
  const dn1 = document.getElementById('btnDN');
  api.globals = {
    owner: 'react', ran: !!ran,
    legacyMarkTop: legacyMark,                 /* 旧层那个全局函数在不在（摘监听用的就是它） */
    dnSealedBefore: dn0 ? dn0.getAttribute('data-dnwired') : null,
    dnSealNow: dn1 ? dn1.getAttribute('data-dnwired') : null,
    hits: Globals.hits,                        /* 我们拦到几次 #btnDN（判据据此证明是我们处理的） */
    toastIsOurs: window.toast === Globals.toast,
    /** 供判据做归属实验：摘掉 / 装回我们那条 scroll 监听（见 `globals.js` 头注） */
    detachTop: Globals.detachTop, attachTop: Globals.attachTop,
    /** 供判据调我们这份浮条（同一份实现） */
    toast: Globals.toast,
  };
  api.markOwned('globals');
}
mountGlobals();

/* ============ D-④ 收口：设置小红点那三件 ＋ 依赖两件收归本仓（2026-10-14 · 会话「重启23」）============
 * 源：`24-script.txt` L15 / L16–21 / L30–35（`DEF` / `loadSet` / `updateSetDot`）·
 *     `26-script.txt` L68–72 / L192–198（`needsKey` / `refreshLLMWho`）
 * 为什么必须收：`showCore.js` 那条 `show()` 链**每起一卦**都调 `updateSetDot()`，而它转发的是
 *   `window.updateSetDot` —— 那个只在旧层里 ⇒ **旧层一不在（D-⑤ 砍段之后）整条起卦链就抛**
 *   `Cannot read properties of undefined (reading 'apply')`
 *   （实测：把产物里 14 个旧内联脚本全摘掉再走一遍起卦流程即复现）。
 * 做法：`SetDot.mount()` 把 `window.loadSet / refreshLLMWho / updateSetDot` 指到本仓这份 ——
 *   切片内部的自由变量（`loadSet` / `needsKey` / `refreshLLMWho`）解析到**模块作用域**，与旧层在不在无关。
 */
function mountSetDot() {
  let did = [];
  try { did = SetDot.mount(); } catch (eSD) { api.setDot = { owner: 'react', error: String((eSD && eSD.message) || eSD) }; return; }
  api.setDot = {
    owner: 'react', mounted: did,
    globalsOurs: window.updateSetDot === SetDot.updateSetDot
      && window.loadSet === SetDot.loadSet && window.refreshLLMWho === SetDot.refreshLLMWho,
  };
  if (api.setDot.globalsOurs) api.markOwned('setDot');
}
mountSetDot();

/* ============  批 D-②：皮肤三件 ＋ 首屏主题改由本仓这套跑 ============
 *   （否则先按默认皮肤画一遍再切 ⇒ 看得见的闪一下）；本仓 React 产物全是 defer 模块、赶不上第一帧
 *   ⇒ 「定首屏皮肤」那一句由 `src/data/skinPrepaint.js`（**经典脚本**，`32-script` 逐字切片）
 *     承担，由产出链 `tools/make-doc-entry.mjs` **内联进文档**（解析期执行，与今天同一时机）。
 *     ⚠ 首屏那一刻的只读登记 `window.__xlrPrepaint` 由判据用来证「它确实在解析期跑过」。
 * 本块负责另一半：把源码尾部挂在 window 上的三件**指向本仓实现** ——
 *   `XLR_SKINS` / `XLR_SKIN_APPLY` / `XLR_SKIN_CUR`（旧层在解析期由 legacy `32-script` 挂出；
 *   我们在**模块期**再挂一次 ⇒ 模块期晚于解析期 ⇒ 本仓赢；两份实现同源（逐字切片），行为一致）。
 *   ⇒ `src/data/skinApply.js` 那条过渡桥因此**变成死路**（它只在两者不同源时才调 legacy 那份）。
 *   ⇒ `SkinsCore` 与 `prepaint` 的 cur 状态同源同值，不会分叉。
 * ⚠ 本块**不碰 CSS**：`html[data-skin]` / `html[data-theme]` 那套仍由 legacy.css 提供。 */
function mountSkins() {
  const legacyApply = window.XLR_SKIN_APPLY;      /* 解析期旧层挂的那个（我们覆盖掉的就是它） */
  let assigned = false;
  try {
    window.XLR_SKINS = SkinsCore.SKINS;
    window.XLR_SKIN_APPLY = SkinsCore.apply;
    window.XLR_SKIN_CUR = SkinsCore.cur;
    assigned = true;
  } catch (eSK) {
    api.skins = { owner: 'react', assigned: false, error: String((eSK && eSK.message) || eSK) }; return;
  }
  api.skins = {
    owner: 'react', assigned: assigned,
    legacyApplyWasFn: typeof legacyApply === 'function',   /* 旧层确实挂过一个（取证：证「覆盖」不是白覆） */
    globalsOurs: window.XLR_SKIN_APPLY === SkinsCore.apply
      && window.XLR_SKINS === SkinsCore.SKINS
      && window.XLR_SKIN_CUR === SkinsCore.cur,
    prepaint: window.__xlrPrepaint || null,               /* 首屏预绘的只读登记（解析期写的） */
    skinNow: document.documentElement.getAttribute('data-skin'),
    themeNow: document.documentElement.getAttribute('data-theme'),
    skinStored: (function () { try { return localStorage.getItem('xlr-skin'); } catch (eL) { return null; } })(),
  };
  /* D-② 预绘脚本自带的**守护**（MutationObserver，用来纠正 legacy 在解析期的覆盖）：
     （它自己也会在 DCL 断一次 —— 双保险。） */
  try {
    if (window.__xlrPrepaintGuard) { window.__xlrPrepaintGuard.disconnect(); api.skins.guardOff = true; }
  } catch (ePG) { }
  api.markOwned('skins');
}
mountSkins();

/* ============  批 C-①b：外链统一出口 `openOut` 改由本仓这份跑 ============
 * 源与接管手法见 `src/data/openOut.js` 头注（`tools/extract-open-out.mjs` 生成，**提取不重写**）：
 *   ① 统一出口 `openOut(url)`（`18-script` L227–235，**零声明差异**）：桌面走 Tauri 的 `open_url`、
 *      安卓走 `location.href`、网页照常 `window.open`。
 *   ② 紧随其后那条**页级捕获委托**的回调正文（L237–246，**声明差异 1 处**）：旧层那条挂在
 *      **document 捕获**、是**匿名监听**（按名摘不掉）⇒ 我们把它的回调正文照抄过来挂到
 *      **window 捕获**（早于 document）并在拦下时 `e.stopPropagation()` ⇒ 旧层那条永远收不到
 *      （本块已把它指到我们这份）**再开一次** —— 那正是本件判据要抓的（Tauri 桩里 invoke 必须恰好 1 次）。
 *   ⚠ 实测（只读核对）：页面上仅有的 http 外链在设置页（`SettingsScreen.jsx` 那两处 `<a target="_blank">`，
 *     无 onClick）⇒ 拦下并 preventDefault 与旧层委托的老行为一致，不打断任何 React 处理器。
 */
function mountOpenOut() {
  const legacyFn = typeof window.openOut === 'function';   /* 旧层那个全局函数（18-script 是普通脚本 ⇒ 载入期就有了） */
  let ran = false;
  try { ran = OpenOut.mount(); } catch (eOO) {
    api.openOut = { owner: 'react', ran: false, error: String((eOO && eOO.message) || eOO) }; return;
  }
  api.openOut = {
    owner: 'react', ran: !!ran,
    legacyFn: legacyFn,                                  /* 我们覆盖掉的就是它（同一个实现：逐字切片） */
    isOurs: window.openOut === OpenOut.openOut,           /* 全局已指到本仓这份 ⇒ 旧层任何直接调用者也走我们 */
    seen: OpenOut.seen, handled: OpenOut.handled,         /* 判据读它证「这一次是我们处理的」（挂 s2ask，不进三臂比对） */
  };
  api.markOwned('openOut');
}
mountOpenOut();

/* ============  批 C-②：开屏引导分步（`#onbLayer`）改由本仓这套跑 ============
 * 源与接管手法见 `src/data/guideCore.js` 头注（`tools/extract-guide.mjs` 生成，**提取不重写**）：
 *   ① `buildWelcome()`（`36-script` L267–357，**声明差异 1 处**：`show()` 幂等早退）：建 `#onbLayer`
 *      ＋ 接线（下一步 / 上一步 / 跳过 / 点层外跳过）＋ `goConfig()`，并导出 `window.__xlrGuideShow`；
 *   ② `guideImg()` 配图（`window.XLR_GUIDE_IMG`）· ③ `GUIDE_STEPS` 8 步文案 · ④ `maybeWelcome()` 首屏自动弹。
 *   ⚠ **自由变量绑定**：`load` / `missing` ⇒ `SettingsCore` 里那两份**同源**实现；`open` ⇒ 本块注入的
 *     「打开设置页」（`openSettings()` ＋ `flushSync` **同步**提交 —— 源里 `open()` 之后紧接着就要取
 *      `#s-llm` / `#stProvs` / `#stKey`，不同步提交那几行会全落空）。
 *   ⚠ **位置**：旧层是在 DCL 的 `init()` 里把它 append 在 **`#setScreen` 之后**；我们比它早建（模块顶层，
 *     共用 id 闸因此把旧层那份挡掉）⇒ 落点在 body 末尾 ⇒ **必须在 DCL 调 `placeGuide()` 归位**，
 *     只读实测（`tools/_diag-guide-config.mjs`）旧路径开的是**旧层那份**设置页（`#setScreen` 节点没换、
 *     `s2settings.mountedAt=null`）；本仓的设置页与它逐条同形，落点照旧由下面那条 `#gNext` 纠正兜着。
 *   ⚠ **自动弹在开屏在场时是死路**（`maybeWelcome` 第一条就早退；实测两臂都不弹）⇒ 真实入口 = `window.__xlrGuideShow`
 *     （设置页那颗「重新看配置引导」）。我们仍按旧层同一时刻（DCL + 260ms）调一次 ⇒ 行为归我们。
 */
/** 归位：把引导层挪到 `#setScreen` 的下一位 —— **与旧层同一个位置**（见上面 ⚠） */
function placeGuide() {
  const L = document.getElementById('onbLayer');
  const S = document.getElementById('setScreen');
  if (!L || !S) return false;
  if (S.nextSibling === L) return true;
  const kids = document.body.children;
  const idx = Array.prototype.indexOf.call(kids, S) + 1;
  try { document.body.insertBefore(L, kids[idx] || null); } catch (eP) { return false; }
  return true;
}
function mountGuide() {
  const before = document.getElementById('onbLayer');
  let ran = false;
  try {
    ran = Guide.mount({
      /* 「打开设置页」＝本仓设置页的打开方式（与点 #btnSet 走的是同一条）；
         flushSync 让它**同步**提交，源里 open() 之后那几行才取得到节点 */
      open: function () { try { flushSync(function () { openSettings(); }); } catch (eF) { openSettings(); } },
    });
  } catch (eG) {
    api.guide = { owner: 'react', ran: false, error: String((eG && eG.message) || eG) }; return;
  }
  const now = document.getElementById('onbLayer');
  const built = !before && !!now;   /* 真由我们建出来的才登记（登记点就在真正动手的那一行旁边） */
  api.guide = {
    owner: 'react', ran: !!ran, built: built,
    legacyHadLayer: !!before,               /* 我们建之前它就已经在了？（正常应为 false —— 共用 id 闸把旧层那份挡掉） */
    layerCount: document.querySelectorAll('#onbLayer').length,
    placed: null,                           /* DCL 归位的结果（下面 readyGuide 里写） */
    moved: null,                            /* 归位那次是不是真的挪了（信息项） */
    /** 供判据做「删掉 → 重建」归属实验：同一个同步任务里删掉 #onbLayer 再调它 ⇒ 必须当场重建、逐字节同形 */
    build: Guide.build,
    /** 归位（重建实验之后要再归位一次，否则层会停在 body 末尾、与旧产物的结构位置不同） */
    place: placeGuide,
    /** 设置页那颗「重看引导」走的同一条入口 */
    show: Guide.show,
  };
  if (built) api.markOwned('guide');
  /* 归位 ＋ 自动弹的调度：**必须等 DCL**（旧层是在 DCL 的 init() 里才建 #setScreen、顺带定位置）。
     ⚠ 实测踩过：`<script type="module">` 是在 `readyState === 'interactive'`（解析完、DCL 还没发）时执行的
     当场报 -1 抓到的）。所以判据是「不是 complete ⇒ 等 DCL」。 */
  const readyGuide = () => {
    const L0 = document.getElementById('onbLayer');
    try { api.guide.placed = placeGuide(); } catch (e1) { api.guide.placed = false; }
    api.guide.moved = !!(L0 && L0.previousSibling && L0.previousSibling.id === 'setScreen');
    try { setTimeout(Guide.maybeWelcome, 260); } catch (e2) { }
  };
  if (document.readyState === 'complete') readyGuide();
  else document.addEventListener('DOMContentLoaded', readyGuide);
}
mountGuide();

/* ============  批 C-⑤：步进条一族（`.vstep` ＋ `html[data-step]`）改由本仓这套跑 ============
 * 源与接管手法见 `src/data/stepCore.js` 头注（`tools/extract-step.mjs` 生成，**提取不重写**、正文零声明差异）：
 *   ① 状态（`STEPS`/`revealMax`）· ② 判据（`currentStep`/`hasCtx`）· ③ 骨架 `buildStepper()`（含药丸几何）
 *   ④a `placePill` · ④b IIFE 顶层 `resize` 监听 · ④c `placeSpill`（分段控件那颗药丸）
 *   ⑤ `syncStep`/`pillSplit`/`pillBusy`/`revealBtn`/`animateIn`/`narrowPhone` · ⑥ `VISITED`/`goStep`/`setStep`
 * —— 四件事 ——
 *   ① **幂等闸 = 共用节点判定**（源里 buildStepper 首两行 `if (!wrap || document.querySelector('.vstep')) return;`）
 *      ⇒ 我们在**模块顶层**先建，旧层 `ready()`（L1989）与看门狗（L2084）那两次 `buildStepper()` 自己早退
 *      （与 `#xlrAura` / `.mfoot` / `#onbLayer` 同族，**不需要改名**）。
 *   ② ⚠ **本件最大的时序坑**：旧层 `ready()`（L2007–2013，**DCL**）会把 `window.__xlrSetStep` 指向**它自己那份**，
 *      而它在 DCL 执行、晚于本模块顶层 ⇒ 必须在 **load 之后**重指回本仓这份，否则 `walkCore`（load 期）与
 *      `GuaCard` 永远打到旧层那份 —— 「本仓接管」**名存实亡**，而判据只看行为时会**误判通过**。
 *   ③ 旧层 `ready()` 里 `buildStepper(); setStep('q')` 那击：前者被闸挡住，后者**挡不住**（同一 try 行切不开）
 *      ⇒ 依赖源里既有语义（同一步只做状态同步、不重播入场）；判据必须实测「两次调用之后 `.vstep` 子树逐属性一致」。
 *   ④ 药丸几何兜底：源里 `buildStepper` 内部有 rAF/load 各一次重摆；我们更早建 ⇒ 自己补上（同一份 `placePill`）。
 */
function mountStepper() {
  const before = document.querySelector('.vstep');
  let ran = false;
  try { ran = StepCore.mount(); } catch (eST) {
    api.stepper = { owner: 'react', ran: false, error: String((eST && eST.message) || eST) }; return;
  }
  const now = document.querySelector('.vstep');
  const built = !before && !!now;   /* 真由我们建出来的才登记（登记点就在真正动手的那一行旁边） */
  api.stepper = {
    owner: 'react', ran: !!ran, built: built,
    legacyHadBar: !!before,                                  /* 我们建之前它就已经在了？（正常应为 false） */
    barCount: document.querySelectorAll('.vstep').length,
    /** 供判据做「删掉 → 重建」归属实验：同一个同步任务里调它 ⇒ 必须当场重建、逐节点同形 */
    build: StepCore.build,
    /** 供判据换步 / 做「同一步第二次调用无害」实验 */
    setStep: StepCore.setStep, goStep: StepCore.goStep, placePill: StepCore.placePill,
    steps: StepCore.STEPS, state: StepCore.state,
    tookOverAt: null,        /* load 之后重指 `window.__xlrSetStep` 的时刻（下面写） */
    legacyHooked: null,      /* 重指之前，那个口子是不是被旧层 ready() 拿走了 */
    isOurs: null,            /* 重指之后 `window.__xlrSetStep === StepCore.setStep` */
  };
  if (built) api.markOwned('stepper');
  /* ★ 见上面 ②：必须晚于旧层 ready() 的赋值 ⇒ 挂在 load 上 */
  const tookOver = () => {
    api.stepper.legacyHooked = (typeof window.__xlrSetStep === 'function') && window.__xlrSetStep !== StepCore.setStep;
    try { window.__xlrSetStep = StepCore.setStep; } catch (eS2) { }
    api.stepper.tookOverAt = Date.now();
    api.stepper.isOurs = window.__xlrSetStep === StepCore.setStep;
    try { StepCore.placePill(false); } catch (eP2) { }   /* 见上面 ④ */
  };
  if (document.readyState === 'complete') tookOver();
  else window.addEventListener('load', tookOver);
  /* 见上面 ④：更早建 ⇒ 自己补一次 rAF 重摆（源里那几次在旧层 buildStepper 内，本臂它不会跑了） */
  try { requestAnimationFrame(function () { StepCore.placePill(false); }); } catch (ePL) { }
}
mountStepper();

/* ============ S1a：开屏组件挂载（React 从「外壳」变成"开屏"这个组件的主导）============
 *   而是「**接管本仓自建的开屏**」：`#xlrSplash` 由下面 `selfBuildSplash()` 在本仓建（D-⑤），
 * 触发（原设计）：等 legacy 把开屏建好（`buildSplash()`，38-script.txt:2416；它可能在 DOMContentLoaded 时才跑，
 *        而本模块早于 DCL 执行 ⇒ 必须**轮询等待**，不能直接取）。
 * 三件事：
 *   ① 把 legacy 那层的 id 让出来（`xlrSplash` → `xlrSplashLegacy`）并 `display:none`
 *      —— 这样 CSS `#xlrSplash{…}` 只作用到**我们的**节点（像素一致的前提）
 *   ② 自己挂 host 到 body（`display:contents` 不引入额外盒）并 render `<Splash/>`
 *      —— 这是 Phase 3「主导」的第一步：body.children 会比 Phase 2 多 1
 *   ③ **让 legacy 的退场逻辑继续有效**：`out()` / `killSplash()` 都是 `getElementById('xlrSplash')`
 *      ⇒ id 让出后它们会作用到**我们的**节点 ⇒ `.out` 动画、珠子飞走、1050ms 后移除节点全都照旧
 *      （⚠ 临时桥：legacy 会对 React 的节点做 DOM 手术；「组件自己接管退场」留给 S1b）
 */
function mountSplash() {
  /* ★ D-⑤（砍段前置）：退场动作的**兜底** —— 旧层缺位时把 `window.__xlrSplashOut` / `__xlrSplashKill`
     指到本仓那份逐字切片（`src/data/splashCore.js` 的 `out` / `kill`）。
     ⚠ **不覆盖旧层已有的**（组装期  注入在解析期就写好了 `window.__xlrSplashOut`）⇒ 旧臂一字不变。 */
  if (typeof window.__xlrSplashOut !== 'function') { try { window.__xlrSplashOut = SplashCore.out; } catch (eSO) { } }
  if (typeof window.__xlrSplashKill !== 'function') { try { window.__xlrSplashKill = SplashCore.kill; } catch (eSK) { } }
  /* ★★★ 2026-10-15（重启32 · 你点名「你照抄代码不行吗」）——**不再让 React 顶替切片建的开屏**。
     原做法（S1a/S1b 时期）：切片 `buildSplash()` 先建 `#xlrSplash`，紧接着下面那条 50ms 轮询把它
     `remove()` 掉、再 `createRoot(...).render(<Splash/>)` ⇒ 可见的那棵树归 React。
     代价（实测）：退场动作 `out()` 是**切片**里的，它手里的 `goBtn` 是**已被移除的游离节点**
     ⇒ `classList.add('ink','fly')` ＋ 盒位移 ＋ WAAPI 全打在看不见的节点上
     现做法：**开屏整棵就由切片那份逐字旧代码建、也由它自己的监听器退场**（切片里本来就有
     `goBtn.addEventListener('click', …)` 那条线）⇒ 行为与旧产物**同源同一份代码**，不再有混血错配。
     ⚠ 代价：React 不再持有开屏子树（S1b 的「React 完全接管」在这件上回退一格）；`api.splash.owner`
       相应改成 `'slice'`，判据若读它需要跟着改（已在此登记）。 */
  let tries = 0;
  const timer = setInterval(() => {
    const legacyNode = document.getElementById('xlrSplash');
    if (!legacyNode) {
      if (++tries > 100) { clearInterval(timer); api.splash = { owner: 'slice', reason: '没等到开屏（reduced-motion？）' }; }
      return;
    }
    clearInterval(timer);
    api.splash = {
      owner: 'slice',                       /* ★ 不再 takeover：整棵由切片那段逐字旧代码持有 */
      mountedAt: Date.now(),
      takeover: false,
      nodeChars: (legacyNode.outerHTML || '').length,
      /** 供判据用：此刻谁提供 `#xlrSplash` */
      activeNode: () => document.getElementById('xlrSplash'),
      /** 退场动作仍是切片那份（`out()` 用 getElementById ⇒ 作用到活节点） */
      outType: typeof window.__xlrSplashOut,
    };
  }, 50);

  /* ============ ★ D-⑤：旧层不在时**自己把开屏立起来** ============
   * 为什么：产物里那 14 个旧内联脚本一被咬断，`#xlrSplash` 就**根本不存在** ⇒ 上面那条轮询等不到 ⇒
   *   没有开屏 ⇒ 本仓引导层 `Guide.maybeWelcome()`（源 `36-script` L436，守卫逐字是
   *   `if (window.__xlrSplashOn || document.getElementById('xlrSplash')) return;`）条件成立 ⇒
   *   弹整屏遮罩 `#onbLayer`（实测 rect 0,0,1280,900）⇒ 吃掉所有点击
   *   （实测：真点 `#btnGo` 超时、`data-step` 停在 `q`，而 pageerror 仍是 0 —— 零报错不等于能用）。
   * 做法：调本仓那份**逐字切片**的 `buildSplash()`（`src/data/splashCore.js`，`tools/extract-splash.mjs`
   *   生成：482 行 / 28,895 字符 / 唯一 1 处声明差异）。
   * ⚠ **时机**：挂在 `DOMContentLoaded` 上 —— 与旧层那次调用**同刻**（旧层是 `38-script` L1980 的
   *   `ready(function () { … buildSplash() … })`），而 `maybeWelcome` 在 DCL + 260ms ⇒ 必须赶在它前面。
   * ⚠ **只在旧层那张节点不存在时**才建 ⇒ 旧臂一个字不变（旧层已建 ⇒ 这一支直接 return，
   *   接管照旧走上面那条 50ms 轮询 —— 时机与今天逐毫秒相同）。
   * ⚠ 建完**不由这里接管**：接管仍归上面那条轮询（同一套 `legacyNode.remove()` + 渲染 `<Splash/>`）。 */
  const selfBuildSplash = () => {
    if (document.getElementById('xlrSplash')) return;      /* 旧层已建 ⇒ 交给轮询那条老路 */
    let err = null;
    try { SplashCore.buildSplash(); } catch (eSB) { err = String((eSB && eSB.message) || eSB); }
    api.splashSelf = {
      called: true, error: err,
      built: !!document.getElementById('xlrSplash'),
      on: window.__xlrSplashOn === true,
      out: typeof window.__xlrSplashOut, kill: typeof window.__xlrSplashKill,
    };
  };
  if (document.readyState === 'complete') selfBuildSplash();
  else document.addEventListener('DOMContentLoaded', selfBuildSplash);
}
mountSplash();

/* ============ S2/C2：设置页接管（**本步起真挂载 React 设置页**）============
 * 拦的机制（为什么拦得住）：legacy 打开设置页靠的是一条 **document 捕获阶段的事件委托**
 *   （`36-script.txt` 里 `closest('#btnSet, #btnSet2')` + `preventDefault/stopPropagation` + `open()`）。
 *   捕获阶段的事件顺序是 **window → document → … → 目标**；我们把监听器装在 **window 捕获阶段**，
 *   就**先一步**拿到事件并 `stopPropagation()` ⇒ legacy 那条委托**永远收不到**。
 *   两条入口都盖住：① 顶栏按钮直接点 ② 底栏 tab 调用的 `#btnSet.click()`（程序化派发同样走捕获链路）。
 *
 * 挂载（照 `docs/phase3-plan.md` §1.6「S2 过渡形态」）：
 *   · legacy 的 `build()` 在 DCL 就跑过、`#setScreen` 平时就躺在 body 里（`.setscreen{display:none}`、
 *     靠 `.on` 才 `display:grid`）。**首次接管时先 `remove()` 掉它** —— 不 remove 就会出现**两个同 id 节点**，
 *     而 `#setScreen{…}` 是按 id 命中的 ⇒ 样式双份命中、`getElementById` 只认第一个（S1a 同族的坑：
 *     隐藏旧节点会留下重复 `<defs>` id，见下面开屏那段注释）。
 *   · 我们的根挂在一个**脱离文档**的容器上，再把 host（`display:contents`，不引入额外盒）append 到 body，
 *     与开屏 `mountSplash()` 同一套做法。
 *   · **懒挂载**：第一次点开才建（legacy 那边也是 build 一次、之后只切 `.on`）；关闭 = 去掉 `.on`，
 *     节点留在文档里 —— 与 legacy 的 `close()` 行为一致。
 *   · `open()` / `close()` 对 `<html>` 的两处副作用（`overflow`、`set-lock`）由组件内部照抄（见 SettingsScreen.jsx）。
 *
 */

let settingsRoot = null, settingsHost = null, settingsOpen = false;
function paintSettings() {
  if (settingsRoot) settingsRoot.render(<SettingsScreen open={settingsOpen} onClose={() => setSettingsOpen(false)} />);
}
function setSettingsOpen(v) {
  settingsOpen = v;
  if (api.s2settings) api.s2settings.open = v;
  paintSettings();
}
function openSettings() {
  if (!settingsRoot) {
    /* ★  尾项（2026-10-14）：旧层的「让位/摘旧节点」动作随段退役 —— 砍段之后 `#setScreen`
       ⚠ 字段名 `legacyNodeRemoved` **沿用不改**（判据 `tools/_probe-settings-owner.mjs` /
         `tools/_diag-guide-config.mjs` 读它）；语义升级为**更强的事实**：本仓接管时文档里本来就没有它。 */
    const legacyNodeRemoved = !document.getElementById('setScreen');
    settingsHost = document.createElement('div');
    settingsHost.setAttribute('data-xlroot', 'settings');
    settingsHost.style.display = 'contents';
    document.body.appendChild(settingsHost);
    settingsRoot = createRoot(settingsHost);
    api.s2settings.mountedAt = Date.now();
    api.s2settings.legacyNodeRemoved = legacyNodeRemoved;
    /** 供判据用：接管后由谁提供 `#setScreen` */
    api.s2settings.activeNode = () => document.getElementById('setScreen');
  }
  setSettingsOpen(true);
}
function mountSettingsInterceptor() {
  const st = { owner: 'react', open: false, intercepts: 0, lastHit: '', lastTrusted: null, startedAt: Date.now() };
  api.s2settings = st;
  window.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    const hit = t.closest('#btnSet, #btnSet2');
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    st.intercepts += 1;
    st.lastHit = String(hit.id || hit.className || '');
    st.lastTrusted = e.isTrusted;
    openSettings();
  }, true);   /* ★ 捕获阶段（第三参 true）= 抢在 legacy 的 document 捕获委托之前 */
}
mountSettingsInterceptor();

/* ============ ★ D-⑤（2026-10-14，你放行第 2 条）：加载期把「当前服务商 / 服务商档案」落盘 ============
 * 为什么需要：旧层设置页（`36-script`）的 `wire()` 在**加载期**就跑过这几步（源 L759–785）——
 *   ① `pv = loadProv(); if (!pvValid(pv)) pv = guessProv(load()); saveProv(pv);`
 *   ② `xlr-llm-svcs` 还空、而全局配置里有 base ⇒ `svcPut(guessProv(s0), { base, model, key })`；
 *      再跑一遍「同一把 Key 只留它自己那家」的去重，最后 `saveSvcs(m)`。
 * 本仓的设置页是 React 且**懒挂载**（第一次点开才建）⇒ 这几步不会自己发生。
 * ⇒ 这里按**同一份实现**补跑（`SettingsCore` 里那些函数本来就是 `36-script` 的逐字切片，不是重写）。
 * 注意：幂等：走 `SettingsCore` 自己的读写（已有值不覆盖、键名逐字相同）。登记：docs/known-differences.md 。 */
function persistLlmSideEffects() {
  try {
    let pv = SettingsCore.loadProv();
    if (!SettingsCore.pvValid(pv)) pv = SettingsCore.guessProv(SettingsCore.load());
    SettingsCore.saveProv(pv);
    const has = (o) => { for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) return true; return false; };
    const s0 = SettingsCore.load();
    if (!has(SettingsCore.loadSvcs()) && s0.base) {
      SettingsCore.svcPut(SettingsCore.guessProv(s0), { base: s0.base, model: s0.model, key: s0.key });
    }
    /* 「同一把 Key 只留它自己那家」去重（源 L766–785 那段，逐条照搬） */
    const m = SettingsCore.loadSvcs();
    const owners = {};
    for (const k in m) {
      if (Object.prototype.hasOwnProperty.call(m, k) && m[k] && m[k].key) {
        const v = m[k].key;
        if (!owners[v]) owners[v] = [];
        owners[v].push(k);
      }
    }
    for (const v in owners) {
      if (Object.prototype.hasOwnProperty.call(owners, v) && owners[v].length > 1) {
        const keep = owners[v].indexOf(pv) >= 0 ? pv : owners[v][0];
        for (const k of owners[v]) if (k !== keep) m[k].key = '';
      }
    }
    SettingsCore.saveSvcs(m);
  } catch (ePersist) { }
}
persistLlmSideEffects();

/* ============ 2026-10-13：引导里「去配置」的**落点纠正** ============
 * 旧版 `goConfig()`（`36-script.txt` L325–342）走完是：关引导 → 开设置页 → 滚到 **「大模型」段顶部**
 * → 未配置就先点智谱卡片 → 聚焦 Key（`preventScroll`）。
 * 实测（明文/加密壳双跑）：这一串在新栈里**照常跑通**（引导关掉、页面打开、`#stKey` 拿到焦点），
 * 但落点 = 段顶部 ⇒ **填 Key 的输入框仍在屏外**（窗口 900 高，Key 在 ~966px 处）——
 * ⇒ 做法：**不拦这一击**（让 legacy 的 goConfig 照常跑完：关引导 / 开页 / 补选智谱 / 聚焦），
 *    只在它之后把落点纠正到 `#stp3`（填 Key 那一步）—— **不复制 goConfig 的任何逻辑**。
 * ⚠ 与旧版的差异属**有意差异**（旧版就停在段顶部），按你 2026-10-13 的要求改。 */
function fixGuideLanding() {
  const step = document.getElementById('stp3');
  if (!step) return;
  try { step.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { }
  const k = document.getElementById('stKey');
  if (k) { try { k.focus({ preventScroll: true }); } catch (e) { } }
}
window.addEventListener('click', (e) => {
  const t = e.target;
  if (!t || typeof t.closest !== 'function') return;
  const g = t.closest('#gNext');
  if (!g) return;
  if (String(g.textContent || '').trim() !== '去配置') return;   /* 同 legacy：`s.go` 那一步的按钮文案 */
  setTimeout(fixGuideLanding, 0);   /* 0ms = 让 legacy 的 goConfig 先同步跑完，再纠正落点 */
}, true);

/* ============ S2/C1：换皮肤面板接管 ============
 * 拦的机制（与 C2 同一套，但 legacy 这次是在 **document 捕获阶段一个地方分派四分支**）
 *   —— `32-script.txt` `init()` L100-129：捕获监听 + 四分支：
 *      1 点皮肤项 → apply + close　2 点面板空白 → 不关　3 点按钮 → 开/关　4 点别处 → 收起
 *   我们装在 **window 捕获阶段**（早于 document）⇒ 四个分支**全部由我们处理**（都 `stopPropagation()`），
 *   legacy 那条委托永远收不到。
 *   ⚠ **四个都要拦**：C1 首跑时分支 4 曾"放行给 legacy 去收"，结果 legacy 摘掉的是 **React 管的**那个
 *   节点、React 随后 `unmount()` 再摘一次 ⇒ 抛 `removeChild … is not a child of this node`（B 臂 JS 报错）。
 *
 * 挂载（照 `openMenu()` L79-81 的同一判据、同一挂点，布局才逐像素一致）：
 *   · **窄屏（≤820px）⇒ 挂 `document.body`**（CSS 那套 `position:fixed` 底部面板才是相对视口的）
 *   · **宽屏 ⇒ 挂锚点按钮内部**（CSS 锚在按钮下方 `top:calc(100%+8px);right:0`）
 *   宿主 `display:contents` ⇒ 不引入额外盒，定位参照仍是原挂点（按钮 / 视口）。
 */

let skinRoot = null, skinHost = null, skinTarget = null, skinOpen = false;
/** 切肤入口统一在 `src/data/skinApply.js`（C1 面板 与 C2 的 #stThemes 共用一份，
 *  A6；那里也写明了" 删 legacy 时一并删掉桥"）。本文件只调用、不重复实现。 */

/* **挂载方式（C1 首跑比对逼出来的）**：用 **portal** 把 `.skinmenu` 直接渲染进
   `narrow ? document.body : anchor` —— 容器是**脱离文档**的 div（`Shell` 那套做法），
   portal 让 DOM 直接插进目标节点 ⇒ `.skinmenu` 是目标节点的**直接子节点**，与 legacy 的
   `openMenu()` 逐节点等价（legacy 就是 `(narrow?body:anchor).appendChild(m)`）。
   结构也不再逐节点等价。 */
function paintSkin() { if (skinRoot && skinTarget) skinRoot.render(createPortal(<SkinMenu cur={SkinsCore.cur()} />, skinTarget)); }

function openSkinMenu(anchor) {
  closeSkinMenu();
  let narrow = false;
  try { narrow = window.matchMedia('(max-width:820px)').matches; } catch (eN) { }
  skinTarget = narrow ? document.body : (anchor || document.getElementById('btnTheme') || document.body);
  skinHost = document.createElement('div');   /* **故意不挂进文档**：只当 React 的容器（DOM 由 portal 插进 skinTarget） */
  skinRoot = createRoot(skinHost);
  skinOpen = true;
  if (api.s2skin) { api.s2skin.open = true; api.s2skin.mountedAt = Date.now(); api.s2skin.parent = narrow ? 'body' : 'anchor'; }
  paintSkin();
}

function closeSkinMenu() {
  /* `unmount()` 会把 portal 渲染出来的 `.skinmenu` 从 skinTarget 里摘掉 —— 与 legacy 的
     `closeMenu()`（`m.parentNode.removeChild(m)`）等价。 */
  if (skinRoot) { try { skinRoot.unmount(); } catch (eU) { } skinRoot = null; }
  skinHost = null;
  /* 兜底：万一还有残留（正常路径不该有），清干净后再放掉引用 */
  if (skinTarget) { const m = skinTarget.querySelector('.skinmenu'); if (m && m.parentNode) m.parentNode.removeChild(m); }
  skinTarget = null;
  skinOpen = false;
  if (api.s2skin) api.s2skin.open = false;
}

function mountSkinInterceptor() {
  const st = { owner: 'react', open: false, intercepts: 0, lastHit: '', lastTrusted: null, parent: '', startedAt: Date.now() };
  api.s2skin = st;
  window.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    /* 1) 点在某个皮肤上 → 换肤 + 收起 */
    const item = t.closest('.skinmenu button[data-k]');
    if (item) {
      e.preventDefault(); e.stopPropagation();
      st.intercepts += 1; st.lastHit = 'item:' + item.getAttribute('data-k'); st.lastTrusted = e.isTrusted;
      applySkin(item.getAttribute('data-k'));
      closeSkinMenu();
      return;
    }
    /* 2) 点在面板里（空白处）→ 什么也不做，别关 */
    if (t.closest('.skinmenu')) {
      e.stopPropagation();
      st.intercepts += 1; st.lastHit = 'panel'; st.lastTrusted = e.isTrusted;
      return;
    }
    /* 3) 点在按钮上 → 开关面板（legacy 认 `[data-skinbtn]`；带上 id 兜底：legacy init 还没跑时也能开） */
    const hit = t.closest('[data-skinbtn], #btnTheme');
    if (hit) {
      e.preventDefault(); e.stopPropagation();
      st.intercepts += 1; st.lastHit = 'btn:' + String(hit.id || hit.className || ''); st.lastTrusted = e.isTrusted;
      if (document.querySelector('.skinmenu')) closeSkinMenu();
      else openSkinMenu(hit);
      return;
    }
    /* 4) 点在别处 → 收起：**由我们收，并且 stopPropagation**。
       为什么不能让 legacy 的同一分支去收（C1 首跑实测的 bug）：legacy 的 `closeMenu()` 会摘掉
       **React 管的**那个节点，React 随后 `unmount()` 再摘一次 ⇒ 抛
       `Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.`
       我们收了、且拦住事件 ⇒ legacy 那条分支根本收不到，行为等价（都是"面板消失"）而无冲突。 */
    if (document.querySelector('.skinmenu')) {
      e.stopPropagation();
      st.intercepts += 1; st.lastHit = 'outside'; st.lastTrusted = e.isTrusted;
      closeSkinMenu();
    }
  }, true);   /* ★ window 捕获阶段 = 抢在 legacy 的 document 捕获委托之前 */
}
mountSkinInterceptor();

/* ============ S2/C3：记录抽屉（`#sdb`）接管 ============
 * 拦的机制（为什么拦得住）：legacy 的入口是 `22-script.txt` **L176–177** 给 `#btnSum` 绑的普通监听
 *   （`btn.addEventListener('click', () => sdbOpen('cases'))`）⇒ 我们装在 **window 捕获阶段** 并
 *   `stopPropagation()` ⇒ 它收不到（与 C2 同一手法）。legacy 的入口语义是"**只开不关**"（`sdbOpen('cases')`）
 *   ⇒ 这里照抄，**不做开/关切换**（关的路径是 × / 遮罩 / Esc，属 Step 4）。
 *
 * 与 C1/C2 的两处不同（都由本块判据逼出来，登记见 docs/s2-log.md §39）：
 *   ① **加载期就挂**（不是懒挂载）：legacy 在加载期就把 `#sdb` 建进 body（`mk()` L178）⇒ 为满足
 *      「静态 DOM 等价」，React 必须在**同一时刻**提供 `#sdb`；开/关只切 `.on` + `<html>.sdb-lock`。
 *   ② **`renderSdb` 重定向**（§39.6.4）：legacy **9 处**调用 `renderSdb`（含跨块的 `18-script.txt` L405
 *      「起一卦后刷新侧栏」）⇒ 不重定向就会用 legacy markup 覆盖 React 的 DOM。重定向到本组件的
 *      `refresh()` 后，9 处**全部**自动保持"刷新"语义。
 *      ⚠ 前置 B：**时序安全** —— `window.__xlrRecordsRefresh?.()`：组件未注册时**静默早退**。
 *
 */

let recordsRoot = null, recordsHost = null, recordsOpen = false;
/* ★ 2026-10-13（ / ）：记录抽屉的**门户目标不能用 `document.body`** ——
   React 17+ 会把**整套委托监听**挂到「根容器之外的 portal 容器」上 ⇒ body 被 React 接管
   改用**外壳自有的裸 div 宿主**：无样式、无 transform/filter ⇒ 抽屉仍是相对视口的
   `position:fixed`（与挂 body 等效），而 body 保持干净。
   改名会同时打断判据与  的登记。 */
const RECORDS_HOST_ID = 'xlr-records-host';
let recordsPortalHost = null;
/* Step 4：`onClose` 由组件内部调用 —— 关的三条路径（`#sdbClose` / `#sdbMask` / Esc）逐字对应
   `22-script.txt` L159 / L160 / L170；`[data-set]` 那条先关抽屉再点 `#btnSet`（照 `sdbFootAct` L251-257）。 */
function paintRecords() { if (recordsRoot) recordsRoot.render(createPortal(<SafeZone what="记录"><Records open={recordsOpen} onClose={() => { if (api.s2records) api.s2records.lastCloseBy = 'component'; setRecordsOpen(false); }} /></SafeZone>, recordsPortalHost || document.body)); }
function setRecordsOpen(v) {
  recordsOpen = v;
  if (api.s2records) api.s2records.open = v;
  /* open()/close() 对 `<html>` 的副作用（等价 `20-script.txt` L129 / L136） */
  try { document.documentElement.classList[v ? 'add' : 'remove']('sdb-lock'); } catch (eL) { }
  paintRecords();
}
function openRecords(tab) { if (api.s2records && tab) api.s2records.tab = tab; setRecordsOpen(true); }

function mountRecords() {
  const legacyNode = document.getElementById('sdb');
  /* ★ ：记住 legacy 抽屉在 body 里的**位置**（门户宿主稍后插回同一位置，不是 append 到末尾）
     实测旧层那个 `#sdb` 是 `22-script` 的 `mk()` 在**解析期** `document.body.appendChild(d)` 追加的
     （骨架里根本没有它），砍段后它不存在 ⇒ 原写法会退回 `append`，`#sdb` 在 body 里的位置与旧版不同
     （实测旧 [#… #mask #sdb STYLE #onbLayer sl-orb] vs 新 [#… #mask STYLE #onbLayer #sdb sl-orb]）。
     等效常量锚点 = 骨架之后、body 里**最后一个没有 id 的 `<style>`** 之前（旧产物里那就是 `28-style`
     那一段，它排在旧层所有内联脚本之后 ⇒ `#sdb` 恰好落在那个位置）。 */
  const legacyNext = legacyNode ? legacyNode.nextSibling : (() => {
    const bare = [...document.body.children].filter(e => e.tagName === 'STYLE' && !e.id);
    return bare.length ? bare[bare.length - 1] : null;
  })();
  if (legacyNode) legacyNode.remove();          /* 摘掉 legacy 那个（与 C2 摘 `#setScreen` 同款） */
  recordsHost = document.createElement('div');  /* React 根容器：故意不挂进文档（DOM 由 portal 提供） */
  recordsRoot = createRoot(recordsHost);
  /* ★ ：门户宿主挂在 body 上，但**门户目标 = 这个宿主**（不是 body 本身）⇒
     body 不再被 React 接管；抽屉的 DOM 落在宿主里，结构上只多一层「透明」容器
     （`结构检查` 第 3/5 项按 id 把它当透明层上提，见 tools/结构检查.mjs）。 */
  recordsPortalHost = document.createElement('div');
  recordsPortalHost.id = RECORDS_HOST_ID;
  /* 插回 legacy 抽屉**原来的位置**（不是 append 到 body 末尾）：body 子节点顺序因此与旧版逐位一致，
     说法把宿主当透明层时，`#sdb` 在结构签名里的**位置**也一致。锚点失效则退回 append。 */
  try { document.body.insertBefore(recordsPortalHost, legacyNext); }
  catch (eH) { document.body.appendChild(recordsPortalHost); }
  const st = {
    owner: 'react', open: false, tab: 'cases', intercepts: 0, redirects: 0, askBlocked: 0, lastAsk: '', fixedSaves: 0,
    writerCalls: 0, lastWriter: '',   /* ★ 审计用（S5-0 盲区扫描）：有 bug 写入者被调用的次数/最后一个是谁 */
    lastHit: '', lastTrusted: null, legacyNodeRemoved: !!legacyNode, mountedAt: Date.now(),
    /* ★ 2026-10-12：抽屉「开关所有权」接管的审计计数（见下面接管块的注释） */
    lastClickInside: null, lastCloseBy: '', outsideClosed: 0, legacyCloseIgnored: 0, escClosed: 0, openRouted: 0,
  };
  api.s2records = st;

  /* ★★ 2026-10-12 你定（真坑一 + 真坑二，都在 C3 靶区）：把「点抽屉外面关抽屉」的**所有权**
       ① legacy 那条**不再生效**；
       ② 外壳**自己**实现「点抽屉真正外面才关」，判据 = 抽屉的实际 DOM 边界（`#sdb` 整棵，
          含页签栏 / 底部按钮 / 回收站块），**不是** `#sdbCases` 那一块矩形；
       ③ 所有关闭路径都走 React 的统一入口（`onClose` / `setRecordsOpen`），不再有路径直改 DOM。

     被接管的 legacy 代码 = `38-script.txt` L2497–2511（产物 `新版-现代.html` 第 11080 行）：
       捕获阶段 + document 级；判「内/外」用的是 `#sdbCases` 的 bounding rect（±6px）
       ⇒ 抽屉**自己的**页签栏 / 底栏 / 回收站块全在矩形之外 ⇒ 被判「外面」⇒ 调 `window.sdbClose()`
       ⇒ `classList.remove('on')` **直接改 DOM、绕过 React** ⇒ 视觉已关、React 状态仍「开」
       ⇒ 关掉后要点**两下**「记录」才回来（实测：第 1 下只把状态翻成关，第 2 下才真开）。
     注意：不落 legacy 文件（`legacy/parts/*.txt` 一字不动）——全在本文件内接管。
     `legacyCloseIgnored`（legacy 几何误判被忽略的次数）· `escClosed` · `openRouted`（打开口子被转发的次数）。 */
  window.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    /* ★★ 2026-10-16（重启35）你点名第 4 条交互：「手机端点开记录侧边栏之后，点**非记录栏**的任意位置收回」。
       判「内/外」的边界必须是**面板** `.sdb-p`，**不是** `#sdb` —— `#sdb` 是 `position:fixed; inset:0` 的
       **整屏**容器（`.on` 时 `pointer-events:auto`）⇒ 点在抽屉外面那一片（≤560 档＝左侧 81% 之外的露出区）
       命中的正是 `#sdb` 自己 ⇒ 旧判据 `closest('#sdb')` 必然命中 ⇒ 判「内」⇒ **永远收不回**。
       实测（`_legacy-ref/_l35-outside.mjs`，390×844）：点 (328,523)/(380,295)/(384,760) 命中链均为
       `div#sdb.on → body → html.sdb-lock`，`outsideClosed` 恒 0、`legacyCloseIgnored` 一路 +1（legacy 那条
       改用面板后：露出区、`.sdb-mask`（不在 `.sdb-p` 内）都判「外」；页签栏 / 底栏 / 回收站 / 搜索框 /
       `#sdbClose` 全在 `.sdb-p` 内 ⇒ 判「内」不关（坑①）。`#btnSum` 仍走上/下那条早退（它自己带开合语义）。 */
    st.lastClickInside = !!t.closest('#sdb .sdb-p');   /* 先记「这一次点击落没落在抽屉**面板**里」，供下面那个口子判 */
    if (st.lastClickInside) return;                /* ② 抽屉内（含页签栏/底栏/回收站）⇒ 一律不关 */
    if (t.closest('#btnSum, #btnCases, #btnSdb')) return;   /* 照 legacy：开合按钮交给它自己的逻辑，不双触发 */
    if (recordsOpen) { st.outsideClosed += 1; st.lastCloseBy = 'outside'; setRecordsOpen(false); }
  }, true);
  /* 拖动 / 滑动那两条（L2477-2478 / L2510）不是点击派发内的调用 ⇒ 靠 pointerdown 复位，避免用上次点击的旧值 */
  window.addEventListener('pointerdown', () => { st.lastClickInside = null; }, true);
  /* ① legacy 关闭的唯一口子：它的几何误判在这里被拦掉；其余（拖动/滑动/设置分支）照旧关，但走 React */
  window.sdbClose = function () {
    if (st.lastClickInside === true) { st.legacyCloseIgnored += 1; return; }
    st.lastCloseBy = 'legacySdbClose'; setRecordsOpen(false);
  };
  /* 同口子的另一半：legacy 的 `sdbOpen`（≤820 拖动开抽屉那条）也转给 React，否则「视觉开着、状态关着」
     会出现**对称**的失同步（下一版同样要点两下）。⚠ 这一行属同一接管范围，若判超出本批，撤掉即可。 */
  window.sdbOpen = function (tab) { st.openRouted += 1; st.lastCloseBy = 'legacySdbOpen'; openRecords(tab || 'cases'); };
  /* ③ Esc：legacy 那条（`22-script.txt` L170，绑在 document 上）拿的是**原始** `sdbClose` 函数引用 ⇒
     绕过上面这个口子、直改 DOM。抽屉开着时在 window 捕获阶段先接过来（走 React），并 `stopPropagation`
     让 legacy 那条收不到 —— 这样 Esc 也是 React 统一入口，不会再把状态留在「开」。 */
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !recordsOpen) return;
    e.preventDefault(); e.stopPropagation();
    st.escClosed += 1; st.lastCloseBy = 'esc'; setRecordsOpen(false);
  }, true);
  /* ★ 重定向 legacy 的渲染入口（**不是置空**；等价性来源见 §39.6.4：React 承接 L154–159 四类写入） */
  st.legacyRenderSdb = window.renderSdb;
  window.renderSdb = function () {
    st.redirects += 1;
    /* 前置 B：组件还没注册刷新函数时**静默早退**（不抛、不落 legacy 渲染） */
    try { if (typeof window.__xlrRecordsRefresh === 'function') return window.__xlrRecordsRefresh(); } catch (eR) { }
  };
  /* ★★ A4①（2026-10-13）**存储层收口**：把 legacy 的五个存储原语换成 React 侧那一份
     （`src/data/recordsStore.js`＝`tools/extract-records-store.mjs` 从 `20-script.txt` L9–47 逐字切片）。
     换掉之后全应用**只有一份真相**：
       · React 侧（`Records.jsx`）直接 import 这份；
       · legacy 侧的记账 / CRUD / 复盘函数**仍在原位**（`legacy/**` 一字不动），但它们内部调
         `loadCasesRaw() / loadCases() / saveCases() / loadRules() / saveRules()` —— 这几个名字在全局作用域
         解析到 `window.*` ⇒ 落到这一份上（不是各写各的 localStorage 副本）。
     ⚠ **只换数据层**（存储原语 ＋ A4② 的动词 `addCase`/`setFb`/`markCase`/…）：复盘那条线
       （`reviewCase`/`rvSave`，会出网）属 A4③，本笔不动。
     ⚠ 刷新语义照旧：源里 `saveCases/saveRules` 末尾是 `renderSdb()`，切片里换成 `notify()`
       ⇒ 下面把它接到**同一个** `__xlrRecordsRefresh`（就是上一段 `renderSdb` 重定向去的那个口子）。 */
  st.legacyStore = {};
  /* ⚠ 只换**数据层**（存储原语 + 动词）：`reviewCase`/`rvSave`（复盘、会出网）属 A4③，这里不动。 */
  const STORE_NAMES = [
    'loadCasesRaw', 'loadCases', 'saveCases', 'loadRules', 'saveRules',
    'addCase', 'updateCaseDuanci', 'markModelAnswered', 'setFb', 'setNote',
    'delCase', 'markCase', 'restoreCase', 'purgeCase', 'purgeAllDeleted', 'clearCases', 'delRule',
  ];
  STORE_NAMES.forEach((nm) => {
    st.legacyStore[nm] = window[nm];
    if (typeof RecordsStore[nm] === 'function') window[nm] = RecordsStore[nm];
  });
  RecordsStore.setNotify(() => {
    try { if (typeof window.__xlrRecordsRefresh === 'function') return window.__xlrRecordsRefresh(); } catch (eN) { }
  });
  /* ★ A4② 复盘接缝：`setFb` 标「没应验」时（源里调全局 `reviewCase`）⇒ 接到 React 侧的复盘实现
     （A4③ 的 `ReviewCore.reviewCase`）。⚠ 抽屉那条路径**不在 setFb 里当场跑**（React 的 setState 是异步的：
     旧版是 setFb → renderSdb 同步重建 DOM → reviewCase 找得到 `#rv-<id>`；React 里要等渲染提交）
     ⇒ 抽屉先把钩子挂空做本地标记，再由 Records.jsx 的 rvPending effect 在渲染后跑，见那里的注释。 */
  /* ★★ A4③（2026-10-13）**复盘 / 准则那条线**也搬到 React（逐字切片：`tools/extract-review-core.mjs`）：
     legacy 里剩下的调用者（`setFb` → 钩子、解卦链 → `ruleBlock`）也落到同一份上。 */
  st.legacyReview = {
    reviewCase: window.reviewCase, reviewBlock: window.reviewBlock,
    ruleBlock: window.ruleBlock, confirmRule: window.confirmRule,
  };
  window.reviewCase = ReviewCore.reviewCase;
  window.reviewBlock = ReviewCore.reviewBlock;
  window.ruleBlock = ReviewCore.ruleBlock;
  window.confirmRule = ReviewCore.confirmRule;
  ReviewCore.setNotify(() => {
    try { if (typeof window.__xlrRecordsRefresh === 'function') return window.__xlrRecordsRefresh(); } catch (eR2) { }
  });
  RecordsStore.setReviewHook(ReviewCore.reviewCase);

  /* ★★ 有意行为变更（登记 ****）：**修 legacy 的「写回 `loadCases()` ⇒ 把回收站写没」数据破坏 bug**。
     全枚举（`grep 'saveCases(' / 'loadCases()'`，20/22/26-script）—— 入参取自 `loadCases()` 的**都是**这个 bug：
       · `addCase`（20 L63）· `updateCaseDuanci`（L70-73）· `markModelAnswered`（L81-82）
       · `setFb`（L85-93）· `setNote`（L97-99）              ← **本批可达**（抽屉四条写路径 + 每次起卦）
       · `persistThread`（26 L626-635）· `rvSave`（22 L30-40）← 同类；只经「复盘 / 接着问」两条**出网**路径调用（本批未接）
       · `recAskGo` 里那处内联（26 L737-739）                 ← 同类，**内联在闭包里、包不到**；同样只在被拦掉的「接着问」路径上
     入参取自 `loadCasesRaw()` 的（`markCase` L110 / `purgeCase` L113 / `purgeAllDeleted` L114 / `clearCases` L118）
     ⚠ 教训：**不要包 `saveCases` 本身**！第一版就是那么写的 ⇒ 会把 `purgeCase` / `purgeAllDeleted`
     ⇒ 正确做法 = **只包那几个有 bug 的写入者**：调完原函数后，把「这次被它丢掉的已删记录」按
       `loadCasesRaw()` 的**原序**补回；**没丢就什么都不做**（那些写入者本来正确的语义一字不动）。
     ★ 2026-10-14（ 尾项）：原先那两条开关（`VITE_S2_RECORDS` 等）已随段退役。 */
  st.legacySaveCases = window.saveCases;   /* ⚠ 只留引用，**不替换** */
  st.wrappedWriters = [];
  const mergeBack = (before, cur) => {
    const have = new Set(cur.map((r) => r && r.id));
    const dropped = before.filter((r) => r && r.deleted && !have.has(r.id));
    if (!dropped.length) return null;
    const byId = new Map(cur.map((r) => [r && r.id, r]));
    const out = [];
    for (const r of before) {
      const u = byId.get(r.id);
      if (u) { out.push(u); byId.delete(r.id); }   /* 保序：被改过的用新版本 */
      else if (r.deleted) out.push(r);             /* 被这次写入丢掉的已删记录 ⇒ 按原序补回 */
    }
    for (const u of byId.values()) out.push(u);    /* 新加的（addCase 那条）放末尾 */
    return out;
  };
  ['addCase', 'updateCaseDuanci', 'markModelAnswered', 'setFb', 'setNote', 'persistThread', 'rvSave'].forEach((nm) => {
    const orig = window[nm];
    if (typeof orig !== 'function') return;
    st.wrappedWriters.push(nm);
    window[nm] = function () {
      const before = (typeof window.loadCasesRaw === 'function') ? window.loadCasesRaw() : null;
      const res = orig.apply(this, arguments);
      st.writerCalls += 1; st.lastWriter = nm;   /* ★ 审计用（S5-0 盲区扫描）：证明"这一步真的调了这个有 bug 的写入者" */
      try {
        const cur = (typeof window.loadCasesRaw === 'function') ? window.loadCasesRaw() : null;
        const merged = (before && cur) ? mergeBack(before, cur) : null;
        if (merged) { st.fixedSaves += 1; st.legacySaveCases(merged); }
      } catch (eFix) { }
      return res;
    };
  });
  paintRecords();
  window.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    /* ★ 有意差异（登记 ****）：`[data-ask]`（接着问）整条属**出网**，按 §十三① 留待
       ⇒ 在 window 捕获阶段**吞掉**这次点击：按钮 DOM 保留（结构等价），但点它没反应。
       不吞的话 legacy 那条 **document 级委托**（`26-script.txt` L755-769 → `openRecAsk`）仍会生效 ——
       它会把 legacy 造的 HTML 写进 **React 管的容器**里（接管期共管，本批不允许）。
       `[data-askgo]`（追问框里那枚「问」）一并吞掉：它才是真正出网的那一步（`recAskGo`）。 */
    const askHit = t.closest('[data-ask], [data-askgo]');
    const sdbNow = document.getElementById('sdb');
    if (askHit && sdbNow && sdbNow.contains(askHit)) {
      e.preventDefault();
      e.stopPropagation();
      st.askBlocked += 1;
      st.lastAsk = String(askHit.getAttribute('data-ask') || askHit.getAttribute('data-askgo') || '');
      return;
    }
    const hit = t.closest('#btnSum');
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    st.intercepts += 1;
    st.lastHit = String(hit.id || '');
    st.lastTrusted = e.isTrusted;
    /* ★ Step 4 补齐「第 4 条关闭路径」（`38-script.txt` L2483–2490）：
       `22-script.txt` L177 那条入口**只管开**，真正的"开着时点它 = 收起"是 38-script 在 **document
       捕获**阶段另装的一条。我们装在 window 捕获阶段（比它更早）⇒ **必须把这层语义一起接过来**，
       否则 ≤560px 档（抽屉打开时 `#btnSum` 被抬到 z-index 520、真的点得到）会把"点它收起"变成"点了没反应"。
       （Step 3 那句"legacy 的入口语义是只开不关"只覆盖了 22-script 那一条，本步更正。） */
    if (recordsOpen) setRecordsOpen(false);
    else openRecords('cases');
  }, true);   /* ★ window 捕获阶段 = 抢在 legacy 的 `#btnSum` 监听之前 */
  api.s2records.activeNode = () => document.getElementById('sdb');
}
mountRecords();

/* ============ S2/MAIN：主流程结果栏（`#right`）接管 —— C6 起卦 / C7 断卦 / C4 断卦依据 ============
 * 本块 = 其中「`#right` 那三块」（C6 `#guaCard` · C7 `#llmPane` · C4 `.pane>#evi`，
 * 容器见 `src/components/RightPane.jsx`）。C5（左侧问卦页 `.left>.pane`）是同一批的**另一块**，另落。
 *
 * 为什么拦得住（机制，与 C2/C3 同族但**入口不同**）：legacy 没有「入口按钮」，它是
 *   `16-script.txt` L127–L134 的 `show(c,B)` 里一句 `right.innerHTML = renderGua(c) + renderLLMPane(c) + renderEvidence(B)`。
 *   ⇒ 接管分两半：
 *     ① **DOM 归 React**：先把 `#right` 的子节点摘空，再 portal 渲染同一份结构；并把 `#right` 的
 *        `innerHTML` 写入口改成 **no-op**（React 已经渲染了同一份结构，不需要 legacy 再写一遍）。
 *        ⚠ 这不是「藏起来」而是「不该发生的写入」：`#right` 是全仓**唯一**被写 innerHTML 的元素
 *        （现场核：`getElementById('right')` 只出现在 16-script L128 与 18-script L301 的 scrollIntoView）。
 *     ② **行为仍归 legacy**：`window.show` 被**最外层**包一层 —— 先 `flushSync` 渲染 React（保证 DOM 已提交），
 *        再原样调用 legacy 那条链。legacy 链上挂着的东西**一个都不重写**：
 *        `window.__ctx/__blocks/__md` 赋值 · `bindResult()`（复制按钮 / 让模型解卦 / 断卦依据折叠）·
 *        `playWalk(c)`（走宫；外面还套着 38-script 的 `calmWalk` + `wireWalk`）· `updateSetDot()` ·
 *        26-script 那层包装的 `addCase()`（每起一卦自动记账）·「接着问」区（`#askBox`，插在 `.llm-body` 之后）。
 *        ⇒ 因为 `window.show` 在 26-script 里**已经被包过一次**（`_show0`），我们必须包在**更外层**，
 *          否则会绕过 `addCase` 与「接着问」区。
 *
 */

let mainRoot = null, mainEl = null;
let mainState = { c: null, B: null };
function paintMain() { if (mainRoot && mainEl) mainRoot.render(createPortal(<SafeZone what="结果"><RightPane c={mainState.c} B={mainState.B} /></SafeZone>, mainEl)); }
/** 渲染用（**同步**提交：legacy 链紧接着就要按 id/class 找节点） */
function renderMain(c, B) { mainState = { c, B }; if (mainRoot) flushSync(() => paintMain()); }

function mountMain() {
  const el = document.getElementById('right');
  if (!el) { api.s2main = { owner: 'legacy', reason: '没找到 #right' }; return; }
  mainEl = el;
  const st = { owner: 'react', renders: 0, blockedWrites: 0, lastC: '', startedAt: Date.now(), bindResultCalls: 0, walkInstalled: false };
  api.s2main = st;
  /* ① 摘空 + 占住写入口（React 拥有 `#right` 的子树） */
  while (el.firstChild) el.removeChild(el.firstChild);
  try {
    Object.defineProperty(el, 'innerHTML', {
      configurable: true,
      get() { return ''; },
      /* legacy `show()` 的 `right.innerHTML = …` 落在这里：计入审计、**故意不写** */
      set() { st.blockedWrites += 1; }
    });
  } catch (eD) { api.s2main.innerHTMLHijack = String((eD && eD.message) || eD); }
  mainRoot = createRoot(document.createElement('div'));   /* 容器故意不挂进文档（DOM 由 portal 提供） */
  paintMain();
  st.activeNode = () => document.getElementById('right');
  /* ② 装最外层 `show`：★  批 D-①（2026-10-14）—— **链上不再有旧层实现**。
     源里 `window.show` 是两层（26-script 包 16-script）；本批把中间那两层收进本仓
     （`src/data/showCore.js`，逐字切片）⇒ 现在是「外壳这一层（flushSync 渲染 React → 调本仓那份）」。
     ⚠ 旧层那份**留着不动**（`st.legacyShow` 只作证据：它还挂在 window 上，但没人再调它）。
     ⚠ 上面 ① 那条 `#right` 的 innerHTML 封条**留着**：它是「DOM 归 React」的守卫（本仓这份已不写 DOM）。
     ⚠ 自由变量：本仓那份里的 `bindResult`/`playWalk` 转发 window（**已是本仓**：resultCore/walkCore）；
       `updateSetDot`/`addCase` 转发 window（**仍是旧层**：设置页小红点 / 记录自动记账）⇒ 本批不收，已登记。
     ★ 2026-10-14（ 尾项）：原先的 `VITE_S2_MAIN` 一键回退开关已随段退役。 */
  const inner = window.show;
  /* ★ 2026-10-14（砍段前置，会话「重启23」）：**安装不再依赖「旧层的 window.show 已就位」**。
     「在最外层**包一层**」legacy 那份）。D-① 之后链上那份已经是本仓的 `ShowCore.show`（`st.legacyShow`
     只留作**证据**，没人再调它）⇒ 旧层在不在都必须装。
     ⚠ 实测（只读实验：把产物里 14 个旧内联脚本全摘掉再走一遍）：起卦链会报
       `window.show is not a function` —— 就是这条守卫把整块提前 `return` 掉了。
     注意：别把这条改回「依赖旧层」：删段（D-⑤）之后旧层必不存在，这条守卫会让起卦链**静默不装**。 */
  st.legacyShow = (typeof inner === 'function') ? inner : null;
  const ours = function (c, B) {
    st.renders += 1;
    st.lastC = String((c && c.g1) || '') + ' · ' + String((c && c.g2) || '') + ' · ' + String((c && c.g3) || '');
    renderMain(c, B);                    /* DOM 归 React（**同步**提交，链上紧接着要按 id/class 找节点） */
    const r = ShowCore.show(c, B);       /* ★ 态写者（__ctx/__blocks/__md）＋ 接着问区 ＋ addCase：本仓这条链 */
    /* ★ 2026-10-23（你报「新开一卦之后，接着问还带着上一卦的问题」）：`__thread` 每卦都清，
       但 `#askBox` 里那些 `.ask-item` 是 DOM 残留、没人清。⇒ 在这里收口：**任何入口起卦**都走这条
       `show`，所以清在这里才等于「有新起卦就刷新」；顺带补上「在本卦的基础上接着问」那行小字。 */
    try { resetAskBox(); } catch (eAB) { }
    /* ★ 证据挂在**外壳侧**（首跑实测：`ShowCore.state()` 那份模块作用域计数在打包后读不到 —— minifier 把
       那层计数函数与切片那份合并了；链子本身照跑：态被写、`#askBox` 也挂上了）⇒ 判据读这一份，不受打包影响。 */
    try {
      st.showHits = (st.showHits || 0) + 1;
      st.showLast = {
        ctx: (typeof window.__ctx === 'object' && window.__ctx !== null),
        blocks: (typeof window.__blocks === 'object' && window.__blocks !== null),
        mdReset: (window.__md === ''),
        threadReset: Array.isArray(window.__thread) && window.__thread.length === 0,
        askBox: !!document.getElementById('askBox'),
      };
    } catch (eS) { st.showLast = { error: String((eS && eS.message) || eS) }; }
    return r;
  };
  window.show = ours;
  st.showIsOurs = (window.show === ours);
  /** 供判据实测：本仓这条链跑过几次、每跑一次现场登记（态是不是本仓写的）；
      ⚠ 读**外壳侧**这份（`st.showHits` / `st.showLast`）—— 模块作用域那份在打包后读不到（见上面注释） */
  st.showState = function () { return { hits: st.showHits || 0, last: st.showLast || null }; };
  /* ③ ★  批 A3①（2026-10-13）：`bindResult()` **整函数搬进 React**。
     它原来挂三处监听：复制「干净一卦」/「让模型解卦」/ 断卦依据折叠 —— 现在由两个组件用 `onClick` 接
     （见 `DivinationPane.jsx` · `EvidencePane.jsx` 的 A3① 段；切片在 `src/data/resultCore.js`）。
     ⇒ 这里把 legacy 那份换成 React 侧收尾件，只留它**唯一不属于那两个组件**的一步 `renderSdb()`
       （「起一卦后刷新记录侧栏」；已被 S2/RECORDS 重定向到 React 的记录组件）。
     ⚠ 不换会怎样：legacy 的监听与 React 的 `onClick` **同时**响应 ⇒ 折叠键点一次切两次类 = 看着「点了没反应」。
     ⚠ 时序：本块跑在 `load`、legacy 的 DCL 之后 ⇒ 首次 `show()` 之前就换好了（`show()` 里那句
       `bindResult()` 会调到这一份）。 */
  st.legacyBindResult = window.bindResult;
  window.bindResult = function () {
    st.bindResultCalls += 1;
    /* 源 L389 那一句（`window.__md` 有内容 ⇒ 放开「新开一卦」）—— 放在这里而不是组件里，
       因为**时序**要对上：legacy 的 `show()` 先 `window.__md=''`、再调本函数；组件 effect 跑在它之前
       （`renderMain` 在 `show()` 正文之前），那时读到的还是上一卦的残留值。 */
    if (window.__md) { try { ResultCore.revealNewBtn(); } catch (eR) { } }
    try { if (typeof window.renderSdb === 'function') window.renderSdb(); } catch (eB) { }
  };
  api.markOwned('bindResult');

  /* ④ ★  批 A3②（2026-10-13）：**走宫改由 React 发起**。
     `WalkCore.installWalk()`（切片在 `src/data/walkCore.js`）把 `window.playWalk` 换成
     「切片版 playWalk + 切片版 calmWalk 的瞬时化」，最外层照 `38-script` 的 `wireWalk()` 先切到「起卦」步
     （调的是 legacy 自己暴露的 `window.__xlrSetStep`，那是它 IIFE 里唯一的对外入口）。
     ⇒ legacy 的 `wireWalk` / `calmWalk` 两层包装成为**不可达的死代码**（`show()` 里那句 `playWalk(c)`
     `onSettle` = 「走宫落定」的回调：通知 `GuaCard` 把「看断辞 · 结果 →」挂出来。
       原来这里**照抄**了源 `watchReveal()` 的 350ms 轮询间隔（落定后 350ms 才挂按钮），那本是轮询的副产品；
       现在**落定即挂**（同一个同步链里，与三宫名/胶囊同一次提交 ⇒ 同一帧出现），登记为 。 */
  try {
    st.walkInstalled = !!WalkCore.installWalk({
      onSettle: function () {
        try { if (typeof window.__xlrVnext === 'function') window.__xlrVnext(true); } catch (eV) { }
      }
    });
    if (st.walkInstalled) api.markOwned('walkCore');
  } catch (eW) { st.walkError = String((eW && eW.message) || eW); }
}
mountMain();

/* ============ S2/ASK：左侧问卦页（`.left > .pane`）接管 —— C5 ============
 *
 * 为什么不能像 `#right` 那样「摘空 + React 摆骨架」：`18-script.txt` 在**加载期**就把
 *   `#mClock/#mTime/#mNum/#h2/#h1` 抓成**顶层 var**（= window 属性，可读可写）**并给它们绑了监听**
 *   （L46/L161–163），还有一个每 2 秒写 `h1/h2.value` 的 interval（L33–37）。摘掉旧节点 = 丢监听、丢时钟同步。
 * ⇒ 四步（**零重写**）：
 *   ① 先抓住旧节点（`old` 表）；
 *   ② portal 把 `<AskPanel/>` 渲染进 `.left`（append 到 `#greetWrap` 之后 = **原来那个位置**），
 *   ③ 把 `window.h1/h2/mClock/mTime/mNum` **重绑**到 React 的新节点（legacy 那些函数按这些变量取值 ⇒ 自动作用到新节点）；
 *   ④ 给带监听的几个节点装**事件转发**：新节点上的事件 ⇒ 在旧节点上 `dispatchEvent` ⇒ legacy 加载期绑的监听器照常跑到
 *      那些**全局函数**（`setMode` / `setCastOpen` / `#btnGo` 那套起卦链），而它们内部一律按 id 取值 ⇒ 取到的就是 React 的节点。
 *   ⑤ 挂载后补一次 `setMode(window.__mode || 'clock')` 把初值补齐（aria-pressed / hidden / `#castLb` / `#modeHint` / 九数 / `#castMini`）。
 *    而且它的 `buildStepper` 有幂等守卫 —— React 若自己渲染 `.vstep`，守卫会让它直接 return ⇒ 步进条变死。
 *   方式三键 / 详情键 / 九数手改 / 时辰 change / 初值补齐 / 每 2 秒刷时钟，**已由 React 侧接管**；
 *   本块的「重绑 + 转发」**A2 起收到零**（`#btnGo` 那条转发也撤了：起卦链改由 `CastCore.goCast()` 发起），
 *   并把 legacy 那条每 2 秒的
 *   `refreshClock()`（18-script L164）**中和成 no-op** ⇒ 同一个态只有一个写者。
 */

function mountAsk() {
  const legacy = document.querySelector('.left > .pane');
  const left = document.querySelector('.left');
  if (!legacy || !left) { api.s2ask = { owner: 'legacy', reason: '没找到 .left > .pane' }; return; }
  const st = {
    owner: 'react', forwards: 0, lastForward: '', rebound: [], legacyNodeRemoved: false,
    blockedWrites: 0, startedAt: Date.now(),
    /*  批 A1 起：判据读的**两张清单**（不再用「转发条数」反推接管与否）
       ★ A3①：`owned` 指向 **api 上那一份共用登记表**（见文件头附近 `api.markOwned`）——
         否则更早跑的 S2/MAIN 块登记不到它自己接管的那几项。 */
    owned: api.owned, forwarded: [],
    /*  批 A2② 起：React 侧播四拍的次数（判据检查「只播一次」⇒ 直接抓「两套并存播两遍」这种事故） */
    fxPlays: 0,
    /* ★ B2-①（2026-10-13）：键盘流（回车）由 React 接的**命中计数** —— 判据读它 = 证明
       「这一击真是 React 那份接的」，而不是"两边都绑着、恰好另一份响了"。
       ⚠ 只有 React 会写这两个字段（旧版臂读到 undefined ⇒ 不进三臂比对，只做 React 臂正向检查）。 */
    keysHits: 0, keysLast: ''
  };
  api.s2ask = st;
  /* ★ A3①：「已接管项」的登记函数已提到文件头附近（定义在 `api` 上）—— 见那里的注释。
     （原先在这里定义 ⇒ S2/MAIN 块调不到，A3 的 `bindResult` 就登记不进去。） */
  /* 四拍由 React 播时，每播一次报一次（判据读 `fxPlays`） */
  api.s3bFxPlay = function () { st.fxPlays += 1; };
  /* ★  批 A2②：**常置** `window.__xlrCasting = 1` ⇒ 38-script 那个 legacy 拦截器（它只认这一个旗）
     整体空转，四拍只由 React 的 `CastFx.installCastFx` 播 ⇒ 不会两套并存播两遍。 */
  try { window.__xlrCasting = 1; } catch (eC) { }

  /* ① 抓旧节点（读的是 legacy 加载期建出来、带着监听的那批） */
  const IDS = ['mClock', 'mTime', 'mNum', 'castToggle', 'btnGo', 'n1', 'n2', 'n3', 'h1', 'h2'];
  const old = {};
  IDS.forEach((id) => { const el = legacy.querySelector('#' + id); if (el) old[id] = el; });

  /* ② **先摘旧 pane、再渲染 React**（⚠ 顺序是实测逼出来的，不是随便定的）：
     `flushSync` 会**同步冲掉 React 的 passive effect**（组件里那个 effect 就在其中）⇒ 若旧 pane 还在文档里，
     组件 effect 里的 `document.getElementById('mClock')` 会命中**旧节点**（文档序在前）⇒ 交互全绑到马上要被摘掉的
     节点上、初值也写进旧节点（实测：点方式键毫无反应、`#dt` 空、`modeHint` 停在静态值 —— 就是这条）。
     摘掉后再渲染 ⇒ 全文档只剩 React 那份 ⇒ id 查找必然命中它。
     渲染完再把 React 那份**挪回原位**：`38-script` 的 `buildFooter` 会搬走「最后一个 `.left > .pane`」，
     位置一错就会把问卦页搬进脚注。 */
  const anchor = legacy.nextSibling;
  legacy.remove();
  st.legacyNodeRemoved = true;
  api.markOwned('legacyPaneRemoved');
  const askHost = document.createElement('div');   /* React 根容器：故意不挂进文档（DOM 由 portal 提供） */
  const askRoot = createRoot(askHost);
  flushSync(() => askRoot.render(createPortal(<AskPanel />, left)));
  const paneNow = left.querySelector('.pane');
  if (paneNow && paneNow.parentNode === left) left.insertBefore(paneNow, anchor || null);

  /* ③ 重绑 legacy 的全局节点引用（顶层 var ⇒ window 属性，可写；interval 与函数都按这些变量取值） */
  ['h1', 'h2', 'mClock', 'mTime', 'mNum'].forEach((k) => {
    const n = left.querySelector('#' + k);
    if (!n) return;
    try { window[k] = n; st.rebound.push(k); } catch (eR) { }
  });

  /* ④ 事件转发：新节点 → 旧节点（旧监听器照常跑到 legacy 的全局函数）
       ⇒ 对应的转发**逐条撤掉**（转发还在 = 两套写者抢同一个态）。
       （18-script 那段 handler 的逐字切片）发起 ⇒ **本块不再转发任何事件**（FWD 空表）。
       ⚠ 四拍动画不受影响：38-script 的 `wireCastFx()` 挂在 document 捕获阶段、按 `closest('#btnGo')` 命中，
         与「按钮由谁渲染」无关；它拦下首次点击、2400ms 后补发 click 交给应用（= React 的 handler）。 */
  const FWD = [];
  FWD.forEach(([id, type]) => {
    const o = old[id], n = left.querySelector('#' + id);
    if (!o || !n) return;
    n.addEventListener(type, function () {
      st.forwards += 1; st.lastForward = id + ':' + type;
      try { o.dispatchEvent(new Event(type, { bubbles: false })); } catch (eD) { }
    });
    st.forwarded.push(id + ':' + type);
  });
  /* 方式切换后滑动药丸要跟着挪：A1 起由组件派 `xlr:askmode` 事件通知（不再借 legacy 的 setMode 链） */
  window.addEventListener('xlr:askmode', function () {
    try { requestAnimationFrame(function () { if (st.placeSpill) st.placeSpill(true); }); } catch (eP) { }
  });

  /* ⑤ 初值补齐 —— ★  批 A1（2026-10-13）：**已搬进 `AskPanel`**
     （「`#h1/#h2` 初值 = `clockNums().zi`」「`#dt` = 今天」「`setMode(window.__mode || 'clock')` 一次补齐」
      四件都在组件里的那个 effect 里，同一套规则、同一套函数）。
     这里只留一件 **legacy 侧的中和**：把 `window.refreshClock` 覆盖成 no-op。
     · 为什么必须中和：18-script 有一条每 2 秒的 timer（L164）调全局 `refreshClock()`，它按 **id** 写
       `#castMini` / 九数值 ⇒ 与 React 侧的新写者**抢同一个态**（两个写者 = 抖动/半活状态）。
     · 中和后：`#castMini` 与九数**只有 React 一个写者**（`AskCore.refreshClock`），行为不变。 */
  try { window.refreshClock = function () { }; api.markOwned('legacyClockNeutralized'); } catch (eN) { }

  /* ⑥ 分段控件那颗滑动药丸（`.spill`）的**位置/宽度**：React 只建了元素（见 AskPanel 注释），
     摆位由这里按 `38-script.txt` **L515–526 `placeSpill()` 的 4 行几何逐字照抄**（不是重写：同左邻右舍的判定、
     同一套 transition 复位手法）。为什么不能让 legacy 自己摆：`wireSeg()` 有「已有 `.spill` 就 return」的幂等守卫，
     而它在加密壳臂可能**早于我们的挂载**跑过一次（药丸建在旧节点上）⇒ 必须由我们保证**两臂行为一致**。 */
  const spillSeg = () => document.querySelector('.cbar .seg') || document.querySelector('.pane-b .seg');
  const placeSpill = (animate) => {
    const seg = spillSeg();
    if (!seg) return;
    /* 注意：换步后左栏会被收起来（`html[data-step]` 那套）⇒ 这时量到的按钮宽高是 0，写进去就变成
       `left:0;width:0`（实测：起卦后两臂都栽在这，base 仍留着上一次的 172/62）。⇒ 量不到尺寸就**保持不动**。 */
    if (!seg.offsetWidth) return;
    const on = seg.querySelector('button[aria-pressed="true"]');
    const sp = seg.querySelector('.spill');
    if (!on || !sp) return;
    const instant = !animate || !sp.__placed;
    if (instant) sp.style.transition = 'none';
    sp.style.left = on.offsetLeft + 'px';
    sp.style.width = on.offsetWidth + 'px';
    if (instant) { void sp.offsetWidth; sp.style.transition = ''; sp.__placed = true; }
  };
  placeSpill(false);
  st.placeSpill = placeSpill;
  /* ★ 为什么还要一个 ResizeObserver：我们挂载时**旧增强层可能还没重排**（移动端/桌面由 `30-script`/`38-script`
     在 DCL 后把 `.f` 整块搬进 `.cside`）⇒ 那一刻量到的按钮宽度是**重排前**的（实测 plain 臂量成 19/278，
     正确答案是 3/88）⇒ 药丸停在错位置。旧增强层自己的 `wireSeg()` 又被幂等守卫挡住不跑。
     ⇒ 用 RO 盯住那颗 `.seg`：重排让它的尺寸一变就重新摆一次（`placeSpill` 内部每次都重新取按钮的
       `offsetLeft/offsetWidth` ⇒ 量的一定是当下布局）。同族的「药丸几何」判据就是看这一段。 */
  try {
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(function () { placeSpill(false); });
      const seg0 = spillSeg();
      if (seg0) ro.observe(seg0);
      st.resizeObserver = true;
      /* 兜底：重排若发生在下一拍之后，RO 会自己触发；这里再补两次（幂等，量到的都是当下值） */
      requestAnimationFrame(function () { placeSpill(false); });
      setTimeout(function () { try { placeSpill(false); } catch (e) { } }, 300);
    }
  } catch (eRO) { }

  st.activeNode = () => left.querySelector('.pane');
}
mountAsk();

/* ============ D-⑤ 第 ② 步：左栏重排（`.cbar` 那条「起卦栏」）改由本仓这套建 ============
 * 源：`30-script.txt` 的 IIFE 内层 `init()`（逐字切片在 `src/data/variantC.js`，
 *   `tools/extract-variant-c.mjs` 生成，1360 字符 / sha16 `4cca55ae7151bb47`）。
 * 它干的事 = **纯 DOM 搬运**：把左栏 `.left .pane-b` 里那叠输入面板（`#q` / `#bgDet` / `.seg` /
 *   `#castFields` / `#cat` / `.gobar` ＋剩下的孩子）重排成一条横向「起卦栏」
 *   `.cbar > .cmain / .cside / .gobar`，然后**删掉 `.pane-b`**。
 * 幂等闸 = **共用节点判定**（切片首行 `if (!paneB || document.querySelector('.cbar')) return;`）
 *   ⇒ 谁先建谁赢、后来者跳过 ⇒ **零改名**（同 `#xlrAura` / `.mfoot` / `.vstep` / `#castPanel` 那一族）。
 * ⚠ **位置 = 紧接 `mountAsk()` 之后**（模块顶层）：`.pane-b` 是 `AskPanel` 渲染的，而 `mountAsk()`
 *   里那次 `flushSync` 是**同步提交** ⇒ 这一行执行完，`.left > .pane > .pane-b` 已在文档里。
 *   本仓在模块顶层就建好 ⇒ 旧层那一次必然看到 `.cbar` 已在、直接 return。
 * ⚠ **为什么必须由本仓建**（不只是归属问题）：`AskPanel` 的 `wireCastPanel()` 等的是 `.cbar`，
 *   而 `#castPanel` 的落点由 `.cbar .cmain` 决定 ⇒ D-⑤ 砍段之后 `.cbar` 若没人建，整条起卦栏塌掉。
 */
function mountVariantC() {
  const before = document.querySelector('.cbar');
  let did = null;
  try { did = VariantC.mount(); } catch (eVCM) { }
  const now = document.querySelector('.cbar');
  const built = !before && !!now;   /* 真由我们建出来的才登记（登记点就在真正动手的那一行旁边） */
  api.variantC = {
    owner: 'react',
    ran: !!(did && did.ok),
    built: built,
    legacyHadCbar: !!before,                                  /* 我们建之前它就已经在了？（正常应为 false） */
    cbarCount: document.querySelectorAll('.cbar').length,
    cmainCount: document.querySelectorAll('.cbar > .cmain').length,
    csideCount: document.querySelectorAll('.cbar > .cside').length,
    paneBGone: !document.querySelector('.left .pane-b'),      /* 被重排掉了？（源里那一步删的就是它） */
    /** 供判据做「同一个同步任务里再调一次 ⇒ 必须幂等、不双建」的检查。
       ⚠ 这一件**搬的是节点**：删掉 `.cbar` 会把整条栏（含 `#castFields`）一起带走
         ⇒ 「删掉重建」那条实验在这件上不成立、也不许照抄（同 `castPanel` 的规矩）。 */
    build: function () { VariantC.mount(); },
  };
  if (built) api.markOwned('variantC');
}
mountVariantC();

/* ============ 手机端说法补齐（★ 2026-10-15 重启32）：问候语断两行 + 输入框占位只留一句 ============
 * 源：旧仓手机段 `E:\小六壬呐\apps\mobile-web\src\modern.js` 的 `splitGreet()` / `adaptPh()`
 *   （逐字基准与两处有意偏离都写在 `src/data/phoneShims.js` 头注里，含源片段 sha16）。
 * 为什么现在补：D-⑤ 搬 React 时这两件没跟着搬（旧层 `fitAll()` 那条链断了）⇒ 实测产物：
 *   · `#q` 占位是**桌面长版** 68 字（旧版 18 字），16px 下溢出输入框（滚高 95 > 客户高 60）。
 * ⚠ 位置 = 紧接 `mountVariantC()` 之后：`.cbar` 已建 ⇒ `#q` 一定在文档里；`#greet` 来自静态骨架。
 * ⚠ 归属登记走 `api.phoneShims`，**不进 `READY_MOUNTS`** —— 那是「legacy 接管项」的表，
 *   本件是仓内自己新加的（同 tailwind.css 那批手机补丁的定位）。
 * ⚠ `watch()` 是必需的，不是保险丝：`#greet` 由 `askCore.renderGreet()` 写、`#q` 的 placeholder
 *   随 React 重渲染回落 ⇒ 只跑一次会被改回去（两处都是「值不同才写」，不会自激）。
 */
function mountPhoneShims() {
  let did = null;
  try { did = PhoneShims.apply(); } catch (ePS) { }
  let watching = false;
  try { watching = PhoneShims.watch(); } catch (ePW) { }
  api.phoneShims = {
    owner: 'react',
    ran: !!(did && (did.greetSplit || did.phShortened)),
    greetSplit: !!(did && did.greetSplit),
    phShortened: !!(did && did.phShortened),
    watching: watching,
    placeholder: (document.getElementById('q') || {}).placeholder || null,
    greet: (() => { const g = document.getElementById('greet'); return g ? g.textContent : null; })(),
    /** 供判据做「删掉重建」式的实验：再跑一遍两处说法（幂等 ⇒ 第二次应双双 false）。 */
    apply: function () { return PhoneShims.apply(); },
  };
  if (did && (did.greetSplit || did.phShortened)) api.markOwned('phoneShims');
}
mountPhoneShims();

/* ============ 手机端动画/手势整套（★ 2026-10-15 重启32，你点名「我的所有原版动画呢」）============
 * 源：旧仓手机段 `modern.js`（逐字基准与偏离都写在 `src/data/phoneAnim.js` 头注里）——
 *   `syncPhoneStep` / `phoneStepSettle` / `stepTapWire` / `stepBarScrollFade` / `stepScrollWire` /
 *   `initStepSwipe` / `initEdgeSwipe` ＋ 旧产物里那三条兜底（未起卦手势吞掉 / 拨回 / 触摸点序号）。
 * 为什么现在补：D-⑤ 砍段时这一串没跟着搬（`stepCore.js` L54–56 把 syncPhoneStep/phoneStepSettle
 *   绑成了**桌面空实现**，其余几个函数在仓里根本不存在）⇒ 实测产物：滑动不换页、序号不展开、
 * ⚠ 位置 = 最后一块（`.vstep` 由 `mountStepper()` 建在前，`#top` 的按钮要够量对齐）⇒ 必须排在它后面。
 * ⚠ 归属登记走 `api.phoneAnim`，不进 `READY_MOUNTS`（同 `phoneShims`）。
 */
function mountPhoneAnim() {
  let ev = null;
  try { ev = PhoneAnim.install(); } catch (ePA) { ev = { error: String((ePA && ePA.message) || ePA) }; }
  api.phoneAnim = {
    owner: 'react',
    wired: (ev && ev.wired) || [],
    hooks: (ev && ev.hooks) || [],
    barPresent: !!(ev && ev.bar),
    error: (ev && ev.error) || null,
    /** 供判据：只读快照（序号三颗的可见性/展开态/字、滑动方向、滚动淡出值） */
    state: function () { return PhoneAnim.state(); },
  };
  if (ev && ev.wired && ev.wired.length) api.markOwned('phoneAnim');
}
mountPhoneAnim();

/* ============ 手机端底栏那一组（★ 2026-10-16，你批 6 之后的"没搬的"）============
 * 源：旧仓手机段 `modern.js`（逐字区间与偏离都写在 `src/data/phoneNav.js` 头注里）——
 *   `NAV_ICONS` 539–544 · `navSvg` 545–548 · `LENS_MAP` 648 · `ensureLensFilter` 650–668 ·
 *   `buildNav` 669–714 · `syncNav` 716–739 · `wireLiquidDrag` 742–1004 · `wireNavCollapse` 1007–1071。
 *   「反正底栏不要，搬可以先搬，里面的效果实现的还不错，但是肯定不能出现在屏幕上，也不能有功能。」
 *   ⇒ 这里传 `{ enabled: false }` —— **不建节点、不接线**（`.mgbar` / `#xlrLensSvg` / `.nplens`
 *     一个都不建，也就没有任何监听器；比"建了再 display:none"彻底，任何皮肤/CSS 都不可能把它露出来）。
 *     搬入的代码留在 `data/phoneNav.js` 备用；将来宽屏/桌面版要用 ⇒ 这一处改传 `{ enabled: true }`。
 * ⚠ 归属登记走 `api.phoneNav`，不进 `READY_MOUNTS`（同 `phoneShims` / `phoneAnim`）。
 */
function mountPhoneNav() {
  let ev = null;
  try { ev = PhoneNav.install({ enabled: false }); } catch (ePN) { ev = { error: String((ePN && ePN.message) || ePN) }; }
  api.phoneNav = {
    owner: 'react',
    ran: !!ev,
    installed: !!(ev && ev.enabled),
    reason: '手机版不要底栏（用户 2026-10-16）：不建节点、不接线；代码留在 data/phoneNav.js 备用',
    error: ev && ev.error ? String(ev.error) : null,
    state: function () { return PhoneNav.state(); },
  };
}
mountPhoneNav();



/* ==== 开发态标记：**已于 2026-10-12 摘除**（你 2026-10-12 定"C1 + 批 1 验收通过"后，按锁定顺序第 1 步执行）====
 * 历史：S1a–C1 期间，本模块在 `api`（= `window.__xlrShell`）上挂过一个 `devState` 属性（内含一个可 grep 的
 *   字符串标记），用来保证"半成品产物不会被当成可发布版本"。闭环见 docs/s2-log.md §十四 / §38.12。
 *   —— legacy 段已删、已无回滚对象 ⇒ 本模块不再有任何构建期分支（默认路径即唯一路径）。
 */
