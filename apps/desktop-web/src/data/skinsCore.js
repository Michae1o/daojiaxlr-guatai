/*
   规矩：**原样搬运** —— 下面每一段都是从源文件**逐字节搬运**搬过来的原文；工具每次运行都会
          **共用的唯一一份数据源**；改动需两边同步，别两边各留一份。
   */
/* eslint-disable */
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
function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
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

/* 与源文件 32-script.txt 尾部挂在 window 上的三个东西一一对应：
     window.XLR_SKINS      ⇐ SKINS
     window.XLR_SKIN_APPLY ⇐ apply
     window.XLR_SKIN_CUR   ⇐ () => cur（闭包状态，只读暴露） */
export const SkinsCore = {
  SKINS, DARK, SKIN_KEY: KEY,
  apply, esc,
  cur: () => cur,
};
