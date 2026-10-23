/* apps/desktop-web/src/data/splashCore.js —— 机械生成，请由工具生成，不要手改
 *
 * 内容 = 早期实现 `38-script.txt` L1305–1786 那整个 `buildSplash()` 的**逐字切片**
 *   （482 行 / 28,895 字符 / sha16 `921b52f23d8de551`），**声明差异唯一 1 处**（见下）。
 *
 * 为什么在本仓（ 砍段前置）：早期实现那 14 个内联脚本一不在，`#xlrSplash` 就**根本不存在** ——
 *   `shell/main.jsx` 的 `mountSplash()` 只是**桥接**（轮询等早期实现那张节点再接管）⇒ 等不到就放弃 ⇒
 *   本仓引导层 `Guide.maybeWelcome()`（源 `36-script` L436，守卫逐字是
 *   `if (window.__xlrSplashOn || document.getElementById('xlrSplash')) return;`）条件成立 ⇒
 *   弹出整屏遮罩 `#onbLayer` ⇒ 吃掉所有点击（实测：真点 `#btnGo` 超时、`data-step` 停在 `q`）。
 *
 * 声明差异（唯一 1 处）：在源里那行 `if (goBtn) goBtn.addEventListener('click', …)` **之前**插入
 *   一行，把内层的 `out` / `killSplash` 交到装配层（`OUT` / `KILL`）。位置与手法 = 组装期
 *   变更记录 那次注入（`tools/assemble-desktop.mjs` 的 `EXPOSE_ANCHOR`），只是搬进本仓 ——
 * ⚠ 切片**自包含**：`narrowW` / `slBusy` / `outPhone` / `out` / `killSplash` / `gone` /
 *   `goBtn` / `t0` 全部声明在函数内部 ⇒ 自由变量只有 `document` / `window`（零绑定）。
 * ⚠ 它与 React 那份开屏（`components/Splash.jsx`）的分工**照旧不变**：可见的那棵树仍是 React 的；
 *   本切片只负责「把节点立起来 ＋ 提供退场动作 `out()`」（`out()` 走 `getElementById('xlrSplash')`
 *   ⇒ 作用到的就是 React 渲染的那个节点）。
 */
/* eslint-disable */
import { IS_PHONE } from '../platform.js';   /* ★ 平台只看产物（构建期常量），不看屏幕宽度 */

/* ===== 装配层声明：切片里那处暴露赋值指到这里（必须排在本函数之前） ===== */
var OUT = null, KILL = null;

/* ===== buildSplash（源 38-script.txt L1305–1786；逐字切片 ＋ 1 处声明差异） ===== */
  function buildSplash() {
    if (document.getElementById('xlrSplash')) return;
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e2) { }
    /* ★★ 2026-10-17 声明差异②（用户逐字：「我的手机版开屏动画呢？怎么不见了？而且还tm给我自动跳过开屏」）
       源里这行是 `if (reduce) return;` —— 系统一开「减弱动态效果」（安卓的无障碍/开发者选项「移除动画」、
       iOS 的「减弱动态效果」）就**整屏不建**；再叠上 `phoneAnim.installGuideRetry()` 的「reduce 例外放行」
       （那条是给"压根没有开屏"的机器兜底的）⇒ 引导 300ms 后直接盖上来 ＝「开屏被自动跳过」。
       正确语义：**reduce = 不播动画，页面还在。** 这里不再早退；动画本身由 legacy 的
       `@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}` 关掉，
       开屏照常静态停在「点击进入」。 */
    window.__xlrSplashReduce = !!reduce;
    /* ★ 2026-10-10 现象：「一切到位之后，框内还是会像刷新了一样」：
       真因是**首次配置引导层**（#onbLayer，整屏 var(--bg) 半透明底）踩着开屏的尾巴出场，
       整片盖上来 ⇒ 看着就是"页面被刷了一下"。
       开屏本身就是一道"入口"，引导不该踩着它的尾巴弹 ⇒ 给个标记，让引导**别在开屏期间自动弹**
       （要再看：设置 → 大模型 →「重新看配置引导」）。 */
    window.__xlrSplashOn = true;
    var ob0 = document.getElementById('onbLayer');
    if (ob0) { ob0.classList.remove('on'); document.documentElement.style.overflow = ''; }
    var d = document.createElement('div');
    d.id = 'xlrSplash';
    /* 开屏层在场期间挂上 sl-on：用来压住底下的首次配置引导（开屏背景半透明，不压会透出来） */
    try { document.documentElement.classList.add('sl-on'); } catch (eS0) { }
    /* ★ 2026-10-09 用户给了风格稿（玻璃阴阳珠 + 发丝线 + 极简留白）：按稿重排开屏，
       并且**用动画把开屏和主页面接起来** —— 那颗珠子飞向该在的位置、缩成第一步「壹」的圆。 */
    d.innerHTML =
      '<span class="sl-axis sl-axis-t" aria-hidden="true"></span>' +
      '<div class="sl-in">' +
        '<div class="sl-orbwrap">' +
          '<span class="sl-line"></span><span class="sl-dot"></span>' +
          '<span class="sl-orb">' +
            /* ★★ 2026-10-10 二改（用户甩参照图：「其实我想要的是这种液态的太极」）：
               参照图＝**3D 渲染的液态太极**，不是早前的版本的「扁平玻璃」——
               ① 浅瓣＝清水/胶质（乳白、半透，边缘略沉做出厚度）；
               ② 深瓣＝液态金属/墨（中心最沉、往边缘提亮，右下外缘一道**月牙棱光**）；
               ③ 外面一圈**半透明水波环**（不闭合、有断口＝水花），不是实线圆；
               ④ 两个鱼眼是**同色系 3D 小球**（各自顶上一颗镜面点），不是传统的反色点；
               ⑤ 底下一点**很淡的接触阴影**（偏右下），让它像压在一层水面上；
               ⑥ 左上方向性受光 + S 交界一条液面亮棱（往深瓣里推 4 单位，两侧都暗才读得出）；
               ⑦ 外围那层玻璃珠壳**撤了**（参照图里球壳不存在，太极自己带水波环）——
                  珠壳留着会变成「玻璃里再套一层玻璃」，糊。
               */
            '<svg class="sl-taiji" viewBox="0 0 120 120" aria-hidden="true">' +
              '<defs>' +
                '<linearGradient id="tjYang" x1="24%" y1="2%" x2="78%" y2="98%">' +
                  '<stop offset="0" stop-color="#ffffff" stop-opacity=".99"/>' +
                  '<stop offset=".42" stop-color="#f8fafb" stop-opacity=".96"/>' +
                  '<stop offset=".82" stop-color="#e9edef" stop-opacity=".93"/>' +
                  '<stop offset="1" stop-color="#dbe1e4" stop-opacity=".9"/></linearGradient>' +
                '<linearGradient id="tjYin" x1="10%" y1="4%" x2="90%" y2="98%">' +
                  '<stop offset="0" stop-color="#8b929c"/>' +
                  '<stop offset=".26" stop-color="#4a505a"/>' +
                  '<stop offset=".62" stop-color="#22262b"/>' +
                  '<stop offset="1" stop-color="#15181c"/></linearGradient>' +
                /* 月牙棱光：亮的那段落在**正右下**，两端都淡出（一端亮到底会被读成「一圈白边」）。 */
                '<linearGradient id="tjCres" x1="8%" y1="96%" x2="96%" y2="40%">' +
                  '<stop offset="0" stop-color="#ffffff" stop-opacity="0"/>' +
                  '<stop offset=".34" stop-color="#ffffff" stop-opacity="0"/>' +
                  '<stop offset=".58" stop-color="#ffffff" stop-opacity=".95"/>' +
                  '<stop offset=".74" stop-color="#ffffff" stop-opacity=".5"/>' +
                  '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>' +
                /* 左上的方向性反光：**只走白色 + 变 alpha**（掺一点灰就会被读成「刷上去的一道糊灰」） */
                '<linearGradient id="tjGloss" x1="6%" y1="66%" x2="70%" y2="4%">' +
                  '<stop offset="0" stop-color="#ffffff" stop-opacity="0"/>' +
                  '<stop offset=".42" stop-color="#ffffff" stop-opacity=".95"/>' +
                  '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>' +
                /* 镜面点：中心纯白、边缘化开（硬边圆点会被读成「贴上去的印刷点」） */
                '<radialGradient id="tjSpec" cx="50%" cy="50%" r="50%">' +
                  '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/>' +
                  '<stop offset=".55" stop-color="#ffffff" stop-opacity=".85"/>' +
                  '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>' +
                /* 鱼眼底下那一点接触阴影：白球坐在浅瓣上，不压这一下就「浮」不起来 */
                '<radialGradient id="tjEyeSh" cx="46%" cy="44%" r="58%">' +
                  '<stop offset="0" stop-color="#2a2f36" stop-opacity=".26"/>' +
                  '<stop offset=".6" stop-color="#2a2f36" stop-opacity=".12"/>' +
                  '<stop offset="1" stop-color="#2a2f36" stop-opacity="0"/></radialGradient>' +
                '<radialGradient id="tjSheen" cx="30%" cy="15%" r="64%">' +
                  '<stop offset="0" stop-color="#ffffff" stop-opacity=".95"/>' +
                  '<stop offset=".5" stop-color="#ffffff" stop-opacity=".30"/>' +
                  '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>' +
                '<radialGradient id="tjEyeY" cx="36%" cy="28%" r="72%">' +
                  '<stop offset="0" stop-color="#ffffff"/>' +
                  '<stop offset=".54" stop-color="#eae8e2"/>' +
                  '<stop offset="1" stop-color="#c0bbb2"/></radialGradient>' +
                '<radialGradient id="tjEyeD" cx="38%" cy="26%" r="76%">' +
                  '<stop offset="0" stop-color="#6a7078"/>' +
                  '<stop offset=".46" stop-color="#31363c"/>' +
                  '<stop offset="1" stop-color="#101317"/></radialGradient>' +
                '<radialGradient id="tjShadow" cx="50%" cy="50%" r="50%">' +
                  '<stop offset="0" stop-color="#1b1f25" stop-opacity=".16"/>' +
                  '<stop offset=".6" stop-color="#1b1f25" stop-opacity=".07"/>' +
                  '<stop offset="1" stop-color="#1b1f25" stop-opacity="0"/></radialGradient>' +
                /* 接触点上的「紧核」：球与地面真正贴着的那一小段最黑（只有宽柔阴影会被读成悬空） */
                '<radialGradient id="tjShadowCore" cx="50%" cy="50%" r="50%">' +
                  '<stop offset="0" stop-color="#15181d" stop-opacity=".26"/>' +
                  '<stop offset=".55" stop-color="#15181d" stop-opacity=".12"/>' +
                  '<stop offset="1" stop-color="#15181d" stop-opacity="0"/></radialGradient>' +
                '<linearGradient id="tjRing" x1="12%" y1="2%" x2="86%" y2="96%">' +
                  '<stop offset="0" stop-color="#ffffff" stop-opacity=".95"/>' +
                  '<stop offset=".45" stop-color="#cfd6df" stop-opacity=".45"/>' +
                  '<stop offset="1" stop-color="#ffffff" stop-opacity=".7"/></linearGradient>' +
              '</defs>' +
              /* ① 接触阴影：**紧核 + 宽散**两层叠（只要一层宽柔的，会被读成「悬空」） */
              '<ellipse cx="62" cy="102" rx="19" ry="4.5" fill="url(#tjShadowCore)"/>' +
              '<ellipse cx="63" cy="103" rx="34" ry="8" fill="url(#tjShadow)"/>' +
              /* ② 水波外环：一圈细环 + 内圈一道暗压边（透镜感）+ 三段亮弧（不闭合＝水花） */
              '<circle class="tjRg" cx="60" cy="59.5" r="58" fill="none" stroke="rgba(126,134,146,.20)" stroke-width="1"/>' +
              '<circle class="tjRg2" cx="60" cy="59.5" r="54" fill="none" stroke="rgba(126,134,146,.12)" stroke-width="1"/>' +
              '<circle class="tjRgIn" cx="60" cy="59.5" r="51.6" fill="none" stroke="rgba(20,24,30,.07)" stroke-width="1.6"/>' +
              '<path class="tjRg" d="M15 31 A58 58 0 0 1 73 1.8" fill="none" stroke="url(#tjRing)" stroke-width="1.7" stroke-linecap="round"/>' +
              '<path class="tjRg" d="M103 22 A58 58 0 0 1 115 71" fill="none" stroke="url(#tjRing)" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>' +
              '<path class="tjRg" d="M43 114 A58 58 0 0 1 9 82" fill="none" stroke="url(#tjRing)" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>' +
              '<path class="tjRg" d="M75 3.5 A58 58 0 0 1 111 33" fill="none" stroke="url(#tjRing)" stroke-width=".9" stroke-linecap="round" opacity=".45"/>' +
              /* ③ 两瓣（半径 52；深瓣＝右半 + 下半左凸，与参照图一致：浅色在左上、深色在右下）
                 ＋ 一圈**内缘薄暗边**：没有它，两瓣贴到水波环上就是「贴纸」，有了才像有厚度的水体。 */
              '<circle class="tjY" cx="60" cy="59.5" r="52" fill="url(#tjYang)"/>' +
              '<circle class="tjEdge" cx="60" cy="59.5" r="50.6" fill="none" stroke="rgba(30,36,44,.07)" stroke-width="2.6"/>' +
              '<path class="tjD" d="M60 7.5 A52 52 0 0 1 60 111.5 A26 26 0 0 1 60 59.5 A26 26 0 0 0 60 7.5 Z" fill="url(#tjYin)"/>' +
              /* ★ 2026-10-10 二改补丁：**外轮廓细圈**。48px 实尺下浅瓣是白、底色是米白，
                 白对米白 ≈ 没有边界 ⇒ 整颗被读成「浮着一块深色月牙」。给整颗描一道
                 */
              '<circle class="tjRim" cx="60" cy="59.5" r="51.4" fill="none" stroke="rgba(52,60,70,.26)" stroke-width="1.5"/>' +
              /* ④ 深瓣外缘的月牙棱光（亮的那段压在正右下，两端淡出）＋ 两道环状反光条
                 （= 液态金属的「环境反射」，很淡；只画在深瓣内部） */
              '<path class="tjCres" d="M28.5 97 A50 50 0 0 1 110 59.5" fill="none" stroke="url(#tjCres)" stroke-width="3" stroke-linecap="round"/>' +
              '<path class="tjRefl" d="M90.2 23.5 A47 47 0 0 1 106.3 51.3" fill="none" stroke="rgba(255,255,255,.26)" stroke-width="2.6" stroke-linecap="round"/>' +
              '<path class="tjRefl" d="M81 96 A42 42 0 0 0 99 75" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="1.8" stroke-linecap="round"/>' +
              /* ⑤ 两个鱼眼：同色系 3D 小球 —— 各自一道**卡边**（白球白瓣、黑球黑瓣，不卡边就糊没）
                 + 一颗**化开**的镜面点 + 一点底部回光 */
              '<ellipse cx="61.8" cy="35.8" rx="11.8" ry="11.6" fill="url(#tjEyeSh)"/>' +
              '<circle class="tjEyeY" cx="60" cy="34" r="10.6" fill="url(#tjEyeY)"/>' +
              '<circle class="tjEyeRim" cx="60" cy="34" r="10.6" fill="none" stroke="rgba(104,110,120,.5)" stroke-width="1.1"/>' +
              '<circle cx="56.2" cy="29.6" r="3.4" fill="url(#tjSpec)"/>' +
              '<path d="M51.4 40 A10.6 10.6 0 0 0 68.6 40" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.1" stroke-linecap="round"/>' +
              '<circle class="tjEyeD" cx="60" cy="85" r="10.6" fill="url(#tjEyeD)"/>' +
              '<circle class="tjEyeRim" cx="60" cy="85" r="10.6" fill="none" stroke="rgba(255,255,255,.20)" stroke-width="1"/>' +
              '<circle cx="56.4" cy="80.8" r="4.4" fill="url(#tjSpec)"/>' +
              '<circle cx="64.8" cy="88.6" r="2" fill="url(#tjSpec)" opacity=".5"/>' +
              /* ⑥ 液面亮棱：压在 S 上、**往深瓣里推 4 单位** —— 白线有一半落在浅瓣上就白给
                 （浅瓣本身已经 240+），推进暗瓣、两侧都是暗的才读得出是一「条」线。 */
              '<path class="tjSeam" transform="translate(4 0)" d="M60 111.5 A26 26 0 0 1 60 59.5 A26 26 0 0 0 60 7.5" fill="none" stroke="rgba(255,255,255,.30)" stroke-width="4.4" stroke-linecap="round"/>' +
              /* 亮棱的**硬芯**：一条 1.6 单位（1× 下约 0.8px）的亮芯 + 外面那圈晕，
                 */
              '<path class="tjSeamCore" transform="translate(4 0)" d="M60 111.5 A26 26 0 0 1 60 59.5 A26 26 0 0 0 60 7.5" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.6" stroke-linecap="round"/>' +
              /* ⑦ 左上方向性受光（整组极缓慢漂移 ⇒ 液面在动，不是印上去的一张图） */
              '<g class="tjHi">' +
                '<circle cx="60" cy="59.5" r="52" fill="url(#tjSheen)"/>' +
                '<path d="M11.5 33 A52 52 0 0 1 82.5 8.5" fill="none" stroke="url(#tjGloss)" ' +
                  'stroke-width="3.4" stroke-linecap="round"/>' +
              '</g>' +
            '</svg><b></b></span>' +
          '<span class="sl-dot"></span><span class="sl-line"></span>' +
        '</div>' +
        '<div class="sl-title">道家小六壬</div>' +
        '<div class="sl-sub">基于邵一尘老师 · 道家小六壬所作</div>' +
        '<div class="sl-sep"></div>' +
        '<div class="sl-motto">无事不卦 · 心动即卦 · 一事不二卦</div>' +
        '<div class="sl-notes">' +
          '<div>问题要具体：问什么，卦就答什么</div>' +
          '<div>越拆细越容易错 —— 够用即止</div>' +
          '<div>结果只到「参考」层级，决定权在你</div>' +
        '</div>' +
        '<span class="sl-axis sl-axis-b" aria-hidden="true"></span>' +
        '<button class="sl-go" type="button" aria-label="点击进入">' +
          '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M4 12h14.5"/><path d="M12.8 6.2 18.6 12l-5.8 5.8"/></svg>' +
        '</button>' +
        '<div class="sl-hint"><span></span>点击进入<span></span></div>' +
      '</div>';
    document.body.appendChild(d);
    var t0 = Date.now(), gone = false;
    var goBtn = d.querySelector('.sl-go');
    /* ★★ 2026-10-17 平台判定（用户逐字：「手机就是手机，电脑就是电脑，关屏幕大小什么事」）
       —— 宽度不是平台，两条线各自由构建期常量标明：手机端 `__XLR_PLATFORM__='phone'`、
       matchMedia 回退：模拟器 WebView 实测 innerWidth=760（viewport 写的是 390 也没吃到），
       一靠宽度就会把手机端判成"宽屏"⇒ 3 秒自动退场 + 珠子飞向「壹」，手机版下落弹跳动效等于没发生。 */
    function narrowW() { return IS_PHONE; }

    /* ★★ 2026-10-09 手机版开屏转场（照用户给的六阶段规格逐条落地）：
       A 0-180ms   蓄力：先轻微下压(scale 1.07/.93) → 迅速向上弹起，带缩放，有明确加速度（不匀速）
       B 180-380ms 上升：到最高点速度渐慢 → 开始下落，轨迹平滑；背景开始极轻微变亮（tinted 淡入）
       C 380-600ms 自由下落：向**视口底部**加速；带极轻微纵向形变（不能变明显椭圆）
       D 600-720ms 撞击底部：纵向压缩 → 迅速恢复；靠缩放/位移/阴影表现冲击；**不是移到就消失**
       E 720-1100ms 反弹 + 形态转换：向上反弹的同时，**同一个元素**从圆变圆角矩形
                    （宽→输入框宽、高→卡片高、圆角 50%→24）；箭头渐变缩小淡出，不突然消失
       F 1100-1500ms 落位：卡片回到输入框位置并稳定；主界面（标题/副标题/卡内文字·快捷操作·发送键）
                    依次显现；结束后进入**真正可交互**的主界面（不是模拟图）

       硬要求：①真实空间位移（不是只做透明度/缩放）；②撞击点用**视口坐标系**算（innerHeight，
       不是容器底，也不受地址栏/安全区影响）；③形态转换连续（同一个元素，不隐藏再显示）；
       ④不改主界面原有设计；⑤优先 transform/opacity，不在动画里反复触发布局重排。 */
    var slBusy = false;
    function outPhone() {
      if (slBusy) return;                                    /* 防重复点击造成叠加 */
      slBusy = true;
      /*
         根因：本仓 `shell/main.jsx` 的 `mountSplash()` 是「先让切片把开屏立起来（buildSplash），
         再由 50ms 轮询把那个节点 remove()、改挂 React 的 <Splash/>」⇒ 切片手里这个 `goBtn`
         **是已经被移除的游离节点** ⇒ 下面那一串 `classList.add('ink','fly')` ＋ 盒位移 ＋ WAAPI
         全打在看不见的节点上（点「进入」后屏幕上只剩 killSplash 把幕撤掉）。
         修法：**进场那一刻现查活节点**（React 那棵里的 `.sl-go`），不依赖建层时抓的那颗。
         可逆：把这一行删掉即回到原行为（游离节点那份完全保留）。 */
      try {
        var liveGo = document.querySelector('#xlrSplash .sl-go');
        if (liveGo) goBtn = liveGo;
      } catch (eLive) { }
      var html = document.documentElement;
      var card = document.querySelector('.cbar');
      var from = goBtn.getBoundingClientRect();
      var to = card ? card.getBoundingClientRect() : null;
      var vh = window.innerHeight;                           /* 视口高：撞击点以它为准 */
      var W = to ? to.width : from.width, H = to ? to.height : from.height;
      var ex = (W - from.width) / 2, ey = (H - from.height) / 2;   /* 宽高往右下长，中心要补回来 */
      var dx = to ? (to.left + to.width / 2) - (from.left + from.width / 2) : 0;
      var dy = to ? (to.top + to.height / 2) - (from.top + from.height / 2) : 0;
      var rise = Math.round(Math.min(104, vh * 0.12));       /* 起跳高度按视口算 */
      var floorY = Math.round(vh - from.height - from.top);   /* 再往下多少＝球底贴到视口底 */
      var bounce = Math.round(rise * 0.46);                   /* 反弹回来多少 */
      var anims = [];
      /* 提交键的**绝对**落点：在点击这一刻量下来最准 —— 此时页面还没开始动，量到的就是动画结束后的稳定位置
         （实测卡 537 / 键 719；动画后期会瞬态漂到 543/731，最后仍回到 537/719）。 */
      var dotAbs = null, cardAbs = to;
      if (card) {
        var dq = card.querySelector('.go');
        if (dq) {
          var q0 = dq.getBoundingClientRect();
          if (q0.width) dotAbs = { left: q0.left, top: q0.top, w: q0.width, h: q0.height };
        }
      }

      html.classList.add('sl-anim', 'sl-nogo');
      /*
         否则页面浮现的那一瞬会看到卡里的字闪一下再消失）。第一拍只让"球→空对话框"完成，
         第二拍(1330ms)放卡里的字/选项/发送键，最后(1820ms)才放顶栏与问候语。 */
      html.classList.add('sl-cinew', 'sl-late');
      /* */
      html.classList.add('sl-shell');
      goBtn.classList.add('ink', 'fly');                      /* ① 变成当前主题色 */
      /* ⚠ 不摘出开屏层：摘到 body 会让 `#xlrSplash .sl-go.fly` 失配、掉回文档流（曾跑到屏幕左下角） */
      goBtn.style.left = from.left + 'px';
      goBtn.style.top = from.top + 'px';
      goBtn.style.width = from.width + 'px';
      goBtn.style.height = from.height + 'px';

      /* B 阶段起：背景开始极轻微变亮（文字退场 + 主题色空背景淡入） */
      setTimeout(function () { d.classList.add('txtout', 'tinted'); }, 150);

      /* ── A→D：一条曲线走完 蓄力 / 上升 / 下落 / 撞底 / 反弹（720ms，全部视口坐标） ── */
      if (goBtn.animate) {
        anims.push(goBtn.animate([
          { transform: 'translate(0,0) scale(1,1)',                                   offset: 0,    easing: 'ease-out',
            boxShadow: '0 10px 22px -18px rgba(10,14,20,.45)' },
          /* A：蓄力（下压 + 横向铺开，克制） */
          { transform: 'translate(0,3px) scale(1.07,.93)',                            offset: .13,  easing: 'cubic-bezier(.1,.9,.2,1)',
            boxShadow: '0 5px 12px -10px rgba(10,14,20,.5)' },
          /* B：弹起 → 最高点（速度渐慢） */
          { transform: 'translate(' + Math.round(dx * .08) + 'px,' + (-rise) + 'px) scale(.97,1.04)', offset: .42, easing: 'cubic-bezier(.45,0,.88,.52)',
            boxShadow: '0 32px 52px -32px rgba(10,14,20,.13)' },
          /* C：自由下落，向视口底部加速（极轻微纵向拉伸） */
          { transform: 'translate(' + dx + 'px,' + floorY + 'px) scale(.95,1.09)',     offset: .83,  easing: 'cubic-bezier(.35,0,.9,.45)',
            boxShadow: '0 24px 40px -28px rgba(10,14,20,.18)' },
          /* D：撞击——纵向压缩到极值，阴影收紧 */
          { transform: 'translate(' + dx + 'px,' + floorY + 'px) scale(1.18,.82)',     offset: .92,  easing: 'cubic-bezier(.2,.8,.3,1)',
            boxShadow: '0 2px 8px -6px rgba(10,14,20,.62)' },
          /* E：反弹上升（形态转换从这里接力） */
          { transform: 'translate(' + dx + 'px,' + (floorY - bounce) + 'px) scale(1,1)', offset: 1,
            boxShadow: '0 18px 32px -22px rgba(10,14,20,.26)' }
        ], { duration: 720, fill: 'forwards' }));
      }

      /* ── 撞击那一刻：背景高光极轻微扩散一次（主体运动完成之后才加的锦上添花） ── */
      setTimeout(function () {
        html.classList.add('sl-hit');
        setTimeout(function () { html.classList.remove('sl-hit'); }, 540);
      }, 640);

      /* ★ 分两步验证用：只看运动（蓄力→起跳→下落→撞屏底→反弹），不做形态转换。
         由预览壳的「⑥ 只看小球运动」打开 window.__xlrSlMotionOnly。 */
      var motionOnly = false;
      try { motionOnly = !!window.__xlrSlMotionOnly || localStorage.getItem('xlr-sl-motion') === '1'; } catch (eM0) { }
      if (motionOnly) {
        setTimeout(function () { goBtn.style.opacity = '0'; }, 880);
        setTimeout(function () { killSplash(); slBusy = false; }, 1080);
        return;
      }

      /* ── E→F：反弹最高点即形变起跑线；同一个元素边上升边展开，落位到输入卡 ── */
      setTimeout(function () {
        /*
           根因：球的底色被我设成了 transparent（变成一个**空壳方框**），而真卡此时还被 sl-anim 压着，
           于是看起来是「空框淡出 → 卡再出现」两块东西。
           改法：从这一刻起就让**真卡在球底下**浮现（撤 sl-anim）、开屏层的主题色底同时渐隐；
           球一路不透明地盖在上面，等自己长到接近卡的尺寸时**才褪皮**（background 带 delay），
           褪出来的正好是同一位置的真卡 ⇒ 看到的是一块东西长成了对话框。 */
        html.classList.remove('sl-anim');
        d.classList.add('tintout');
        anims.forEach(function (a) { try { a.cancel(); } catch (eC) { } });
        /* 落位前**重新量一次真卡**：它的位置会随主界面浮现而挪（实测 top 537 → 547，因为窄屏问候语
           这时才折成两行）⇒ 不重量就会差十来个像素，那就不是"按设计稿还原"了。 */
        if (card) {
          var r2 = card.getBoundingClientRect();
          if (r2 && r2.width > 0) {
            W = r2.width; H = r2.height;
            ex = (W - from.width) / 2; ey = (H - from.height) / 2;
            dx = (r2.left + r2.width / 2) - (from.left + from.width / 2);
            dy = (r2.top + r2.height / 2) - (from.top + from.height / 2);
          }
        }
        goBtn.style.transition = 'none';
        goBtn.style.transform = 'translate(' + dx + 'px,' + (floorY - bounce) + 'px)';
        void goBtn.offsetWidth;                              /* 先钉住这一帧，再开过渡 */
        var d2 = 620;
        /* ⚠ 背景/边框的过渡**不能加 delay**：一给延迟，球就会"尺寸已经长成卡的方框、颜色还是主题色实心"
           */
        goBtn.style.transition = 'width ' + d2 + 'ms cubic-bezier(.2,.75,.25,1),'
          + 'height ' + d2 + 'ms cubic-bezier(.2,.75,.25,1),'
          + 'border-radius ' + d2 + 'ms cubic-bezier(.4,.05,.2,1),'
          + 'transform ' + d2 + 'ms cubic-bezier(.2,.72,.24,1),'
          + 'opacity .22s ease,'                      /* 与真卡壳的 .18s 交叉：时长接近才不会忽明忽暗 */
          + 'background .26s ease,border-color .26s ease,box-shadow .30s ease';
        goBtn.style.width = W + 'px';
        goBtn.style.height = H + 'px';
        goBtn.style.borderRadius = '24px';
        goBtn.style.transform = 'translate(' + (dx - ex) + 'px,' + (dy - ey) + 'px)';
        /*
           全在 .glass 里，值是从 html[data-step="q"] .cbar 的规则里逐项抄的。
           于是球展开出来就是一张**空对话框**（壳与真卡一模一样、里面还没有字与选项），
           而不是一块主题色实心方块。第二拍再往框里填内容。 */
        goBtn.classList.remove('ink');
        goBtn.classList.add('glass');
        goBtn.style.color = 'transparent';
        /* */
        var sv = goBtn.querySelector('svg');
        if (sv) { sv.style.transition = 'transform .28s ease,opacity .28s ease'; }
      }, 720);

      /*
         那枚提交按钮的位置（带箭头的圆形按钮）。于是"箭头最后才出现"这件事，就由这个过程本身完成：
         大球里的箭头跟着小球飞走，最后落成提交键。 */
      var seed = null;
      /*
         而且速度不能比方框展开快；**方框完全展开（1340ms）时，按钮滑到位、其他元素也浮现到位** —— 三者同时到位。
         时间全部倒推自 T = 1340ms（= 球展开完成的时刻，720+620）：
           · 按钮：860 起步、滑 480ms ⇒ 1340 到位（平均 0.29px/ms，比方框展开的 0.45px/ms 慢 ⇒ 不会比它快）
           · 卡内内容：920 起、.42s ⇒ 1340 到位
           · 顶栏与问候语：990 起、.35s ⇒ 1340 到位
         起点仍用「点击那一刻量下的卡底边中点」——展开期间卡的位置不会变，所以起点是准的。 */
      setTimeout(function () {
        if (!dotAbs || !cardAbs || !goBtn.cloneNode) return;
        var bx = Math.round(cardAbs.left + cardAbs.width / 2 - dotAbs.w / 2);   /* 方框底边中点 */
        var by = Math.round(cardAbs.top + cardAbs.height - dotAbs.h - 9);       /* 贴着底边露头 */
        seed = goBtn.cloneNode(true);
        seed.className = 'sl-seed';
        seed.style.left = bx + 'px';
        seed.style.top = by + 'px';
        seed.style.width = Math.round(dotAbs.w) + 'px';
        seed.style.height = Math.round(dotAbs.h) + 'px';
        seed.style.borderRadius = '50%';    /* ⚠ 必须显式写：clone 会把大球行内的 24px 方角一起带过来 */
        document.body.appendChild(seed);
        /* 大球里那枚箭头"跟着离开" */
        var sv0 = goBtn.querySelector('svg');
        if (sv0) { sv0.style.transform = 'scale(.5)'; sv0.style.opacity = '0'; }
        var mx = Math.round(dotAbs.left - bx);            /* 向右移动的距离 */
        var my = Math.round(dotAbs.top - by);
        /* ⚠ 位移与透明度**分开两条动画**：位移要用"极慢起手"的阻尼曲线，
           但透明度若也走这条曲线，方框形成的瞬间小球还是全透明的（用户："小球并没有淡入"）。
           所以透明度单走一条、前 18% 就显到 0.10 ⇒ 一出现就能看见。 */
        seed.animate([
          { transform: 'translate(0,0)' },
          { transform: 'translate(' + mx + 'px,' + my + 'px)' }
        ], { duration: 480, fill: 'forwards', easing: 'cubic-bezier(.62,.02,.28,1)' });
        seed.animate([
          { opacity: 0, offset: 0 },
          { opacity: .15, offset: .18 },   /* 展开期间就看得见它，不再是 0.01 那种"看不见" */
          { opacity: .30, offset: .55 },
          { opacity: .30, offset: 1 }      /* ⚠ 最后一帧必须钉在 offset 1：否则 .55 之后会继续朝 CSS 的 0 插值（透明度一路下滑） */
        ], { duration: 480, fill: 'forwards', easing: 'ease-out' });
      }, 860);
      /* 注：不在这里做"补位"。实测提交键那几个像素的漂移（719→731→723）是动画后期页面微动的**瞬态**，
         动画彻底结束后会回到原值；用同一次量出来的绝对坐标反而最稳。 */

      /* 交接：真卡那枚提交键淡入（sl-nogo 摘掉）之后，把剥离出来的圆按钮收掉 —— 见上面 2520ms 那一条 */

      /* 第一拍：球长到与卡完全重合那一刻（720+620=1340ms）才放真卡的壳 —— 位置与外观一致 ⇒ 无缝接上 */
      setTimeout(function () { html.classList.remove('sl-shell'); }, 1346);

      /* 第一拍结束：球已经长成一张**空对话框**（壳与真卡外观一致、里面空着）→ 先让它站 200ms 让人看清，
         第二拍（A）才往框里填字/快捷选项/发送键。 */
      setTimeout(function () {
        goBtn.style.pointerEvents = 'none';   /* 球已褪成透明，别挡着下面的卡收点击 */
        d.classList.add('out');
      }, 1600);   /* 球 1346 起淡出 .22s ⇒ 1566 已完全透明，这里再收开屏层就不会有残余突变 */
      /* 卡内内容：**倒推自 T=1340ms（球长完那一刻）** —— 内容的过渡是 opacity .42s，
         所以 1340-420 = **920ms** 起步 ⇒ 球到位的同时，框里的字/快捷选项/发送键也正好到位。
         ⚠ 2026-10-10 一度把它挪到 1500（想压"提前出现的方框"），是**判错了凶手**：
         那个方框其实是卡的父级 `.pane`（两层叠着的同一块玻璃，藏壳漏了它），
         */
      setTimeout(function () {
        html.classList.remove('sl-cinew');
        try { animateIn(); } catch (eA) { }
      }, 920);   /* 920 + .42s = 1340（与球长完同刻） */
      /* 交接（撤 sl-nogo 显真键 + 移除临时圆钮）：1340 到位后 **+80ms**。
         留这 80ms 是等父级 .gobar 的 opacity 先落到 1 ——
         */
      setTimeout(function () {
        html.classList.remove('sl-nogo');
        if (seed && seed.parentNode) seed.parentNode.removeChild(seed);
      }, 1420);
      /* 顶栏与问候语：**同样倒推自 1340** —— 它们的过渡是 opacity .35s ⇒ 990ms 起步。
         990 + .35s = 1340（与球/内容同刻到位）。 */
      setTimeout(function () { html.classList.remove('sl-late'); }, 990);
      /* ① 球与真卡壳**交叉**：1346ms 同时开始（壳淡入 .18s / 球淡出 .22s）⇒ 两者叠加的总亮度是连续的。 */
      setTimeout(function () { goBtn.style.opacity = '0'; }, 1346);
      /* 收尾：临时元素撤干净、解开重入锁。放在 1620ms（球的淡出 1346+220 已完成，
         否则移除时它还剩一点 opacity ⇒ 又是一次突变）。 */
      setTimeout(function () {
        if (goBtn.parentNode) goBtn.parentNode.removeChild(goBtn);
        killSplash();
        slBusy = false;
      }, 1620);
    }
    /* 出场：文字先收，珠子飞向「壹」那个圆 → 缩成它，主页面同时浮起。（Web Animations，不改文档流） */
    function out() {
      if (gone) return;
      gone = true;
      var el = document.getElementById('xlrSplash');
      if (!el) return;
      /* ★ 手机版走上面那套新动效；宽屏保持原样（珠子飞向「壹」）。 */
      if (narrowW() && goBtn) { outPhone(); return; }
      var orb = el.querySelector('.sl-orb');   /* 用珠子本体量：外面那层还含上下细线，高≠宽，算出来会落偏 */
      var tgt = document.querySelector('.vstep button[data-k="q"] i') ||
                document.querySelector('.vstep button[data-k="q"]');
      var from = orb ? orb.getBoundingClientRect() : null;
      var to = tgt ? tgt.getBoundingClientRect() : null;
      el.classList.add('out');
      try { document.documentElement.classList.add('slgo'); } catch (eG) { }
      setTimeout(function () { try { document.documentElement.classList.remove('slgo'); } catch (eG2) { } }, 2200);
      if (orb && from && to && orb.animate) {
        /* ★★ 把珠子从开屏外壳里「摘」出来挂到 body 上：外壳 `.out` 要整体淡出 +
           visibility:hidden（这样主页面才浮得出来），珠子留在里面会被一起抹掉 ——
           飞到壹的位置、转着圈缩小，全程 opacity=1，最后 100ms 才淡出交接给壹。 */
        try { document.body.appendChild(orb); orb.classList.add('sl-orb-fly'); orb.style.animation = 'none'; } catch (eM) { }
        orb.style.position = 'fixed';
        orb.style.left = from.left + 'px';
        orb.style.top = from.top + 'px';
        orb.style.margin = '0';
        orb.style.zIndex = '10001';
        orb.style.width = from.width + 'px';
        var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
        var dy = (to.top + to.height / 2) - (from.top + from.height / 2);
        var sc = Math.max(.08, to.width / Math.max(1, from.width));
        orb.style.transformOrigin = '50% 50%';
        /* ★ 太极自己转：**匀速**（linear），和珠子的位移/缩放分两条动画走。
           同一条 transform 里既写缓动又写旋转 ⇒ 转速被缓动拽得忽快忽慢（用户点了「不够丝滑」）。 */
        var tj = orb.querySelector('.sl-taiji');
        if (tj && tj.animate) {
          try { tj.getAnimations().forEach(function (aT) { aT.cancel(); }); } catch (eT2) { }
          tj.style.transformOrigin = '50% 50%';
          tj.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(720deg)' }],
            { duration: 1020, easing: 'cubic-bezier(.52,.04,.88,.3)', fill: 'forwards' });
        }
        /* ★ 先掐掉珠子自己的入场淡入动画 —— 否则飞行途中两条动画抢 opacity，
           */
        try { orb.getAnimations().forEach(function (a) { a.cancel(); }); } catch (eK) { }
        /*
           所以模糊不是最后 100ms 才来，而是从 55% 起一路加厚（2px→10px），
           和「壹用 blur 凝出」（CSS 的 vborn 也加了 blur）两头叠上 ⇒ 糊着交棒，不是硬切。 */
        orb.animate([
          { transform: 'translate(0,0) scale(1)', opacity: 1, filter: 'blur(0px)', offset: 0, easing: 'cubic-bezier(.34,.72,.22,1)' },
          { transform: 'translate(' + (dx * .55) + 'px,' + (dy * .55) + 'px) scale(' + (sc * 1.6) + ')', opacity: 1, filter: 'blur(0px)', offset: .5, easing: 'cubic-bezier(.34,.72,.22,1)' },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')', opacity: .92, filter: 'blur(2px)', offset: .72, easing: 'linear' },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + (sc * .9) + ')', opacity: .5, filter: 'blur(6px)', offset: .88 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + (sc * .78) + ')', opacity: 0, filter: 'blur(10px)', offset: 1 }
        ], { duration: 1020, easing: 'linear', fill: 'forwards' });
        var b1 = document.querySelector('.vstep button[data-k="q"]');
        if (b1) { b1.classList.add('vborn'); setTimeout(function () { b1.classList.remove('vborn'); }, 1400); }
      }
      setTimeout(function () { killSplash(); }, 1050);
    }
    /* 撤开屏层的同时摘掉 sl-on（引导层靠它复位） */
    function killSplash() {
      var e = document.getElementById('xlrSplash');
      if (e && e.parentNode) e.parentNode.removeChild(e);
      try { document.documentElement.classList.remove('sl-on'); } catch (eS1) { }
    }
    /*
       ⇒ 手机版**只有点那枚按钮**才继续；宽屏保持原样（点哪儿都行 + 自动兜底）。 */
    /* ★  声明差异（本工具唯一那 1 处）：把本作用域里的 out / killSplash 交到装配层。
       位置与手法 = 组装期 变更记录 那次注入（见 tools/assemble-desktop.mjs 的 EXPOSE_ANCHOR），
       只是搬进了本仓 —— 咬断早期实现之后，React 那份开屏的退场动作仍要有人给。 */
    try { OUT = out; KILL = killSplash; } catch (eExp) { }
    if (goBtn) goBtn.addEventListener('click', function (e) { e.stopPropagation(); out(); });
    d.addEventListener('click', function (e) {
      if (!narrowW()) { out(); return; }
      if (goBtn && (e.target === goBtn || goBtn.contains(e.target))) out();
    });
    /*
       —— 桌面端：3 秒不动自动进入（沿用早期实现行为 + 7 秒兜底）；
       —— 手机端：**只有点「进入」才走**（原话「不再自动跳过」）。
       手机端错判成宽屏（模拟器里 innerWidth=760 而 viewport 写的是 390，见 变更记录 早期实现），
       也会把拉窄的桌面窗口错判成手机 ⇒ 两个方向都**不留宽度回退**。 */
    if (!IS_PHONE) {
      setTimeout(function () {
        var w = 3000 - (Date.now() - t0);
        if (w > 0) setTimeout(out, w); else out();
      }, 60);
      setTimeout(out, 7000);                               /* 兜底：绝不让它一直盖着（只桌面端） */
    }
  }

/* ===== 装配层（本工具写的那一层，不是切片） ===== */
export const SplashCore = {
  /** 建开屏层（幂等：源里首行就是「已有 #xlrSplash 就早退」）。
      */
  buildSplash: buildSplash,
  /** 退场（源里那份 `out`）：走 `getElementById('xlrSplash')` ⇒ 作用到 React 渲染的那个节点。
      */
  out: function () { return OUT ? OUT.apply(null, arguments) : false; },
  /** 撤层（源里那份 `killSplash`）。 */
  kill: function () { return KILL ? KILL.apply(null, arguments) : false; },
  /* */
  state: function () { return { out: typeof OUT, kill: typeof KILL, on: window.__xlrSplashOn === true }; },
};
