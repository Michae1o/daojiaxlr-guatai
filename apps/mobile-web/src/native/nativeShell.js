/* nativeShell.js —— 手机端「App 那一层」：状态栏 / 键盘 / 震动 / 返回键 / 启动图
 *
 * 为什么要有这一层：本仓手机端产物是**一份网页**（`apps/mobile-shell/www/index.html`——
 *   安卓 APK、iOS .app、线上 `/xlr/m/` 读的是同一个文件）。WebView 里网页有的毛病，装成 App 之后一样在：
 *   · 状态栏文字是系统默认色，深色皮肤下黑字压深底 ⇒ 看不见；
 *   · iOS 键盘上方那条「完成 / 上一项 / 下一项」工具栏（网页味最重的一处）；
 *   · 按下没有回弹（stage 注入的 `*{-webkit-tap-highlight-color:transparent}` 关掉了高亮，却没给替代）；
 *   · 安卓返回键直接退出 App（设置弹窗、记录抽屉开着时也一样）；
 *   · 冷启动先在原生层露一帧默认底色，再切到 HTML 开屏。
 *
 *   ① **只在原生壳里跑**（`Capacitor.isNativePlatform()`）。网页 / 桌面端一律空转 ⇒ 零副作用；
 *   ② 插件用 `Capacitor.registerPlugin(name)` 现取，**不在 JS 里 import 各插件的 web 包**
 *      —— 单文件产物不因此变大一字节，原生能力全在壳里；
 *
 */

const CAP = typeof window !== 'undefined' ? window.Capacitor : null;
export const IS_NATIVE = !!(CAP && typeof CAP.isNativePlatform === 'function' && CAP.isNativePlatform());
export const NATIVE_PLATFORM = IS_NATIVE && typeof CAP.getPlatform === 'function' ? CAP.getPlatform() : 'web';

/** 拿一个原生插件代理；拿不到 ⇒ null（网页环境、插件没装、旧壳都走这条）。 */
function plugin(name) {
  if (!IS_NATIVE) return null;
  try {
    if (typeof CAP.isPluginAvailable === 'function' && !CAP.isPluginAvailable(name)) return null;
    if (typeof CAP.registerPlugin === 'function') return CAP.registerPlugin(name);
    if (CAP.Plugins && CAP.Plugins[name]) return CAP.Plugins[name];
  } catch (e) { }
  return null;
}

/* ---- 状态栏 ---- */

/** `rgb(r,g,b)` / `rgba(...)` → `#rrggbb`（StatusBar.setBackgroundColor 只认 hex 或颜色名）。 */
function toHex(c) {
  if (!c) return null;
  if (c.charAt(0) === '#') return c;
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return null;
  const h = n => ('0' + Number(n).toString(16)).slice(-2);
  return '#' + h(m[1]) + h(m[2]) + h(m[3]);
}

/** 浅底→深字(DARK)、深底→浅字(LIGHT)。跟 `data-theme` 走（皮肤切换会连带改它）。 */
function syncStatusBar(sb) {
  if (!sb) return;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  try { sb.setStyle({ style: dark ? 'LIGHT' : 'DARK' }); } catch (e) { }
  if (NATIVE_PLATFORM === 'android') {
    /* 安卓：WebView 不压到状态栏下面（iOS 那边由 CSS env(safe-area-inset-*) 让位），
       背景色跟页面底色一致，否则默认黑白会在皮肤切换时闪一条。 */
    try { sb.setOverlaysWebView({ overlay: false }); } catch (e) { }
    const bg = toHex(getComputedStyle(document.body).backgroundColor);
    if (bg) { try { sb.setBackgroundColor({ color: bg }); } catch (e) { } }
  }
}

/* ---- 震动 ---- */

function haptic(h, style) {
  if (!h) return;
  try { h.impact({ style: style || 'Light' }); } catch (e) { }
}

/* ---- 返回键 / 侧滑 ---- */

/** 退一步：先关最上层的东西，退无可退才让调用方去退 App。
 *  返回 true = 这一下被我们消化了。 */
export function backOnce() {
  try {
    /* ① 设置弹窗（`.mask.on`，关它走它自己的关闭钮，别直接摘类 —— 关闭钮还要收尾） */
    const mask = document.getElementById('mask');
    if (mask && mask.classList.contains('on')) {
      const x = document.getElementById('btnClose');
      if (x) { x.click(); return true; }
      mask.classList.remove('on');
      return true;
    }
    /* ② 记录抽屉（外壳摘 `.on` + `html.sdb-lock`；点顶栏那颗钮就等于你自己关） */
    if (document.documentElement.classList.contains('sdb-lock')) {
      const b = document.getElementById('btnSum');
      if (b) { b.click(); return true; }
    }
    /* ③ 起卦「详情」面板（`#castPanel` 没有 `.off` 就是展开着） */
    const cp = document.getElementById('castPanel');
    if (cp && !cp.classList.contains('off')) {
      const t = document.getElementById('castToggle');
      if (t) { t.click(); return true; }
    }
    /* ④ 回上一步（叁→贰→壹）。壹页没有上一步 ⇒ 交给调用方 */
    const step = document.documentElement.getAttribute('data-step');
    if (typeof window.__xlrSetStep === 'function') {
      if (step === 'jie') { window.__xlrSetStep('gua'); return true; }
      if (step === 'gua') { window.__xlrSetStep('q'); return true; }
    }
  } catch (e) { }
  return false;
}

/* ---- 安装 ---- */

const H = { statusBar: null, keyboard: null, haptics: null, splash: null, app: null };
const calls = [];

export function installNativeShell() {
  const ev = {
    isNative: IS_NATIVE,
    platform: NATIVE_PLATFORM,
    plugins: {},
    wired: [],
    error: null,
    backTest: null,
  };
  if (!IS_NATIVE) return ev;   /* 网页 / 桌面：什么都不做（连监听都不挂） */

  /* 原生壳标记：CSS 侧据此分流（见 tailwind.css 末尾「深色皮肤光团压暗」那一节）。
     两个类：`xlr-native` = 在原生壳里；`xlr-android` / `xlr-ios` = 哪一端。
     ⇒ 只在安卓压暗，iOS 保持原样（同一份 CSS 在 WKWebView 里渲染出来是柔和的，
     只在 Capacitor 里加 ⇒ 桌面端 / 网页版不受影响。 */
  try {
    document.documentElement.classList.add('xlr-native', 'xlr-' + NATIVE_PLATFORM);
  } catch (e) { }

  H.statusBar = plugin('StatusBar');
  H.keyboard = plugin('Keyboard');
  H.haptics = plugin('Haptics');
  H.splash = plugin('SplashScreen');
  H.app = plugin('App');
  ev.plugins = {
    StatusBar: !!H.statusBar, Keyboard: !!H.keyboard, Haptics: !!H.haptics,
    SplashScreen: !!H.splash, App: !!H.app,
  };

  try {
    /* ① 状态栏：开机同步一次，之后跟皮肤/明暗变化（切皮肤 = 改 data-skin + data-theme） */
    syncStatusBar(H.statusBar);
    if (H.statusBar) {
      const mo = new MutationObserver(function () { syncStatusBar(H.statusBar); });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-skin'] });
      ev.wired.push('statusBar:theme');
      /* 页面底色也可能不是变量直接给的（color-mix / 图片）⇒ 皮肤切换后再补一次 */
      setTimeout(function () { syncStatusBar(H.statusBar); }, 600);
    }

    /* ② 键盘：去掉 iOS 那条工具栏；弹起来时只把**真的被挡住**的输入框滚到中间 */
    if (H.keyboard) {
      try { H.keyboard.setAccessoryBarVisible({ isVisible: false }); ev.wired.push('keyboard:noAccessory'); } catch (e) { }
      try {
        H.keyboard.addListener('keyboardDidShow', function (info) {
          const el = document.activeElement;
          if (!el || !/^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
          const kbH = (info && info.keyboardHeight) || 0;
          const r = el.getBoundingClientRect();
          const limit = window.innerHeight - (kbH > 0 ? kbH : 300);
          if (r.bottom > limit) {
            try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e2) { }
          }
        });
        ev.wired.push('keyboard:avoid');
      } catch (e) { }
    }

    /* ③ 震动：起卦那一下给 Medium，换页/换皮肤给 selection（轻） */
    if (H.haptics) {
      document.addEventListener('click', function (e) {
        const t = e.target;
        if (t && typeof t.closest === 'function' && t.closest('#btnGo')) haptic(H.haptics, 'Medium');
      }, true);
      let lastStep = document.documentElement.getAttribute('data-step');
      new MutationObserver(function () {
        const s = document.documentElement.getAttribute('data-step');
        if (s !== lastStep) { lastStep = s; haptic(H.haptics, 'Light'); }
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-step'] });
      ev.wired.push('haptics:go+step');
    }

    /* ④ 安卓返回键：先按层级退，退无可退才退出 App */
    if (H.app && typeof H.app.addListener === 'function') {
      H.app.addListener('backButton', function () {
        calls.push({ at: Date.now(), act: 'backButton' });
        if (backOnce()) return;
        try { H.app.exitApp(); } catch (e) { }
      });
      ev.wired.push('app:backButton');
    }

    /* ⑤ 原生启动图：等 HTML 开屏**画出来**再撤，否则会露一帧白底 */
    if (H.splash) {
      let done = false;
      const hide = function () {
        if (done) return;
        done = true;
        try { H.splash.hide(); calls.push({ at: Date.now(), act: 'splash.hide' }); } catch (e) { }
      };
      const t0 = Date.now();
      (function waitSplash() {
        const el = document.getElementById('xlrSplash');
        if (el || Date.now() - t0 > 1500) { hide(); return; }
        requestAnimationFrame(waitSplash);
      })();
      ev.wired.push('splash:deferredHide');
    }
  } catch (e) {
    ev.error = String((e && e.message) || e);
  }

  /* 给探针/自查看的证据（只读） */
  try {
    window.__xlrNative = {
      isNative: IS_NATIVE, platform: NATIVE_PLATFORM,
      plugins: ev.plugins, wired: ev.wired, calls: calls,
      backOnce: backOnce,
      statusBarStyle: function () {
        return document.documentElement.getAttribute('data-theme') === 'dark' ? 'LIGHT' : 'DARK';
      },
    };
  } catch (e2) { }

  return ev;
}

export const NativeShell = { IS_NATIVE, NATIVE_PLATFORM, installNativeShell, backOnce };
