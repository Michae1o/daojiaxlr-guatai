/* askTaijiMarkup.js —— 「接着问」那一颗太极的**唯一来源**（本仓自绘 · 手机端专有）
 *
 * ★ 原文（2026-10-16 · 本(会话)）：
 *   第一轮：「我是觉得**有点模糊，边缘有锯齿**，而且**要不要把它也改成玻璃感？和背景统一风格**？
 *           **单指安卓版接着问的这单独一个**」
 *   第二轮：「**那就单独搞一个，液态感一点，然后黑白过渡不要太过硬核，可以软过渡那种**」
 *          ＋「机端一份源码同时出 APK 和手机网页 /xlr/m/ ⇒ 改完两边一起变没问题」
 *   第三轮（看了第一版定稿图）：「**十分模糊，为什么不能提高像素呢？**而且我要的液态感是**有点流动感的**，
 *           然后**黑白过渡可以彼此渗透一点**的那种」
 *   ⇒ 本版三处修正：① **不再用大模糊**（0.9 → 0.35，只用来吃掉锯齿，不是用来做过渡）；
 *      ② 过渡改成**几何渗透**（两缕墨渗进白、两缕白渗进墨，各自是贴着缝的小软斑）；
 *      ③ **流动感**＝三层慢动（瓣体呼吸 / 渗透呼吸 / 受光漂移；CSS 见 tailwind.css 的 #btnAskMore 段）。
 *
 * ── 为什么单出一份（而不是继续复用开屏那份）────────────────────────────
 *   旧做法：`modelAskCore.js` 的 `askTaijiOn()` 直接 import 开屏的 `splashMarkup.js`（零复制共用）。
 *   用户明确「单指这一个」⇒ 改共用源会让**开屏那颗**一起变 ⇒ 必须另立一份，开屏那份一字不动。
 *
 *   开屏：`viewBox 0 0 120 120`，显示 **58×58**（legacy.css `.sl-orb`）⇒ 1 画稿单位 = 0.483 CSS px。
 *   按钮：同一个 120 单位画稿被 `#btnAskMore .sl-orb` 压到 **36×36** ⇒ 1 单位 = **0.30 CSS px**，
 *         而旧稿线宽是 0.9 / 1 / 1.1 / 1.5 / 1.6 / 1.7 单位 ⇒ **0.8～1.5 个设备像素**（DPR3）
 *         ⇒ 亚像素细线 ＋ 慢转（askSpin 3.6s）每帧重采样 = 用户看到的「模糊、边缘锯齿」。
 *         ＋ 删掉旧稿那三圈 r≈17 的发丝环（36px 下本来就是灰晕）＋ 最细线宽 **0.7 单位 = 2.1 设备像素**。
 *   ⚠ 「提高像素」的实情：这是矢量稿，真机上按 DPR 栅格化（DPR3 ⇒ 108×108 设备像素），
 *     清晰度取决于**几何**（线宽是否 ≥2 设备像素、有没有上大模糊），不是「分辨率不够」。
 *
 *   ① 液态感（流动）：珍珠底 ＋ 液面高光（`.tjHi`，吃 legacy 的 tjFlow 漂移）＋ 右下内缘棱光
 *      ＋ **瓣体缓慢呼吸**（`.atk-flow`）＋ **渗透缕呼吸**（`.atk-bleed`）＋ 整块 3.6s 慢转（既有）。
 *   ② 黑白彼此渗透：瓣体仍是**实心**（#191d22→#0c0e11，不加透明度、不洗灰），
 *      缝上只留 **0.35 单位（≈1 设备像素）** 的一点羽化（吃锯齿用），
 *      真正的「渗透」交给贴着缝的 4 缕软斑（墨→白 2 缕 / 白→墨 2 缕）。
 *   ③ ⚠ 瓣的外弧特意画到 **r=17.2（大于裁切圈 16.6）**：羽化是双向的，外弧若与裁切圈重合，
 *      暗瓣会沿边缘被糊掉一圈；外弧画大一档 ⇒ 裁切处仍是实心，轮廓干净。
 *
 * ⚠ 复用开屏的**类名**（`.sl-orb` / `.sl-taiji` / `.tjHi`）是**有意**的：
 *   `legacy.css` / `tailwind.css` 里那几件（36px 定位、从按钮长出来的形变、askSpin 慢转、tjFlow 漂移）
 *   全靠这几个类名 ⇒ 换画稿不必动既有规则。渐变 id 一律 `atk*` 前缀，避免与开屏的 `tj*` 撞 id。
 *   对照：开屏那份的瓣是**纯黑白硬边**（`SplashDefs.jsx` 的 tjYang/tjYin 各档同色）——变更记录 管的是**它**。
 */
export const ASK_TAIJI_SHA16 = 'dcff94d8caf41114';

export const ASK_TAIJI_MARKUP =
  '<span class="sl-orb" aria-hidden="true">' +
    '<svg class="sl-taiji" viewBox="0 0 36 36" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="atkBody" x1="14%" y1="4%" x2="86%" y2="96%">' +
          '<stop offset="0" stop-color="#ffffff"/>' +
          '<stop offset=".5" stop-color="#fbfcfd"/>' +
          '<stop offset="1" stop-color="#f4f7f9"/>' +
        '</linearGradient>' +
        '<linearGradient id="atkYin" x1="30%" y1="0%" x2="70%" y2="100%">' +
          '<stop offset="0" stop-color="#191d22"/>' +
          '<stop offset="1" stop-color="#0c0e11"/>' +
        '</linearGradient>' +
        '<radialGradient id="atkGloss" cx="34%" cy="26%" r="62%">' +
          '<stop offset="0" stop-color="#ffffff" stop-opacity=".20"/>' +
          '<stop offset=".55" stop-color="#ffffff" stop-opacity=".06"/>' +
          '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>' +
        '</radialGradient>' +
        '<linearGradient id="atkRim" x1="20%" y1="6%" x2="82%" y2="94%">' +
          '<stop offset=".42" stop-color="#ffffff" stop-opacity="0"/>' +
          '<stop offset="1" stop-color="#ffffff" stop-opacity=".38"/>' +
        '</linearGradient>' +
        '<clipPath id="atkClip"><circle cx="18" cy="18" r="16.6"/></clipPath>' +
        /* 只吃锯齿：0.35 单位 ≈ 1 设备像素（上一版用 0.9 ⇒ 用户判「十分模糊」） */
        '<filter id="atkSoft" x="-15%" y="-15%" width="130%" height="130%">' +
          '<feGaussianBlur stdDeviation="0.35"/>' +
        '</filter>' +
        /* 渗透缕专用：比瓣体软一档，才像墨在水里化开 */
        '<filter id="atkBleed" x="-30%" y="-30%" width="160%" height="160%">' +
          '<feGaussianBlur stdDeviation="0.8"/>' +
        '</filter>' +
      '</defs>' +
      /* 1 液面张力：外圈一道柔光（0.7 单位 = 2.1 设备像素） */
      '<circle cx="18" cy="18" r="17.25" fill="none" stroke="rgba(255,255,255,.26)" stroke-width=".7"/>' +
      /* 2 瓣体（白侧）：珍珠底 */
      '<circle cx="18" cy="18" r="16.6" fill="url(#atkBody)"/>' +
      /* 3 阴瓣：实心黑＋缝上一点羽化（外弧 r=17.2 故意大过裁切圈）＋ 缝上一道浅棱光 */
      '<g class="atk-flow" clip-path="url(#atkClip)" filter="url(#atkSoft)">' +
        '<path d="M18 0.8 A17.2 17.2 0 0 1 18 35.2 A8.6 8.6 0 0 1 18 18 A8.6 8.6 0 0 0 18 0.8 Z" fill="url(#atkYin)"/>' +
        '<path d="M18 0.8 A17.2 17.2 0 0 1 18 35.2 A8.6 8.6 0 0 1 18 18 A8.6 8.6 0 0 0 18 0.8 Z" fill="none" stroke="rgba(255,255,255,.20)" stroke-width=".7"/>' +
      '</g>' +
      /* 4 彼此渗透：贴着缝的 4 缕（上段月牙「墨→白」两缕 · 下段暗面「白→墨」两缕），各自还会缓缓呼吸 */
      '<g class="atk-bleed" clip-path="url(#atkClip)" filter="url(#atkBleed)">' +
        '<ellipse cx="24.4" cy="6.6" rx="2.6" ry="1.05" transform="rotate(-28 24.4 6.6)" fill="#12151a" opacity=".55"/>' +
        '<ellipse cx="24.2" cy="12.4" rx="2.2" ry=".85" transform="rotate(-58 24.2 12.4)" fill="#12151a" opacity=".42"/>' +
        '<ellipse cx="11.8" cy="29.4" rx="2.6" ry="1" transform="rotate(26 11.8 29.4)" fill="#ffffff" opacity=".5"/>' +
        '<ellipse cx="11.4" cy="22.8" rx="2" ry=".8" transform="rotate(58 11.4 22.8)" fill="#ffffff" opacity=".38"/>' +
      '</g>' +
      /* 5 轮廓：给白瓣一个形（0.7 单位 = 2.1 设备像素） */
      '<circle cx="18" cy="18" r="16.6" fill="none" stroke="rgba(24,28,36,.34)" stroke-width=".7"/>' +
      /* 6 受光组（.tjHi ⇒ 吃到 legacy 那条 tjFlow 漂移）：液面高光 ＋ 右下内缘棱光 */
      '<g class="tjHi">' +
        '<circle cx="18" cy="18" r="16.6" fill="url(#atkGloss)"/>' +
        '<circle cx="18" cy="18" r="15.3" fill="none" stroke="url(#atkRim)" stroke-width="1.5"/>' +
      '</g>' +
    '</svg>' +
  '</span>';
