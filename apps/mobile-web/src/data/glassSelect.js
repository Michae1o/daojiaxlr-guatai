/*
   规矩：**提取不重写** —— 下表每一个成员都是从源文件**逐字节切片**搬过来的原文；
      ① 幂等标记 data-gsel → 自用 data-xgs；② 块内另盖自用标记 data-xgs（data-gsel 那句照留）；
      ③ 一次性闸 window.__gselWired → 自用 window.__xgsWired。
   ⚠ 为什么必须改（两条都是「照抄会坏」）：① 照抄原判据 ⇒ 把 React 自己盖的封条当成「不用接管」⇒ 弹层永远不开；
      ② 沿用同名闸 ⇒ React 这份被自己的闸挡死 ⇒ 弹层的 Esc / ↑↓ / 回车全没人接。
   来源 sha16 = 1eb17e2ab562b52b
*/
var gselOpen = null;
  function closeGlass() {
    if (!gselOpen) return;
    if (gselOpen.parentNode) gselOpen.parentNode.removeChild(gselOpen);
    gselOpen = null;
  }
  function gselPick(sel, idx) {
    sel.selectedIndex = idx;
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    closeGlass();
  }
  function gselHi(box, d) {
    var bs = box.querySelectorAll('button[data-i]'), cur = 0;
    for (var i = 0; i < bs.length; i++) if (bs[i].getAttribute('data-hi') === '1') cur = i;
    var nx = Math.max(0, Math.min(bs.length - 1, cur + d));
    for (var j = 0; j < bs.length; j++) bs[j].setAttribute('data-hi', j === nx ? '1' : '0');
    if (bs[nx]) {
      bs[nx].setAttribute('aria-selected', 'true');
      try { bs[nx].scrollIntoView({ block: 'nearest' }); } catch (eS) { }
    }
  }
  /* 弹层重新贴回控件（滚动/改窗时用；比直接关掉更稳，也不影响截图/缩放） */
  function positionGlass() {
    if (!gselOpen || !gselOpen.__sel) return;
    var sel = gselOpen.__sel, box = gselOpen;
    var r = sel.getBoundingClientRect();
    if (r.width <= 0) { closeGlass(); return; }
    var w = Math.max(r.width, 148), h = box.offsetHeight;
    box.style.width = w + 'px';
    box.style.left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - w - 8)) + 'px';
    var top = r.bottom + 7;
    if (top + h > window.innerHeight - 8 && r.top - h - 7 > 8) top = r.top - h - 7;
    box.style.top = top + 'px';
  }
  function openGlass(sel) {
    closeGlass();
    var r = sel.getBoundingClientRect();
    if (r.width <= 0) return;
    var box = document.createElement('div');
    box.className = 'glsel';
    var cur = sel.selectedIndex;
    for (var i = 0; i < sel.options.length; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = sel.options[i].textContent;
      b.setAttribute('data-i', i);
      b.setAttribute('data-hi', i === cur ? '1' : '0');
      if (i === cur) b.setAttribute('aria-selected', 'true');
      box.appendChild(b);
    }
    document.body.appendChild(box);
    gselOpen = box;
    box.__sel = sel;                       /* 记住是哪一栏的弹层（页面上不止一个 select） */
    positionGlass();
    box.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('button[data-i]') : null;
      if (!t) return;
      gselPick(sel, parseInt(t.getAttribute('data-i'), 10));
    });
    box.addEventListener('mousemove', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('button[data-i]') : null;
      if (!t) return;
      var bs = box.querySelectorAll('button[data-i]');
      for (var k = 0; k < bs.length; k++) bs[k].setAttribute('data-hi', bs[k] === t ? '1' : '0');
    });
  }
  function buildGlassSelect() {
    var sels = document.querySelectorAll('select');
    for (var i = 0; i < sels.length; i++) {
      var s = sels[i];
      if (s.getAttribute('data-xgs') || s.offsetWidth <= 0) continue;
      s.setAttribute('data-gsel', '1');
      s.setAttribute('data-xgs', '1');   /* ★ 新仓自用幂等标记；上面那句 data-gsel 是给 legacy 看的封条 */
      /* 拦下原生弹层（mousedown 的默认行为就是弹它）；键盘那几个入口也一起接过来 */
      s.addEventListener('mousedown', function (e) { e.preventDefault(); openGlass(this); });
      s.addEventListener('click', function (e) { e.preventDefault(); });
      s.addEventListener('keydown', function (e) {
        var k = e.key;
        if (k === 'Enter' || k === ' ' || k === 'Spacebar' || k === 'ArrowDown' || k === 'ArrowUp') {
          e.preventDefault();
          openGlass(this);
        }
      });
    }
    if (window.__xgsWired) return;
    window.__xgsWired = 1;
    /* ★ 捕获阶段：弹层开着时那几下键盘必须先被我吃掉，否则「回车」会顺到问卦框去提交 */
    document.addEventListener('keydown', function (e) {
      if (!gselOpen) return;
      var sel = gselOpen.__sel;
      var k = e.key;
      if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); closeGlass(); }
      else if (k === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); gselHi(gselOpen, 1); }
      else if (k === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); gselHi(gselOpen, -1); }
      else if (k === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        var t = gselOpen.querySelector('button[data-hi="1"]');
        if (t && sel) gselPick(sel, parseInt(t.getAttribute('data-i'), 10));
      }
    }, true);
    document.addEventListener('mousedown', function (e) {
      if (!gselOpen) return;
      if (gselOpen.contains(e.target)) return;
      if (e.target && e.target.getAttribute && e.target.getAttribute('data-gsel')) return;
      closeGlass();
    }, true);
    var raf = 0;
    function reposition() {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; positionGlass(); });
    }
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
  }

export const GlassSelect = {
  buildGlassSelect, closeGlass, gselPick, openGlass, positionGlass,
};
