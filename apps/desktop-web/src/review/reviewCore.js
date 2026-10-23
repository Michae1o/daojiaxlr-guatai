/*
   ⚠ **为什么住在 `src/review/` 而不是 `src/data/`**：复盘主流程里有 `fetch` —— 而构建检查
     （fetch / XMLHttpRequest / WebSocket / EventSource）。搬的时候两条检查都拦过一次（R4 ⇒ RV_SYS 不切、
     ① ⇒ 本文件挪出 data/）——**检查是对的**，改的是搬法不是检查。
        有意改动**只有 1 条**：
     · `reviewCase`：renderSdb(); → notify();

   ⚠ 与 legacy 的共存：legacy 那份同名函数仍在原位（`legacy/**` 一字不动），外壳把
     `window.reviewCase / reviewBlock / ruleBlock / confirmRule` 换成本模块的导出 ⇒ 名字还在旧段里，
     **活得是这一份**（React 抽屉走的就是它；legacy 的 `setFb` 也经记录钩子落到这里）。
     ⇒ `say()` 一开口就找得到 `#rv-<id>`。React 的 setState 是异步的 ⇒ 抽屉那条路径**等渲染提交后**再跑
     `reviewCase`（见 Records.jsx 的 rvPending effect）；其余行为逐字不变。
*/
/* eslint-disable */

import { RecordsStore } from '../data/recordsStore.js';

/*
   这里只转发提示词正文，不在本文件再存一份。 */
const RV_SYS = (typeof window !== 'undefined' && window.RV_SYS) || '';

/* 读写一律走 A4①② 那份（本模块不自己碰 localStorage） */
const loadCases = () => RecordsStore.loadCases();
const loadRules = () => RecordsStore.loadRules();
const saveCases = (a) => RecordsStore.saveCases(a);
const saveRules = (a) => RecordsStore.saveRules(a);
const stamp = () => RecordsStore.stamp();

/* 刷新：源里 `reviewCase` 末尾调 renderSdb() ⇒ 切片里换成 notify()；外壳接到与 renderSdb 重定向同一个口子 */
let notifyHook = null;
export function setNotify(fn) { notifyHook = (typeof fn === 'function') ? fn : null; }
function notify() { try { if (notifyHook) notifyHook(); } catch (e) { } }

/*
   （`loadSet` / `needsKey` / `apiURL` / `hdr` / `payloadOf` / `readSSE` 属设置与出口，本批不动）。
   `sdbTab`（`confirmRule` 末尾切到准则页）同理转发；React 侧再补一次自己的页签切换。 */
const fwd = (nm) => (...a) => (typeof window[nm] === 'function' ? window[nm](...a) : undefined);
const loadSet = fwd('loadSet'), needsKey = fwd('needsKey'), apiURL = fwd('apiURL');
const hdr = fwd('hdr'), payloadOf = fwd('payloadOf'), readSSE = fwd('readSSE'), sdbTab = fwd('sdbTab');
const esc = (s) => (typeof window.esc === 'function' ? window.esc(s) : String(s == null ? '' : s));

function rvFind(id) {
  var a = loadCases();
  for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
  return null;
}
function rvSave(id, html, why, rule) {
  var a = loadCases();
  for (var i = 0; i < a.length; i++) {
    if (a[i].id === id) {
      if (html != null) a[i].rv = html;
      if (why != null) a[i].rvWhy = why;
      if (rule != null) a[i].rvRule = rule;
    }
  }
  saveCases(a);
}
function reviewCase(id) {
  var rec = rvFind(id);
  if (!rec) return;
  var row = document.getElementById('rv-' + id);
  function say(msg, cls) {
    if (!row) row = document.getElementById('rv-' + id);
    if (!row) return;
    row.className = 'rv on';
    var b = row.querySelector('.rv-b'); if (b) b.innerHTML = msg;
    var s = row.querySelector('.rv-s'); if (s) s.textContent = cls || '';
  }

  var s = loadSet();
  var bad = needsKey(s);
  if (bad) {
    say('<span class="rv-no">要复盘得先接一个模型——' + esc(bad) +
        '<br>复盘会把这一卦和实际结果一起交给模型，让它指出错在哪一步。' +
        '<br>（不接模型的话，这一条就只留在记录里，不生成复盘。）</span>', '未接模型');
    return;
  }

  var usr = '请复盘这一卦：\n\n' +
    '【所问】' + rec.q + '\n' +
    (rec.bg ? '【背景】' + rec.bg + '\n' : '') +
    '【卦】' + rec.gua + '\n' +
    '【事类】' + (rec.cat || '') + '\n' +
    (rec.duanci ? '【我当时给的断辞】\n' + rec.duanci + '\n' : '【我当时给的断辞】（未记）\n') +
    '【实际结果·卦主确认】' + (rec.note || '（卦主未写实际情况）') + '\n\n' +
    (ruleBlock() || '') +
    '请按格式复盘。';

  var ep = apiURL();
  say('<span class="cur"></span>', '复盘进行中…');
  var acc = '';
  var t0 = Date.now();

  fetch(ep.url, {
    method: 'POST', headers: hdr(s, ep.proxy),
    body: JSON.stringify(payloadOf(s, ep.proxy,
      [{ role: 'system', content: RV_SYS }, { role: 'user', content: usr }], true))
  })
    .then(function (resp) {
      if (!resp.ok) return resp.text().then(function (t) { throw new Error('HTTP ' + resp.status + ' ' + String(t).slice(0, 200)); });
      if (!resp.body || !resp.body.getReader) {
        return resp.json().then(function (j) {
          acc = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        });
      }
      return readSSE(resp, function (d) { acc += d; say(rvFmt(acc) + '<span class="cur"></span>', '复盘进行中…'); });
    })
    .then(function () {
      var sec = ((Date.now() - t0) / 1000).toFixed(1);
      var rule = '', m = acc.match(/RULE[:：]\s*(.+)/);
      if (m) rule = m[1].trim();
      var why = '', m2 = acc.match(/【依据】([\s\S]*?)(?=\n【|$)/);
      if (m2) why = m2[1].trim();
      /* 把 RULE 那一行从展示里去掉（它单独变成准则），其余照排 */
      var show = rvFmt(acc).replace(/\s*RULE[:：][\s\S]*$/, '');
      rvSave(id, show, why, rule);
      say('', '');
      notify();
      var st = document.getElementById('stat');
      if (st) st.textContent = '复盘好了（用时 ' + sec + ' 秒）。看完点「写入准则」——不点就不落库。';
    })
    .catch(function (e) {
      var m3 = String(e && e.message || e);
      say('<span class="rv-no">复盘失败：' + esc(m3) + '</span>' +
          (ep.proxy ? '' : '<br><span class="mini">无法连接。请检查网络设置，或更换供应商。如仍有问题，请看【联系】页面的说明。</span>'), '失败');
    });
}
function rvFmt(t) {
  return esc(t).split('\n').map(function (ln) {
    var x = ln.trim();
    if (!x) return '<div style="height:6px"></div>';
    var m = x.match(/^【(.+?)】\s*(.*)$/);
    if (m) return '<div class="rv-t">【' + m[1] + '】</div><div>' + m[2] + '</div>';
    return '<div>' + x + '</div>';
  }).join('');
}
function reviewBlock() {
  var a = loadCases().filter(function (r) { return r.fb; });
  if (!a.length) return '';
  a = a.slice(-6);
  var L = ['【过往复盘 · 只作校准，不要拿它当规则往新卦上套】'];
  a.forEach(function (r) {
    L.push('· ' + r.t + '　' + r.gua + '　问「' + r.q + '」　→ ' +
      (r.fb === '错' ? '我上次断错了' : '上次断对了') +
      (r.note ? '；实际情况：' + r.note : ''));
  });
  L.push('复盘里凡是我上次断错的地方，这次要留意别再犯；但每卦仍以本卦自己的判据为准。');
  L.push('');
  return L.join('\n');
}
function ruleBlock() {
  var rs = loadRules();
  if (!rs.length) return '';
  var L = ['【本门已确认的准则 · 必须遵守】',
           '（这些是卦主本人逐条确认过的修正，来自实断复盘。遇到同类情形按它断，与判据冲突时以它为准。）'];
  rs.forEach(function (r, i) {
    L.push('· 第 ' + (i + 1) + ' 条（' + r.at + (r.gua ? '，' + r.gua : '') + '）：' + String(r.rule || '').replace(/<[^>]+>/g, ''));
    if (r.why) L.push('    依据：' + String(r.why).replace(/<[^>]+>/g, ''));
  });
  L.push('');
  return L.join('\n');
}
function confirmRule(id) {
  var a = loadCases(), rec = null;
  for (var i = 0; i < a.length; i++) if (a[i].id === id) rec = a[i];
  if (!rec || !rec.rv) return;
  var rs = loadRules();
  rs.push({
    id: 'r' + Date.now(), at: stamp(), from: rec.id, gua: rec.gua, q: rec.q,
    rule: rec.rvRule || '', why: rec.rvWhy || ''
  });
  saveRules(rs);
  var st = document.getElementById('stat');
  if (st) st.textContent = '已写入准则（第 ' + rs.length + ' 条）。以后解卦会自动带上它。';
  sdbTab('rules');
}

export const ReviewCore = {
  RV_SYS, rvFind, rvSave, reviewCase, rvFmt, reviewBlock, ruleBlock, confirmRule, setNotify,
};
