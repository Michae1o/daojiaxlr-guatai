/* quickReadCore.js —— 「本机速断」的正文生成（进「叁 断卦」步自动出那段）。
 *
 *    只把**措辞**改成当面说话的口气——先给答案，再讲两句人话；
 *    去掉破折号、「」套宫名、排比和客服腔。改前改后同一批问题出的结论必须一一对应。
 *
 * 与前几版的关系（逻辑部分照旧）：
 *   1. 吉凶三态：①问吉凶→吉凶当答案；②不问吉凶→答案在落宫特性；③问了但吉凶不足以回答→以特性为主。
 *   2. 前两宫只解释"为什么走到这一步"，不当独立吉凶。
 *   4. 应期两种问法：问"什么时候"→定点（季节＋年份，要属相才能钉死）；问"还有多久"→拿本宫三数当时长。
 *
 */
import { G, GYY, SHENG, KE, GLOSS, bodyUse, ASKS } from '@xlr/shared-judgment';

/* ---------- 关系：原文义，不带吉凶、不自造词 ---------- */

/* ---------- 落宫性质白话（从判据里切前两段） ---------- */
function tag(g) {
  const x = String((G[g] && G[g].xing) || '').replace(/——.*$/, '');
  const ps = x.split(/[、，]/).filter(s => s && String(s).trim());
  return ps.slice(0, 2).join('、') || x;
}

/* 说话口气：破折号改逗号，别让句子读起来像稿子 */
function speak(s) { return String(s == null ? '' : s).replace(/——/g, '，').replace(/，，/g, '，'); }

/* ---------- 三宫走向：前因 → 经过 → 结果（材料里的「相承关系」） ----------
   依据（原话）：
   · 「天、地、人，三宫是指前因、经过、结果，这就是一个事情的相承关系」｜028 L421｜A
   · 「前两宫只看事情的可能性」「发展的状况」｜028 L455 / L463｜A
   · 「天时小吉…小吉生人宫大安木，为得到财」｜011 L665｜A（前宫生人宫＝得／成）
   · 「天时又克地宫，说明财动，财空」；「天时克地宫原本为得，可却所得为空」｜011 L737 / L758｜A（克＝去取得，但可能落空／有阻碍）
   · 「天克地，不代表地对人没作用，无非有阻碍」｜031 L278｜A
   · 落宫凶照样断凶，前两宫生只作"怎么解决时可利用"｜029 L457｜A
   */
function pairRel(a, b) {
  const wa = G[a].wx, wb = G[b].wx;
  if (wa === wb) return '比和';
  if (SHENG[wa] === wb) return '生';
  if (KE[wa] === wb) return '克';
  if (SHENG[wb] === wa) return '被生';
  return '受制';
}
const T2D = {
  '生': '接得上，一路往下',
  '克': '这里别住了',
  '被生': '中间回头照应起头',
  '受制': '中间压着起头',
  '比和': '两段同气',
};
/* 地→人：只说"这一段跟结果是什么关系"，不评强弱、不改吉凶（014：生克只是关系、是一种状态；029：落宫凶照样断凶） */
const D2R = {
  '生': '结果是顺着中间这一步过来的',
  '克': '中间压着结果，这一步是硬拿',
  '被生': '结果反过来照应中间，越往后越费劲',
  '受制': '结果压住中间，前面铺的路到后面用不上',
  '比和': '中间和结果同气，顺',
};
/* 六神优先于五行：宫义先说一句人话（GLOSS 在包内，见 shared-judgment），五行只当关系用 */

/* ---------- 应期：定点（什么时候）vs 时长（还有多久） ---------- */
const SEASON = [
  [/长夏/, [5, 7], '长夏'], [/冬春/, [2, 4], '冬春之交'], [/辰巳|四季土/, [4, 6], '春末夏初'],
  [/春/, [2, 4], '春天'], [/秋/, [8, 10], '秋天'], [/冬/, [11, 1], '冬天']
];
function seasonOf(GG) {
  const ji = String(GG.ji || '');
  for (const [re, span, name] of SEASON) if (re.test(ji)) return { span, name };
  return { span: [3, 5], name: '这一季' };
}
function whenPoint(GG, bu, now) {
  const { span, name } = seasonOf(GG);
  const near = bu ? (bu.t === '用生体' || bu.t === '体克用') : /吉$/.test(String(GG.jx));
  let off = near ? 0 : 1;
  const m = now.getMonth() + 1;
  if (span[0] <= span[1] ? m > span[1] : (m > span[1] && m < span[0])) off += 1;
  const y = now.getFullYear() + off;
  return (off === 0 ? '今年' : off === 1 ? '明年' : '后年') + name + '，' + span[0] + ' 到 ' + span[1] + ' 月';
}
function durationOf(GG) {
  const n = parseInt(String(GG.san || '').split(/[·\s]+/)[0], 10) || 3;
  const a = String(GG.act || '');
  const unit = a === '快' ? ['天', '周'] : (a === '动' ? ['周', '个月'] : ['个月', '季']);
  return { n, unit, txt: n + ' ' + unit[0] + '到 ' + n + ' ' + unit[1] };
}

/* ---------- 是非问句判定词（跟问法走） ---------- */
const VD = [['会不会', '会'], ['能不能', '能'], ['可不可以', '可以'], ['可否', '可以'], ['有没有', '有'],
  ['行不行', '行'], ['该不该', '该'], ['是不是', '是'], ['是否', '是'],
  ['顺利', '顺'], ['成功', '成'], ['成不成', '成']];

/* ---------- 主函数 ---------- */
export function quickRead(c) {
  if (!c || !c.g3 || !G[c.g3]) return '';
  const g1 = c.g1, g2 = c.g2, g3 = c.g3, GG = G[g3], q = String(c.q || '');
  const bu = (() => { try { return c.zi ? bodyUse(g3, c.zi) : null; } catch (e) { return null; } })();

  /* ---- 问法 ---- */
  const isWhere = /哪|何处|什么地方|何方|位置|方位/.test(q);
  const isPoint = /什么时候|何时|几时|哪天|几月|哪年/.test(q);
  const isDur = /还有多久|多久能|多长时间|几天|几个月|多久/.test(q);
  const isSuit = /适合|该不该|要不要嫁|要不要娶|值得/.test(q);
  const isYn = /吗|嘛|是否|能否|会不会|能不能|可不可以|有没有|行不行|该不该/.test(q) || /(.)不\1/.test(q);

  let head = '', why = [];

  /* ---- ① 结论：按问法给（吉凶三态） ---- */
  if (isWhere) {
    const it = pickItem(c, ['方位', '位置']);
    let dir = '';
    if (it) { const m = String(it.tx).replace(/<[^>]*>/g, '').match(/往\s*([^\s，。；]+?)\s*方向/); if (m) dir = m[1]; }
    head = '**往' + (dir || GG.fw) + '那边找**';
    if (it) why.push('方向看的是落宫克的那一宫：它在哪边，就往哪边找，以你现在住的地方为中心。');
  } else if (isPoint) {
    head = '**' + whenPoint(GG, bu, new Date()) + '**';
    why.push('时间按这一宫管的季节推，吉的近一点，不吉的远一点。想钉到哪一年，得先知道你的属相。');
  } else if (isDur) {
    const d = durationOf(GG);
    head = '**大概 ' + d.txt + '**';
    why.push('这一宫自带三个数 ' + String(GG.san).replace(/\s/g, ' ') + '，问"还有多久"就拿它当个量。数只是参考，不是日期。');
  } else if (isSuit && c.catKey === 'marriage' && ASKS.marriage) {
    const ok = /吉$/.test(String(GG.jx));
    head = '**' + (ok ? '适合' : '眼下还不适合') + '**';
    const s = String(ASKS.marriage.suit[ok ? 'good' : 'bad'].plain).replace(/^适合。|^目前还不适合。/, '').trim();
    why.push(s || ('这一宫偏' + tag(g3) + '，吉凶是' + GG.jx + '，现在不是能定下来的状态。'));
  } else if (c.catKey === 'weather') {
    /*
       · 三宫＝气／地理气温／天气体现；天宫先、地宫次、落宫最后，一宫管一段时辰；
       · 问「会不会下雨」只判会不会＋理由，问「天气如何」才说天气；
       */
    const map = (ASKS.weather && ASKS.weather.byPalace && ASKS.weather.byPalace[0]) || {};
    const d1 = String(map[g1] || ''), d2 = String(map[g2] || ''), d3 = String(map[g3] || '');
    const askRain = /会下雨|会下雪|下不下|下雨吗|下雪吗|会不会下|要下吗|下不下雨/.test(q);
    const snow = /雪/.test(q);
    if (askRain) {
      head = '**' + (/雨|雪/.test(d3) ? '会' : '不会') + '**';
      why.push('先看落宫：落到' + g3 + '，天象是' + d3 + '，这就是结果；天宫' + g1 + '是' + d1 + '（气）、地宫' + g2 + '是' + d2 + '（地理气温），这两宫是形成它的条件。');
      why.push(snow
        ? '雪还要地面够冷，按你当地的气温看；正问是「明天天气如何」。'
        : '要问得更准，直接问「明天天气如何」，别把天气问成吉凶题。');
    } else {
      head = '**' + d3 + '**';
      why.push('先定落宫：落到' + g3 + '，天象是' + d3 + '——这就是天气本身。');
      why.push('再反推天地：天宫' + g1 + '是' + d1 + '（气、先天条件），地宫' + g2 + '是' + d2 + '（地理与当地气温），这两宫是形成它的条件。');
    }
  } else if (isYn) {
    if (!head) {
      const lost = (c.catKey === 'lost' && ASKS.lost && ASKS.lost.find[g3]) ? ASKS.lost.find[g3] : null;
      if (lost) { head = '**' + String(lost.plain).replace(/。$/, '') + '**'; }
      else {
        let verb = '';
        for (const [k, v] of VD) if (q.indexOf(k) > -1) { verb = v; break; }
        if (!verb) verb = q.indexOf('会') > -1 ? '会' : q.indexOf('能') > -1 ? '能' : '是';
        const yes = /吉$/.test(String(GG.jx));
        /* 只判"这句话问的是好的一面还是坏的一面"，不碰事类判据：
           问"严重吗/要紧吗/会不会更糟"→ 吉就该答"不严重"，凶才答"严重"；
           问"能过吗/能好吗"→ 吉答"能"，凶答"不能"。 */
        const negQ = /严重|要紧|危险|厉害|更糟|恶化|有没有问题|有没有事|难吗/.test(q);
        const good = negQ ? !yes : yes;
        const li = !!(bu && (bu.t === '用生体' || bu.t === '体克用'));
        const bian = /变数/.test(String(GG.xing || ''));
        if (bian) {
          /* ① 留连＝唯一带变数之宫 ⇒ 不给死答案 */
          head = '**还没定，眼下还拖着**';
          why.push('这一宫是六宫里唯一带变数的：不是已经断了，也不是已经成了，说的是"还缠着、没落定"。');
        } else if (li && !good) {
          /* 往后走势：用生体＝有外力；体克用＝自己去争（两句话不能混） */
          const wait = verb === '有' ? '没有' : '不' + verb;
          if (bu.t === '用生体') {
            head = '**眼下还' + wait + '，但有转机**';
            why.push('落宫是' + g3 + '，' + GG.jx + '，' + tag(g3) + '；后面的走势是用生体，有人帮、有外力，不算死局。');
          } else {
            head = '**眼下还' + wait + '，但往后再主动争取，还有机会**';
            why.push('落宫是' + g3 + '，' + GG.jx + '，' + tag(g3) + '；后面是体克用，要靠你自己去争，争了才可能转过来。');
          }
        } else if (li && good) {
          head = bu.t === '用生体'
            ? '**' + verb + '，而且有外人在推**'
            : '**' + verb + '，但得你自己去争**';
        } else {
          head = '**' + (good ? verb : (verb === '有' ? '没有' : '不' + verb)) + '**';
        }
      }
    }
  } else {
    /* 不问吉凶的泛问：答案在落宫特性里，吉凶只作括注 */
    head = '**' + tag(g3) + '**';
    why.push('你没问吉凶，那先看这一宫是什么脾气（' + g3 + '，' + GG.jx + '）。');
  }

  /* ---- ② 理由：落宫性质 + 前两宫怎么把它带过来（最多两句） ---- */
  if (!why.length) why.push('最后落在' + g3 + '，' + String(GG.xing || '').replace(/[。；\s]+$/, '') + '。');

  const isWeather = c.catKey === 'weather' && !!(ASKS.weather && ASKS.weather.byPalace);
  if (!isWeather && why.length < 2) {
    /* 三宫走向：前因 → 经过 → 结果；前两宫只在落宫的框架里解释 */
    const k12 = pairRel(g1, g2), k23 = pairRel(g2, g3);
    const bad = /凶$/.test(String(GG.jx));
    const frame = bad
      ? '这些都是过程，落宫这一关已经先定了。'
      : '这些过程是往成里走的。';
    const step = (g1 === g2)
      ? '起头和中间都是' + g1 + '（' + GLOSS[g1] + '），' + T2D[k12] + '；'
      : '起头是' + g1 + '（' + GLOSS[g1] + '），走到中间是' + g2 + '（' + GLOSS[g2] + '），' + T2D[k12] + '；';
    why.push(step + '最后落在' + g3 + '（' + GLOSS[g3] + '），' + D2R[k23] + '。' + frame);
  }

  return speak(head) + '\n\n' + why.slice(0, 2).map(speak).join('\n');
}

function plainOf(it) {
  if (it && it.plain) return String(it.plain);
  const t = String((it && it.tx) || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const ps = t.split('。').filter(Boolean);
  return ps.length > 2 ? ps.slice(0, 2).join('。') + '。' : t;
}
function pickItem(c, labels) {
  try {
    const ex = (c.cat && typeof c.cat.extra === 'function') ? (c.cat.extra(c) || []) : [];
    for (const lb of labels) for (const it of ex) if (it && it.lb === lb && it.tx) return it;
  } catch (e) { }
  return null;
}

export const QuickReadCore = { quickRead };
