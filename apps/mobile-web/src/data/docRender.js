/* docRender.js —— 断辞正文的渲染（`renderDoc` / `bold` / `htmlEsc`）**唯一一份**。
 *
 * 来源（**逐字**）：上游 `(upstream)` L2302–2317
 *   function renderDoc(t){ … esc(t).split('\n').forEach(…) }  ·  function bold(s){ … }
 *   （上游那份的 `esc` = L3–7 的 `esc()`，这里用同义的 htmlEsc。）
 *
 *   在新产物里**根本不存在**。于是任何走 `window.renderDoc` 的调用点都会：
 *     ① 静默什么都不做（守卫写法），或 ② 抛 TypeError 把整棵树打崩（裸调用，记录抽屉那次就是）。
 *   ⇒ 收敛成一份模块：调用点直接 import，**不再经 window**；`window` 上若真有早期实现那份，
 */
export function htmlEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]);
}

export function boldStr(s) {
  return String(s == null ? '' : s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function bold(s) {
  const w = typeof window !== 'undefined' ? window.bold : undefined;
  return typeof w === 'function' ? w(s) : boldStr(s);
}

export function renderDoc(t) {
  const w = typeof window !== 'undefined' ? window.renderDoc : undefined;
  if (typeof w === 'function') return w(t);
  /*
     —— 本函数此前**漏搬**了早期实现同族函数里的 `one()` / `verdict()` / `<div class="jy">`：
     本文件头注写的来源是上游 `现代版-预览.html` L2302–2317，那是**加 verdict 之前**的版本；
     而 2026-10-10 用户在早期实现补的那段（旧 `apps/mobile-web/chunks/a10.html` L102–135，其注释逐字：
     「断辞卡里**第一块正文**＝结论……① 判定词单独包一层（.vd），颜色由 --jyc 给；
       ② 紧跟的括号（吉凶·宫名、依据括注）降成灰阶小字（.jx），不跟判定词抢眼。
       只在**渲染层**拆，业务字符串一个字不改」）没跟着搬。
     ⇒ 后果（实测，390×844 叁断卦）：新版把「能（小吉 · 小吉）」整条当普通粗体正文渲染成
       `<strong>` = 34px/700/黑；早前的版本是 `.vd`《能》34px/700 + `.jx`《（小吉 · 小吉）》**17px/400/灰**。
       8 屏比对里 04/05/07 三屏那个完全相同的差异框 [110,283,316,315]（0.702%/0.576%）就是它。
     ⇒ 下面按早期实现 L112–135 逐字补回（`one()` 的 lead/计数、`verdict()` 的正则与产物、`bold`→boldStr 等价）。 */
  let nDiv = 0;
  function one(s) {
    const lead = (nDiv === 0);
    nDiv++;
    return '<div' + (lead ? ' class="jy"' : '') + '>' + (lead ? verdict(s) : boldStr(s)) + '</div>';
  }
  function verdict(s) {
    const m = s.match(/^(\*\*)?([^（）()]{1,16})（([^（）]{0,44})）(\*\*)?(.*)$/);
    if (!m) return boldStr(s);
    return '<span class="vd">' + m[2] + '</span><span class="jx">（' + m[3] + '）</span>' + boldStr(m[5]);
  }
  let out = '';
  htmlEsc(t).split('\n').forEach((ln) => {
    const s = ln.trim();
    if (!s) { out += '<div style="height:7px"></div>'; return; }
    const m = s.match(/^【(.+?)】\s*(.*)$/);
    if (m) {
      out += '<h4>【' + m[1] + '】</h4>';
      if (m[2]) out += one(m[2]);
      return;
    }
    out += one(s);
  });
  return out;
}

export const DocRender = { htmlEsc, boldStr, bold, renderDoc };
