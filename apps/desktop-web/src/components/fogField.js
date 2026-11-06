/* fogField.js —— 背景雾气的渲染层（桌面端）
 *
 * 三层结构（都在 body 里、内容之下）：
 *   #xlrFog（固定层，z-index:-2，不接指针）
 *     └ .fg-stage（换档时整层淡出/淡入）
 *         ├ .fg-cloud × n      贴图层（一档「轻柔流动」）
 *         └ canvas             实时流雾（二档，WebGL2）
 *
 * 规矩：
 *   · 每帧只写 transform / opacity（不触发重排）；静态档一个 rAF 都不开。
 *   · 冻结 = 停表（画面留在当前帧），相位落盘；与安卓 FogBackdrop 的语义一致。
 *   · 容器离开文档（壳换页）就停表：if (!stage.isConnected) return。
 *   · 安卓的位移单位是 dp；桌面按视口宽 / 393dp（手机逻辑宽）折算，保持同等的相对幅度。
 */

import { FogCore } from '../data/fogCore.js';

const PHONE_W = 393;
const PHONE_H = 852;
const TICK_MS = 33;                  /* 安卓实时流雾 30fps 调度 */
const ID = 'xlrFog';

let stageEl = null;      /* .fg-stage */
let rootEl = null;       /* #xlrFog */
let clouds = [];         /* [{el, cloud, li}] */
let canvas = null;
let gl = null, glProg = null, glUni = {};
let scene = null;
let skin = 'bw';
let level = 0;
let frozen = false;
let clock = 0;           /* 0..1 相位 */
let glSpeed = 1;         /* 实时档流速倍率（黑白要更快） */
let lastTs = 0;
let lastSave = 0;
let rafId = 0;
let lastDraw = 0;
let gpuDpr = 1;
let fadeAnim = null;
let resizeTimer = 0;
let started = false;

function curSkin() {
  return document.documentElement.getAttribute('data-skin') || 'bw';
}

function mountRoot() {
  if (rootEl && rootEl.isConnected) return rootEl;
  rootEl = document.getElementById(ID);
  if (rootEl) return rootEl;
  rootEl = document.createElement('div');
  rootEl.id = ID;
  rootEl.setAttribute('aria-hidden', 'true');
  /* 放到 #xlrAura 之前（更下面一层）；body.firstChild 通常是 #xlrAura */
  const aura = document.getElementById('xlrAura');
  if (aura && aura.parentNode === document.body) document.body.insertBefore(rootEl, aura);
  else if (document.body.firstChild) document.body.insertBefore(rootEl, document.body.firstChild);
  else document.body.appendChild(rootEl);
  stageEl = document.createElement('div');
  stageEl.className = 'fg-stage';
  rootEl.appendChild(stageEl);
  return rootEl;
}

function clearStage() {
  if (gl) {
    try { gl.getExtension('WEBGL_lose_context') && gl.getExtension('WEBGL_lose_context').loseContext(); } catch (e) { }
  }
  gl = null; glProg = null; glUni = {}; canvas = null;
  if (stageEl) { stageEl.textContent = ''; }
  clouds = [];
}

/* ---------- WebGL ---------- */
function compile(glc, type, src) {
  const sh = glc.createShader(type);
  glc.shaderSource(sh, src);
  glc.compileShader(sh);
  if (!glc.getShaderParameter(sh, glc.COMPILE_STATUS)) {
    const log = glc.getShaderInfoLog(sh);
    glc.deleteShader(sh);
    throw new Error('fog shader: ' + log);
  }
  return sh;
}

function initGL() {
  canvas = document.createElement('canvas');
  canvas.className = 'fg-canvas';
  stageEl.appendChild(canvas);
  const opts = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' };
  gl = canvas.getContext('webgl2', opts);
  if (!gl) throw new Error('webgl2 unavailable');
  const vs = compile(gl, gl.VERTEX_SHADER, `#version 300 es
    void main(){
      vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FogCore.FOG_GLSL);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('fog link: ' + gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  glProg = prog;
  glUni = {
    resolution: gl.getUniformLocation(prog, 'resolution'),
    time: gl.getUniformLocation(prog, 'time'),
    color1: gl.getUniformLocation(prog, 'color1'),
    color2: gl.getUniformLocation(prog, 'color2'),
    color3: gl.getUniformLocation(prog, 'color3'),
    strength: gl.getUniformLocation(prog, 'strength'),
    relief: gl.getUniformLocation(prog, 'relief'),
    seed: gl.getUniformLocation(prog, 'seed')
  };
  const pal = FogCore.shaderPalette(skin);
  gl.uniform3fv(glUni.color1, pal.colors[0]);
  gl.uniform3fv(glUni.color2, pal.colors[1]);
  gl.uniform3fv(glUni.color3, pal.colors[2]);
  gl.uniform1f(glUni.strength, pal.strength);
  gl.uniform1f(glUni.relief, pal.relief);
  glSpeed = pal.speed || 1;
  try { window.__fogSpeed = glSpeed; } catch (e) { }
  gl.uniform1f(glUni.seed, FogCore.getSeed(skin));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   /* 着色器输出已预乘 */
  sizeGL();
}

function sizeGL() {
  if (!canvas || !gl) return;
  const vw = Math.max(1, rootEl ? rootEl.clientWidth : window.innerWidth);
  const vh = Math.max(1, rootEl ? rootEl.clientHeight : window.innerHeight);
  /* Android 也是按屏幕全分辨率画；这里上限 2 倍，避免 4K 窗口白烧 GPU */
  gpuDpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const w = Math.round(vw * gpuDpr), h = Math.round(vh * gpuDpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
  gl.uniform2f(glUni.resolution, canvas.width, canvas.height);
}

function drawGL(seconds) {
  if (!gl) return;
  gl.useProgram(glProg);
  gl.uniform1f(glUni.time, seconds * glSpeed);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/* ---------- PNG 层 ---------- */
function buildClouds() {
  const frag = document.createDocumentFragment();
  clouds = [];
  /* dp → px 要**分轴**折算（安卓基准 393×852dp）：
     位移 74dp 在手机上占宽 19%，若桌面也按宽度折算再套到高度上，竖直位移就会占掉 20% 的高度
     （手机只有 6%）⇒ 窗口一横过来雾就「走得太野」。x 跟宽、y 跟高，比例才对得上。 */
  const vw = window.innerWidth || 1200;
  const vh = window.innerHeight || 800;
  const kx = Math.max(1, Math.min(4, vw / PHONE_W));
  const ky = Math.max(1, Math.min(4, vh / PHONE_H));
  scene.layers.forEach(function (L) {
    const el = document.createElement('div');
    el.className = 'fg-cloud';
    /* 素材类在 fog-tiles.css（.fg-<name> / -flow / -wisp） */
    const asset = scene.original ? L.cloud.name : (L.cloud.name + (L.li === 1 ? '-wisp' : '-flow'));
    el.classList.add('fg-' + asset);
    el.style.transformOrigin = '50% 50%';
    frag.appendChild(el);
    clouds.push({ el: el, cloud: L.cloud, li: L.li, kx: kx, ky: ky });
  });
  if (scene.cinnabar) {
    const cb = document.createElement('div');
    cb.className = 'fg-cloud fg-xuan-cinnabar';
    frag.appendChild(cb);
    /* 朱砂底纹压在雾上（安卓在雾层之后单独画），不进动画列表 */
    stageEl.appendChild(frag);
    stageEl.appendChild(cb);
    return;
  }
  stageEl.appendChild(frag);
}

function paintClouds(seconds) {
  const opt = { original: scene.original, historical: scene.historical };
  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i];
    const st = FogCore.layerStyle(c.cloud, c.li, seconds, opt);
    const el = c.el;
    el.style.transform = 'translate3d(' + (st.px * c.kx).toFixed(2) + 'px,' +
      (st.py * c.ky).toFixed(2) + 'px,0) scale(' + st.sx.toFixed(4) + ',' + st.sy.toFixed(4) + ')' +
      (st.rot ? ' rotate(' + st.rot.toFixed(3) + 'deg)' : '');
    el.style.opacity = Math.max(0, Math.min(1, st.alpha * (scene.gain || 1))).toFixed(3);
  }
}

/* ---------- 生命周期 ---------- */
function rebuild() {
  clearStage();
  scene = FogCore.sceneFor(skin, level);
  const de = document.documentElement;
  if (!scene) { rootEl.setAttribute('data-fog', '0'); de.setAttribute('data-fog', '0'); stop(); return; }
  rootEl.setAttribute('data-fog', '1');
  de.setAttribute('data-fog', '1');
  rootEl.setAttribute('data-fog-level', String(level));
  rootEl.setAttribute('data-skin', skin);
  clock = FogCore.getPhase(skin);
  frozen = FogCore.isFogFrozen(level);
  const realtime = level === 2 && FogCore.realtimeAvailable() &&
    FogCore.REALTIME_SKINS.indexOf(skin) >= 0;
  if (realtime) {
    try { initGL(); } catch (e) { /* 显卡/上下文失败 → 退回贴图档，不留空白 */ scene = FogCore.sceneFor(skin, 1); buildClouds(); }
  } else {
    buildClouds();
  }
  /* 静态档 / 冻结档：只画一帧，一个 rAF 都不开（安卓也是停表，不是空转） */
  tick(performance.now(), true);
  if (level > 0 && !frozen) start(); else stop();
}

function start() {
  if (started) return;
  started = true;
  rafId = requestAnimationFrame(loop);
}

function stop() {
  started = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  lastTs = 0;
}

function loop(ts) {
  if (!started) return;
  if (!stageEl || !stageEl.isConnected || !rootEl.isConnected) { stop(); return; }
  if (!document.hidden) tick(ts, false);
  rafId = requestAnimationFrame(loop);
}

function tick(ts, force) {
  if (!scene) return;
  const moving = level > 0 && !frozen;
  if (moving) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(200, Math.max(0, ts - lastTs));   /* 切页回来不跳一大段 */
    lastTs = ts;
    clock += (dt * (scene.speed || 1)) / FogCore.durationFor(scene);
    if (clock >= 1) clock -= Math.floor(clock);           /* 首尾连续：折回而不是归零跳帧 */
    /* 相位落盘（安卓在冻结/卸载时存；这里每半秒存一次，异常退出也能接上） */
    if (ts - lastSave > 500) { lastSave = ts; FogCore.savePhase(skin, clock); }
  } else {
    lastTs = 0;
  }
  const seconds = FogCore.secondsFor(clock, scene);
  if (!moving && !force) return;                         /* 冻结 / 静态档：留在这帧，不再画 */

  if (gl) {
    if (moving && ts - lastDraw < TICK_MS && !force) return;
    lastDraw = ts;
    sizeGL();
    drawGL(seconds);
    return;
  }
  if (moving && !force && ts - lastDraw < 16) return;    /* 贴图档 60fps 足够 */
  lastDraw = ts;
  paintClouds(seconds);
}

/* 换档：安卓先 160ms 淡出、换层、再 360ms 淡入 */
function swapWithFade(fn) {
  if (!stageEl) { fn(); return; }
  try {
    if (fadeAnim) fadeAnim.cancel();
    fadeAnim = stageEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
    fadeAnim.onfinish = function () {
      fn();
      if (!stageEl) return;
      try {
        fadeAnim = stageEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: 'ease-out', fill: 'forwards' });
      } catch (e) { stageEl.style.opacity = ''; }
    };
  } catch (e) { fn(); }
}

/* ---------- 对外 ---------- */
export const FogField = {
  /** 挂载（幂等）。壳在模块期调一次。 */
  mount() {
    mountRoot();
    skin = curSkin();
    level = FogCore.getFogLevel();
    rebuild();
    /* 皮肤变了就换一套雾（安卓 SkinFogBackdrop 按 key 重建） */
    try {
      const mo = new MutationObserver(function () {
        const k = curSkin();
        if (k === skin) return;
        skin = k;
        swapWithFade(rebuild);
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
    } catch (e) { }
    window.addEventListener('resize', function () {
      /* 位移是按视口宽折算的（dp→px）⇒ 窗口尺寸变了要重算；防抖 250ms，别跟着拖动窗口狂建层 */
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (gl) sizeGL();
        if (rootEl && rootEl.isConnected) rebuild();
      }, 250);
    });
    return true;
  },
  /** 设置页改了档位 / 冻结 */
  update() {
    const nextLevel = FogCore.getFogLevel();
    const wasFrozen = frozen;
    if (nextLevel !== level) {
      level = nextLevel;
      swapWithFade(rebuild);
      return true;
    }
    const nextFrozen = FogCore.isFogFrozen(level);
    if (nextFrozen !== wasFrozen) {
      if (nextFrozen) { FogCore.savePhase(skin, clock); frozen = true; stop(); }
      else { frozen = false; lastTs = 0; start(); }
      return true;
    }
    if (skin !== curSkin()) { skin = curSkin(); swapWithFade(rebuild); return true; }
    return false;
  },
  status() {
    return {
      level: level, frozen: frozen, skin: skin, clock: clock,
      clouds: clouds.length, gl: !!gl, mounted: !!(rootEl && rootEl.isConnected)
    };
  },
  node: function () { return rootEl; }
};
