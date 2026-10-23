/*
        有意改动**只有 3 条**，逐条列在下面（本文件不含任何判据算式：R4）。
     · `saveCases`：renderSdb(); → notify();
     · `saveRules`：renderSdb(); → notify();
     · `setFb`：if (rec && rec.fb === '错' && !rec.rv) reviewCase(id); → if (rec && rec.fb === '错' && !rec.rv) reviewHook(id);

   ⚠ 与 legacy 的共存（A4① 的接缝）：legacy 那份同名函数**仍在原位**（`legacy/**` 一字不动），
     但外壳把 `window.loadCasesRaw/loadCases/saveCases/loadRules/saveRules` 换成本模块的导出
     ⇒ 名字虽然还在 legacy 段里，**活得是这一份**（记账 / CRUD / 复盘那些函数都通过这几个原语读写）。
   源 sha16 = 4c73659130aa6351
*/
/* eslint-disable */

import { zhi } from '@xlr/shared-judgment';   /* `addCase` 正文里的 `zhi[c.zi - 1]`（源里是 18-script 的全局）*/

/* 刷新回调：外壳接到 `window.renderSdb` 重定向后的那个 refresh 上（语义与源里的 `renderSdb()` 等价：
   源里 legacy 的 `saveCases/saveRules` 末尾就是拿它刷界面的）。未接时静默无操作。 */
let notifyHook = null;
export function setNotify(fn) { notifyHook = (typeof fn === 'function') ? fn : null; }
function notify() { try { if (notifyHook) notifyHook(); } catch (e) { } }

/* 复盘接缝（A4②）：源里 `setFb` 标「没应验」时直接调全局 `reviewCase(id)` ⇒ 这里改成钩子。
   复盘本体（调模型 / 写准则）属 A4③；未接时**什么都不做**（＝早前的版本那条「准备中…」不会起来）。 */
let reviewHookFn = null;
export function setReviewHook(fn) { reviewHookFn = (typeof fn === 'function') ? fn : null; }
function reviewHook(id) { try { if (reviewHookFn) reviewHookFn(id); } catch (e) { } }

var CASE_KEY = 'xlr-cases';
var RULE_KEY = 'xlr-rules';
function loadCasesRaw() {
  try {
    var a = JSON.parse(localStorage.getItem(CASE_KEY) || '[]');
    if (Object.prototype.toString.call(a) !== '[object Array]') return [];
    /* ★ 二十二版（现象：「记录点不开」·手机和 win 两端）：剔除坏条目——
       数组里哪怕混一条 null，加载时整个记录抽屉就渲染失败，
       连「记录」按钮的接线都接不上（表现：按钮点了没反应）。 */
    return a.filter(function (r) { return r && typeof r === 'object'; });
  } catch (e) { return []; }
}
function loadCases() {
  return loadCasesRaw().filter(function (r) { return !r.deleted; });
}
function saveCases(a) {
  try { localStorage.setItem(CASE_KEY, JSON.stringify(a.slice(-200))); } catch (e) { }
  notify();
}
function loadRules() {
  try {
    var a = JSON.parse(localStorage.getItem(RULE_KEY) || '[]');
    return Object.prototype.toString.call(a) === '[object Array]' ? a : [];
  } catch (e) { return []; }
}
function saveRules(a) {
  try { localStorage.setItem(RULE_KEY, JSON.stringify(a.slice(-100))); } catch (e) { }
  notify();
}
function stamp() {
  var d = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
         ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function addCase() {
  var c = window.__ctx;
  if (!c) return;
  if (window.__recId) return;   /* ★ 2026-10-08：每起一卦自动记一次，同一卦不重记 */
  var rec = {
    id: 'c' + Date.now(), t: stamp(), q: c.q, bg: c.bg || '',
    gua: c.g1 + ' · ' + c.g2 + ' · ' + c.g3 + '　' + zhi[c.zi - 1] + '时',
    cat: c.cat.name, catKey: c.catKey || 'general',
    g: [c.g1, c.g2, c.g3], zi: c.zi, src: c.src || '',
    duanci: window.__md || '', ans: '', fb: '', note: '',
    rv: '', rvWhy: '', rvAt: '',
    thread: (window.__thread || []).slice()
  };
  var a = loadCases(); a.push(rec); saveCases(a);
  window.__recId = rec.id;   /* 之后在原卦上「接着问」、解完的断辞，都记进这一条 */
}
function updateCaseDuanci() {
  var id = window.__recId;
  if (!id) return;
  var a = loadCases();
  for (var i = 0; i < a.length; i++) if (a[i].id === id) {
    a[i].duanci = window.__md || '';
    saveCases(a);
    return;
  }
}
function markModelAnswered() {
  var id = window.__recId;
  if (!id) return;
  var a = loadCases();
  for (var i = 0; i < a.length; i++) if (a[i].id === id) { a[i].ans = 'model'; saveCases(a); return; }
}
function setFb(id, fb) {
  var a = loadCases(), rec = null;
  for (var i = 0; i < a.length; i++) {
    if (a[i].id === id) {
      a[i].fb = (a[i].fb === fb ? '' : fb);
      if (a[i].fb !== '错') { a[i].rv = ''; a[i].rvWhy = ''; }   /* 撤销「没应验」→ 复盘作废 */
      rec = a[i];
    }
  }
  saveCases(a);
  if (rec && rec.fb === '错' && !rec.rv) reviewHook(id);          /* ★ 触发复盘 */
}
function setNote(id, note) {
  var a = loadCases();
  for (var i = 0; i < a.length; i++) if (a[i].id === id) a[i].note = note;
  saveCases(a);
}
function delCase(id) { markCase(id, true); }
function markCase(id, dead) {
  var a = loadCasesRaw();
  for (var i = 0; i < a.length; i++) {
    if (a[i].id === id) { if (dead) { a[i].deleted = Date.now(); } else { try { delete a[i].deleted; } catch (e) { a[i].deleted = 0; } } }
  }
  saveCases(a);
}
function restoreCase(id) { markCase(id, false); }
function purgeCase(id) { saveCases(loadCasesRaw().filter(function (r) { return r.id !== id; })); }
function purgeAllDeleted() { saveCases(loadCasesRaw().filter(function (r) { return !r.deleted; })); }
/* ★ 2026-10-22（要求：回收站多选）—— 一批 id 一次落盘，别一条一条写（省得刷十几次） */
function purgeMany(ids) {
  var m = {}; (ids || []).forEach(function (id) { m[id] = 1; });
  saveCases(loadCasesRaw().filter(function (r) { return !m[r.id]; }));
}
function restoreMany(ids) {
  var m = {}; (ids || []).forEach(function (id) { m[id] = 1; });
  var a = loadCasesRaw();
  for (var i = 0; i < a.length; i++) if (m[a[i].id]) delete a[i].deleted;
  saveCases(a);
}
function clearCases() {
  var a = loadCasesRaw(), now = Date.now();
  for (var i = 0; i < a.length; i++) if (!a[i].deleted) a[i].deleted = now;
  saveCases(a);
}
function delRule(id) {
  saveRules(loadRules().filter(function (r) { return r.id !== id; }));
}

export const RecordsStore = {
  CASE_KEY, RULE_KEY, loadCasesRaw, loadCases, saveCases, loadRules, saveRules, stamp,
  addCase, updateCaseDuanci, markModelAnswered, setFb, setNote,
  delCase, markCase, restoreCase, purgeCase, purgeAllDeleted, purgeMany, restoreMany, clearCases, delRule,
  setNotify, setReviewHook,
};
