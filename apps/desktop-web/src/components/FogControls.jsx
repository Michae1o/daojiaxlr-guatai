/* FogControls.jsx —— 设置页「背景雾气」的两件控件（液态玻璃 + 跟手 + 非线性收尾）
 *
 * 移植自安卓 SettingsText.kt：
 *   · FogLevelControl()：三档（静态雾景 / 轻柔流动 / 实时流雾），横拖跟手、松手就近吸附，
 *     360ms cubic-bezier(.22,1,.36,1) 收尾；按下时滑块轻微压扁+放大、拖动带一点旋转。
 *   · GlassSwitch()：44×26 轨道、20 旋钮、可走 18；拖多少给多少，松手过半数即开；
 *     轨道主色浓度 0.58×p。
 *
 * ⚠ 本机 Windows「显示动画」关着 ⇒ 全局 prefers-reduced-motion: reduce ⇒ legacy.css 把
 *   transition/animation 全部打死。所以这里的动效一律走 WAAPI / 直接写 transform，
 *   与开屏、雾层同一口径（不要改成 CSS transition——那会变成瞬移）。
 */
import { useEffect, useRef, useState } from 'react';
import { FogCore } from '../data/fogCore.js';

const EASE = 'cubic-bezier(.22,1,.36,1)';   /* 安卓 KY_EASE_OUT */

function cancelAnim(el) {
  if (!el) return;
  try { if (el._fa) el._fa.cancel(); } catch (e) { }
  el._fa = null;
}

/* 三档分段控件 */
export function FogLevelControl({ level, onLevel }) {
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const state = useRef({ pos: level, dragging: false, cell: 1, width: 1, pull: 0 });
  const [, force] = useState(0);

  const paint = () => {
    const th = thumbRef.current, tr = trackRef.current;
    if (!th || !tr) return;
    const s = state.current;
    const w = tr.clientWidth || 1;
    const cell = w / 3;
    s.width = w; s.cell = cell;
    th.style.width = (cell - 6) + 'px';
    th.style.transform = 'translate3d(' + (cell * s.pos + 3) + 'px,0,0) scale(' +
      (1 + 0.055 * (s.dragging ? 1 : 0) + 0.065 * Math.abs(s.pull)) + ',' +
      (1 - 0.07 * (s.dragging ? 1 : 0) - 0.025 * Math.abs(s.pull)) + ') rotate(' +
      (s.pull * 1.2) + 'deg)';
  };

  useEffect(() => {
    const s = state.current;
    if (s.dragging) return;
    const th = thumbRef.current;
    paint();
    if (!th) return;
    const from = s.pos;
    if (Math.abs(from - level) < 0.001) return;
    const cell = s.cell || 1;
    const a = th.animate(
      [{ transform: 'translate3d(' + (cell * from + 3) + 'px,0,0)' },
       { transform: 'translate3d(' + (cell * level + 3) + 'px,0,0)' }],
      { duration: 360, easing: EASE, fill: 'forwards' });
    th._fa = a;
    s.pos = level;
    a.onfinish = () => { cancelAnim(th); paint(); };
  }, [level]);

  useEffect(() => {
    paint();
    const onResize = () => paint();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); cancelAnim(thumbRef.current); };
  }, []);

  const down = (e) => {
    const tr = trackRef.current;
    if (!tr) return;
    const s = state.current;
    s.dragging = true; s.pull = 0;
    const cell = (tr.clientWidth || 1) / 3;
    s.cell = cell;
    const rect = tr.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    /* 点在哪一格就走到哪一格（不跳变：从当前值滑过去） */
    const target = Math.max(0, Math.min(2, Math.floor(x / cell)));
    try { tr.setPointerCapture(e.pointerId); } catch (er) { }
    cancelAnim(thumbRef.current);
    if (thumbRef.current) {
      thumbRef.current.animate(
        [{ transform: 'translate3d(' + (cell * s.pos + 3) + 'px,0,0)' },
         { transform: 'translate3d(' + (cell * target + 3) + 'px,0,0)' }],
        { duration: 200, easing: EASE, fill: 'forwards' });
    }
    s.pos = target; force(v => v + 1); paint();
    if (target !== level) onLevel(target);
  };

  const move = (e) => {
    const s = state.current;
    if (!s.dragging) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    const rect = trackRef.current.getBoundingClientRect();
    s.pos = Math.max(0, Math.min(2, (x - rect.left - 3) / s.cell));
    s.pull = 0;
    paint();
  };

  const up = () => {
    const s = state.current;
    if (!s.dragging) return;
    s.dragging = false;
    const next = Math.max(0, Math.min(2, Math.round(s.pos)));
    s.pos = next;
    const th = thumbRef.current;
    if (th) {
      const cell = s.cell;
      cancelAnim(th);
      th.animate(
        [{ transform: 'translate3d(' + (cell * s.pos + 3) + 'px,0,0)' },
         { transform: 'translate3d(' + (cell * next + 3) + 'px,0,0)' }],
        { duration: 360, easing: EASE, fill: 'forwards' });
    }
    force(v => v + 1);
    paint();
    if (next !== level) onLevel(next);
  };

  return (
    <div className="fg-seg fg-glass" id="stFogLevel" ref={trackRef}
      onPointerDown={down} onPointerMove={move} onPointerUp={up}
      onPointerCancel={up}>
      <span className="fg-thumb" ref={thumbRef} aria-hidden="true"></span>
      <div className="fg-cells">
        {FogCore.FOG_LEVELS.map((t, i) => (
          <button key={t} type="button" aria-current={i === level ? 'true' : 'false'}
            onClick={() => { if (i !== level) onLevel(i); }}>{t}</button>
        ))}
      </div>
    </div>
  );
}

/* 冻结开关 */
export function FogSwitch({ checked, onChange, label, hint }) {
  const wrapRef = useRef(null);
  const knobRef = useRef(null);
  const onRef = useRef(null);
  const st = useRef({ p: checked ? 1 : 0, dragging: false });
  const lastUp = useRef(0);

  const paintKnob = () => {
    const s = st.current;
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate3d(' + (18 * s.p) + 'px,0,0) scale(' +
        (1 + (s.dragging ? 0.06 : 0)) + ')';
    }
    if (onRef.current) onRef.current.style.opacity = String(0.58 * s.p);
  };

  const tween = (to) => {
    const s = st.current;
    const knob = knobRef.current, on = onRef.current;
    const from = s.p;
    if (Math.abs(from - to) < 0.001) { paintKnob(); return; }
    s.p = to;
    if (knob) {
      cancelAnim(knob);
      const a = knob.animate(
        [{ transform: 'translate3d(' + (18 * from) + 'px,0,0)' },
         { transform: 'translate3d(' + (18 * to) + 'px,0,0)' }],
        { duration: 200, easing: EASE, fill: 'forwards' });
      knob._fa = a;
      a.onfinish = () => { cancelAnim(knob); paintKnob(); };
    }
    if (on) {
      cancelAnim(on);
      const b = on.animate([{ opacity: 0.58 * from }, { opacity: 0.58 * to }],
        { duration: 200, easing: EASE, fill: 'forwards' });
      on._fa = b;
      b.onfinish = () => { cancelAnim(on); paintKnob(); };
    }
  };

  useEffect(() => { tween(checked ? 1 : 0); }, [checked]);
  useEffect(() => { paintKnob(); }, []);

  const down = (e) => {
    st.current.dragging = true;
    st.current.moved = false;
    cancelAnim(knobRef.current);
    cancelAnim(onRef.current);
    try { wrapRef.current.setPointerCapture(e.pointerId); } catch (er) { }
    paintKnob();
  };
  const move = (e) => {
    if (!st.current.dragging) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + 3 + 10);
    st.current.p = Math.max(0, Math.min(1, 0.5 + dx / 18));
    st.current.moved = true;
    paintKnob();
  };
  const up = () => {
    if (!st.current.dragging) return;
    st.current.dragging = false;
    lastUp.current = Date.now();
    /* 没拖动 = 点击：直接翻转（安卓那边整行 toggleable，这里点到旋钮也应该管用） */
    if (!st.current.moved) {
      const nx = checked ? 0 : 1;
      tween(nx);
      onChange(!checked);
      return;
    }
    st.current.moved = false;
    const on = st.current.p >= 0.5;
    const next = on ? 1 : 0;
    tween(next);
    if (on !== checked) onChange(on);
  };

  /* 整行可点（安卓是 toggleable 的 Row）：真实的指针拖动由上面的跟手处理；
     键盘 / 脚本的 click 走这里。⚠ 指针松手后浏览器还会补一次 click ⇒ 300ms 内忽略，
     否则一次拖动会被自己反弹回去。 */
  const rowClick = (e) => {
    if (Date.now() - lastUp.current < 300) return;
    onChange(!checked);
  };

  return (
    <div className="fg-freeze" id="stFogFreezeRow" onClick={rowClick}>
      <div className="fg-lab">
        <div className="fg-t">{label}
          <em className={checked ? '' : 'off'} id="stFogFreezeState">{checked ? '已冻结' : '流动中'}</em>
        </div>
        <div className="fg-d" id="stFogFreezeHint">{hint}</div>
      </div>
      <div className="fg-sw" id="stFogFreeze" role="switch" aria-checked={checked}
        aria-label="冻结雾气" ref={wrapRef}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClick={(e) => {
          /* 脚本 / 键盘的 click：指针松手后浏览器补的那一次由 lastUp 挡掉 */
          if (Date.now() - lastUp.current < 300) { e.stopPropagation(); return; }
          e.stopPropagation();
          onChange(!checked);
        }}>
        <span className="fg-sw-track"></span>
        <span className="fg-sw-on" ref={onRef} style={{ opacity: checked ? 0.58 : 0 }}></span>
        <span className="fg-sw-knob" ref={knobRef}></span>
      </div>
    </div>
  );
}
