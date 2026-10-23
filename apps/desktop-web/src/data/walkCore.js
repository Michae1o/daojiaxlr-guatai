/*
   规矩：**提取不重写** —— 下面 esc / chip / playWalk / calmWalk 是从源文件**逐字节切片**搬来的原文
   ⚠ 与 legacy 的共存：外壳在「load」时把「window.playWalk」换成这里这一份 ⇒
     legacy 的 wireWalk / calmWalk 两层包装成为**不可达的死代码**；show() 里那句
     playWalk(c) 调到的就是本模块。
*/
/* eslint-disable */
import { G } from '@xlr/shared-judgment';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m];
  });
}
function chip(l, v, a) {
  return '<span class="tag' + (a ? ' a' : '') + '">' + esc(l) + ' <b>' + esc(v) + '</b></span>';
}
function playWalk(c) {
  var walk = document.getElementById('walk');
  var cells = walk ? walk.querySelectorAll('.wc') : [];
  var dot = document.getElementById('wDot');
  var cntEl = document.getElementById('wCount');
  var phEl = document.getElementById('wPhase');
  var card = document.getElementById('guaCard');
  var targets = [c.n1, c.n2, c.n3], names = [c.g1, c.g2, c.g3];
  var marks = ['天', '地', '人'];
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
  var total = targets[0] + targets[1] + targets[2];

  /* 六宫的圆心（建盘时量一次，之后只写 transform —— 绝不逐帧量） */
  var pts = null;
  function measure() {
    if (!walk || !cells.length) return;
    var W = walk.getBoundingClientRect();
    pts = [];
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i].getBoundingClientRect();
      pts.push([Math.round(r.left - W.left + r.width / 2), Math.round(r.top - W.top + r.height / 2)]);
    }
  }
  /* 光珠滑到第 n 宫：位移走 CSS transition ⇒ 是「滑过去」，不是「闪一下」 */
  function moveDot(n, ms) {
    if (!dot || !pts || !pts[n]) return;
    dot.style.setProperty('--hop', (ms || 0) + 'ms');
    dot.style.transform = 'translate(' + (pts[n][0] - 16) + 'px,' + (pts[n][1] - 16) + 'px)';
  }

  function reveal() {
    /* 三宫名逐个落定 + 卡片顶线扫出 + 标签浮现 */
    if (card) card.classList.add('on');
    [['gA', 'arA'], ['gB', 'arB'], ['gC']].forEach(function (grp, i) {
      setTimeout(function () {
        var el = document.getElementById(grp[0]);
        if (el) { el.textContent = names[i]; el.classList.remove('hold'); }
        grp.slice(1).forEach(function (id) {
          var e2 = document.getElementById(id); if (e2) e2.classList.remove('hold');
        });
      }, 90 + i * 170);
    });
    setTimeout(function () {
      var ch = document.getElementById('guaChips');
      if (ch) {
        ch.innerHTML =
          chip('落宫', c.g3 + (c.g3 === G[c.g3].jx ? '' : ' · ' + G[c.g3].jx), true) +
          chip('五行', G[c.g3].wx) +
          chip('体用', c.bu.t + ' · ' + c.bu.jx) +
          chip('事类', c.cat.name);
        ch.classList.remove('hold');
      }
      var sr = document.getElementById('guaSrc');
      if (sr) sr.classList.remove('hold');
      /* */
      if (c.withXiang && typeof xiangBoardHtml === 'function' && sr && sr.insertAdjacentHTML && !document.getElementById('xiangBoard')) {
        sr.insertAdjacentHTML('afterend', xiangBoardHtml(c));
      }
    }, 640);
  }

  if (!cells.length || reduce || !total || total <= 0 || total > 400) { reveal(); return; }

  /*
     ① 节奏放慢：每格 120~215ms（原来 26~115ms，一格一闪，看着就是抽筋）；
     ② 走法换掉：不再逐格闪背景，改成**一颗光珠沿着圈滑行**（transform 过渡），
        走到哪一格，那一格才柔柔亮起（背景过渡 .34s），落宫时补一圈涟漪。
     全程约 2.5~3 秒走完，收尾再逐个落定三宫名。 */
  var delay = Math.max(120, Math.min(215, Math.round(2600 / total)));
  var pos = 0, phase = 0, count = 0, first = true;

  function tick() {
    for (var i = 0; i < cells.length; i++) cells[i].classList.remove('lit');
    var cell = cells[pos];
    if (cell) cell.classList.add('lit');
    moveDot(pos, first ? 0 : delay);
    first = false;
    count++;
    if (cntEl) cntEl.textContent = String(count);
    if (phEl) phEl.textContent = marks[phase] + '宫';
    if (count >= targets[phase]) {
      if (cell) cell.classList.add('land', 'wpop');
      var m = cell ? cell.querySelector('.wm') : null;
      /* 同一个格可能被落两次（如地宫与人宫同宫），标记要累加、不能覆盖 */
      if (m) m.textContent = (m.textContent ? m.textContent + '·' : '') + marks[phase];
      (function (cc) { setTimeout(function () { if (cc) cc.classList.remove('wpop'); }, 660); })(cell);
      phase++; count = 0;
      if (phase >= 3) { setTimeout(reveal, 360); return; }
      if (cntEl) cntEl.textContent = '0';
      setTimeout(tick, delay * 2.2);
      return;
    }
    pos = (pos + 1) % 6;
    setTimeout(tick, delay);
  }
  /* 起步前留半拍：让滚动与入场先落定，光珠从大安静静地亮起来 */
  measure();
  setTimeout(function () { measure(); moveDot(0, 0); }, 80);
  setTimeout(tick, 300);
}
function calmWalk() {
    if (window.__pwCalm) return;
    var orig = window.playWalk;
    if (typeof orig !== 'function') return;
    window.__pwCalm = 1;
    window.playWalk = function (c) {
      var st = window.setTimeout;
      var walkEl = document.getElementById('walk');
      /* 先挂 calm：算宫逻辑照跑（三宫名/标签/结论都照常亮），但里面一律不播过渡与动画 */
      try { if (walkEl) walkEl.classList.add('calm'); } catch (eC) { }
      /* ★★ 光压定时器还不够：走宫内部是一长串嵌套 setTimeout（每格几十~几百 ms），
         只压第一层的话，嵌套的那些仍按原速跑 ⇒ 落卦后卦名/胶囊要两秒多才填上（页面空一会儿）。
         所以同时把 prefers-reduced-motion 临时伪装成 true —— 应用里有 reduce 分支会直接出结果。 */
      var mm = window.matchMedia;
      try {
        window.matchMedia = function (q) {
          if (String(q).indexOf('prefers-reduced-motion') > -1) {
            return { matches: true, media: q, addListener: function () { }, removeListener: function () { }, addEventListener: function () { }, removeEventListener: function () { } };
          }
          return mm.apply(window, arguments);
        };
      } catch (eM2) { }
      try {
        window.setTimeout = function (fn, ms) { return st(fn, 0); };
        orig.call(this, c);
      } catch (e1) {
        try { orig.call(this, c); } catch (e2) { }
      } finally {
        window.setTimeout = st;
        try { window.matchMedia = mm; } catch (eM3) { }
      }
      try {
        var walk = document.getElementById('walk');
        var dot = document.getElementById('wDot');
        var cells = walk ? walk.querySelectorAll('.wc') : [];
        if (!walk || !dot || !cells.length) return;
        var W = walk.getBoundingClientRect(), idx = cells.length - 1;
        var want = String((c && c.g3) || '').trim();
        for (var i = 0; i < cells.length; i++) {
          if (want && (cells[i].textContent || '').trim().indexOf(want) > -1) { idx = i; break; }
        }
        var r = cells[idx].getBoundingClientRect();
        dot.style.setProperty('--hop', '0ms');
        dot.style.transform = 'translate(' + Math.round(r.left - W.left + r.width / 2 - 16) +
          'px,' + Math.round(r.top - W.top + r.height / 2 - 16) + 'px)';
      } catch (e3) { }
      /* 收尾：光珠在「不走马灯」的前提下没有意义，还压在宫名上 ⇒ 藏掉（落宫那一格自带高亮）；
         同时把圆心计数补成最终值，避免停在「0 · 起势」像没跑完。 */
      try {
        var dot2 = document.getElementById('wDot');
        if (dot2) dot2.style.display = 'none';
        var cnt = document.getElementById('wCount'), ph = document.getElementById('wPhase');
        /* */
        if (cnt) cnt.style.display = 'none';
        if (ph) ph.textContent = '天 · 地 · 人';
        var cs = walkEl ? walkEl.querySelectorAll('.wc') : [];
        /*
           走马灯走过时给每格盖的「天/地/人」标记要补回来（大宫＝g1、地宫＝g2、人宫＝g3；
           同一宫被点到两次就叠成「天 · 人」）。 */
        var mk = [['天', c && c.g1], ['地', c && c.g2], ['人', c && c.g3]];
        var k2, i2, wm2;
        for (i2 = 0; i2 < cs.length; i2++) {
          wm2 = cs[i2].querySelector('.wm');
          if (wm2) wm2.textContent = '';
        }
        for (i2 = 0; i2 < mk.length; i2++) {
          if (!mk[i2][1]) continue;
          for (k2 = 0; k2 < cs.length; k2++) {
            var wg = cs[k2].querySelector('.wg');
            if (wg && wg.textContent.trim() === String(mk[i2][1]).trim()) {
              wm2 = cs[k2].querySelector('.wm');
              if (wm2) wm2.textContent = wm2.textContent ? (wm2.textContent + ' · ' + mk[i2][0]) : mk[i2][0];
              break;
            }
          }
        }
        /* 落宫必须有标记：圆盘上把落宫那一格打上高亮（.land 自带底色 + 2px 底条） */
        if (c && walkEl) {
          var w3 = String(c.g3 || '').trim();
          for (var k = 0; k < cs.length; k++) {
            if (w3 && (cs[k].textContent || '').indexOf(w3) > -1) cs[k].classList.add('land');
          }
        }
      } catch (e4) { }
    };
  }

/* 安装器（手写，非切片）：语义照 38-script 的 wireWalk()，但只留它**切得出**的那部分。
   ⚠⚠ 时序（实测，别想当然）：**模块脚本在 DCL 之前执行** ⇒ 明文臂里本安装跑在 legacy 的 ready()（DCL 注册）
      **之前** ⇒ 之后 legacy 的 wireWalk() 还会再看一眼 window.playWalk，而它有幂等守卫 __xlrWrapped
      ⇒ **必须给自己这份盖上那个旗**，否则 legacy 会再包一层 = 两套都在跑（切步跑两次、watchReveal 又挂一个
   ⚠ __pwCalm：legacy 的 calmWalk() 用同一个旗做幂等 ⇒ 这里先用切片版 calmWalk 把它置 1（它自己会置），
      legacy 那份到 DCL 时直接 return。
   ⚠ __xlrWalkLegacy：安装那一刻 window.playWalk 是什么就存什么（明文臂 = 16-script 的原始 playWalk；
      若 legacy 那侧已先跑过，存到的就是它那层包装）—— **运行时不再调用**，只作对照。
   ⚠ autoTimer：wireWalk 里那句 clearTimeout(autoTimer) **照抄不了**（闭包变量），实测它**永远是 null**
      */
export function installWalk(opts) {
  const hooks = opts || {};
  if (window.__xlrWalkInstalled) return false;
  window.__xlrWalkInstalled = 1;
  window.__xlrWalkLegacy = window.playWalk;
  window.playWalk = playWalk;                 /* ① 换成切片版 */
  try { window.__pwCalm = 0; } catch (e0) { }
  calmWalk();                                 /* ② 用切片版 calmWalk 压成瞬时版（它会把 __pwCalm 置回 1） */
  /* ③ 兜底：万一切片版 calmWalk 早退（守卫/环境变了）⇒ 照样把这一层包装装上（否则「切步 + 看断辞按钮」
        */
  const settle = (window.playWalk === playWalk) ? playWalk : window.playWalk;
  if (settle === playWalk) { try { window.__xlrWalkCalmFail = 1; } catch (eF) { } }
  window.playWalk = function (c) {
    try { if (typeof window.__xlrSetStep === 'function') window.__xlrSetStep('gua'); } catch (eS) { }
    const r = settle.call(this, c);
    if (hooks.onSettle) { try { hooks.onSettle(); } catch (eH) { } }
    return r;
  };
  /* ④ **关键**：盖上 legacy 的幂等旗 __xlrWrapped，挡住 wireWalk() 再包一层（见上面时序说明）。
     不盖的后果实测：#guaCard 里出现两个「看断辞 · 结果 →」。 */
  try { window.playWalk.__xlrWrapped = true; } catch (eW2) { }
  return true;
}

export const WalkCore = { installWalk, playWalk, calmWalk };
