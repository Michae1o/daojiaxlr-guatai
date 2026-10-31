/*
   来源：legacy `buildSplash()` 内联 SVG 的 `<defs>` 段（由工具**机械切分**，非手抄）
   生成：node tools/gen-splash-jsx.mjs --part defs
   规则：**等价翻译** —— 标签名/属性值/层级/顺序逐字保留，只做 HTML→JSX 的属性名映射
        （stop-color→stopColor 等，映射表见工具）。 */
export default function SplashDefs() {
  return (
  <defs>
    <linearGradient id="tjYang" x1="24%" y1="2%" x2="78%" y2="98%">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset=".42" stopColor="#ffffff" />
      <stop offset=".82" stopColor="#ffffff" />
      <stop offset="1" stopColor="#ffffff" />
    </linearGradient>
    <linearGradient id="tjYin" x1="10%" y1="4%" x2="90%" y2="98%">
      <stop offset="0" stopColor="#0e0f11" />
      <stop offset=".26" stopColor="#0e0f11" />
      <stop offset=".62" stopColor="#0e0f11" />
      <stop offset="1" stopColor="#0e0f11" />
    </linearGradient>
    <linearGradient id="tjCres" x1="8%" y1="96%" x2="96%" y2="40%">
      <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
      <stop offset=".34" stopColor="#ffffff" stopOpacity="0" />
      <stop offset=".58" stopColor="#ffffff" stopOpacity=".95" />
      <stop offset=".74" stopColor="#ffffff" stopOpacity=".5" />
      <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>
    <linearGradient id="tjGloss" x1="6%" y1="66%" x2="70%" y2="4%">
      <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
      <stop offset=".42" stopColor="#ffffff" stopOpacity=".95" />
      <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>
    <radialGradient id="tjSpec" cx="50%" cy="50%" r="50%">
      <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
      <stop offset=".55" stopColor="#ffffff" stopOpacity=".85" />
      <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="tjEyeSh" cx="46%" cy="44%" r="58%">
      <stop offset="0" stopColor="#2a2f36" stopOpacity=".26" />
      <stop offset=".6" stopColor="#2a2f36" stopOpacity=".12" />
      <stop offset="1" stopColor="#2a2f36" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="tjSheen" cx="30%" cy="15%" r="64%">
      <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
      <stop offset=".5" stopColor="#ffffff" stopOpacity=".30" />
      <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="tjEyeY" cx="36%" cy="28%" r="72%">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset=".54" stopColor="#eae8e2" />
      <stop offset="1" stopColor="#c0bbb2" />
    </radialGradient>
    <radialGradient id="tjEyeD" cx="38%" cy="26%" r="76%">
      <stop offset="0" stopColor="#6a7078" />
      <stop offset=".46" stopColor="#31363c" />
      <stop offset="1" stopColor="#101317" />
    </radialGradient>
    <radialGradient id="tjShadow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stopColor="#1b1f25" stopOpacity=".16" />
      <stop offset=".6" stopColor="#1b1f25" stopOpacity=".07" />
      <stop offset="1" stopColor="#1b1f25" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="tjShadowCore" cx="50%" cy="50%" r="50%">
      <stop offset="0" stopColor="#15181d" stopOpacity=".26" />
      <stop offset=".55" stopColor="#15181d" stopOpacity=".12" />
      <stop offset="1" stopColor="#15181d" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="tjRing" x1="12%" y1="2%" x2="86%" y2="96%">
      <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
      <stop offset=".45" stopColor="#cfd6df" stopOpacity=".45" />
      <stop offset="1" stopColor="#ffffff" stopOpacity=".7" />
    </linearGradient>
  </defs>
  );
}
