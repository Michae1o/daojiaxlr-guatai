/*
        （源里逐字有且唯一 / 声明差异逆回去 == 源切片 / 产物里就是这份正文）。
   —— 两块各自的来源 ——
      拦下之后补一行 e.stopPropagation()，理由见下）。⚠ 委托整块是 L237–L246 ——
   —— 为什么要那 1 处声明差异 ——
   早期实现那条委托挂在 **document 捕获**阶段、是**匿名监听**（按名摘不掉）⇒ 接管手法 = 把它那条回调正文
   照抄过来、挂到 **window 捕获**（早于 document）并在拦下时 stopPropagation ⇒ 早期实现那条永远收不到
   本文件这份）**再开一次** —— 「只开一次」正是本件的判据（Tauri 桩里 invoke 必须恰好 1 次）。
   —— 装配（手写）——
   它们挂在 s2ask 里，**不进三臂比对**（早期版本臂没有外壳自报）。
   源 sha16：18-script = 601f0a75442e2beb
*/
/* eslint-disable */

/* ===== ① 统一出口：切片正文（零差异） ===== */
function openOut(url) {
  var T = window.__TAURI__;
  if (T && T.core && T.core.invoke) { T.core.invoke('open_url', { url: url })['catch'](function () { }); return; }
  if (window.Capacitor && typeof window.Capacitor.getPlatform === 'function') {
    try { location.href = url; } catch (e) { }
    return;
  }
  try { window.open(url, '_blank'); } catch (e) { }
}

/* ===== ② 页级捕获委托：**回调正文**逐字切片（声明差异 1 处） ===== */
let clicksSeen = 0;      /* 本项目的捕获处理函数被叫到几次（任何点击都算） */
let linksHandled = 0;    /* 其中「真的是 http(s) 外链、且被我们拦下」几次 */
function onCaptureClick(e) {
  clicksSeen += 1;

  var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
  if (!a) return;
  var href = a.getAttribute('href') || '';
  if (!/^https?:/i.test(href)) return;
  if (window.__TAURI__ || (window.Capacitor && typeof window.Capacitor.getPlatform === 'function')) {
    e.preventDefault();
    e.stopPropagation();   /* ★ 声明差异（唯一一处）：见文件头 —— 不让事件继续走到早期实现那条 document 委托 */
    openOut(href);
  }

  if (e.defaultPrevented) linksHandled += 1;   /* 手写：正文逐字（不能往里塞计数）⇒ 用 defaultPrevented 认这件事 */
}

/* ===== 手写装配 ===== */
export function mount() {
  if (window.__xlrOpenOutMounted) return false;
  window.__xlrOpenOutMounted = 1;
  window.openOut = openOut;                                 /* 早期实现直接调用者 ⇒ 走我们这份 */
  window.addEventListener('click', onCaptureClick, true);    /* ★ 抢在早期实现那条 document 捕获委托之前 */
  return true;
}

export const OpenOut = {
  openOut,
  mount,
  seen: function () { return clicksSeen; },
  handled: function () { return linksHandled; },
};
