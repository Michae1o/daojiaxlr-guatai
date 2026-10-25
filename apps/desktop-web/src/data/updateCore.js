/* updateCore.js —— 桌面端 app 内更新（2026-10-25 · 用户定的「档 B」）
 *
 * 原文：「win免安装先走B，安卓一起走」。
 *   档 B = 下整包 → 后台换装 → 自己重启（不是只换网页）。
 *
 * 这条线为什么能这么写：
 *   · 桌面 exe 里 shim.js 把 `fetch` 全接到了 Rust 侧（`http_fetch`）⇒ 前端拿更新清单**没有跨域**这回事；
 *   · Rust 侧 `apply_update` 负责下载 / sha256 校验 / 解压 / 铺 _update / 写换装脚本，
 *     前端只负责「告诉人发生了什么」，不碰文件。
 *   · 换装必须等进程退出（Windows 不许覆盖运行中的 exe）⇒ 成功之后由前端调 `quit_app`，
 *     那个 .bat 才接手覆盖并重新拉起。所以「更新完会自己关掉再开」是设计，不是崩溃。
 *
 * ⛔ 清单地址与通道键：
 *   各份分发的 exe 不一样，混推会把用户换成另一个版本。
 *   
 */

/* ★ 更新清单放官网静态目录（和下载物同站）。
   ⚠ 换域名 / 换路径时，`tools\生成更新清单.py` 里那份也要同步改（那边写的是同一串）。 */
/* 更新清单地址：留空 = 不做自动更新。
   ★ 想启用：把地址填进 ONLINE_MANIFEST，或者构建时设 XLR_UPDATE_URL 指到你的清单（不改源码）。 */
const ONLINE_MANIFEST = '';
export const MANIFEST_URL = (typeof __XLR_UPDATE_URL__ !== 'undefined' && __XLR_UPDATE_URL__) || ONLINE_MANIFEST;

/* 这份软件属于哪个通道（决定清单里取哪一条） */
export function channel() {
  if (typeof window !== 'undefined' && window.__XLR_PORTABLE__) return 'portable';
  return 'full';   /* 这一份只有完整功能，没有单独的轻量变体 */
}

/* 只有桌面 exe 有 __TAURI__（withGlobalTauri）。网页版/安卓没有 ⇒ 这条线不存在「整包更新」 */
function invokeFn() {
  var t = (typeof window !== 'undefined') ? window.__TAURI__ : null;
  return (t && t.core && t.core.invoke) ? t.core.invoke : null;
}

export function isDesktop() {
  return !!invokeFn();
}

/* 当前版本：Rust 从 Cargo.toml 读，与 tauri.conf / build.gradle 由 版本号.py 一起写 */
export function currentVersion() {
  var inv = invokeFn();
  if (!inv) return Promise.resolve('');
  return inv('app_version').then(function (v) { return v || ''; }, function () { return ''; });
}

/* 三段数字比较：a > b 返回 1。本项目的版本是 `1.<YYMMDD>.<批>`，逐段比就够 */
export function cmpVersion(a, b) {
  var pa = String(a || '').split('.');
  var pb = String(b || '').split('.');
  var n = Math.max(pa.length, pb.length);
  for (var i = 0; i < n; i++) {
    var x = parseInt(pa[i], 10) || 0;
    var y = parseInt(pb[i], 10) || 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

/* 查一次清单。返回 { current, channel, hasNew, info } */
export function check() {
  var inv = invokeFn();
  if (!inv) return Promise.reject(new Error('这条线没有整包更新'));
  /* 协作包/开源包里这条是空的（导出器留空，见 tools\make-collab-bundle.py）⇒ 明说没配，别去别人的站点拉 */
  if (!MANIFEST_URL) return Promise.reject(new Error('这份软件没有配置更新清单'));
  /* ⚠ 带时间戳：nginx 上这份清单是 no-cache，但中间还有一层运营商缓存可不管头 */
  return fetch(MANIFEST_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) {
      /* 404/502 都走这里：清单还没发或服务器抽了 —— 对人只说「连不上」，别说 HTTP 码 */
      if (!r.ok) throw new Error('暂时连不上更新服务，稍后再试');
      return r.json();
    })
    .then(function (j) {
      return currentVersion().then(function (cur) {
        var ch = channel();
        var it = (j && j.desktop && j.desktop[ch]) || null;
        return {
          current: cur,
          channel: ch,
          hasNew: !!it && cmpVersion(it.version, cur) > 0,
          info: it
        };
      });
    });
}

/* 下载 + 校验 + 铺好 + 写换装脚本。返回一句给人看的话 */
export function apply(info) {
  var inv = invokeFn();
  if (!inv) return Promise.reject(new Error('这条线没有整包更新'));
  return inv('apply_update', {
    url: info.url,
    sha256: info.sha256 || '',
    size: info.size || 0
  });
}

/* 让进程退出，把场子交给换装脚本（它会重新拉起） */
export function quit() {
  var inv = invokeFn();
  if (inv) inv('quit_app');
}

/* 下载进度：-1 没在下载 · 0..99 百分比 · 100 下完了（在解压换装）
   前端 250ms 轮一次；数值由 Rust 侧下载循环写进一个 atomic（见 main.rs 的 UPD_PCT） */
export function progress() {
  var inv = invokeFn();
  if (!inv) return Promise.resolve(-1);
  return inv('update_progress').then(function (p) {
    return (typeof p === 'number') ? p : -1;
  }, function () { return -1; });
}
