/*
        （源里逐字有 / 声明差异逆回去 == 源切片 / 产物里就是这份正文）。改行为要改 legacy 源再重跑本工具。
   —— 三件各自的来源与接管手法 ——
      源里是顶层语句（var topBar / function markTop / addEventListener / 初调）⇒ 整块包进 installTopBar()。
      markTop 在源里是**全局函数**（18-script 是普通脚本）⇒ 接管 = 先按名摘掉早期实现那条 scroll 监听，
      这里只把 window.toast 指过去 ⇒ legacy 的调用者（如设置页 say()）自动走本项目的实现。
      DARKSKIN + toggleDayNight，源里那段按钮级绑定 wireDayNight **故意不切**）。
      ⚠ 早期实现那份监听是 IIFE 内的函数、按名摘不掉 ⇒ 接管手法 = **document 捕获阶段拦 #btnDN**
      再盖上早期实现看的封条 data-dnwired（叫它的看门狗别再往上挂）。
      源里的自由变量 XLR_SKINS / applySkin 在这里分别绑定 SkinsCore.SKINS 与 src/data/skinApply.js。
*/
/* eslint-disable */
import { SkinsCore } from './skinsCore.js';
import { applySkin } from './skinApply.js';
import { ResultCore } from './resultCore.js';

/* 源里是 38-script IIFE 里读的全局主题表 ⇒ 绑定同一份表（不自抄一份） */
const XLR_SKINS = SkinsCore.SKINS;

/* ===== ① 顶栏吸顶：切片正文（零差异） ===== */
function installTopBar() {
  /* */
  try { if (typeof window.markTop === 'function') window.removeEventListener('scroll', window.markTop); } catch (e0) { }
var topBar = document.getElementById('top');
function markTop() { topBar.classList.toggle('stuck', window.scrollY > 6); }
window.addEventListener('scroll', markTop, { passive: true });
markTop();
  window.__xlrTopHandler = markTop;   /* 交出来给判据做归属实验（摘掉它 ⇒ 滚动应当彻底没人管） */
  return true;
}

/* ===== ③ 白天/黑夜：切片正文（零差异） ===== */
var DARKSKIN = (function () {
    var m = {}, list = (typeof XLR_SKINS !== 'undefined' && XLR_SKINS) || [];
    for (var i = 0; i < list.length; i++) if (String(list[i].t || '').indexOf('深') === 0) m[list[i].k] = 1;
    m.hei = 1; m.mg = 1;
    return m;
  })();
  function toggleDayNight() {
    var curSkin = document.documentElement.getAttribute('data-skin') || 'xuan';
    if (DARKSKIN[curSkin]) {
      var back = 'xuan';
      try { back = localStorage.getItem('xlr-skin-prevlight') || 'xuan'; } catch (e2) { }
      if (DARKSKIN[back]) back = 'xuan';
      applySkin(back);
    } else {
      try { localStorage.setItem('xlr-skin-prevlight', curSkin); } catch (e3) { }
      /*
         四个深色主题、只留「黑夜」当深色侧 ⇒ 这里跟着改成 'hei'，否则切夜会落到一个
         已从主题表里摘掉的键上（菜单里没有它、切换按钮却跳过去）。 */
      applySkin('hei');
    }
  }

/* ===== 手写装配：把三件接到页面上（判据可复跑） ===== */
let dnHits = 0;                       /* 我们拦到几次（判据据此证明"是我们处理的"，不是早期实现那条） */
function installDayNight() {
  const b = document.getElementById('btnDN');
  if (!b) return false;
  /* 盖上早期实现看的封条：它的看门狗每 125ms 会再调它自己的 wireDayNight —— 不盖就会多挂几条监听 */
  b.setAttribute('data-dnwired', '1');
  /* */
  document.addEventListener('click', function (e) {
    const t = e.target;
    if (!t || !t.closest) return;
    const hit = t.closest('#btnDN');
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    dnHits += 1;
    toggleDayNight();
  }, true);
  return true;
}
/* */
export function detachTop() {
  try { window.removeEventListener('scroll', window.__xlrTopHandler); return true; } catch (e1) { return false; }
}
export function attachTop() {
  try { window.addEventListener('scroll', window.__xlrTopHandler, { passive: true }); return true; } catch (e2) { return false; }
}

/** 唯一入口：外壳在模块顶层调一次（幂等：__xlrGlobalsMounted） */
export function mount() {
  if (window.__xlrGlobalsMounted) return false;
  window.__xlrGlobalsMounted = 1;
  try { installTopBar(); } catch (eT) { }
  try { window.toast = ResultCore.toast; } catch (eO) { }   /* ② 浮条：指向同一份实现 */
  try { installDayNight(); } catch (eD) { }
  return true;
}

export const Globals = {
  mount,
  toast: ResultCore.toast,
  toggleDayNight,
  installDayNight,
  detachTop,
  attachTop,
  hits: function () { return dnHits; },
};
