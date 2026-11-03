/* SplashOrbit.jsx —— 开屏「二十八宿环绕北斗」（2026-11-02 从安卓端移植）
 *
 * 来源：apps/android/kuikly/shared/src/commonMain/kotlin/com/xlr/k/pages/SplashOrbit.kt
 *   数据：src/data/splashOrbitData.js（由 tools/import-splash-orbit.py 从安卓端生成）
 *   素材：src/assets/splash-orbit/<皮肤>/{s01..s24,f01..f24,north}.webp
 *         （安卓端 PNG 原样转 WebP q95；CSS 规则在 src/styles/splash-orbit-tiles.css，构建时内联）
 *
 * 移植口径（**只搬动画，不重画**）：
 *   · 轨道 = 安卓端各皮肤原图拟合出来的倾斜椭圆；相位按**弧长**走（等角度 ≠ 等距离，会忽快忽慢）
 *   · 24 个宿组沿轨道平移，24 秒一圈、**线性**匀速（环绕是持续自转，套缓动会一顿一顿）
 *   · 每宿按原图 ID 错开起伏（振幅 8–11 画布像素，周期 3/4/4.8/6 秒，都整除 24 秒 ⇒ 回到零不跳）
 *   · 星芒层（f）跟宿组同一个位移，只变透明度（正弦脉冲；黑夜/莫高窟给更高的底）
 *   · 北斗整块轻浮动（上下约 3dp，4 秒一轮），画在最上层
 *   · 点了圆钮以后整层随开屏一起淡出（#xlrSplash.out 的 opacity），组件卸载时停 rAF
 *
 * 尺寸口径（**与 PC 原来的静态星图一致，构图不动**）：
 *   原来那张星图 = 1254 画布按 0.74 屏宽摆出来、内容最长边 1130/1254、内容底边 1206/1254；
 *   这里把内容 bbox 归一化到同一组数（内容最长边 → 1130 画布单位、底边 → 1206），
 *   外层 .sl-orbit 仍用旧的 left/top/width/opacity 那套（splash-art.css），所以九套的
 *   视觉大小、落点与旧静态星图一模一样。
 */
import { useEffect, useRef } from 'react';
import { SkinsCore } from '../data/skinsCore.js';
import { ORBIT_SETS } from '../data/splashOrbitData.js';

const TURN_MS = 24000;          /* 一圈 24 秒 */
const ARC_N = 1440;             /* 弧长表精度（与安卓端同一个数） */
const TWO_PI = Math.PI * 2;
const BOB_PERIODS = [3000, 4000, 4800, 6000];
const PHI = 2.399963229728653;  /* 黄金角：按 ID 错峰 */
const CANVAS = 1254;            /* 安卓/预览共用的画布 */
const CONTENT_W = 1130;         /* 旧静态星图：内容最长边 = 1130/1254 画布 */
const CONTENT_BOTTOM = 1206;    /* 旧静态星图：内容底边 = 1206/1254 画布 */
const pad2 = (n) => (n < 10 ? '0' + n : '' + n);

/* 椭圆弧长表（参数角 ↔ 弧长），与安卓端 OrbitPath 同一份算法 */
function buildPath(set) {
  const th = (set.tiltDeg * Math.PI) / 180;
  const cs = Math.cos(th);
  const sn = Math.sin(th);
  const ar = new Float32Array(ARC_N + 1);
  let acc = 0;
  let prevX = 0;
  let prevY = 0;
  for (let i = 0; i <= ARC_N; i++) {
    const t = (i * TWO_PI) / ARC_N;
    const x = set.cx + set.a * Math.cos(t) * cs - set.b * Math.sin(t) * sn;
    const y = set.cy + set.a * Math.cos(t) * sn + set.b * Math.sin(t) * cs;
    if (i > 0) acc += Math.hypot(x - prevX, y - prevY);
    prevX = x;
    prevY = y;
    ar[i] = acc;
  }
  const total = acc;
  const n = set.g.length / 7;

  const arcAt = (phase) => {
    let p = phase % TWO_PI;
    if (p < 0) p += TWO_PI;
    const q = (p / TWO_PI) * ARC_N;
    const i = Math.min(ARC_N - 1, Math.max(0, Math.floor(q)));
    const f = q - i;
    return ar[i] + (ar[i + 1] - ar[i]) * f;
  };

  const angleAt = (pos) => {
    let v = pos % total;
    if (v < 0) v += total;
    let lo = 0;
    let hi = ARC_N;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (ar[m] < v) lo = m;
      else hi = m;
    }
    const d = ar[hi] - ar[lo];
    const f = d > 0 ? (v - ar[lo]) / d : 0;
    return ((lo + f) * TWO_PI) / ARC_N;
  };

  const s0 = new Float32Array(n);
  for (let i = 0; i < n; i++) s0[i] = arcAt(set.g[i * 7 + 6]);

  return { cs, sn, total, angleAt, s0 };
}

export default function SplashOrbit() {
  const skin = SkinsCore.cur();
  const set = ORBIT_SETS[skin] || ORBIT_SETS.bw;

  const stageRef = useRef(null);
  const cvRef = useRef(null);
  const mapRef = useRef(null);
  const tileRefs = useRef([]);   /* 每宿两块：s 在前、f 在后 */
  const northRef = useRef(null);

  const n = set.g.length / 7;

  useEffect(() => {
    const stage = stageRef.current;
    const cv = cvRef.current;
    const map = mapRef.current;
    if (!stage || !cv || !map) return;

    const path = buildPath(set);
    const contentW = set.bx1 - set.bx0;
    const contentH = set.by1 - set.by0;
    const k = CONTENT_W / Math.max(contentW, contentH);
    const offsetX = CANVAS / 2 - ((set.bx0 + set.bx1) / 2) * k;
    const offsetY = CONTENT_BOTTOM - set.by1 * k;
    map.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) scale(' + k + ')';

    /* 北斗那点浮动：安卓 3dp；按「内容宽 = 0.6668 屏宽」折成画布单位 */
    const northBob = 0.0115 * Math.max(contentW, contentH);

    const fit = () => {
      const w = stage.clientWidth || 1;
      cv.style.transform = 'scale(' + w / CANVAS + ')';
    };
    fit();

    let raf = 0;
    /* ★ 2026-11-03：相位基准用 performance.now() 的**绝对值**，不再从本组件挂载时刻起算。
       加密壳的加载层（protect.py 里的 bootSky）画的是同一片星图，两层各自 rAF：
       若各从自己的起点算，交接那 0.98 秒里两片星相位不同 ⇒ 用户看到「星点重叠成重影」。
       共用绝对时钟后，两层相位逐帧相同，重合得看不出接缝。 */
    const tick = (now) => {
      /* 开屏被 legacy 的 killSplash() 直接从 DOM 摘掉时，React 侧不一定会卸载本组件；
         节点一旦离开文档就停表，别让 49 个 transform 每帧写到游离节点上。 */
      if (!stage.isConnected) { return; }
      const p = ((now % TURN_MS) + TURN_MS) % TURN_MS / TURN_MS;
      const g = set.g;
      for (let i = 0; i < n; i++) {
        const gi = i * 7;
        const id = set.ids[i];
        const ang = path.angleAt(path.s0[i] + path.total * p);
        const x = set.cx + set.a * Math.cos(ang) * path.cs - set.b * Math.sin(ang) * path.sn;
        const y = set.cy + set.a * Math.cos(ang) * path.sn + set.b * Math.sin(ang) * path.cs;
        const bob = (8 + (id % 3) * 1.5) *
          Math.sin((p * TURN_MS * TWO_PI) / BOB_PERIODS[id % 4] + id * PHI);
        const dx = (x - g[gi + 4]).toFixed(2);
        const dy = (y - g[gi + 5] + bob).toFixed(2);
        const tr = 'translate(' + dx + 'px,' + dy + 'px)';
        const a = tileRefs.current[i * 2];
        const b = tileRefs.current[i * 2 + 1];
        if (a) a.style.transform = tr;
        if (b) {
          b.style.transform = tr;
          /* 星芒脉冲：与安卓端同一个式子（sin 三次方 ⇒ 亮一下、暗一阵） */
          const w = (1 + Math.sin(p * TWO_PI * (4 + (id % 3)) + id * 2.3999632)) * 0.5;
          const w3 = w * w * w;
          b.style.opacity = (set.key === 'hei' || set.key === 'mg' ? 0.45 + 0.55 * w3 : 0.12 + 0.88 * w3)
            .toFixed(3);
        }
      }
      if (northRef.current) {
        northRef.current.style.transform = 'translateY(' + (northBob * Math.sin(p * TWO_PI * 6)).toFixed(2) + 'px)';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fit);
      ro.observe(stage);
    } else {
      window.addEventListener('resize', fit);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', fit);
    };
  }, [set]);

  const tile = (cls, refIdx, left, top, width, height) => (
    <span
      key={cls}
      ref={(el) => { tileRefs.current[refIdx] = el; }}
      className={'sl-o ' + cls}
      style={{ left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' }}
    />
  );

  const cells = [];
  for (let i = 0; i < n; i++) {
    const gi = i * 7;
    const left = set.g[gi];
    const top = set.g[gi + 1];
    const width = set.g[gi + 2];
    const height = set.g[gi + 3];
    cells.push(tile('sl-o-s so-' + set.key + '-s' + pad2(i + 1), i * 2, left, top, width, height));
    cells.push(tile('sl-o-f so-' + set.key + '-f' + pad2(i + 1), i * 2 + 1, left, top, width, height));
  }

  return (
    <div className="sl-orbit" aria-hidden="true" ref={stageRef}>
      <div className="sl-orbit-cv" ref={cvRef}>
        <div className="sl-orbit-map" ref={mapRef}>
          {cells}
          <span
            ref={northRef}
            className={'sl-o sl-o-north so-' + set.key + '-north'}
            style={{ left: set.nx + 'px', top: set.ny + 'px', width: set.nw + 'px', height: set.nh + 'px' }}
          />
        </div>
      </div>
    </div>
  );
}
