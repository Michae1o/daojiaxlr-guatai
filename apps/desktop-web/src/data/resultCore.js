/*
        本文件不含任何判据算式（R4）：切片正文里的 `zhi` 由下面的 import 提供（包名入口，不新抄一份）。
   ⚠ 与 legacy 的共存：`window.bindResult` 由外壳换成 React 侧收尾件（只留 renderSdb 那一步）
      ⇒ legacy 那份整函数成为死代码；本模块这几个函数是**唯一活的**那一份。
*/
/* eslint-disable */
import { zhi } from '@xlr/shared-judgment';

function copyClean() {
  var c = window.__ctx; if (!c) return '';
  var L = [];
  L.push('【所问】' + c.q);
  if (c.bg) L.push('【背景】' + c.bg);
  L.push('【卦】' + c.g1 + ' · ' + c.g2 + ' · ' + c.g3 + '　' + zhi[c.zi - 1] + '时　（' + c.src + '）');
  if (c.cat && c.cat.name) L.push('【事类】' + c.cat.name);
  var d = document.getElementById('doc');
  var txt = d ? String(d.innerText || '').trim() : '';
  if (txt) L.push('【断辞】\n' + txt);
  L.push('道家小六壬 · 卦台');
  return L.join('\n');
}
function toast(msg) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;' +
    'background:rgba(32,32,32,.84);color:#fff;padding:7px 16px;border-radius:999px;font-size:12.5px;' +
    'letter-spacing:.04em;pointer-events:none;opacity:0;transition:opacity .18s;';
  document.body.appendChild(t);
  requestAnimationFrame(function () { t.style.opacity = '1'; });
  setTimeout(function () {
    t.style.opacity = '0';
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
  }, 1500);
}
function fallback(t, done) {
  var ta = document.createElement('textarea');
  ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  var ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { }
  document.body.removeChild(ta);
  done(ok);
}
function revealNewBtn() {
  var b = document.getElementById('btnNew');
  if (b) b.hidden = false;
}

export const ResultCore = { copyClean, toast, fallback, revealNewBtn };
