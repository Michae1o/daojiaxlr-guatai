/* updateCore.js —— 手机端 app 内更新（2026-10-25 · 用户定的「安卓一起走」）
 *
 * 和桌面端不是同一套做法，别互相抄：
 *   桌面 = 下整包 zip、换文件、自己重启（档 B）。
 *   安卓 = 下 APK 交系统安装器覆盖装（这是系统唯一允许的路）。⛔ 做不到静默安装。
 *
 * 为什么全部走原生（XlrUpdate 插件，见 android/.../XlrUpdatePlugin.java）：
 *   · WebView 的 origin 是 http://localhost，fetch 本站就是跨域，会被浏览器拦；
 *     原生 HttpURLConnection 没有跨域这回事。
 *   · 下载 5 MB 二进制也不能靠网页层（拿不到、也存不了）。
 *
 * 通道 = 包名，不是构建常量：
 *   包名来自系统，比任何前端常量都准。
 */
/* 更新清单地址：留空 = 不做自动更新。
   ★ 想启用：把地址填进 ONLINE_MANIFEST，或者构建时设 XLR_UPDATE_URL 指到你的清单（不改源码）。 */
const ONLINE_MANIFEST = '';
export const MANIFEST_URL = (typeof __XLR_UPDATE_URL__ !== 'undefined' && __XLR_UPDATE_URL__) || ONLINE_MANIFEST;

function plugin() {
  var C = (typeof window !== 'undefined') ? window.Capacitor : null;
  var P = (C && C.Plugins) ? C.Plugins.XlrUpdate : null;
  return P || null;
}

/* 有没有这套原生能力（网页版没有 ⇒ 这条线不该出「检查更新」按钮） */
export function isAndroid() {
  return !!plugin();
}

export function info() {
  var p = plugin();
  if (!p) return Promise.reject(new Error('这条线没有应用内更新'));
  return p.info();
}

/* { current, hasNew, info } —— 比 versionCode（数字，严格递增），⛔ 不比版本名 */
export function check() {
  var p = plugin();
  if (!p) return Promise.reject(new Error('这条线没有应用内更新'));
  /* 协作包/开源包里这条是空的（导出器留空）⇒ 明说没配，别去别人的站点拉 */
  if (!MANIFEST_URL) return Promise.reject(new Error('这份软件没有配置更新清单'));
  return p.info().then(function (cur) {
    return p.fetchText({ url: MANIFEST_URL + '?t=' + Date.now() }).then(function (r) {
      /* 404/502 都走这里：清单还没发或服务器抽了 —— 对人只说「连不上」，别说 HTTP 码 */
      if (r.status < 200 || r.status >= 300) throw new Error('暂时连不上更新服务，稍后再试');
      var j = null;
      try { j = JSON.parse(r.body); } catch (e) { throw new Error('更新清单格式不对'); }
      var it = (j && j.android && j.android[cur.packageName]) || null;
      return {
        current: cur,
        hasNew: !!it && (Number(it.versionCode) || 0) > (Number(cur.versionCode) || 0),
        info: it
      };
    });
  });
}

/* 下载 APK 到缓存，边下边报进度（onProgress 收 0-100） */
export function download(info, onProgress) {
  var p = plugin();
  if (!p) return Promise.reject(new Error('这条线没有应用内更新'));
  var handle = null;
  var ready = onProgress
    ? p.addListener('progress', function (d) { onProgress(d && d.percent ? d.percent : 0); })
    : null;
  /* `Promise.resolve` 兜一层：Capacitor 不同版本 addListener 可能给 Promise、也可能给 handle 本身，
     直接 `ready.then` 在后者上就是 `s.then is not a function`。 */
  return Promise.resolve(ready).then(function (h) {
    handle = h;
    return p.download({ url: info.url, sha256: info.sha256 || '' });
  }).then(function (r) {
    if (handle && handle.remove) handle.remove();
    return r;
  }, function (e) {
    if (handle && handle.remove) handle.remove();
    throw e;
  });
}

export function canInstall() {
  var p = plugin();
  if (!p) return Promise.reject(new Error('这条线没有应用内更新'));
  return p.canInstall();
}

export function openInstallSettings() {
  var p = plugin();
  if (!p) return Promise.reject(new Error('这条线没有应用内更新'));
  return p.openInstallSettings();
}

/* 交给系统安装器 —— 用户还要在系统弹窗里再点一次「安装」 */
export function install() {
  var p = plugin();
  if (!p) return Promise.reject(new Error('这条线没有应用内更新'));
  return p.install();
}
