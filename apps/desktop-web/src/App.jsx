/*
   */
import { useEffect, useState } from 'react';
import {
  castByClock, castByNums, castByDate,
  autoCat, buildContext, buildBlocks, plainAll,
  CATS, G, zhi
} from '@xlr/shared-judgment';

const MODES = [['clock', '时间取数'], ['num', '报数'], ['date', '公历日期']];
const pad = (x) => (x < 10 ? '0' : '') + x;
const today = () => { const n = new Date(); return n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()); };

export default function App() {
  const [mode, setMode] = useState('clock');
  const [q, setQ] = useState('');
  const [nums, setNums] = useState(['', '', '']);
  const [date, setDate] = useState(today);
  const [dateTouched, setDateTouched] = useState(false);
  /*
     反馈「23:30 算今天的子时，00:30 就是次日的子时」⇒ 日子必须跟着钟走。
     —— 与上游时辰框 __ziTouch 那套完全同构。 */
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
    if (mode === 'clock') {
      r = castByClock(new Date());
    } else if (mode === 'num') {
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
    const blocks = buildBlocks(ctx);
    setOut({ ctx, blocks, plain: plainAll(ctx, blocks) });
  }

  return (
    <div className="mx-auto max-w-4xl p-5 font-sans">
      <h1 className="text-lg font-semibold">道家小六壬 · 卦台</h1>
      <p className="mt-1 text-xs opacity-60">
        Phase 1 骨架版（行为对齐）· 判据模块 @xlr/shared-judgment
      </p>

      <section className="mt-5 flex flex-wrap gap-2">
        {MODES.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setMode(k)}
            aria-pressed={mode === k}
            className={'rounded border px-3 py-1 text-sm ' + (mode === k ? 'bg-black text-white' : '')}>
            {label}
          </button>
        ))}
      </section>

      <section className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs opacity-60">所问之事</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="写具体一点，比如：我这个月能拿到那笔货款吗"
            className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </label>

        {mode === 'num' && (
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <input key={i} value={nums[i]} inputMode="numeric"
                onChange={e => { const n = nums.slice(); n[i] = e.target.value; setNums(n); }}
                placeholder={['第一个数', '第二个数', '第三个数'][i]}
                className="w-28 rounded border px-3 py-2 text-sm" />
            ))}
            <span className="self-center text-xs opacity-60">0 按 10 取</span>
          </div>
        )}

        {mode === 'date' && (
          <input type="date" value={date} onChange={e => { setDateTouched(true); setDate(e.target.value); }}
            className="rounded border px-3 py-2 text-sm" />
        )}

        <label className="block">
          <span className="text-xs opacity-60">事类</span>
          <select value={cat} onChange={e => setCat(e.target.value)}
            className="mt-1 rounded border px-3 py-2 text-sm">
            <option value="auto">自动判定</option>
            {Object.keys(CATS).map(k => <option key={k} value={k}>{CATS[k].name}</option>)}
          </select>
        </label>

        <button type="button" onClick={go}
          className="rounded bg-black px-4 py-2 text-sm text-white">起卦</button>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </section>

      {out && (
        <section className="mt-6 space-y-4">
          <div className="rounded border p-4 text-sm">
            <div><b>{out.ctx.g1} · {out.ctx.g2} · {out.ctx.g3}</b>　{zhi[out.ctx.zi - 1]}时</div>
            <div className="mt-1 opacity-70">{out.ctx.src}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded border px-2 py-0.5">落宫 {out.ctx.g3} · {out.ctx.bu.jx}</span>
              <span className="rounded border px-2 py-0.5">五行 {G[out.ctx.g3].wx}</span>
              <span className="rounded border px-2 py-0.5">体用 {out.ctx.bu.t} · {out.ctx.bu.jx}</span>
              <span className="rounded border px-2 py-0.5">事类 {out.ctx.cat.name}</span>
            </div>
          </div>

          <div className="space-y-3">
            {out.blocks.map(b => (
              <details key={b.n} className="rounded border p-3" open={b.n === 'A'}>
                <summary className="cursor-pointer text-sm font-medium">{b.n}. {b.t}{b.d ? ' · ' + b.d : ''}</summary>
                <ul className="mt-2 space-y-2">
                  {b.items.map((it, i) => (
                    <li key={i} className="text-sm">
                      <span className="mr-2 text-xs opacity-60">{it.lb}</span>
                      <span dangerouslySetInnerHTML={{ __html: it.tx }} />
                      {it.src && <span className="ml-1 text-xs opacity-40">（{it.src}）</span>}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>

          <details className="rounded border p-3">
            <summary className="cursor-pointer text-sm font-medium">发给模型的纯文本（判据全文）</summary>
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap text-xs">{out.plain}</pre>
          </details>
        </section>
      )}
    </div>
  );
}
