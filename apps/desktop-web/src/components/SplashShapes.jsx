/*
   来源：legacy `buildSplash()` 内联 SVG 的 `defs` 之后的图形与路径段（由工具**机械切分**，非手抄）
   生成：node tools/gen-splash-jsx.mjs --part rest
   规则：**等价翻译** —— 标签名/属性值/层级/顺序逐字保留，只做 HTML→JSX 的属性名映射
        （stop-color→stopColor 等，映射表见工具）。 */
/*
   改动：删鱼眼 9 节点（含眼窝/高光/眼弧）· 清空 tjHi 柔光组（tjSheen 整圆罩 + tjGloss 棱光弧）· 两瓣纯黑白。
   原文：「能不能把这个太极图里的鱼眼去掉…就纯黑白阴阳，这才是真正的太极图。（开屏和按钮转变都要换）」 */
export default function SplashShapes() {
  return (
  <>
    <ellipse cx="62" cy="102" rx="19" ry="4.5" fill="url(#tjShadowCore)" />
    <ellipse cx="63" cy="103" rx="34" ry="8" fill="url(#tjShadow)" />
    <circle className="tjRg" cx="60" cy="59.5" r="58" fill="none" stroke="rgba(126,134,146,.20)" strokeWidth="1" />
    <circle className="tjRg2" cx="60" cy="59.5" r="54" fill="none" stroke="rgba(126,134,146,.12)" strokeWidth="1" />
    <circle className="tjRgIn" cx="60" cy="59.5" r="51.6" fill="none" stroke="rgba(20,24,30,.07)" strokeWidth="1.6" />
    <path className="tjRg" d="M15 31 A58 58 0 0 1 73 1.8" fill="none" stroke="url(#tjRing)" strokeWidth="1.7" strokeLinecap="round" />
    <path className="tjRg" d="M103 22 A58 58 0 0 1 115 71" fill="none" stroke="url(#tjRing)" strokeWidth="1.1" strokeLinecap="round" opacity=".7" />
    <path className="tjRg" d="M43 114 A58 58 0 0 1 9 82" fill="none" stroke="url(#tjRing)" strokeWidth="1.1" strokeLinecap="round" opacity=".55" />
    <path className="tjRg" d="M75 3.5 A58 58 0 0 1 111 33" fill="none" stroke="url(#tjRing)" strokeWidth=".9" strokeLinecap="round" opacity=".45" />
    <circle className="tjY" cx="60" cy="59.5" r="52" fill="url(#tjYang)" />
    <circle className="tjEdge" cx="60" cy="59.5" r="50.6" fill="none" stroke="rgba(30,36,44,.07)" strokeWidth="2.6" />
    <path className="tjD" d="M60 7.5 A52 52 0 0 1 60 111.5 A26 26 0 0 1 60 59.5 A26 26 0 0 0 60 7.5 Z" fill="url(#tjYin)" />
    <circle className="tjRim" cx="60" cy="59.5" r="51.4" fill="none" stroke="rgba(52,60,70,.26)" strokeWidth="1.5" />
    <path className="tjCres" d="M28.5 97 A50 50 0 0 1 110 59.5" fill="none" stroke="url(#tjCres)" strokeWidth="3" strokeLinecap="round" />
    <path className="tjRefl" d="M90.2 23.5 A47 47 0 0 1 106.3 51.3" fill="none" stroke="rgba(255,255,255,.26)" strokeWidth="2.6" strokeLinecap="round" />
    <path className="tjRefl" d="M81 96 A42 42 0 0 0 99 75" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1.8" strokeLinecap="round" />
    <path className="tjSeam" transform="translate(4 0)" d="M60 111.5 A26 26 0 0 1 60 59.5 A26 26 0 0 0 60 7.5" fill="none" stroke="rgba(255,255,255,.30)" strokeWidth="4.4" strokeLinecap="round" />
    <path className="tjSeamCore" transform="translate(4 0)" d="M60 111.5 A26 26 0 0 1 60 59.5 A26 26 0 0 0 60 7.5" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.6" strokeLinecap="round" />
    <g className="tjHi">
    </g>
  </>
  );
}
