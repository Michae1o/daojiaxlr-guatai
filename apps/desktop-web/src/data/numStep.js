import { IS_PHONE } from '../platform.js';
/*
        声明差异逆回去 == 源切片 / 产物里就是这份正文 / 三块之间只有空白与注释）。
        改行为要改 legacy 源再重跑本工具。
      ① window.__autoObs → 自用 window.__autoObsX（3 处）；
      ② 入口闸 el.getAttribute('data-nstep') → 自用 data-nsx；
      ③ 幂等标记 data-nstep 照留，另加自用 data-nsx。
   ⚠ 为什么必须改①②：① 照抄会被 legacy 已占的闸挡死（这份不建自己的活 observer，归属不干净）；
      ② 照抄会把 React 自己盖的封条 data-nstep="1" 当成"已接线"⇒ 一个钮都不建。
   ⚠ 接线前提：`buildNumStep` 开头是 `if (!document.getElementById('castPanel')) return;`，
      而 `#castPanel` 由 legacy 的 `buildCastPanel` 建 ⇒ 调用方必须**轮询等它出现**（见 AskPanel.jsx）。
   来源 sha16 = 1eb17e2ab562b52b
*/
function stepOnce(el, box) {
    box.addEventListener('click', function (ev) {
      var b = ev.target;
      while (b && b !== box && b.tagName !== 'BUTTON') b = b.parentNode;
      if (!b || b.tagName !== 'BUTTON') return;
      var d = parseInt(b.getAttribute('data-d'), 10) || 0;
      var v = parseInt(el.value, 10);
      if (isNaN(v)) v = 0;
      v = Math.max(0, Math.min(99, v + d));
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  /* ★ 数字框被 buildCastPanel 搬进了 #castPanel，不在 #castFields 里了，
     而「自动取数」这个状态类还挂在 #castFields 上 ⇒ CSS 够不着。把状态抄一份到 #castPanel
     （.auto 转发），CSS 才能按状态切换外观。 */
  function syncAuto() {
    var cf = document.getElementById('castFields');
    var p = document.getElementById('castPanel');
    if (!cf || !p) return;
    var on = cf.classList.contains('auto');
    if (on !== p.classList.contains('auto')) p.classList.toggle('auto', on);
  }
  function buildNumStep() {
    var p = document.getElementById('castPanel');
    if (!p) return;
    syncAuto();
    var cf0 = document.getElementById('castFields');
    if (cf0 && !window.__autoObsX && window.MutationObserver) {
      try {
        window.__autoObsX = new MutationObserver(syncAuto);
        window.__autoObsX.observe(cf0, { attributes: true, attributeFilter: ['class'] });
      } catch (eO) { }
    }
    var ins = p.querySelectorAll('input[type=number]');
    for (var i = 0; i < ins.length; i++) {
      var el = ins[i];
      if (el.getAttribute('data-nsx')) continue;
      el.setAttribute('data-nstep', '1');
      el.setAttribute('data-nsx', '1');   /* ★ 新仓自用幂等标记；上面那句 data-nstep 是给 legacy 看的封条 */
      var wrap = document.createElement('span');
      wrap.className = 'nwrap';
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
      /* ★ （现象：「报数页面不太适配」）：原来两个钮打包在 input **后面** ⇒ 看着是 [数字][−][+]。
         拆成左右分列（− 在数字前、+ 在数字后）＝常见「数量步进」的样子，也和卡片里那一排胶囊同族。 */
      var bMinus = document.createElement('button');
      bMinus.type = 'button'; bMinus.className = 'nsb';
      bMinus.setAttribute('data-d', '-1'); bMinus.setAttribute('tabindex', '-1');
      bMinus.setAttribute('aria-label', '减一'); bMinus.textContent = '−';
      var bPlus = document.createElement('button');
      bPlus.type = 'button'; bPlus.className = 'nsb';
      bPlus.setAttribute('data-d', '1'); bPlus.setAttribute('tabindex', '-1');
      bPlus.setAttribute('aria-label', '加一'); bPlus.textContent = '+';
      wrap.insertBefore(bMinus, el);
      wrap.appendChild(bPlus);
      /* ★ 窄屏每格只有 ~86px，减号+数字+加号之后留给文字的只有 24px ⇒
         「第一数」这种占位会被裁成一个字（早前的版本截图里就是"只剩第"）。窄屏换成一道短横，
         该填第几个由上面那行标签（随口报三个数…）交代。 */
      try {
        if (i === 0 || i === 1 || i === 2) el.setAttribute('aria-label', '第' + (i + 1) + '数');
        if (IS_PHONE) el.placeholder = '—';   /* ★ 按产物平台，不按屏幕宽度 */
      } catch (ePh) { }
      stepOnce(el, wrap);
    }
  }

export const NumStep = {
  buildNumStep,
};
