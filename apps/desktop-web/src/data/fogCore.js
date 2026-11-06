/* fogCore.js —— 背景雾气（移植自安卓 2.261103.4 的 SkinFogBackdrop / RealtimeFog）
 *
 * 真源：apps/android/kuikly/shared/src/commonMain/kotlin/com/xlr/k/pages/FogBackdrop.kt
 *       apps/android/kuikly/androidApp/src/main/java/com/xlr/k/fog/RealtimeFogView.kt（AGSL 密度场）
 * 这里只做三件事：**数据**（每套皮肤用哪几团雾、位移/铺开多少）、**运动学**（三股独立流动的
 * 相位公式，逐字照 Kotlin 的 wave/FogCloud）、**状态**（档位与冻结，按安卓同名语义存本机）。
 *
 * 三档（安卓「背景雾气」分段控件）：
 *   0 静态雾景   —— 不跑表，画面停在上次相位（默认 0）
 *   1 轻柔流动   —— 贴图三层沿平滑路径游移（非等比缩放、各层周期不同）
 *   2 实时流雾   —— WebGL 密度场（AGSL 的 GLSL 移植），雾形本身在变
 *
 * 口径：档位与冻结都是**每档独立**的（安卓 2.261103.4 把冻结从「雾开关」里拆出来了）。
 */

export const FOG_LEVELS = ['静态雾景', '轻柔流动', '实时流雾'];

/* 安卓 FogBackdrop.kt：CLOCK_MS = 210_000（二档完整循环），CLOCK_S = 180（逻辑相位） */
export const PNG_CLOCK_MS = 210000;
export const PNG_CLOCK_S = 180;

const KEY_LEVEL = 'xlr-fog-level';
const KEY_FROZEN = 'xlr-fog-frozen-';
const KEY_PHASE = 'xlr-fog-phase-';

/* 每套皮肤的雾团 —— 名字、种子、位移（dp）、铺开量，逐项照 Kotlin。
   dx/dy 为负表示往反方向游移。 */
export const SKIN_CLOUDS = {
  glass: [
    { name: 'pink', seed: 0.0, dx: 74, dy: -54, spread: 0.15 },
    { name: 'blue', seed: 1.9, dx: -80, dy: 69, spread: 0.17 },
    { name: 'violet', seed: 3.7, dx: 59, dy: -74, spread: 0.13 }
  ],
  bw: [
    { name: 'bw-ink', seed: 0.6, dx: 54, dy: -45, spread: 0.11 },
    { name: 'bw-light', seed: 2.6, dx: -59, dy: 50, spread: 0.11 }
  ],
  hei: [
    { name: 'hei-light', seed: 1.2, dx: 54, dy: -50, spread: 0.11 },
    { name: 'hei-ink', seed: 3.2, dx: -59, dy: 45, spread: 0.12 }
  ],
  xuan: [
    { name: 'xuan-warm', seed: 1.5, dx: 40, dy: -35, spread: 0.08 }
  ],
  qing: [
    { name: 'qing-jade', seed: 0.3, dx: 64, dy: -54, spread: 0.13 },
    { name: 'qing-blue', seed: 2.1, dx: -59, dy: 64, spread: 0.12 }
  ],
  dou: [
    { name: 'dou-rose', seed: 0.9, dx: 59, dy: -50, spread: 0.12 },
    { name: 'dou-mauve', seed: 2.9, dx: -54, dy: 59, spread: 0.13 }
  ],
  dh: [
    { name: 'dh-ochre', seed: 0.4, dx: 54, dy: -45, spread: 0.12 },
    { name: 'dh-mineral', seed: 2.4, dx: -59, dy: 50, spread: 0.13 },
    { name: 'dh-azurite', seed: 4.2, dx: 45, dy: -54, spread: 0.11 }
  ],
  mg: [
    { name: 'mg-gold', seed: 1.1, dx: 50, dy: -40, spread: 0.12 },
    { name: 'mg-blue', seed: 3.4, dx: -59, dy: 50, spread: 0.13 },
    { name: 'mg-ember', seed: 5.1, dx: 45, dy: -50, spread: 0.11 }
  ]
};

/* 原 PNG 只有敦煌 / 莫高窟用（二档「褶皱」以外）；其余套装的雾一律走 flow/wisp。 */
const ORIGINAL_SKINS = { dh: 1, mg: 1 };

/* 实时流雾的色彩与浓度 —— 安卓 RealtimeFogView.applyPalette() 原值。
 * ★ 桌面调参：宣纸 / 敦煌 / 莫高窟 反馈「太淡」，浓度上调（安卓那组值在手机上够，
 *   桌面视口大、雾被摊薄）。其余套装保持安卓原值。 */
const REALTIME_PALETTE = {
  glass: { colors: [0xdf9ec4, 0x94b5eb, 0xb497db], strength: 0.33 },
  bw: { colors: [0x242424, 0xffffff, 0x888888], strength: 0.20, speed: 1.9 },
  hei: { colors: [0xacacac, 0x686868, 0x959595], strength: 0.18 },
  xuan: { colors: [0xc0a587, 0xb8aa97, 0xc8b89f], strength: 0.26 },
  qing: { colors: [0x639f94, 0x819fb2, 0x729c9b], strength: 0.33 },
  dou: { colors: [0xa8746a, 0xb8969d, 0xbd9388], strength: 0.33 },
  dh: { colors: [0xa96f53, 0x698d7d, 0x647f99], strength: 0.58, relief: 1.45 },
  mg: { colors: [0xc69a59, 0x577392, 0xad7955], strength: 0.44 }
};

/* 贴图档（轻柔流动 / 静态）每套皮肤的浓度增益：安卓的 alpha 是按手机小屏算的，
   桌面把同一张 640×960 铺到 1200+ 宽以后整体偏淡 ⇒ 按皮肤各给一档（1 = 安卓原值）。
   此前反馈：黑白 / 梦幻 / 青瓷 / 豆沙 偏淡；宣纸 / 莫高窟更淡（纸色吃雾）；
   敦煌次之。黑黑夜保持克制（深底本来就显）。 */
/* 贴图档的流速倍率：安卓按手机屏给的周期，桌面看（尤其莫高窟这种大团慢雾）几乎不动。
   莫高窟 1.9×：肉眼能看出烟在走；其余保持 1。 */
const FOG_SPEED = { mg: 1.9 };

const FOG_GAIN = {
  bw: 1.55, glass: 1.55, qing: 1.6, dou: 1.6,
  xuan: 2.3, mg: 1.35, dh: 1.7, hei: 1.25
};

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

/* ---------- 档位 / 冻结（每档独立） ---------- */
export function getFogLevel() {
  const v = parseInt(lsGet(KEY_LEVEL), 10);
  /* 没存过就默认「轻柔流动」（安卓默认是 0=静态；桌面屏幕大、静帧更淡，默认给会动的那档才看得见）。
     ⚠ 用户自己选过就完全听他的（包括选回静态）。 */
  return (v >= 0 && v <= 2) ? v : 1;
}
export function setFogLevel(level) {
  const n = Math.max(0, Math.min(2, level | 0));
  lsSet(KEY_LEVEL, String(n));
  return n;
}
export function isFogFrozen(level) {
  if (level !== 1 && level !== 2) return false;   /* 静态档没有「冻结」可言 */
  return lsGet(KEY_FROZEN + level) === 'true';
}
export function toggleFogFrozen(level) {
  if (level !== 1 && level !== 2) return false;
  const next = !isFogFrozen(level);
  lsSet(KEY_FROZEN + level, next ? 'true' : 'false');
  return next;
}

/* 相位按皮肤存（安卓 KEY_FOG_PHASE_<skin>）：冻结/切档/卸载后接着走，不跳。 */
export function getPhase(skin) {
  const v = parseFloat(lsGet(KEY_PHASE + skin));
  return (isFinite(v) && v >= 0 && v <= 1) ? v : 0;
}
export function savePhase(skin, phase) {
  if (!isFinite(phase)) return;
  lsSet(KEY_PHASE + skin, String(Math.max(0, Math.min(1, phase))));
}

/* 实时流雾的种子（安卓：保存每个皮肤第一次抽到的 seed，冻结回看时画面不换天） */
export function getSeed(skin) {
  const k = 'xlr-fog-seed-' + skin;
  const v = parseFloat(lsGet(k));
  if (isFinite(v) && v >= 0) return v;
  const s = Math.random() * 100;
  lsSet(k, String(s));
  return s;
}

/* ---------- 运动学（逐字照 FogCloud） ---------- */
function wave(sec, periodSec, phase) {
  return Math.sin(2 * Math.PI * (sec / periodSec) + phase);
}

/**
 * 一团雾的第 li 层在这一刻的样式。
 * li 顺序与安卓 for (li in 0..if (original) 1 else 2) 一致：
 *   li=0 主密度（flow）· li=1 薄雾（wisp，周期减半）· li=2 逆向薄雾（flow，周期加倍）
 * @param {object} cloud  SKIN_CLOUDS 里的一项
 * @param {number} li     层号
 * @param {number} sec    逻辑秒（clock * 90 或 clock * 180）
 * @param {object} opt    { original, historical }
 */
export function layerStyle(cloud, li, sec, opt) {
  const original = !!(opt && opt.original);
  const historical = !!(opt && opt.historical);
  const fast = li === 0 ? 1 : (li === 1 ? 2 : 0.5);
  const amp = original
    ? (li === 0 ? 1 : 0.55)
    : (li === 0 ? 0.48 : (li === 1 ? 0.20 : 0.18));
  const ph = cloud.seed + li * 7.13;

  const kx = original ? amp : (li === 2 ? (historical ? -1.6 : -2.0) : (historical ? 1.45 : 1.85));
  const ky = original ? amp : (li === 1 ? (historical ? -1.4 : -1.8) : (historical ? 1.25 : 1.65));
  const px = cloud.dx * kx * (0.62 * wave(sec, 9 / fast, ph) + 0.38 * wave(sec, 15 / fast, ph + 1.7));
  const py = cloud.dy * ky * (0.66 * wave(sec, 10 / fast, ph + 3.1) + 0.34 * wave(sec, 18 / fast, ph + 5.3));

  const aBase = original ? 0.55 : 0.65;
  const aAmp = original ? 0.45 : 0.35;
  const a = amp * (aBase + aAmp * (0.5 + 0.5 * wave(sec, 6 / fast, ph + 2.2)));

  /* 非等比缩放：X/Y 各自独立相位与周期 ⇒ 拉长压扁，看起来在「变形」 */
  const sx = 1.02 + cloud.spread * 2.6 * (0.5 + 0.5 * wave(sec, 10 / fast, ph + 6.1));
  const sy = 1.00 + cloud.spread * 1.6 * (0.5 + 0.5 * wave(sec, 18 / fast, ph + 8.4));
  const rot = original ? 0 : 7 * wave(sec, 30 / fast, ph + 1.4);

  const asset = original ? cloud.name : (cloud.name + (li === 1 ? '-wisp' : '-flow'));
  return { asset: asset, px: px, py: py, alpha: a, sx: sx, sy: sy, rot: rot };
}

/** 这一档这一套皮肤要画什么（供 FogField 渲染） */
export function sceneFor(skin, level) {
  if (skin === 'bru') return null;                    /* 卡通不叠雾 */
  const clouds = SKIN_CLOUDS[skin];
  if (!clouds) return null;
  /* 敦煌在「轻柔流动」与「实时流雾」都用褶皱版（flow/wisp）：
     此前要求两档观感一致，实时档不再走着色器（见 FogField 的 REALTIME_SKINS）。 */
  const folded = (skin === 'dh' || skin === 'mg');
  const original = !!ORIGINAL_SKINS[skin] && !folded;
  const historical = folded;
  let layers = [];
  clouds.forEach(function (c) {
    const count = original ? 2 : 3;
    for (let li = 0; li < count; li++) layers.push({ cloud: c, li: li });
  });
  /* 宣纸 / 青瓷：雾的原图本身极淡（宣纸暖雾最大 alpha 只有 30/255），单层铺到桌面几乎看不见。
     复制一轮错位的同一团雾，alpha 叠加后才有「和纸色/瓷色分得开」的浓度。 */
  const copies = skin === 'xuan' ? 3 : (skin === 'qing' ? 2 : 1);
  if (copies > 1) {
    const base = layers;
    for (let c = 1; c < copies; c++) {
      layers = layers.concat(base.map(function (l) {
        return {
          cloud: Object.assign({}, l.cloud, {
            seed: l.cloud.seed + 2.7 * c,
            dx: -l.cloud.dx * (0.75 - 0.2 * c),
            dy: l.cloud.dy * (0.7 + 0.25 * c)
          }),
          li: l.li
        };
      }));
    }
  }
  return {
    skin: skin,
    level: level,
    gain: FOG_GAIN[skin] || 1,
    speed: FOG_SPEED[skin] || 1,
    original: original,
    historical: historical,
    /* 原图档（敦煌/莫高窟）相位按 90 秒铺满；其余按 180 秒，与安卓一致 */
    originalPeriod: original,
    layers: layers,
    cinnabar: skin === 'xuan'       /* 宣纸：朱砂底纹 + 纸纹，静止、压在雾上 */
  };
}

export function secondsFor(clock, scene) {
  return clock * (scene.originalPeriod ? 90 : PNG_CLOCK_S);
}

/* 走一档要多久（安卓：原图 90s、敦煌二档 180s、其余 210s） */
export function durationFor(scene) {
  if (scene.originalPeriod) return 90000;
  if (scene.historical) return 180000;
  return PNG_CLOCK_MS;
}

/* ---------- 实时流雾 ---------- */
let glProbe = null;
export function realtimeAvailable() {
  if (glProbe !== null) return glProbe;
  try {
    const cv = document.createElement('canvas');
    glProbe = !!(cv.getContext('webgl2') || cv.getContext('webgl'));
  } catch (e) { glProbe = false; }
  return glProbe;
}

export function shaderPalette(skin) {
  const p = REALTIME_PALETTE[skin] || REALTIME_PALETTE.bw;
  const cols = p.colors.map(function (c) {
    return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
  });
  return { colors: cols, strength: p.strength, relief: p.relief || 1, speed: p.speed || 1 };
}

export function realtimeSkins() { return Object.keys(REALTIME_PALETTE); }

/* 实时流雾实际启用的皮肤：**不含敦煌 / 莫高窟** —— 这两套的雾是画好的原图（褶皱流纹 / 原 PNG），
   着色器出来的色块和它们对不上（：实时档的敦煌/莫高窟要跟轻柔流动一致）。 */
export const REALTIME_SKINS = ['bw', 'hei', 'glass', 'xuan', 'qing', 'dou', 'dh'];

/* AGSL → GLSL ES 3.00：逐行照 RealtimeFogView.SOURCE，只换类型名与入口。
   hash/noise3/density/wander/smoke 的常数一字不改，换端不能凭手感。 */
export const FOG_GLSL = `#version 300 es
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform float strength;
uniform float relief;
uniform float seed;
out vec4 outColor;

float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += vec3(dot(p, p.yzx + 33.33));
  return fract((p.x + p.y) * p.z);
}
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
float density(vec3 p) {
  return 0.76 * noise3(p) + 0.19 * noise3(p * 1.93 + 5.7)
       + 0.05 * noise3(p * 3.71 + 13.1);
}
// Independent random destinations, smoothly joined: no orbital loop,
// no per-frame random flicker. Travel spans the viewport, not a corner.
vec2 wander(float seconds, float period, float id) {
  float segment = floor(seconds / period);
  float f = fract(seconds / period);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 start = vec2(hash(vec3(segment, id, seed)), hash(vec3(segment, id + 9.7, seed)));
  vec2 finish = vec2(hash(vec3(segment + 1.0, id, seed)), hash(vec3(segment + 1.0, id + 9.7, seed)));
  return (mix(start, finish, f) - 0.5) * 2.4;
}
float smoke(vec3 p) {
  if (relief < 0.5) return density(p);
  p.xy = vec2(p.x * 0.86 - p.y * 0.51, p.x * 0.51 + p.y * 0.86);
  vec2 curl = vec2(noise3(p * 1.1 + 3.7), noise3(p * 1.1 + 9.2)) - 0.5;
  p.xy += curl * 1.1;
  float broad = 0.57 * noise3(p) + 0.28 * noise3(p * 1.87 + 5.7)
              + 0.11 * noise3(p * 3.4 + 13.1) + 0.04 * noise3(p * 5.8 + 21.3);
  float breaks = noise3(vec3(p.xy * 2.1, p.z * 0.7 + 17.4));
  return broad - 0.13 * smoothstep(0.45, 0.8, breaks);
}
void main() {
  vec2 coord = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y);
  vec2 uv = coord / resolution.y;
  float t = time * 0.045;
  vec2 p = uv * mix(3.2, 4.6, relief);
  vec2 bend = vec2(
    noise3(vec3(p * 0.7 + 2.1, t * 0.6)),
    noise3(vec3(p * 0.7 + 8.3, t * 0.6 + 4.2))) - 0.5;
  p += bend * (0.65 + 0.55 * relief);
  p += relief * 0.16 * vec2(sin(p.y * 1.6 + t * 0.9), sin(p.x * 1.4 - t * 0.7));
  float lo = mix(0.22, 0.26, relief);
  float hi = mix(0.86, 0.72, relief);
  vec2 travelScale = vec2(resolution.x / resolution.y, 1.0) * 4.6;
  vec2 wa = relief * wander(time, 26.0, 1.3) * travelScale;
  vec2 wb = relief * wander(time + 7.0, 31.0, 8.9) * travelScale;
  vec2 wc = relief * wander(time + 15.0, 29.0, 17.2) * travelScale;
  float a = smoothstep(lo, hi, smoke(vec3(p - wa + vec2(t * 0.55, -t * 0.35), t)));
  float b = smoothstep(lo, hi, smoke(vec3(p * 0.87 - wb + vec2(5.4 - t * 0.40, 2.6 + t * 0.28), t + 7.3)));
  float c = smoothstep(lo + 0.04, hi + 0.02, smoke(vec3(p * 0.72 - wc + vec2(9.2 + t * 0.32, 6.1 - t * 0.20), t * 0.8 + 15.7)));
  a *= a;
  b *= b;
  c *= c;
  c *= mix(1.0, 0.72, relief); // Warm ochre remains a smaller supporting current.
  float total = a + b + c + 0.001;
  float alpha = strength * (1.0 - exp(-1.15 * total));
  vec3 color = (color1 * a + color2 * b + color3 * c) / total;
  float core = smoothstep(0.30, 1.25, total);
  float depth = noise3(vec3(p * 0.8 + 4.7, t * 0.85 + 3.1));
  color *= 1.0 - relief * core * (0.08 + 0.12 * depth);
  outColor = vec4(color * alpha, alpha);
}
`;

export const FogCore = {
  FOG_LEVELS, SKIN_CLOUDS, PNG_CLOCK_MS, PNG_CLOCK_S,
  getFogLevel, setFogLevel, isFogFrozen, toggleFogFrozen,
  getPhase, savePhase, getSeed, sceneFor, secondsFor, durationFor, layerStyle,
  realtimeAvailable, realtimeSkins, REALTIME_SKINS, shaderPalette, FOG_GLSL
};
