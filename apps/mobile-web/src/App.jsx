/* App.jsx —— 手机端最小可用界面（Phase 1 只做行为对齐）
   判据一律来自 @xlr/shared-judgment 包名入口。 */
import { useEffect, useState } from 'react';
import {
  castByClock, castByNums, castByDate,
  autoCat, buildContext, buildBlocks,
  CATS, G, zhi
} from '@xlr/shared-judgment';

const MODES = [['clock', '时间'], ['num', '报数'], ['date', '日期']];
const pad = (x) => (x < 10 ? '0' : '') + x;
const today = () => { const n = new Date(); return n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()); };

export default function App() {
  const [mode, setMode] = useState('clock');
  const [q, setQ] = useState('');
  const [nums, setNums] = useState(['', '', '']);
  const [date, setDate] = useState(today);
  const [dateTouched, setDateTouched] = useState(false);
  /*
     「23:30 算今天的子时，00:30 就是次日的子时」⇒ 页面开着跨过午夜时日期框要自己翻篇；
     用户手动改过之后就不再碰他选的。与上游时辰框那套同构。 */
  useEffect(() => {
    if (dateTouched) return undefined;
    const id = setInterval(() => {
      const t = today();
      setDate(prev => (prev === t ? prev : t));
    }, 2000);
    return () => clearInterval(id);
  }, [dateTouched]);
  const [cat, setCat] = useState('auto');
  const [err, setErr] = useState('');
  const [out, setOut] = useState(null);

  function go() {
    setErr('');
    const question = q.trim();
    if (!question) return setErr('先写清楚你要问的事。');
    if (question.length < 4) return setErr('问题太短了——「问什么，卦就答什么」，请写具体一点。');

    let r = null;
    if (mode === 'clock') r = castByClock(new Date());
    else if (mode === 'num') {
      if (nums.some(v => v === '')) return setErr('三个数都要报。');
      r = castByNums(nums);
    } else {
      if (!date) return setErr('选一个日期。');
      r = castByDate(date);
      if (!r) return setErr('超出内置农历表范围（2020–2040）。改用报数，或手工把农历月日填进报数。');
    }

    const catKey = cat === 'auto' ? autoCat(question + ' ') : cat;
    const ctx = buildContext({
      q: question, bg: '', catKey, zi: r.zi,
      g1: r.g[0], g2: r.g[1], g3: r.g[2], src: r.src
    });
    ctx.withXiang = false;
    ctx.n1 = r.steps[0]; ctx.n2 = r.steps[1]; ctx.n3 = r.steps[2];
    setOut({ ctx, blocks: buildBlocks(ctx) });
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[560px] px-4 pb-10 pt-5 text-[15px] leading-relaxed">
      <header className="flex items-baseline justify-between">
        <h1 className="text-base font-semibold">道家小六壬 · 卦台</h1>
        <span className="text-[11px] opacity-50">手机端骨架</span>
      </header>

      {/* 起卦方式：分段（手机端独立实现） */}
      <div role="tablist" className="mt-4 grid grid-cols-3 gap-1 rounded-lg border p-1">
        {MODES.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k}
            onClick={() => setMode(k)}
            className={'rounded-md py-1.5 text-sm ' + (mode === k ? 'bg-black text-white' : 'opacity-70')}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <textarea value={q} onChange={e => setQ(e.target.value)} rows={2}
          placeholder="写具体一点：我这个月能拿到那笔货款吗"
          className="w-full resize-none rounded-lg border px-3 py-2 text-[15px]" />

        {mode === 'num' && (
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(i => (
              <input key={i} value={nums[i]} inputMode="numeric"
                onChange={e => { const n = nums.slice(); n[i] = e.target.value; setNums(n); }}
                placeholder={'第' + (i + 1) + '数'}
                className="rounded-lg border px-3 py-2 text-center text-[15px]" />
            ))}
            <p className="col-span-3 text-[11px] opacity-50">0 按 10 取</p>
          </div>
        )}

        {mode === 'date' && (
          <input type="date" value={date} onChange={e => { setDateTouched(true); setDate(e.target.value); }}
            className="w-full rounded-lg border px-3 py-2 text-[15px]" />
        )}

        <div className="flex items-center gap-2">
          <select value={cat} onChange={e => setCat(e.target.value)}
            className="flex-1 rounded-lg border px-3 py-2 text-[15px]">
            <option value="auto">事类：自动判定</option>
            {Object.keys(CATS).map(k => <option key={k} value={k}>事类：{CATS[k].name}</option>)}
          </select>
          <button type="button" onClick={go}
            className="rounded-lg bg-black px-5 py-2 text-[15px] text-white">起卦</button>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>

      {out && (
        <section className="mt-6 space-y-4">
          <div className="rounded-lg border px-4 py-3">
            <div className="text-lg font-medium tracking-wide">
              {out.ctx.g1} · {out.ctx.g2} · {out.ctx.g3}
            </div>
            <div className="mt-1 text-[11px] opacity-60">{zhi[out.ctx.zi - 1]}时 · {out.ctx.src}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <span className="rounded border px-2 py-1">落宫 {out.ctx.g3}</span>
              <span className="rounded border px-2 py-1">五行 {G[out.ctx.g3].wx}</span>
              <span className="rounded border px-2 py-1">体用 {out.ctx.bu.t}</span>
              <span className="rounded border px-2 py-1">事类 {out.ctx.cat.name}</span>
            </div>
          </div>

          {out.blocks.map(b => (
            <details key={b.n} className="rounded-lg border px-4 py-3" open={b.n === 'A'}>
              <summary className="cursor-pointer text-sm font-medium">{b.n}. {b.t}</summary>
              <ul className="mt-2 space-y-2">
                {b.items.map((it, i) => (
                  <li key={i} className="text-[13px]">
                    <span className="mr-1.5 text-[11px] opacity-55">{it.lb}</span>
                    <span dangerouslySetInnerHTML={{ __html: it.tx }} />
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
