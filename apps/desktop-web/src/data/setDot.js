/* apps/desktop-web/src/data/setDot.js —— 机械生成，请由工具生成，不要手改
 *
 * 内容 = 早期实现那五块的**逐字切片**（零声明差异）：
 *   `24-script.txt` → `DEF`(L15) · `loadSet`(L16–21) · `updateSetDot`(L30–35)
 *   `26-script.txt` → `needsKey`(L68–72) · `refreshLLMWho`(L192–198)
 *
 * 为什么在本仓（ 收口）：`src/data/showCore.js` 的 `updateSetDot()` 转发 `window.updateSetDot`，
 * 而早期实现不在时（ 砍段之后）那条转发会抛 `… undefined (reading 'apply')`（实测复现）。
 * ⇒ 本模块把这几件收归本仓，并由外壳把 `window.loadSet / window.refreshLLMWho / window.updateSetDot`
 *   指到这一份（`SetDot.mount()`，在 `shell/main.jsx` 里挂）。
 * ⚠ 切片里的自由变量（`loadSet` / `refreshLLMWho` / `needsKey`）都解析到**本模块作用域**的这几份
 *   ⇒ 与早期实现是否还在无关（这正是要的效果）。
 */
/* eslint-disable */

/* ===== DEF（默认设置）（源 24-script.txt）===== */
var DEF = { wire: 'direct', base: 'https://api.deepseek.com', model: 'deepseek-chat', key: '', temp: 0.5, proxy: 'http://127.0.0.1:8788' };

/* ===== loadSet（源 24-script.txt）===== */
function loadSet() {
  var s = {};
  try { s = JSON.parse(localStorage.getItem('xlr-llm') || '{}') || {}; } catch (e) { s = {}; }
  for (var k in DEF) if (s[k] === undefined) s[k] = DEF[k];
  return s;
}

/* ===== updateSetDot（源 24-script.txt）===== */
function updateSetDot() {
  var s = loadSet();
  var ready = s.model && s.base && (s.wire === 'proxy' || s.key || /localhost|127\.0\.0\.1/.test(s.base));
  document.getElementById('setDot').className = 'dot' + (ready ? ' on' : '');
  if (typeof refreshLLMWho === 'function') refreshLLMWho();
}

/* ===== needsKey（源 26-script.txt）===== */
function needsKey(s) {
  if (!s.model || !s.base) return '还没配模型。点右上角「设置」。';
  if (s.wire === 'direct' && !s.key && !/localhost|127\.0\.0\.1/.test(s.base)) return '直连需要 API Key，请在「设置」里填。';
  return '';
}

/* ===== refreshLLMWho（源 26-script.txt）===== */
function refreshLLMWho() {
  var el = document.getElementById('llmWho');
  if (!el) return;
  var s = loadSet();
  if (needsKey(s)) { el.textContent = '未接模型'; return; }
  el.textContent = '已接 ' + s.model + ' · ' + (s.wire === 'proxy' ? '本地中转' : '浏览器直连');
}

/* ===== 装配层（本工具写的那一层，不是切片）===== */
export const SetDot = {
  loadSet: loadSet,
  needsKey: needsKey,
  refreshLLMWho: refreshLLMWho,
  updateSetDot: updateSetDot,
  /*
       而共享判据里有个导出就叫「G」⇒ 单字母变量名会被误判成「判据定义体落盘」（本工具首跑就栽在这；
       ⚠ 连注释里写成赋值形式也会被抓 —— 本工具第二跑就是被这句注释自己绊的）。 */
  mount: function () {
    var did = [];
    var OURFNS = { loadSet: loadSet, refreshLLMWho: refreshLLMWho, updateSetDot: updateSetDot };
    for (var k in OURFNS) {
      try {
        var had = typeof window[k] === 'function';
        if (had && window[k] === OURFNS[k]) continue;
        window[k] = OURFNS[k];
        did.push(k + (had ? '(was:legacy)' : '(was:absent)'));
      } catch (e) { }
    }
    return did;
  }
};
