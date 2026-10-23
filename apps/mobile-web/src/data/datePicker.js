/*
        产物里就是这份正文）。改行为要改 legacy 源再重跑本工具。
      入口闸 data-dp → 自用 data-dpx（封条 data-dp 照盖）。
   ⚠ 为什么必须改：照抄原判据 ⇒ 把 React 自己盖的封条当成「已接线」⇒ 日期点不开。
   ℹ 它没有一次性 document 级闸；点外面关那条 listeners 每次调用都装，legacy 那份绑在旧节点上 ⇒ 空转、不冲突。
   来源 sha16 = 1eb17e2ab562b52b
*/
function buildDatePicker() {
    var dt = document.getElementById('dt');
    var pop = document.getElementById('dppop');
    if (!dt || !pop || dt.getAttribute('data-dpx')) return;
    dt.setAttribute('data-dp', '1');
    dt.setAttribute('data-dpx', '1');   /* ★ 新仓自用幂等标记；上面那句 data-dp 是给 legacy 看的封条 */
    var cur = new Date();
    if (dt.value) {
      var parts = dt.value.split('-');
      if (parts.length === 3) cur = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    }
    function pad(x) { return (x < 10 ? '0' : '') + x; }
    function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function render() {
      var y = cur.getFullYear(), m = cur.getMonth();
      var startDow = (new Date(y, m, 1).getDay() + 6) % 7;
      var days = new Date(y, m + 1, 0).getDate();
      var today = fmt(new Date());
      var sel = dt.value;
      var h = '<div class="dphd"><button type="button" class="dpn" data-mv="-1">\u2039</button>' +
        '<b>' + y + ' \u5e74 ' + (m + 1) + ' \u6708</b>' +
        '<button type="button" class="dpn" data-mv="1">\u203a</button></div>' +
        '<div class="dpg dpw"><i>\u4e00</i><i>\u4e8c</i><i>\u4e09</i><i>\u56db</i><i>\u4e94</i><i>\u516d</i><i>\u65e5</i></div>' +
        '<div class="dpg">';
      var i, d;
      for (i = 0; i < startDow; i++) h += '<i class="out"></i>';
      for (d = 1; d <= days; d++) {
        var ds = y + '-' + pad(m + 1) + '-' + pad(d);
        var cls = 'dpd' + (ds === sel ? ' on' : '') + (ds === today ? ' tod' : '');
        h += '<button type="button" class="' + cls + '" data-d="' + ds + '">' + d + '</button>';
      }
      var tail = (7 - ((startDow + days) % 7)) % 7;
      for (i = 0; i < tail; i++) h += '<i class="out"></i>';
      h += '</div><div class="dpft"><button type="button" data-dpclear="1">\u6e05\u9664</button>' +
        '<button type="button" data-dptoday="1">\u4eca\u5929</button></div>';
      pop.innerHTML = h;
    }
    function open() {
      render();
      pop.hidden = false;
      /* 下方空间不够就向上弹（手机上半屏点日期也不至于被裁掉） */
      var r = dt.getBoundingClientRect();
      var need = 330;
      if (r.bottom + need > window.innerHeight && r.top > need) pop.className = 'dppop up';
      else pop.className = 'dppop';
    }
    function close() { pop.hidden = true; }
    dt.addEventListener('click', function () { if (pop.hidden) open(); else close(); });
    pop.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var mv = t.closest('[data-mv]');
      if (mv) { cur.setMonth(cur.getMonth() + (+mv.getAttribute('data-mv'))); render(); return; }
      var day = t.closest('[data-d]');
      if (day) { dt.value = day.getAttribute('data-d'); close(); return; }
      if (t.closest('[data-dpclear]')) { dt.value = ''; close(); return; }
      if (t.closest('[data-dptoday]')) { dt.value = fmt(new Date()); close(); return; }
    });
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (pop.hidden || !t || !t.closest) return;
      if (!t.closest('.dtw')) close();
    }, true);
  }

export const DatePicker = {
  buildDatePicker,
};
