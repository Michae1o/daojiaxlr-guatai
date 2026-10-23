/*
        （源里逐字有 / 声明差异逆回去 == 源切片 / 产物里就是这四份正文）。
   —— 四块各自的来源 ——
   ① buildWelcome()：行 267–357（**声明差异 2 处**：show() 的幂等早退 ＋ 智谱链接改超链接，见下）
   ② guideImg(k)：行 364–387（零差异）
   ③ GUIDE_STEPS：行 388–430（零差异）
   ④ maybeWelcome()：行 432–447（零差异）
   —— 自由变量绑定（源里是 36-script 那个大 IIFE 的**私有**函数，搬过来必须给）——
   · load / missing ⇒ 绑到 settingsCore.js 里那两份**同源**实现（同一提取器族从同一段正文切出来的，不另抄一份）
   · open          ⇒ 外壳注入（mountGuide() 传进来）。源里它是「打开设置页」；本仓的设置页由外壳
                      openSettings() 提供（React 那份，与旧层那份逐条同形）⇒ 注入时用 flushSync 包一层，
                      让它**同步**提交 —— 源里 open() 之后那几行紧接着就要取 #s-llm / #stProvs / #stKey
   —— 声明差异（2 处）——
   ① 「show()」开头加一行「已经弹着就直接 return」：旧层 init() 里那条 setTimeout(maybeWelcome, 260) 是**无条件**的、
   #gB 的 innerHTML 重渲一遍（图重解码）。正常情况下 maybeWelcome 第一条「开屏在场时不弹」已经把两条路都挡住
   （实测见 _legacy-ref/_diag-guide-config），这行是给**没有开屏**那种情况（reduced-motion 等）兜底。
   点一下就能打开网页」）⇒ 点它由 C-①b 那条统一出口打开（桌面＝系统浏览器）。
   —— 接管手法（装配，手写）——
   · 本模块**在 DCL 之前**（外壳模块顶层）建层 ⇒ 旧层 buildWelcome() 里那条共用 id 闸
     共用 id 判定 ⇒ **不需要改名**）。
     ⇒ 外壳在 DCL 调 placeGuide() 把它**归位**到 #setScreen 的下一位（否则结构签名会变）。
   · 一键回退：VITE_BISECT=noreact ⇒ 不装（回到 legacy 全权）。
   源 sha16：36-script = 0b71b790ca1ec608
*/
/* eslint-disable */
import { SettingsCore } from './settingsCore.js';

/* 自由变量 open：源里 = 旧层那个「打开设置页」；本仓由外壳注入 */
let __opener = null;
function open() { if (typeof __opener === 'function') return __opener(); }

/* 自由变量 load / missing：绑同一份实现（settingsCore.js 里那两份） */
const load = SettingsCore.load;
const missing = SettingsCore.missing;

/* ===== ① buildWelcome：切片正文（**声明差异 1 处**：show() 的幂等早退） ===== */
function buildWelcome() {
    if (document.getElementById('onbLayer')) return;
    var d = document.createElement('div');
    d.className = 'onb guide';
    d.id = 'onbLayer';
    d.innerHTML =
      '<div class="card">' +
        '<div class="gtop"><span class="gst" id="gSt"></span>' +
          '<button class="gx" type="button" id="gX">跳过</button></div>' +
        '<div class="gttl" id="gT"></div>' +
        '<div class="gbody" id="gB"></div>' +
        '<div class="row gnav">' +
          '<button class="sbtn" type="button" id="gPrev">上一步</button>' +
          '<button class="sbtn pri" type="button" id="gNext">下一步</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(d);

    var gi = 0;
    function close(flag) {
      try { localStorage.setItem('xlr-onboarded-2', flag || 'skip'); } catch (e) { }
      d.classList.remove('on');
      document.documentElement.style.overflow = '';
    }
    function render() {
      var s = GUIDE_STEPS[gi] || GUIDE_STEPS[0];
      document.getElementById('gSt').textContent = (gi + 1) + ' / ' + GUIDE_STEPS.length;
      document.getElementById('gT').textContent = s.t;
      var b = '<p class="lead">' + s.h + '</p>';
      if (s.list) {
        b += '<ul>';
        s.list.forEach(function (li) { b += '<li>' + li + '</li>'; });
        b += '</ul>';
      }
      if (s.link) b += '<p class="glink">页面地址：<a href="' + s.link + '" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline"><b>' + s.link.replace(/^https?:\/\//, '') + '</b></a></p>';
      var gb = document.getElementById('gB');
      gb.innerHTML = b;
      if (s.img) { var fig = guideImg(s.img); if (fig) gb.appendChild(fig); }
      if (s.imgs) {
        for (var im2 = 0; im2 < s.imgs.length; im2++) {
          var fg = guideImg(s.imgs[im2]);
          if (fg) gb.appendChild(fg);
        }
      }
      var prev = document.getElementById('gPrev'), next = document.getElementById('gNext');
      /* ★ 上一步：第一步没有它 —— 用 display:none 直接不占位（原来 visibility:hidden
         会留半行空白，「下一步」孤零零贴在右边）。 */
      prev.style.display = gi === 0 ? 'none' : '';
      next.textContent = s.go ? '去配置' : (gi === GUIDE_STEPS.length - 1 ? '开始问卦' : '下一步');
      /*
         animation 不会自己重播 ⇒ 强制重排一次让 CSS 那条 `.onb .gbody{animation:xlrFadeIn}` 重新播。 */
      try {
        gb.style.animation = 'none';
        void gb.offsetWidth;
        gb.style.animation = '';
      } catch (eA) { }
    }
    function show() {
      if (d.classList.contains('on')) return;   /* ★ 声明差异①：见文件头 —— 同一层连弹两次会把 #gB 重渲一遍 */
      d.classList.add('on');
      document.documentElement.style.overflow = 'hidden';
      render();
    }
    /*
       已经配好了别动他的服务商（免得把人家正在用的那家换掉）。 */
    function goConfig() {
      close('done');
      open();
      var t = document.getElementById('s-llm');
      if (t) t.scrollIntoView({ block: 'start' });
      if (missing(load())) {
        var card = document.querySelector('#stProvs .prov[data-p="zhipu"]');
        if (card) card.click();
      }
      var k = document.getElementById('stKey');
      if (k) { try { k.focus({ preventScroll: true }); } catch (e) { } }
      var wiz = document.getElementById('stWiz');
      if (wiz) {
        var old = wiz.style.outline;
        wiz.style.outline = '2px solid var(--accent)';
        setTimeout(function () { wiz.style.outline = old; }, 1200);
      }
    }
    document.getElementById('gNext').addEventListener('click', function () {
      var s = GUIDE_STEPS[gi];
      if (s.go) { goConfig(); return; }
      if (gi >= GUIDE_STEPS.length - 1) { close('done'); return; }
      gi++; render();
    });
    document.getElementById('gPrev').addEventListener('click', function () {
      if (gi > 0) { gi--; render(); }
    });
    document.getElementById('gX').addEventListener('click', function () { close('skip'); });
    /* 点卡片外的空白处 = 跳过（弹着的时候整页不可点，得给一条随手退出的路） */
    d.addEventListener('click', function (ev) { if (ev.target === d) close('skip'); });

    window.__xlrGuideShow = show;
  }

/* ===== ② guideImg：切片正文（零差异） ===== */
function guideImg(k) {
    var M = window.XLR_GUIDE_IMG || {};
    if (!M[k]) return null;
    var f = document.createElement('figure');
    f.className = 'gimg';
    var im = document.createElement('img');
    im.setAttribute('alt', '智谱开放平台截图');
    im.setAttribute('src', M[k]);
    f.appendChild(im);
    /* 配图在卡片里必然偏小 → 点一下放大看（点任意处关闭） */
    f.style.cursor = 'zoom-in';
    f.setAttribute('title', '点一下放大');
    f.addEventListener('click', function () {
      var box = document.createElement('div');
      box.className = 'gzoom';
      var big = document.createElement('img');
      big.setAttribute('alt', '智谱开放平台截图（放大）');
      big.setAttribute('src', M[k]);
      box.appendChild(big);
      box.addEventListener('click', function () { if (box.parentNode) box.parentNode.removeChild(box); });
      document.body.appendChild(box);
    });
    return f;
  }

/* ===== ③ GUIDE_STEPS：切片正文（零差异） ===== */
var GUIDE_STEPS = [
    {
      t: '先配一个模型',
      h: '解卦台<b>本身不联网</b>——起卦、排盘、本机速断都在你电脑上算完。配上模型，点「让模型解卦」，它才会按这套体系把这一卦解出来。'
    },
    {
      t: '先去注册智谱',
      h: '点下面这个链接打开智谱开放平台（控制台），手机号或微信扫码登录都行——<b>新号送 2000 万 tokens 体验包</b>（见下图红字那行）。',
      img: 'register',
      link: 'https://open.bigmodel.cn/login'
    },
    {
      t: '进「API Key」这一页',
      h: '登录后进控制台，在左边那一栏里找到「<b>API Key</b>」点进去（下图红框处）。',
      img: 'keynav'
    },
    {
      t: '新建一把钥匙',
      h: '点右上角「<b>+ 新建 API Key</b>」——下图红框处那个按钮。',
      img: 'keynew'
    },
    {
      t: '给它起个名字',
      h: '弹出的窗口里给这把钥匙起个名字，随便写，比如「预测」，然后点确定。',
      img: 'keyname'
    },
    {
      t: '复制下来 —— 只显示这一次',
      h: '弹窗里那串字符就是钥匙：点「<b>复制</b>」，再点「我已妥善保存」。<br><b>它只在创建时明文显示一次</b>，关掉就再也看不到了，丢了只能重新生成一把。',
      img: 'keycopy'
    },
    {
      t: '粘进来，测一下',
      h: '剩下的交给软件：点下面的「去配置」，它会给你把服务商选好（智谱 GLM），光标停在要粘贴的地方。粘完点「<b>测试连接</b>」，通了就保存。',
      go: 1
    },
    {
      t: '配好了',
      h: '回主页，把问题写具体，点对话框右下角那个箭头。<br>想再走一遍这个引导：<b>设置 → 大模型 → 重新看配置引导</b>。'
    }
  ];

/* ===== ④ maybeWelcome：切片正文（零差异） ===== */
function maybeWelcome() {
    /*
       引导层（整屏半透明底）踩着开屏的尾巴出场 ⇒ 看着像页面被刷了一遍。
       开屏在场时不自动弹引导（要再看：设置 → 大模型 →「重新看配置引导」）。 */
    if (window.__xlrSplashOn || document.getElementById('xlrSplash')) return;
    var seen = null, s = load();
    try { seen = localStorage.getItem('xlr-onboarded-2'); } catch (e) { }
    if (seen) return;
    // 但有这条短路时，只要模型配好了就永远不弹（换键也不弹）。所以本条只「记标记」不再短路。
    if (!missing(s)) { try { localStorage.setItem('xlr-onboarded-2', 'done'); } catch (e) { return; } }
    var d = document.getElementById('onbLayer');
    if (!d) return;
    if (window.__xlrGuideShow) window.__xlrGuideShow();
    else { d.classList.add('on'); document.documentElement.style.overflow = 'hidden'; }
  }

/* ===== 手写装配 ===== */
export function mount(opts) {
  __opener = (opts && opts.open) || null;
  if (window.__xlrGuideMounted) return false;
  window.__xlrGuideMounted = 1;
  buildWelcome();              /* 共用 id 闸（见文件头）：旧层那份因此跳过 */
  return true;
}

export const Guide = {
  mount,
  maybeWelcome,
  /** 设置页那颗「重新看配置引导」走的入口（＝源里 window.__xlrGuideShow） */
  show: function () { if (typeof window.__xlrGuideShow === 'function') window.__xlrGuideShow(); },
  /** 供判据做「删掉 → 重建」归属实验（同一个同步任务里调它 ⇒ 必须当场重建、逐字节同形） */
  build: buildWelcome,
};
