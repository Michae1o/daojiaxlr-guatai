/*
 *
 * 来源（只读，逐字基准）：`(upstream)`（上游手机段）
 *   · splitGreet  L340–L352   该片段 486 字节
 *   · adaptPh     L357–L369   该片段 504 字节
 *
 * 上游当初怎么用它（`modern.js` L325–L334 的 `fitAll()`）：
 *   `fitCat()` / `adaptPh()` / `splitGreet()` / `syncPhoneStep()` 一串，boot、resize、换页各跑一次。
 *
 *   ① 源里那两处 `matchMedia(...)` 在上游构建手机产物时就被固化成 `({matches:true})`（恒窄屏）
 *      ⇒ 这里只留窄屏那一支；`else`（还原宽屏文案）在手机上永不执行，故不搬。
 *   ② `splitGreet` 源里用 `g.__raw === undefined` **只捕一次**原文案。本仓 `#greet` 由
 *      `data/askCore.js` 的 `renderGreet()` 写、且**可能重渲染**（新词会跟首捕的旧词打架）
 *      ⇒ 这里改成**幂等判定**（已有换行就 return；否则按当前文本断一次）。
 *
 *   `styles/legacy.css` 被 改它要连带重算。
 * 幂等：两处都靠「值不同才写」收敛 ⇒ 被 watch() 的 MutationObserver 反复调用也不会抖。
 */
/* eslint-disable */

/* ===== splitGreet（源 L340–L352，窄屏支）===== */
function splitGreet() {
  var g = document.getElementById('greet');
  if (!g) return false;
  var txt = g.textContent || '';
  if (!txt) return false;                    /* 还没填词：不动（见头注偏离②） */
  if (txt.indexOf('\n') >= 0) return false;  /* 已经是两行：幂等 */
  var i = txt.search(/[，,。！!？?、；;：:]/);
  if (i < 0 || i >= txt.length - 1) return false;
  g.textContent = txt.slice(0, i + 1) + '\n' + txt.slice(i + 1);
  return true;
}

/* ===== adaptPh（源 L357–L369，窄屏支）===== */
var PH_NARROW = '问具体的事。例如「我这次面试能过吗」';
function adaptPh() {
  var ta = document.getElementById('q');
  if (!ta) return false;
  if (ta.placeholder !== PH_NARROW) { ta.placeholder = PH_NARROW; return true; }
  return false;
}

/* 有没有开关要暴露？—— 上游没有；这里给 null 语义：XLR_XIANG 那类总闸归应用层（见 judgment.js 头注）。 */

export const PhoneShims = {
  PH_NARROW: PH_NARROW,

  /* */
  apply: function () {
    var out = { greetSplit: false, phShortened: false, error: null };
    try { out.greetSplit = splitGreet(); } catch (eG) { out.error = String((eG && eG.message) || eG); }
    try { out.phShortened = adaptPh(); } catch (eP) { if (!out.error) out.error = String((eP && eP.message) || eP); }
    return out;
  },

  /** 盯住会「重渲染回去」的两处：`#greet` 的文本、`#q` 的 placeholder。
      收敛保证：两处都是「值不同才写」⇒ 自己写下去的那次不会再触发一次写入。 */
  watch: function () {
    if (window.__xlrPhoneShimsWatching) return false;
    window.__xlrPhoneShimsWatching = 1;
    var mo = new MutationObserver(function () {
      try { splitGreet(); } catch (e1) { }
      try { adaptPh(); } catch (e2) { }
    });
    var g = document.getElementById('greet'), q = document.getElementById('q');
    if (g) mo.observe(g, { childList: true, characterData: true, subtree: true });
    if (q) mo.observe(q, { attributes: true, attributeFilter: ['placeholder'] });
    /* ⚠ 两个节点都是静态骨架里的（`legacy/shell.html`）⇒ 模块顶层调用时必在；
       万一不在（骨架被换），给一次性兜底：下一帧再找。 */
    if (!g || !q) {
      setTimeout(function () {
        var g2 = document.getElementById('greet'), q2 = document.getElementById('q');
        if (g2) mo.observe(g2, { childList: true, characterData: true, subtree: true });
        if (q2) mo.observe(q2, { attributes: true, attributeFilter: ['placeholder'] });
      }, 0);
    }
    return true;
  },
};
