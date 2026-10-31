/* mcp-tools.js —— MCP 的**内核**：工具表 + 怎么算。判据只从本包取，这里不复制任何判据。
 *
 * 为什么放在 shared-judgment 包里：同一份内核要给三种出口用——
 *   ① 桌面 App 内的「小智 · MCP」桥（浏览器里，走 WebSocket 反连）
 *   ② 命令行 `node mcp/cli.mjs`（Node 里，stdio / HTTP / 小智 三种传输）
 *   ③ 以后任何人自己接的客户端
 * 判据只存在一份的口径不变：工具执行全部落在 cast/buildContext/plainAll/sections 上。
 *
 * 会话（）：每次起卦发一个 `gid`，后续 jie / shilei / duanci 带上它就不再重算，
 * 解决「跨了时辰再问，同一个卦变成了另一个卦」的老毛病。store 由调用方注入，默认内存版。
 *
 * 本文件不许碰 DOM、不许碰 localStorage、不许用 Node 专有 API（浏览器与 Node 都要能跑）。
 */
import { castByClock, castByNums, castByDate } from './cast.js';
import { autoCat, buildContext, buildBlocks, G, zhi } from './judgment.js';
import { plainAll } from './plain-text.js';
import { sections } from './corpus.js';
import { SYS } from './prompt.js';

/* ---------------- 卦 id 与最近卦缓存 ---------------- */

/* 默认 TTL 两小时（一个时辰的量级，够一段连续追问）；最多留 200 个，先到先淘汰。 */
export function createCastStore(opt) {
  const ttl = (opt && opt.ttlMs) || 2 * 3600 * 1000;
  const max = (opt && opt.max) || 200;
  const map = new Map();
  let seq = 0;

  function sweep() {
    const now = Date.now();
    for (const [k, v] of map) if (now - v.at > ttl) map.delete(k);
    while (map.size > max) map.delete(map.keys().next().value);
  }

  return {
    put(rec) {
      sweep();
      seq = (seq + 1) % 46656;
      const id = 'gua_' + Date.now().toString(36) + '_' + seq.toString(36);
      map.set(id, { at: Date.now(), rec });
      return id;
    },
    get(id) {
      const v = map.get(id);
      if (!v) return null;
      if (Date.now() - v.at > ttl) { map.delete(id); return null; }
      return v.rec;
    },
    size() { return map.size; },
  };
}

/* ---------------- 起卦（内核唯一入口） ---------------- */

function castOne(a) {
  const q = String(a.question || '').trim();
  const bg = a.background ? String(a.background).trim() : '';
  const mode = (a.mode || 'auto').toLowerCase();
  const now = new Date();

  let r;
  if (mode === 'num' || (mode === 'auto' && Array.isArray(a.nums) && a.nums.length === 3)) {
    if (!Array.isArray(a.nums) || a.nums.length !== 3) throw new Error('报数模式需要三个数 nums:[a,b,c]');
    r = castByNums(a.nums, a.zi, now);
  } else if (mode === 'date') {
    if (!a.date) throw new Error('日期模式需要 date:"YYYY-MM-DD"');
    r = castByDate(a.date, a.zi, now);
    if (!r) throw new Error('超出内置农历表范围（2020–2040）或日期不合法');
  } else {
    r = castByClock(now, a.manualNums);
  }

  const catKey = autoCat((q + ' ' + bg + ' ') || ' ');
  const c = buildContext({
    q, bg, catKey, zi: r.zi,
    g1: r.g[0], g2: r.g[1], g3: r.g[2], src: r.src,
  });
  return { r, c, catKey };
}

/* 按 gid 取回原卦；没有 gid 就现起一卦并把新卦存进去。 */
function needCast(a, ctx) {
  const gid = String(a.gid || '').trim();
  if (gid) {
    const rec = ctx.store.get(gid);
    if (!rec) throw new Error('没有这一卦（gid 过期或不存在）。重新起一卦：调用 xiaoliuren_qigua，或用这里的 gid=空');
    rec.c.withXiang = !!a.withXiang;
    return { rec, gid, fresh: false };
  }
  const { r, c, catKey } = castOne(a);
  const rec = { r, c, catKey };
  const id = ctx.store.put(rec);
  return { rec, gid: id, fresh: true };
}

/* ---------------- 断辞里要用的两段文本 ---------------- */

function shortRead(c) {
  const g = c.g3, GG = G[g];
  const L = [];
  L.push(`卦：${c.g1} · ${c.g2} · ${c.g3}（天／地／人），${zhi[c.zi - 1]}时，${c.src}。`);
  L.push(`落宫 ${g}：${GG.jx}，${GG.wx}，动作词「${GG.act}」——${GG.xing}`);
  L.push(`事类：${c.cat.name}。`);
  L.push(`体用：${c.bu.t}　${c.bu.jx}（体＝落宫，用＝起卦时辰；只在结果不明或有后续时才看）。`);
  L.push(`应期区间：${GG.ji}；落宫固定三数 ${GG.san}。`);
  return L.join('\n');
}

/* 判据素材里少量带 <b> 之类的行内标记：MCP 出口一律去标签，给的是纯文本。 */
function plainTag(s) {
  return String(s == null ? '' : s).replace(/<\/?[a-zA-Z][^>]*>/g, '');
}

function shileiText(c) {
  const cat = c.cat, g = c.g3;
  const L = [`事类：${cat.name}`];
  if (cat.luo && cat.luo[g]) L.push(`落宫 ${g}：${plainTag(cat.luo[g])}`);
  if (Array.isArray(cat.tips) && cat.tips.length) {
    L.push('此类要点：');
    cat.tips.forEach((t, i) => L.push(`${i + 1}. ${plainTag(t)}`));
  }
  return L.join('\n');
}

/* ---------------- 让模型解卦（可选工具；没配模型就不列出来） ---------------- */

export function hasModel(opt) {
  const m = opt && opt.llm;
  return !!(m && m.base && m.key && m.model);
}

async function askModelText(c, llm) {
  const B = buildBlocks(c);
  const plain = plainAll(c, B, null);
  const sys = SYS;   /* 开源版只有一套提示词 */
  let usr = '请按格式解这一卦：\n\n' + plain;
  if (c.withXiang) {
    usr += '\n\n【附】这一卦带三宫具象：请在断辞里把三盘读出来（前因 → 中段 → 后果），再合回落宫；只读象、不越出这一卦。';
  }
  const url = String(llm.base).replace(/\/+$/, '') + '/chat/completions';
  const body = {
    model: llm.model,
    stream: false,
    max_tokens: 8192,
    messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }],
  };
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ac ? setTimeout(() => ac.abort(), (llm.timeoutMs || 120000)) : null;
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + llm.key },
      body: JSON.stringify(body),
      signal: ac ? ac.signal : undefined,
    });
  } catch (e) {
    if (timer) clearTimeout(timer);
    throw new Error('连不上模型（' + (e && e.message ? e.message : e) + '），检查 XLR_MCP_LLM_BASE 与网络');
  }
  if (timer) clearTimeout(timer);
  const raw = await resp.text();
  if (!resp.ok) throw new Error('模型返回 HTTP ' + resp.status + '：' + raw.slice(0, 240));
  let j;
  try { j = JSON.parse(raw); } catch (e) { throw new Error('模型返回的不是 JSON：' + raw.slice(0, 120)); }
  const text = j && j.choices && j.choices[0] && j.choices[0].message
    ? String(j.choices[0].message.content || '').trim() : '';
  if (!text) throw new Error('模型没给出断辞（空响应）');
  return { text, chars: plain.length };
}

/* ---------------- 工具表（客户端 tools/list 看到的就是这份） ---------------- */

const GID_DESC = '可选：上一手 xiaoliuren_qigua 返回的卦 id。带上它就不再重新起卦（同一个卦接着问必须带）；不带则按参数现起一卦，回包里有新的 gid。';

export const MCP_TOOLS = [
  {
    name: 'xiaoliuren_qigua',
    description:
      '道家小六壬起卦排盘。用户想看卦、问吉凶、让它起一卦时调用。'
      + '返回卦 id（gid）、三宫（大安/留连/速喜/赤口/小吉/空亡）、落宫吉凶与宫性、体用、应期区间、取数池。'
      + '口播时只说结论与主要依据，不要照读全文。',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: '所问之事，例如「这笔生意能成吗」' },
        background: { type: 'string', description: '可选背景：问卦人身份、属相、已发生的事实等' },
        mode: { type: 'string', enum: ['auto', 'clock', 'num', 'date'], description: 'auto 默认按当前时刻；num 报数；date 指定公历日期' },
        nums: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: '报数模式的三个数，0 按 10 计' },
        date: { type: 'string', description: 'date 模式的公历日期 YYYY-MM-DD（农历表覆盖 2020–2040）' },
        zi: { type: 'number', description: '可选时辰 1–12（1＝子时）；不传按当前钟点' },
      },
      required: ['question'],
    },
  },
  {
    name: 'xiaoliuren_jie',
    description:
      '按判据逐条解卦（详细版）。已起过卦、要求「详细说」「说说依据」时调用。'
      + '返回该卦的完整判据文本（理法／主断／体用／三宫／专门判据／应期／数／自查／边界），约 4–6 千字，'
      + '只适合提炼，不要整段念给用户。',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: '所问之事，需与起卦时一致' },
        background: { type: 'string', description: '可选背景' },
        mode: { type: 'string', enum: ['auto', 'clock', 'num', 'date'] },
        nums: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        date: { type: 'string' },
        zi: { type: 'number' },
        withXiang: { type: 'boolean', description: '是否附三宫具象（三盘排法），默认不附' },
        gid: { type: 'string', description: GID_DESC },
      },
      required: ['question'],
    },
  },
  {
    name: 'xiaoliuren_shilei',
    description:
      '十类事类速断素材：婚姻／孕产／财运／工作／疾病／失物／行人／天气／官司／考试。'
      + '用户问的是某类具体事、需在落宫之上再补这一类的专门取象时调用。',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: '所问之事（用于自动归类）' },
        catKey: { type: 'string', enum: ['auto', 'marriage', 'preg', 'money', 'work', 'ill', 'lost', 'travel', 'law', 'exam', 'weather', 'general'], description: '事类，默认 auto' },
        g3: { type: 'string', enum: ['大安', '留连', '速喜', '赤口', '小吉', '空亡'], description: '落宫（可选，不给则按当前时刻起卦）' },
        mode: { type: 'string', enum: ['auto', 'clock', 'num', 'date'] },
        nums: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        date: { type: 'string' },
        zi: { type: 'number' },
        gid: { type: 'string', description: GID_DESC },
      },
      required: ['question'],
    },
  },
  {
    name: 'xiaoliuren_chadian',
    description:
      '在主仓判据文档（00–07 八份，约 7.9 万字）里检索。用户问「依据是什么」「原文怎么讲」，'
      + '或需要核对某宫／某类事的原话时调用。返回命中的小节标题与节选。',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '检索词，例如「留连」「应期」「空亡」' },
        limit: { type: 'number', description: '返回条数，默认 3，最多 6' },
        chars: { type: 'number', description: '每条节选字数，默认 500，最多 1200' },
      },
      required: ['keyword'],
    },
  },
];

export const MCP_TOOL_DUANCI = {
  name: 'xiaoliuren_duanci',
  description:
    '让本机配置的模型按这套体系的提示词直接给出断辞（一两百字，格式固定：一句结论 + 2–4 句白话）。'
      + '用户要一段能直接念出来、能直接发出去的话时调用；要「依据」用 xiaoliuren_jie，不要用这个。',
  inputSchema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: '所问之事' },
      background: { type: 'string', description: '可选背景' },
      mode: { type: 'string', enum: ['auto', 'clock', 'num', 'date'] },
      nums: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      date: { type: 'string' },
      zi: { type: 'number' },
      withXiang: { type: 'boolean', description: '是否带三宫具象' },
      gid: { type: 'string', description: GID_DESC },
    },
    required: ['question'],
  },
};

/* 按配置给清单：没配模型的机器上，解卦工具不出现（免得客户端反复试一个用不了的家伙）。 */
export function listTools(opt) {
  return hasModel(opt) ? MCP_TOOLS.concat([MCP_TOOL_DUANCI]) : MCP_TOOLS.slice();
}

/* ---------------- 工具执行 ---------------- */

/* async：解卦那一支要发 HTTP，统一成 Promise，调用方 await（同步工具会立即 resolve）。 */
export async function callMcpTool(name, a, opt) {
  a = a || {};
  const ctx = {
    store: (opt && opt.store) || createCastStore(),
  };
  return callToolInner(name, a, ctx, opt || {});
}

async function callToolInner(name, a, ctx, opt) {
  switch (name) {
    case 'xiaoliuren_qigua': {
      const { rec, gid } = needCast(a, ctx);
      const text = shortRead(rec.c) + '\n\n（口播提示：先给结论一句，再说落宫两条依据即可；体用与取数只在必要时补。）';
      return {
        content: [{ type: 'text', text: '卦 id：' + gid + '\n' + text }],
        structuredContent: {
          gid, gong: [rec.c.g1, rec.c.g2, rec.c.g3], gi: rec.r.gi, zi: rec.r.zi, ziName: rec.r.ziName,
          luoGong: rec.c.g3, jx: G[rec.c.g3].jx, wx: G[rec.c.g3].wx, act: G[rec.c.g3].act,
          catKey: rec.catKey, catName: rec.c.cat.name, gua: rec.c.gua, yy: rec.c.yy,
          bodyUse: rec.c.bu, yingQi: G[rec.c.g3].ji, nums: G[rec.c.g3].san, src: rec.c.src,
        },
      };
    }
    case 'xiaoliuren_jie': {
      const { rec, gid, fresh } = needCast(a, ctx);
      rec.c.withXiang = !!a.withXiang;
      const B = buildBlocks(rec.c);
      const plain = plainAll(rec.c, B, null);
      const head = fresh ? '卦 id：' + gid + '（本次新起）\n' : '卦 id：' + gid + '\n';
      return {
        content: [{ type: 'text', text: head + plain + '\n\n（口播提示：这是判据全文，不要照读；挑 2–4 条与所问直接相关的说。）' }],
        structuredContent: { gid, gong: [rec.c.g1, rec.c.g2, rec.c.g3], blocks: B.map((b) => b.n + b.t), chars: plain.length },
      };
    }
    case 'xiaoliuren_shilei': {
      const { rec, gid } = needCast(a, ctx);
      let c = rec.c;
      if (a.g3 || (a.catKey && a.catKey !== 'auto')) {
        c = buildContext({
          q: c.q, bg: c.bg,
          catKey: a.catKey && a.catKey !== 'auto' ? a.catKey : rec.catKey,
          zi: c.zi, g1: c.g1, g2: c.g2, g3: a.g3 || c.g3, src: c.src,
        });
      }
      return {
        content: [{ type: 'text', text: shileiText(c) }],
        structuredContent: { gid, catKey: c.catKey, catName: c.cat.name, luoGong: c.g3 },
      };
    }
    case 'xiaoliuren_chadian': {
      const kw = String(a.keyword || '').trim();
      if (!kw) throw new Error('keyword 不能为空');
      const limit = Math.min(Math.max(Number(a.limit) || 3, 1), 6);
      const chars = Math.min(Math.max(Number(a.chars) || 500, 100), 1200);
      const hits = sections(kw).slice(0, limit);
      if (!hits.length) return { content: [{ type: 'text', text: `语料里没有检索到「${kw}」。` }] };
      const text = hits.map((h, i) =>
        `【${i + 1}】${h.title} · ${h.head}\n` + String(h.text).slice(0, chars).trim() + '…'
      ).join('\n\n');
      return { content: [{ type: 'text', text }], structuredContent: { keyword: kw, hits: hits.length, docs: hits.map((h) => h.id) } };
    }
    case 'xiaoliuren_duanci': {
      if (!hasModel(opt)) throw new Error('这台机器没配模型（XLR_MCP_LLM_BASE / KEY / MODEL），解卦工具不可用；要依据请用 xiaoliuren_jie');
      const { rec, gid, fresh } = needCast(a, ctx);
      rec.c.withXiang = !!a.withXiang;
      const out = await askModelText(rec.c, opt.llm);
      return {
        content: [{ type: 'text', text: out.text }],
        structuredContent: {
          gid, model: opt.llm.model, chars: out.text.length, judgedChars: out.chars,
          gong: [rec.c.g1, rec.c.g2, rec.c.g3], fresh,
        },
      };
    }
    default:
      throw new Error(`未知工具：${name}`);
  }
}
