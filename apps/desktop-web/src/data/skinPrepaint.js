/*
   ⚠ 本文件是**经典脚本**（不是 ES module）⇒ 由产出链（tools/make-doc-entry.mjs）内联进 HTML。
     不能改成模块：皮肤/明暗必须在**画第一帧之前**定到 html 上，defer 模块赶不上第一帧。
   ⚠ 源里「挂 window.XLR_SKINS / XLR_SKIN_APPLY / XLR_SKIN_CUR」那三行**不在这里** ——
     由本仓模块在模块期指向本仓实现（src/shell/main.jsx 的 mountSkins；模块期晚于解析期 ⇒ 本仓赢）。
   */
(function () {
var SKINS = [
    { k: 'bw', n: '黑白', t: '浅 · 无色相', bg: '#f4f4f5', ac: '#0f1013' },
    { k: 'hei', n: '黑夜', t: '深 · 无色相', bg: '#131316', ac: '#e8e8ec' },
    { k: 'glass', n: '梦幻', t: '浅 · 流光', bg: '#e9edf6', ac: '#3f6bf0' },
    { k: 'xuan', n: '宣纸', t: '浅 · 朱砂', bg: '#f5f3ee', ac: '#9c3b28' },
    { k: 'qing', n: '青瓷', t: '浅 · 靛青', bg: '#eef2f1', ac: '#2f6f6b' },
    { k: 'dou', n: '豆沙', t: '浅 · 陶土', bg: '#f6f1ea', ac: '#a8543c' },
    { k: 'bru', n: '卡通', t: '浅 · 高对比', bg: '#ffffff', ac: '#e8442a' },
    /*
       （黑白主题的黑色换皮）」⇒ 四个深色主题（mo/term/jin/ye）从表里摘掉，
       补一个 'hei' 黑夜 = 黑白那套无色相配色的深底版（同一个灰阶体系，反相）。 */
    /*
       色值取自**国色官网 zhongguose.com**（国内可访问）的真实中国传统色：
         花青 #2376B7 · 石绿 #57C3C2 · 沙石黄 #E5B751 · 枣红 #7C1823 · 杏黄 #F28E16 · 群青 #1772B4
       敦煌 = 白天站窟外看壁画（沙壁底 + 花青/石绿 + 枣红）；莫高窟 = 夜里提灯进窟（暖褐 + 金 + 群青）。 */
    { k: 'dh', n: '敦煌', t: '浅 · 沙壁石窟', bg: '#FBF2DE', ac: '#7C1823' },
    { k: 'mg', n: '莫高窟', t: '深 · 提灯入窟', bg: '#2A1A12', ac: '#E5B751' }
  ];
SKINS.push({"k":"tonggu","n":"铜古","t":"浅 · 西周青铜","bg":"#E9E6DF","ac":"#33402F"});
var DARK = { hei: 1, mg: 1 };
var KEY = 'xlr-skin';
var cur = null;
  try { cur = localStorage.getItem(KEY); } catch (e) { }
  var known = false;
  for (var i = 0; i < SKINS.length; i++) if (SKINS[i].k === cur) known = true;
  if (!known) cur = 'bw';
function apply(k) {
    cur = k;
    var r = document.documentElement;
    r.setAttribute('data-skin', k);
    // 明暗跟着皮肤走，否则源码里那套 data-theme 变量会把颜色盖回去
    r.setAttribute('data-theme', DARK[k] ? 'dark' : 'light');
    try { localStorage.setItem(KEY, k); } catch (e) { }
    var m = document.querySelector('.skinmenu');
    if (m) {
      var bs = m.querySelectorAll('button[data-k]');
      for (var j = 0; j < bs.length; j++) {
        bs[j].setAttribute('aria-current', bs[j].getAttribute('data-k') === k ? 'true' : 'false');
      }
    }
  }
/* ★ 本仓外包装（**不属于** legacy 正文；见文件头）：
      真不在表里的非法值不受影响（保持源的回落 bw）。
   ③ **守护**：legacy 的 32-script（body 中段）也在解析期跑，它那份 9 套表不认新皮肤 ⇒ 会把 html 上的
      data-skin 覆盖成它的回落值、并把回落值写回 storage（实测：开机第一眼永远是默认皮肤）。
      这里用 MutationObserver 盯着 data-skin，被改走就按本仓那份合法值改回来。
      ⚠ 为什么用 Observer 而不是「在 body 末尾再内联一段脚本」：后者会**往 DOM 里加节点**，
      ⚠ 自身 setAttribute 也会触发一次回调 —— 那时值已经是对的，比一下就不动（不会循环）。
       */
var want = null;
try { want = localStorage.getItem(KEY); } catch (eW) { }
for (var q = 0; q < SKINS.length; q++) if (SKINS[q].k === want) { cur = want; }
apply(cur);
window.__xlrPrepaintApply = apply;
window.__xlrPrepaint = {
  skin: cur,
  theme: document.documentElement.getAttribute('data-theme'),
  readyState: document.readyState,
  at: Date.now()
};
try {
  var guard = new MutationObserver(function () {
    if (document.documentElement.getAttribute('data-skin') !== cur) {
      try { apply(cur); } catch (eA) { }
    }
  });
  guard.observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
  window.__xlrPrepaintGuard = guard;
  document.addEventListener('DOMContentLoaded', function () { try { guard.disconnect(); } catch (eD) { } }, { once: true });
} catch (eG) { }
})();
