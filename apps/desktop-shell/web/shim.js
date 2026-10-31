/* Tauri 版的网络适配层 + 启动自检。
   自检走「图片信标」上报到本机监听端口：不受跨域限制，也不依赖 Tauri 的任何权限。
   信标只在「页面本身就从调试端口 端口 打开」时才发（`PROBE_ON`）：
     以前是无条件发，正式分发时虽然只是静默失败，但浏览器控制台每次多两条
     ERR_CONNECTION_REFUSED —— 公开的网页版里看着像在偷偷连本机（）。 */
(function () {
  var PROBE = '';
  var PROBE_ON = false;   /* 对外包不带调试端口 */
  function beacon(stage) {
    if (!PROBE_ON) { return; }
    try { new Image().src = PROBE + encodeURIComponent(stage); } catch (e) { }
  }

  beacon('1.shim-ran');

  var T = window.__TAURI__;
  if (!T) { beacon('2.NO-__TAURI__'); return; }
  beacon('2.keys:' + Object.keys(T).join(','));

  var invoke = (T.core && T.core.invoke) || (T.tauri && T.tauri.invoke);
  if (!invoke) { beacon('2b.NO-invoke'); return; }

  // ---------- 网络适配：外部地址走 Rust 侧发请求（没有跨域这回事）----------
  var raw = window.fetch.bind(window);

  // 只认「真的外网地址」。这里必须把 *.localhost 全部排掉——
  //   Tauri 自己的内部通信走的是 http://ipc.localhost/...，漏掉它会造成**无限递归**
  //   （拦到 IPC → 调 invoke → invoke 又走 fetch → 再被拦…body 每次翻倍直到崩）。
  function isExternal(u) {
    if (!/^https?:\/\//i.test(u)) return false;
    var host;
    try { host = new URL(u, 'http://x/').hostname.toLowerCase(); } catch (e) { return false; }
    if (!host) return false;
    if (host === 'localhost' || host.endsWith('.localhost')) return false;
    if (host === '127.0.0.1' || host === '::1' || host === '[::1]') return false;
    if (/^127\./.test(host)) return false;
    return true;
  }

  window.fetch = function (input, init) {
    var url = (typeof input === 'string') ? input : (input && input.url) || '';
    if (!isExternal(url)) return raw(input, init);
    init = init || {};

    // 头可能是 Headers 实例、数组或对象，统一成对象
    var hdrs = {};
    try {
      if (init.headers) {
        if (typeof init.headers.forEach === 'function' && !Array.isArray(init.headers)) {
          init.headers.forEach(function (v, k) { hdrs[k] = v; });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(function (p) { hdrs[p[0]] = p[1]; });
        } else {
          for (var k in init.headers) hdrs[k] = init.headers[k];
        }
      }
    } catch (e) { }

    var bodyLen = (typeof init.body === 'string') ? init.body.length : -1;
    beacon('5a.req ' + (init.method || 'GET') + ' len=' + bodyLen + ' ' + url);

    var args;
    try {
      args = { req: { url: url, method: init.method || 'GET', headers: hdrs, body: (typeof init.body === 'string') ? init.body : null } };
      JSON.stringify(args);                     // 先自己试一次，好把错定在这一步
      beacon('5b.args-ok');
    } catch (e2) {
      beacon('5b.ARGS-FAIL:' + e2.name + ':' + e2.message);
      throw e2;
    }

    return invoke('http_fetch', args).then(function (s) {
      var o = JSON.parse(s);
      beacon('5.http-ok:' + o.status);
      return new Response(o.body, { status: o.status });
    }, function (e) {
      beacon('5.http-errcmd:' + (e && e.message ? e.message : e));
      throw e;
    });
  };
  beacon('2c.fetch-patched');

  // ---------- 自检：等应用渲染出来，再试着改标题 ----------
  var tries = 0;
  var timer = setInterval(function () {
    if (++tries > 60) { beacon('3.TIMEOUT-no-btnGo'); clearInterval(timer); return; }
    if (!document.getElementById('btnGo')) return;
    clearInterval(timer);
    beacon('3.RENDERED');
    /* 窗口标题由 tauri.conf.json 决定——这里曾硬写旧名做链路自检，
       改名后它会在运行时把新名覆盖回旧名 ⇒ 已撤掉覆写，只留一个信标。 */
    beacon('4.title-by-config');
  }, 100);

  // ---------- 受控自检 ----------
  // 只有当本机端口在监听时才跑（本地排查用）。正式使用时探测失败、静默收场，
  // 不会有任何多余的外网流量。
  raw(PROBE + '0.ping', { method: 'GET' }).then(function () {
    beacon('T0.probe-alive');

    // ---- DOM 实况：页面上到底画出了什么 ----
    try {
      var de = document.documentElement;
      var cs = getComputedStyle(document.body);
      beacon('D1.skin=' + (de.getAttribute('data-skin') || '(无)') +
             ' theme=' + (de.getAttribute('data-theme') || '(无)'));
      beacon('D2.bg=' + cs.backgroundColor + ' scrollH=' + document.body.scrollHeight +
             ' winH=' + window.innerHeight + ' winW=' + window.innerWidth);

      function rectOf(sel) {
        var e = document.querySelector(sel);
        if (!e) return sel + '=没有';
        var r = e.getBoundingClientRect();
        var st = getComputedStyle(e);
        return sel + '=' + Math.round(r.left) + ',' + Math.round(r.top) +
               ' ' + Math.round(r.width) + 'x' + Math.round(r.height) +
               ' disp=' + st.display + ' vis=' + st.visibility;
      }
      beacon('D3.' + rectOf('.top'));
      beacon('D4.' + rectOf('.wrap'));
      beacon('D5.' + rectOf('#btnGo'));
      beacon('D6.' + rectOf('#onbLayer'));
      beacon('D7.' + rectOf('#stPage'));

      // 页面上有多少个可见元素
      var all = document.querySelectorAll('*'), vis = 0;
      for (var i = 0; i < all.length; i++) {
        var r2 = all[i].getBoundingClientRect();
        if (r2.width > 0 && r2.height > 0) vis++;
      }
      beacon('D8.dom=' + all.length + ' visible=' + vis);
      beacon('D9.title=' + document.title);

      // ---- 谁把内容顶下去了？列出 body 的直接子元素 ----
      var kids = document.body.children, rep = [];
      for (var k = 0; k < kids.length; k++) {
        var e2 = kids[k], r3 = e2.getBoundingClientRect();
        rep.push(e2.tagName + (e2.className ? '.' + String(e2.className).slice(0, 24) : '') +
                 '[' + Math.round(r3.top) + '+' + Math.round(r3.height) + ']');
      }
      beacon('DA.body-kids(' + kids.length + '):' + rep.join(' '));

      var first = document.body.firstElementChild;
      if (first) {
        var fcs = getComputedStyle(first);
        beacon('DB.first=' + first.tagName + '.' + String(first.className).slice(0, 30) +
               ' h=' + Math.round(first.getBoundingClientRect().height) +
               ' pos=' + fcs.position + ' disp=' + fcs.display +
               ' hCss=' + fcs.height + ' mt=' + fcs.marginTop);
      }
      beacon('DC.head-start:' + document.documentElement.outerHTML.slice(0, 260).replace(/\s+/g, ' '));

      // 有没有重复的 .top（壳残留 + 应用各一份 ⇒ 追加的证据）
      beacon('DD..top个数=' + document.querySelectorAll('.top').length +
             ' .boot个数=' + document.querySelectorAll('.boot').length +
             ' .wrap个数=' + document.querySelectorAll('.wrap').length);

      // 延时复核：开机占位有没有被摘掉（它 z-index 很高，不摘会一直盖着界面）
      setTimeout(function () {
        var b2 = document.querySelector('.boot');
        var b3 = document.getElementById('btnGo');
        beacon('DE.+2.5s boot=' + (b2 ? '还在！pos=' + getComputedStyle(b2).position : '已摘除 ✓') +
               ' btnGo=' + (b3 ? '在' : '没了'));
      }, 2500);
    } catch (e) { beacon('D?.fail:' + e.message); }

    return window.fetch('https://api.deepseek.com/models', { method: 'GET' });
  }).then(function (r) {
    beacon('T1.https-ok status=' + r.status);
    return r.text();
  }).then(function (t) {
    beacon('T2.bodylen=' + t.length);
  }, function (e) {
    /* 没监听就走这里，正常 */
  });
})();
