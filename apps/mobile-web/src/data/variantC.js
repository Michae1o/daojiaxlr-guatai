/* apps/mobile-web/src/data/variantC.js —— 机械生成的搬运用副本
 *
 * 内容 = 早期实现 `30-script.txt` IIFE 内层 `init()` 的**逐字切片**（零声明差异，1360 字符
 *）。那段干的事 = **纯 DOM 搬运**：
 *   把左栏 `.left .pane-b` 里那叠输入面板（`#q` / `#bgDet` / `.seg` / `#castFields` / `#cat` /
 *   `.gobar` ＋剩下的孩子）重排成一条横向「起卦栏」`.cbar > .cmain / .cside / .gobar`，
 *   然后**删掉 `.pane-b`**（源里写着一条死规矩：漏搬一个孩子，起卦时读它 `.checked` 直接抛 null）。
 *
 * 为什么在本仓（ 第 ② 步）：`src/components/AskPanel.jsx` 的 `wireCastPanel()` 等的是 `.cbar`，
 *   而 `#castPanel` 的落点由 `.cbar .cmain` 决定 ⇒ 早期实现那些内联脚本一不在（ 砍段），
 *   `.cbar` 就没人建 = 整条起卦栏塌掉。
 * 幂等闸 = **共用节点判定**（切片首行 `if (!paneB || document.querySelector('.cbar')) return;`）
 *   ⇒ 谁先建谁赢、后来者跳过 ⇒ **零改名**（与 `#xlrAura` / `.mfoot` / `.vstep` / `#castPanel` 同族）。
 * ⚠ 切片里的自由变量只有 `document` ⇒ 与早期实现在不在无关（这正是要的效果）。
 */
/* eslint-disable */

/* ===== init（左栏重排：纯 DOM 搬运）（源 30-script.txt）===== */
  function init() {
    var paneB = document.querySelector('.left .pane-b');
    if (!paneB || document.querySelector('.cbar')) return;
    function wrapOf(el) { return el ? el.closest('.f') : null; }

    var fQ = wrapOf(document.getElementById('q'));      /* 问题 */
    var fBG = wrapOf(document.getElementById('bgDet'));  /* 背景（可展开） */
    var fC = wrapOf(document.getElementById('cat'));    /* 事类 */
    var fM = wrapOf(document.querySelector('.left .seg')); /* 起卦方式 */
    var fN = document.getElementById('castFields');     /* 报数三个数 / 月日时（同一块，只换内容） */
    var go = document.querySelector('.left .gobar');    /* 起卦按钮 + 错误行 */
    if (!fQ || !fC || !fN || !go) return;

    var bar = document.createElement('div'); bar.className = 'cbar';

    var main = document.createElement('div'); main.className = 'cmain';
    main.appendChild(fQ);
    if (fBG) main.appendChild(fBG);

    var side = document.createElement('div'); side.className = 'cside';
    [fC, fM, fN].forEach(function (x) { if (x) side.appendChild(x); });
    bar.appendChild(main);
    bar.appendChild(side);
    bar.appendChild(go);

    /* ★ 剩下的孩子（如「附带三宫具象」复选框）必须一并搬走。
       漏搬一个，它就会随着 .pane-b 一起被删掉 —— 起卦时读它 .checked 直接抛 null。 */
    while (paneB.firstChild) main.appendChild(paneB.firstChild);

    var pane = paneB.parentNode;
    pane.removeChild(paneB);
    pane.appendChild(bar);
  }

/* ===== 装配层（本工具写的那一层，不是切片）===== */
export const VariantC = {
  /** 跑那段搬运；幂等闸在切片里（`.cbar` 已存在 ⇒ 早退）。
      返回 { ok, built, cbar }：`built` = **这一次调用**真把 `.cbar` 建出来了（归属证据，不是声明）。 */
  mount: function () {
    var hadBefore = !!document.querySelector('.cbar');
    try { init(); } catch (eVC) { return { ok: false, error: String((eVC && eVC.message) || eVC) }; }
    var hasNow = !!document.querySelector('.cbar');
    return { ok: true, built: !hadBefore && hasNow, cbar: hasNow };
  }
};
