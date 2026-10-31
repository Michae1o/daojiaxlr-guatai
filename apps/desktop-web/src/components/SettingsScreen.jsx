/* SettingsScreen.jsx —— C2（设置页）早期版本 
 *   结构来源（逐字照抄）：`legacy/parts/36-script.txt`
 *     · 外壳/头部/身体   L133–L253（`build()` 里拼的那份 html，L249–253 挂到 body）
 *     · 五个 section     L149–L243 + 五步向导 L159–L194 + 进阶设置 L198–L210
 *     · **运行期填充/改写** L478–L571（`render()`）+ L127–L131（`#stThemes`）+ L978–L984（`open()`）
 *   数据与纯逻辑来源：`src/data/settingsCore.js`（工具机械提取、逐字、改动后重新构建）
 *     ⇒ 本文件**只负责把同样的 DOM 摆出来**，不重写任何计算逻辑
 *       （`pvValid / guessProv / missing / load / loadSvcs / …` 一律调 `SettingsCore`）。
 *
 * 规矩：
 *   · **照抄早期版本**（结构/类名/id/文字一字不改）；CSS 不在这边写（桌面端样式唯一样源 = legacy.css）。
 *   · 文字一律走 **JSX 文本节点**，不用 `esc()` —— 等价性已在 `早期实现记录` 原记录 给出机制证明
 *     （早期版本 `esc()` + innerHTML 的最终文本节点 == React 文本节点；本项目文案全部落在该等价范围内）。
 *   · 每个状态驱动的属性/类名后面都标了**源行号**，便于逐条回溯。
 *
 * **交互（本轮实现的部分）** —— 逐条对应早期版本监听器：
 *   已实现：`#setBack`/Esc 关闭 · **`#setNav` 点击滚动（早期版本 L789-794；2026-10-13 补 —— 此前漏抄，
 *   见下方 注）** · 左栏随滚动高亮(L958-970，**照抄早期版本只算 s-llm/s-skin/s-data/s-about 四屏、
 *   不含 s-contact**）· `#stGuide`(L748-757) ·
 *   服务商卡片点击(L817-844) · `prov-del` 删除(L798-816) · `#stCustomGo`+Enter 起名(L728-744) ·
 *   `#stAgain`/`#stStart`(L500-514) · `#stEye`(L847-851) · 三个输入框(L853-868) ·
 *   `#stWireD`/`#stWireP`(L869-874) · `#stSave`(L876-881) · `#stCaseExp`(L917-936) ·
 *   `#stCaseClr`(L938-943) · `#stReset`(L945-955)
 *   **已实现（2026-10-13 接线，用户「第二条接」）**：`#stPull`(拉模型 L883→pull) · `#stTest`(连通测试 L882→test) ·
 *   `#stKey` 失焦自动拉(L904-908) · `#stModels` 清单点击(L890-901) —— 见下面「出网两条」那一段
 *   （逐字照抄 `renderModels()` L583-605 / `pull()` L607-670 / `test()` L672-718）。
 *   **C1 已落地（2026-10-12）**：`#stThemes` 点击(L910-915) + `renderThemes()`(L573-578)
 *   —— 走 `src/data/skinApply.js`（与 C1 换皮肤面板**共用一份**，A6 已解）
 */
import { useEffect, useRef, useState } from 'react';
import { SettingsCore as C } from '../data/settingsCore.js';
/* 「小智 · MCP」那一节：桥在 data/mcpBridge.js，这里只摆 DOM（见 McpSection.jsx 头注） */
import McpSection from './McpSection.jsx';
/* 出网那两处（测试连接 / 拉模型）改走 llmEndpoint ——
   智谱官方地址在网页版与安卓上要换成本站中转；带 /anthropic 的地址要换请求形状。 */
import { endpoint as epOf, headers as hdrsOf, payload as pyOf, textOf, errOf, resolveBase, isAnth, IS_TAURI } from '../data/llmEndpoint.js';
import { fetchLLM } from '../llm/llmFetch.js';
/* （要求）：「设置 → 常见问题」那一栏的条目，按平台过滤（本端专属 + 通用） */
import { faqList } from '../data/faq.js';
import { SkinsCore } from '../data/skinsCore.js';
import { applySkin, currentSkin } from '../data/skinApply.js';
/* （要求）：数据栏的「准则」导出/清空 +「旧数据导入」——
   准则是 RecordsStore 的第二个库（RULE_KEY = 'xlr-rules'），与卦例本同一个 store ⇒ 读写走同一份原语，
   不自己碰 localStorage（与 recordsStore 的规矩一致）。 */
import { RecordsStore } from '../data/recordsStore.js';
/* （app 内更新·桌面档 B）：关于页的「版本更新」——查清单 → 下整包 → 自动重启 */
import * as Upd from '../data/updateCore.js';

const VER = 'v1.0';   /* L16 `var VER = 'v1.0'` */

/* `provCard()` L64–L68 的逐字对应（一张服务商卡片）+ `render()` 的高亮段 L526–L538：
   `aria-current` 是**每张卡都设**（`k2 === pv ? 'true' : 'false'`，L531）；
   ⚠ 卡片末尾那个 `<em class="pst">已配置</em>` 小标**不再渲染**（用户：跟卡片上的介绍文字重叠了）。
   高亮仍走 `aria-current`；「配没配好」由下面那张状态卡说。
   ⚠ `data-p` / `data-del` 是**属性值**（早期版本经过 `esc()`），其等价性**不套用**文本节点那条，
   另有单独证明（`早期实现记录` 原记录：属性值也逐字等价）。 */
function ProvButton({ k, n, note, rec, del, pv, got }) {
  return (
    <button type="button" className="prov" data-p={k} aria-current={k === pv ? 'true' : 'false'}>
      {rec ? <i>推荐</i> : null}
      {del ? <em className="prov-del" data-del={k} title="删掉这家">✕</em> : null}
      <b>{n}</b><span>{note}</span>
    </button>
  );
}

export default function SettingsScreen({ open, onClose, preload }) {
  /* （用户质问「你知道它里面不能显示 key 吗」——这条确实没做到）：
  const PORTABLE = false;   /* 开源版只有一份包，没有便携变体 */
  /* 打开时解析"当前在用的是哪家服务商" —— 逐字对应 open() 前的 wire() L758-761：
       pv = loadProv(); if (!pvValid(pv)) pv = guessProv(load()); saveProv(pv);
     （`render()` L480 那句 `if (!pvValid(pv)) pv = guessProv(s)` 是给后续重渲染兜底的，同一套逻辑。） */
  const [pv, setPv] = useState(() => {
    let k = C.loadProv();
    if (!C.pvValid(k)) k = C.guessProv(C.load());
    C.saveProv(k);
    return k;
  });

  /* C1：当前皮肤 —— 读**共用**的 `SkinsCore` 状态（不另存一份）。
     早期版本对应 `open()` 里的 `renderThemes()`（L573-578：用 `window.XLR_SKIN_CUR()` 给 `.theme` 标 aria-current）；
     这边把它变成 state：点一下 → `applySkin()` → `setSkin()` ⇒ 重渲染即等价于 renderThemes()。 */
  const [skin, setSkin] = useState(() => currentSkin());
  /* `#stThemes` 点击（L910-915）：`window.XLR_SKIN_APPLY(data-k)` + `renderThemes()` */
  const onTheme = (k) => { applySkin(k); setSkin(k); };

  /* ── 早期版本放在"模块级变量 / 活的 DOM"上的东西，React 里一律变成 state（对应关系见注释末尾） ──
     每次「早期版本会调 render()」的地方 ⇒ 调 `renderLike()`：先按 L480 重新定 `pv`，再强制重画。
     整屏派生值（状态卡三态 / 卡片 aria-current 与「已配置」/ stp3-5 的 off / 两句 hint /
     卦例本则数 / 导出清空的 disabled / 连接方式 pri / 中转行 display / 字段值）都在下面 return 里
     从 `C.load()` **现读** ⇒ **重画 == 早期版本 render() 的效果**。
       `eyeOn` ⇐ `el.stKey.type` + `el.stEye.textContent`（L847-851）—— **唯一进 state 的**（React 要驱动 `type`）
     ⚠ `#stMsg` 的 display/class/正文、`#stCustomRow` 的 display **不进 state**：早期版本是
     `say()/quiet()`（L456-459）与 `showCustomRow()/hideCustomRow()`（L721-727）**直接改 DOM**
     ⇒ JSX 侧照做（ref/getElementById 直接赋属性），源文件里那两个静态 `style="display:none"`
     与静态 `class="stmsg"` **原样保留**。
     `models`（早期版本 `var models = []`）本批不存在：**只有 pull()（出网，原记录① 留待）会填它**
     ⇒ `#stModels` 保持静态 `none`。 */
  const [, setTick] = useState(0);
  const [eyeOn, setEyeOn] = useState(false);
  /* （现象：「本地没部署 qwen，点 Ollama 却说我已配置」）：
     null = 正在探 / 还没探；true = 那台「本机模型」真在跑；false = 连不上。
     只对**本地地址**（localhost / 127.0.0.1）用；云端各家不探（白花请求、还容易被限流）。 */
  const [localUp, setLocalUp] = useState(null);

  const bodyRef = useRef(null);     /* `.setbody`（滚动高亮挂它，L958） */
  const wizRef = useRef(null);      /* `#stWiz`（stAgain/stStart，L504-513） */
  const navRef = useRef(null);      /* `#setNav`（aria-current 就地改，L967-969） */
  const nameRef = useRef(null);     /* `#stCustomName` */
  const keyRef = useRef(null);      /* `#stKey` */
  const baseRef = useRef(null);     /* `#stBase` */
  const modelRef = useRef(null);    /* `#stModel` */
  const tempRef = useRef(null);     /* `#stTemp` */
  const proxyRef = useRef(null);    /* `#stProxy` */
  const msgRef = useRef(null);      /* `#stMsg`（say()/quiet() 直接改它，L456-459） */
  /* 新增（出网两条接线）：前四个 ref 存的是 **DOM 节点**（在下面那支 effect 里用
     `getElementById` 取；**故意不在 JSX 上加 `ref`** —— 那要登记进结构核对器的声明表 = 改判据）；
     第五个 `modelsRef` 存早期版本那个闭包数组 `models`（L581）的数据。 */
  const pullRef = useRef(null);       /* `#stPull`（节点） */
  const pullHintRef = useRef(null);   /* `#stPullHint`（节点） */
  const modelsBoxRef = useRef(null);  /* `#stModels`（节点） */
  const testRef = useRef(null);       /* `#stTest`（节点） */
  const modelsRef = useRef([]);       /* 早期版本 `var models = []`（L581）的数据 */
  /* render 之后要补的 DOM 副作用（早期版本直接改 DOM：滚动 / 聚焦 / 闪高亮）。
     用法：先 `pending.current = () => {...}`，再触发重画 —— 效果在提交后执行。 */
  const pending = useRef(null);

  /* L450-461 say()：先弹浮条（早期版本调全局 toast），再写 `#stMsg`（kind 进 class、正文进内容）。
     ⚠ 早期版本这里是 innerHTML；**本批实现到的提示语里没有标签**（带 `<code>`/`<br>` 的都在
     pull()/test() 两条出网路径上，按 原记录① 留待）⇒ 文本节点等价（原记录）。 */
  const say = (kind, txt) => {
    try {
      const plain = String(txt).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (plain && typeof window.toast === 'function') window.toast(plain.slice(0, 46));
    } catch (e) { }
    const m = msgRef.current;                                          /* L456-459，逐行照抄 */
    if (!m) return;
    m.style.display = '';
    m.className = 'stmsg ' + (kind || '');
    m.innerHTML = txt;
    /* ⚠ 这里用 `innerHTML` 与早期版本一致（不是 textContent）。后果：提示语里嵌入的
       **自定义家名字**（`cc.n` / `n`，用户自己输入）含 HTML 时会被解析 —— **早期版本行为如此，本轮照抄**；
       带 `<code>`/`<br>` 的提示语都在出网路径（留待），与本批无关。 */
  };
  const quiet = () => { const m = msgRef.current; if (m) m.style.display = 'none'; };    /* L461 */
  const syncSvc = () => {                                             /* L95 */
    const s2 = C.load();
    C.svcPut(pv, { base: s2.base, model: s2.model, key: s2.key });
  };
  const renderLike = () => {                                          /* L478 */
    let k = pv;
    if (!C.pvValid(k)) k = C.guessProv(C.load());                     /* L480 */
    if (k !== pv) setPv(k);
    setTick(t => t + 1);
  };

  /* ---------- 出网两条：拉取可用模型 / 测试连接（接线，用户「第二条接」）----------
     逐条照抄 `36-script.txt`：`renderModels()` L583-605 · `pull()` L607-670 · `test()` L672-718 ·
     清单点击 L890-901 · Key 失焦自动拉 L904-908 · 两颗按钮的禁用/文案（L615-616/667-668、L680-681/715-716）。
     ⚠ 早期版本用闭包 `models` 与缓存的 `el.stPull/…`；这里用上面那些 ref 持同一份东西，
       并**照抄早期版本的 DOM 写法**（`innerHTML` / `style.display` / `disabled` / `textContent`）——
       与 `say()`、左栏 `aria-current` 同一套做法：React 不接管这些属性的后续变化。
     ⚠ `apiURL/hdr/esc` 走 `SettingsCore`（提取器第三版新收，逐字切片，见 extract-settings-core.mjs）。 */
  const renderModels = (list, note) => {                              /* L583-605，逐字同构 */
    modelsRef.current = list || [];
    const box = modelsBoxRef.current;
    if (!box) return;
    if (!modelsRef.current.length) { box.style.display = 'none'; return; }
    const s2 = C.load();
    let h = '<div class="mh"><span class="n">共 ' + modelsRef.current.length + ' 个</span>' +
      '<input type="text" id="stMF" placeholder="输入几个字过滤…" spellcheck="false"></div><div class="ml">';
    for (let i = 0; i < modelsRef.current.length; i++) {
      h += '<button type="button" class="mi" data-m="' + C.esc(modelsRef.current[i]) + '" aria-current="' +
        (modelsRef.current[i] === s2.model ? 'true' : 'false') + '">' + C.esc(modelsRef.current[i]) + '</button>';
    }
    h += '</div>' + (note ? '<div class="mn">' + note + '</div>' : '');
    box.innerHTML = h;
    box.style.display = '';
    const f = document.getElementById('stMF');
    if (f) f.addEventListener('input', () => {
      const q = f.value.toLowerCase();
      const bs = box.querySelectorAll('.mi');
      for (let j = 0; j < bs.length; j++) {
        bs[j].style.display = (!q || bs[j].getAttribute('data-m').toLowerCase().indexOf(q) >= 0) ? '' : 'none';
      }
    });
  };

  /* （现象：「本地没部署 qwen，点 Ollama 却说我已配置…你这个本地接口作假了吧」）：
     实测确认三处「假」——
       ① 状态卡只判「地址 + 模型名填了没有」（`missing()`），**从不探本机** ⇒ 没装 Ollama 也写「已配置」；
       ② 拉取失败时回退 `FALLBACK`（写死的 qwen2.5:7b 等）⇒ 看着像「拉到了」；
       ③ 保存只写 localStorage、从不验证连通 ⇒ 永远报「已保存」。
     ⇒ 补一次**真探**：GET `<base>/models`（Ollama 的 OpenAI 兼容口子也认这个），通了才算在跑。
       只探本地地址；云端各家照旧不探（那会白花一次请求，也容易被限流）。 */
  const isLocalBase = (base) => /localhost|127\.0\.0\.1/.test(String(base || ''));
  /* 打开设置页 / 换服务商时探一次（只探本地地址） */
  useEffect(() => {
    if (!open) return;
    const s2 = C.load();
    if (isLocalBase(s2.base)) probeLocal(s2); else setLocalUp(null);
  }, [open, pv]);
  const probeLocal = (s2, cb) => {
    const base = String((s2 && s2.base) || '').replace(/\/+$/, '');
    if (!base) { setLocalUp(false); if (cb) cb(false); return; }
    setLocalUp(null);
    let done = false;
    const fin = (up) => { if (done) return; done = true; setLocalUp(up); if (cb) cb(up); };
    const t = setTimeout(() => fin(false), 6000);
    try {
      fetch(resolveBase(base) + '/models', { method: 'GET' })
        .then((r) => { clearTimeout(t); fin(!!r.ok); })
        .catch(() => { clearTimeout(t); fin(false); });
    } catch (e) { clearTimeout(t); fin(false); }
  };

  const pull = () => {                                                /* L607-670，逐字同构 */
    const s2 = C.load();
    const base = String(s2.base || '').replace(/\/+$/, '');
    const pb = pullRef.current, hint = pullHintRef.current, box = modelsBoxRef.current;
    if (!base) { say('bad', '先把接口地址填上——或者在上面点一个服务商。'); return; }
    if (s2.wire === 'direct' && !s2.key && !/localhost|127\.0\.0\.1/.test(base)) {
      say('bad', '拉清单要带上 Key，先在第 3 步把 Key 填上。'); return;
    }
    if (pb) { pb.disabled = true; pb.textContent = '拉取中…'; }
    if (hint) hint.textContent = '正在连 ' + base + ' …';
    /* 先清空旧清单：换过服务商的话，留着上家的列表比没有更误导 */
    modelsRef.current = [];
    if (box) box.style.display = 'none';

    let p;
    if (s2.wire === 'proxy') {
      /* 走本地中转：让它替我们 GET /models */
      p = fetch(String(s2.proxy || '').replace(/\/+$/, '') + '/proxy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base: base, key: s2.key, path: '/models', method: 'GET' })
      }).then((r) => r.text().then((t) => ({ ok: r.ok, st: r.status, t: t })));
    } else {
      /* 走 llmEndpoint 换算后的地址（网页版 / 安卓上智谱官方地址会自动换成本站中转） */
      p = fetch(resolveBase(base).replace(/\/+$/, '') + '/models', {
        method: 'GET', headers: { 'Authorization': 'Bearer ' + s2.key }
      }).then((r) => r.text().then((t) => ({ ok: r.ok, st: r.status, t: t })));
    }

    p.then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.st + ' ' + String(r.t).slice(0, 180));
      const j = JSON.parse(r.t);
      const arr = (j && j.data) || (j && j.models) || [];
      const ids = [];
      for (let i = 0; i < arr.length; i++) {
        const it = arr[i];
        const id = (typeof it === 'string') ? it : (it.id || it.name || it.model);
        if (id) ids.push(String(id));
      }
      ids.sort();
      if (!ids.length) throw new Error('清单是空的');
      renderModels(ids, '');
      if (hint) hint.textContent = '拉到了 ' + ids.length + ' 个，点一个就选中。';
      say('good', '✓ 从服务商拉到了 ' + ids.length + ' 个可用模型。');
      renderLike();
      return null;
    })
      .catch((e) => {
        const why = C.esc(String(e.message || e).slice(0, 170));
        /* 本地地址**不许**回退内置清单 —— 那份清单是写死的（qwen2.5:7b 等），
           本机没装 Ollama 时它会假装「拉到了」，用户以为配好了，等解卦才报连不上。
           ⇒ 本地这条直接把「怎么把它跑起来」说清楚。 */
        if (isLocalBase(base)) {
          if (hint) hint.textContent = '连不上本机，先把它跑起来。';
          say('bad', '连不上这个地址（' + why + '）。<br>' +
            '① 服务起来了吗；② 地址写对了吗（一般以 <code>/v1</code> 结尾）；' +
            '③ 再点一次「拉取可用模型」。');
          return;
        }
        const fb = C.FALLBACK[C.guessProv(C.load())] || [];
        if (fb.length) {
          renderModels(fb, '这是<b>内置</b>的常用清单——没能拉到这家的实时列表。可以直接在下面手填模型名，或换个时间再拉。');
          if (hint) hint.textContent = '没拉成，先给你一份常用清单。';
          say('bad', '拉取失败：' + why + '<br>已回退到内置清单。');
        } else {
          if (hint) hint.textContent = '没拉成，手动填模型名吧。';
          say('bad', '拉取失败：' + why);
        }
      })
      .then(() => {
        if (pb) { pb.disabled = false; pb.textContent = '拉取可用模型'; }
      });
  };

  const test = () => {                                                /* L672-718，逐字同构 */
    const s2 = C.load();
    C.save(s2);                        // 先把当前输入落盘，测的就是这份
    const bad = C.missing(s2);
    if (bad) { say('bad', C.esc(bad)); return; }

    const ep = epOf(s2), t0 = Date.now();
    const tb = testRef.current;
    if (tb) { tb.disabled = true; tb.textContent = '测试中…'; }
    say('', '正在连这家服务商…');

    fetchLLM(s2, [{ role: 'user', content: '只回两个字：可以' }], false, 16)
      .then((r) => r.text().then((t) => ({ ok: r.ok, st: r.status, t: t })))
      .then((r) => {
        if (!r.ok) {
          let hint = '';
          try { hint = errOf(JSON.parse(r.t)); } catch (e) { hint = ''; }
          throw new Error('HTTP ' + r.st + (hint ? ' · ' + hint.slice(0, 90) : ' ' + String(r.t).slice(0, 220)));
        }
        const j = JSON.parse(r.t);
        const c = textOf(j) || '(空响应)';
        say('good', '✓ 通了。用时 ' + (Date.now() - t0) + ' 毫秒，模型回：<code>' +
          C.esc(String(c).trim().slice(0, 40)) + '</code>');
        renderLike();
        const st5 = document.getElementById('stp5');
        if (st5) st5.className = 'step';
      })
      .catch((e) => {
        const m = C.esc(String(e.message || e));
        /* （已定的口径）：不解释机制，只说下一步 ——
           「无法连接。请检查网络设置，或更换供应商。」
           网络层失败不把 Failed to fetch 甩给用户；HTTP 错误（Key 错/余额）留服务商原话。
           设置里「联系」并入「关于」、那一栏已删 ⇒ 文案改指【关于】。 */
        const netFail = !ep.proxy && /Failed to fetch|NetworkError|Load failed|网络/i.test(String(e.message));
        say('bad', (netFail ? '✗ 无法连接。<br>' : '✗ 没通：' + m + '<br>') +
          '请检查网络设置，或更换供应商。');
      })
      .then(() => {
        if (tb) { tb.disabled = false; tb.textContent = '测试连接'; }
      });
  };

  /* L890-901：清单里点一个 ⇒ 选中它（就地改 aria-current，不重建清单） */
  const onModelsClick = (e) => {
    const b = e.target && e.target.closest ? e.target.closest('.mi') : null;
    if (!b) return;
    const s2 = C.load();
    s2.model = b.getAttribute('data-m');
    C.save(s2);
    const box = modelsBoxRef.current;
    if (box) {
      [].forEach.call(box.querySelectorAll('.mi'), (x) => {
        x.setAttribute('aria-current', x === b ? 'true' : 'false');
      });
    }
    quiet(); renderLike();
  };

  /* L904-908：Key 一离开输入框就自动拉一次（还没拉过的话） */
  const onKeyBlur = () => {
    if (modelsRef.current.length) return;
    const s2 = C.load();
    if (s2.key || /localhost|127\.0\.0\.1/.test(s2.base || '')) pull();
  };

  /* 接线一律走**原生监听**（照早期版本 `el.stPull.addEventListener` 那一套），**不在 JSX 上加 `ref`/`onClick`**：
     那些「动态属性」要登记进 `tools/_check-settings-skeleton.mjs` 的声明表，而**改判据要已定** ⇒ 避开这条路。
     节点用 `getElementById` 取（同一份 DOM，id 与早期版本逐字相同），存进上面那几个 ref 供处理函数用。 */
  useEffect(() => {
    pullRef.current = document.getElementById('stPull');          /* L882-883 */
    testRef.current = document.getElementById('stTest');
    modelsBoxRef.current = document.getElementById('stModels');
    pullHintRef.current = document.getElementById('stPullHint');
    const pb = pullRef.current, tb = testRef.current, box = modelsBoxRef.current;
    const k = document.getElementById('stKey');                   /* L904-908 */
    if (pb) pb.addEventListener('click', pull);
    if (tb) tb.addEventListener('click', test);
    if (box) box.addEventListener('click', onModelsClick);        /* L890-901 清单点击 */
    if (k) k.addEventListener('blur', onKeyBlur);                 /* L904-908 失焦自动拉 */
    return () => {
      if (pb) pb.removeEventListener('click', pull);
      if (tb) tb.removeEventListener('click', test);
      if (box) box.removeEventListener('click', onModelsClick);
      if (k) k.removeEventListener('blur', onKeyBlur);
    };
  }, [open]);
  /* 三个输入框共用：`save(s); syncSvc(); quiet(); render();`（L853-861，逐字同构） */
  const onField = (field) => (e) => {
    const s2 = C.load();
    s2[field] = e.target.value.trim();
    C.save(s2); syncSvc(); quiet(); renderLike();
  };

  /* ---------- 事件（逐条照抄 36-script.txt） ---------- */
  const onGuide = () => {                                             /* L748-757 */
    try { localStorage.removeItem('xlr-onboarded-2'); } catch (e) { }
    /* （现象：：「点了只有提醒，页面还是设置页」）：legacy 的引导层 `.onb` z-index = **90**
       （`legacy.css` L1071），而设置页 `.setscreen` z-index = **600** ⇒ 从设置页里点开引导，
       引导**确实开出来了、但被设置页整个盖住**（实测：`#onbLayer` 已拿到 `.on`/`display:flex`/1280×900，
       但 `elementFromPoint` 在屏幕中心命中的仍是设置页）。
       ⇒ 只在这一刻把引导层抬到设置页之上（**基础值 90 一字不动** = 首启观感照抄早期版本）；
       归还时机 = 设置页关闭时（见下面 `[open]` 那个 effect）。 */
    const ob = document.getElementById('onbLayer');
    if (ob) ob.style.zIndex = '640';                                  /* 高于设置页 600 */
    if (window.__xlrGuideShow) { window.__xlrGuideShow(); say('good', '✓ 引导已打开（随时点「跳过」退出）'); }
    else say('warn', '引导层没建起来——刷新一下页面再试。');
  };
  const onCustomNameKey = (ev) => {                                   /* L886-888 */
    if (ev.key === 'Enter') { ev.preventDefault(); customCreate(); }
  };
  const showCustomRow = () => {                                       /* L721-726，逐行照抄 */
    const r = document.getElementById('stCustomRow');
    if (!r) return;
    r.style.display = '';
    try { r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { }
    if (nameRef.current) nameRef.current.focus();
  };
  const hideCustomRow = () => {                                       /* L727 */
    const r = document.getElementById('stCustomRow');
    if (r) r.style.display = 'none';
  };
  const customCreate = () => {                                        /* L728-744 */
    const n = nameRef.current ? nameRef.current.value.trim() : '';
    if (!n) { say('bad', '先给它起个名字（比如 gemini）。'); if (nameRef.current) nameRef.current.focus(); return; }
    const k = 'u' + Date.now().toString(36);
    const cc = C.loadCustoms(); cc.push({ k: k, n: n }); C.saveCustoms(cc);
    const s2 = C.load();
    if (s2.base) C.svcPut(pv, { base: s2.base, model: s2.model, key: s2.key });
    setPv(k); C.saveProv(k);
    s2.base = ''; s2.model = ''; s2.key = '';
    C.save(s2);
    if (nameRef.current) nameRef.current.value = '';
    hideCustomRow();
    quiet(); renderLike();
    pending.current = () => {                                         /* L741-743：滚到第 2 步 + 聚焦 */
      const st2 = document.getElementById('stp2');
      if (st2) { try { st2.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { } }
      if (baseRef.current) baseRef.current.focus();
    };
    say('good', '✓ 已建好「' + n + '」：往下填接口地址 → Key → 模型，最后「测试连接」。');
  };
  const onProvsClick = (e) => {                                       /* L796-844 */
    const del = e.target.closest ? e.target.closest('.prov-del') : null;
    if (del) {                                                        /* L798-816 ✕ 删自定义家 */
      e.stopPropagation();
      const dk = del.getAttribute('data-del');
      let cc = null;
      C.loadCustoms().forEach((x) => { if (x.k === dk) cc = x; });
      if (!cc) return;
      if (!window.confirm('删掉自定义服务商「' + cc.n + '」？它存下的地址和 Key 一起清掉，不能撤销。')) return;
      C.saveCustoms(C.loadCustoms().filter((x) => x.k !== dk));
      const mm2 = C.loadSvcs(); if (mm2[dk]) { delete mm2[dk]; C.saveSvcs(mm2); }
      if (pv === dk) {
        setPv('deepseek'); C.saveProv('deepseek');
        const ds = C.svcGet('deepseek'); const s3 = C.load();
        if (ds) { s3.base = ds.base; s3.model = ds.model; s3.key = ds.key; }
        C.save(s3);
      }
      say('good', '✓ 已删掉「' + cc.n + '」。');
      renderLike();
      return;
    }
    const b = e.target.closest ? e.target.closest('.prov') : null;    /* L817-844 选一家 */
    if (!b) return;
    const k2 = b.getAttribute('data-p');
    if (k2 === 'custom') { showCustomRow(); return; }                 /* L820-824 */
    let p = null;
    for (let i = 0; i < C.PROVS.length; i++) if (C.PROVS[i].k === k2) p = C.PROVS[i];
    if (!p) C.loadCustoms().forEach((x) => { if (x.k === k2) p = x; });
    if (!p) return;
    hideCustomRow();
    const s2 = C.load();
    if (s2.base) C.svcPut(pv, { base: s2.base, model: s2.model, key: s2.key });   /* L833 */
    setPv(p.k); C.saveProv(p.k);
    const mine = C.svcGet(p.k);
    if (mine) { s2.base = mine.base; s2.model = mine.model; s2.key = mine.key; }
    else { s2.base = p.base || ''; s2.model = p.model || ''; s2.key = ''; }
    if (p.local) s2.wire = 'direct';
    C.save(s2);
    quiet(); renderLike();
    /* L842-844：`models = []; el.stModels.style.display = 'none'; if (s.key || p.local) pull();`
       ⇒ 清单清空已由 `models` 恒空体现；**`pull()` 出网，按 原记录① 留待（本批不调）**。 */
  };
  const onAgain = () => {                                            /* L500-509 */
    const w = wizRef.current; if (!w) return;
    w.style.display = '';
    try { w.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { }
    const old = w.style.outline;
    w.style.outline = '2px solid var(--accent)';
    setTimeout(() => { if (wizRef.current) wizRef.current.style.outline = old; }, 1000);
  };
  const onStart = () => {                                            /* L510-514 */
    const w = wizRef.current; if (!w) return;
    w.style.display = '';
    try { w.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { }
  };
  const onEye = () => {                                              /* L847-851 */
    const on = keyRef.current && keyRef.current.type === 'password';
    if (keyRef.current) keyRef.current.type = on ? 'text' : 'password';
    setEyeOn(!!on);
  };
  const onTemp = (e) => {                                            /* L862-865 */
    const s2 = C.load(); const v = parseFloat(e.target.value);
    s2.temp = isNaN(v) ? 0.5 : Math.min(2, Math.max(0, v)); C.save(s2);
  };
  const onProxy = (e) => {                                           /* L866-868 */
    const s2 = C.load(); s2.proxy = e.target.value.trim(); C.save(s2); quiet();
  };
  /* （要求）：智谱的地址一键切换 ——
     标准 API 走 `api/paas/v4`，token plan（编码套餐）走 `api/anthropic`（Claude 协议，软件自己认地址换形状）。
     点「这里」就换一次、记住；再点一次换回来。 */
  const onZipToggle = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const s2 = C.load();
    s2.base = isAnth(s2.base)
      ? 'https://open.bigmodel.cn/api/paas/v4'
      : 'https://open.bigmodel.cn/api/anthropic';
    C.save(s2);
    if (baseRef.current) baseRef.current.value = s2.base;   /* ← 输入框是 defaultValue 非受控，得手动改 */
    renderLike();
  };
  const onWire = (w) => () => {                                      /* L869-874 */
    const s2 = C.load(); s2.wire = w; C.save(s2); renderLike();
  };
  const onSave = () => {                                             /* L876-881 */
    const s2 = C.load();
    C.save(s2);
    /* 本地地址保存后**当场探一次**再说「成功」——
       原来只写 localStorage 就报「已保存」，用户没装 Ollama 也会以为配好了（解卦时才报连不上）。 */
    if (isLocalBase(s2.base)) {
      say('', '已保存，正在检查本机模型…');
      probeLocal(s2, (up) => {
        say(up ? 'good' : 'bad', up
          ? '✓ 已保存，本机的本地模型是在跑的。回到主界面点「让模型解卦」就能用。'
          : '已保存，但本机这个地址（' + C.esc(s2.base) + '）连不上 —— 本地模型没装或没启动，现在还解不了卦。');
      });
      renderLike();
      return;
    }
    say('good', '✓ 已保存。回到主界面点「让模型解卦」就会用它。');
    renderLike();
  };
  /* （用户要）：「导出按钮后面都加一个打开导出文件夹」。
     记下最后一次真正落盘的路径 —— 点了就让资源管理器选中它；没导出过就开「下载」目录。 */
  const lastExport = useRef('');

  const onOpenFolder = () => {
    const t = window.__TAURI__;
    const inv = t && t.core && t.core.invoke;
    if (!inv) { say('bad', '这条线打不开文件夹 —— 到浏览器的下载列表里找。'); return; }
    inv('open_folder', { path: lastExport.current || '' })
      .then(() => { say('good', '✓ 已打开导出文件夹。'); })
      ['catch']((e) => { say('bad', '打不开文件夹：' + e); });
  };

  const onCaseExp = () => {                                          /* L917-936 */
    let a = [];
    try { a = JSON.parse(localStorage.getItem(C.KEYS.cases) || '[]') || []; } catch (e) { a = []; }
    const txt = JSON.stringify(a, null, 2);
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      window.__TAURI__.core.invoke('save_export', { name: '道家小六壬-卦例本.json', text: txt })
        .then((path) => { lastExport.current = path; say('good', '✓ 已导出 ' + a.length + ' 则 → ' + path); })
        ['catch']((e) => { say('bad', '导出失败：' + e); });
      return;
    }
    const blob = new Blob([txt], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a2 = document.createElement('a');
    a2.href = url; a2.download = '道家小六壬-卦例本.json';
    document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
    setTimeout(() => { URL.revokeObjectURL(url); }, 4000);
    say('good', '✓ 已导出 ' + a.length + ' 则。');
  };
  const onCaseClr = () => {                                          /* L938-943 */
    if (!window.confirm('清空卦例本？这个不能撤销。')) return;
    try { localStorage.removeItem(C.KEYS.cases); } catch (e) { }
    say('good', '✓ 卦例本已清空。');
    renderLike();
  };
  const onReset = () => {                                            /* L945-955 */
    if (!window.confirm('重置全部？模型配置、主题、卦例本都会被清掉。')) return;
    try {
      localStorage.removeItem(C.KEYS.llm);
      localStorage.removeItem(C.KEYS.cases);
      localStorage.removeItem(C.KEYS.skin);
    } catch (e) { }
    /* C1（2026-10-12）：L952-953 原样落齐 ——
       `XLR_SKIN_APPLY('xuan')`（重置后皮肤回到 xuan 宣纸，**早期版本就这么写死**）
       ＋ `renderThemes()`（把 `#stThemes` 的 aria-current 重标）⇒ 这边走**共用入口** `applySkin()`，
       `setSkin('xuan')` 就是 renderThemes() 的等价物。 */
    applySkin('xuan');
    setSkin('xuan');
    renderLike();
    say('good', '✓ 已重置。');
  };

  /* ══════════ （要求）：准则的导出/清空 + 旧数据导入 ══════════
     原文：「数据那一栏里只有卦例本的导出和清空和全部重置。我希望加入一个准则，可以导出和清空。
     再加一个旧数据导入功能，旁边有个导入键，点开导入时，让用户选择，导入卦例、导入准则、导入卦例+准则。」
     口径：
       · 准则 = RecordsStore 的第二个库（'xlr-rules'），一条 = {id,at,from,gua,q,rule,why}。
       · **导入只加不覆盖**：按 id 去重，本地已有的不动（他可能已经在本地调教过，导入是「补」不是「换」）。
         没有 id 的旧数据现补一个；落盘前按时间排序 —— saveCases/saveRules 各自只留最后 200/100 条，
         不排序会把「新导进来的」当成新的留下、把本地更早的挤掉。
       · 文件用 <input type="file"> 读：桌面（WebView2）/ 安卓（Capacitor WebView）/ 网页版都支持，
         不必给 Tauri 或 Capacitor 加任何权限。
       · 兼容两种外形：数组（本应用导出就是数组）／{cases:[],rules:[]}。
         归类判据：带 string 型 `rule` 字段的是准则；其余带 q/gua 的是卦例
         （⚠ 准则对象自己也带 gua/q，所以**只能**用 `rule` 判，不能用 gua/q 判）。 */
  const [impAsk, setImpAsk] = useState(false);
  const impKind = useRef('');        /* 'cases' | 'rules' | 'both' */
  const impFile = useRef(null);

  const onRuleExp = () => {
    let a = [];
    try { a = RecordsStore.loadRules() || []; } catch (e) { a = []; }
    const txt = JSON.stringify(a, null, 2);
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      window.__TAURI__.core.invoke('save_export', { name: '道家小六壬-准则.json', text: txt })
        .then((path) => { lastExport.current = path; say('good', '✓ 已导出 ' + a.length + ' 条准则 → ' + path); })
        ['catch']((e) => { say('bad', '导出失败：' + e); });
      return;
    }
    const blob = new Blob([txt], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a2 = document.createElement('a');
    a2.href = url; a2.download = '道家小六壬-准则.json';
    document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
    setTimeout(() => { URL.revokeObjectURL(url); }, 4000);
    say('good', '✓ 已导出 ' + a.length + ' 条准则。');
  };
  const onRuleClr = () => {
    if (!window.confirm('清空准则？这个不能撤销。（卦例本不受影响）')) return;
    try { localStorage.removeItem(RecordsStore.RULE_KEY); } catch (e) { }
    if (window.__xlrRecordsRefresh) { try { window.__xlrRecordsRefresh(); } catch (e) { } }
    say('good', '✓ 准则已清空。');
    renderLike();
  };
  /* 选好类别 → 收起面板 → 开文件框（同一个 input 复用） */
  const impGo = (kind) => {
    impKind.current = kind;
    setImpAsk(false);
    if (impFile.current) impFile.current.click();
  };
  const onImportFile = (ev) => {
    const el = ev.target;
    const f = el && el.files && el.files[0];
    if (el) el.value = '';                      /* 清掉值 ⇒ 同一个文件能连着导两次 */
    if (!f) return;
    const kind = impKind.current || 'both';
    const rd = new FileReader();
    rd.onerror = () => say('bad', '读不了这个文件。');
    rd.onload = () => {
      let data = null;
      try { data = JSON.parse(String(rd.result || '').replace(/^\uFEFF/, '')); }
      catch (e) { say('bad', '这个文件不是本应用导出的 JSON。'); return; }
      const incCases = [], incRules = [];
      const eat = (arr) => (Array.isArray(arr) ? arr : []).forEach((r) => {
        if (!r || typeof r !== 'object') return;
        if (typeof r.rule === 'string' && r.rule) incRules.push(r);
        else if (r.q != null || r.gua != null) incCases.push(r);
      });
      if (Array.isArray(data)) eat(data);
      else if (data && typeof data === 'object') { eat(data.cases); eat(data.rules); }
      const wantC = (kind === 'cases' || kind === 'both'), wantR = (kind === 'rules' || kind === 'both');
      const gotC = wantC ? incCases : [], gotR = wantR ? incRules : [];
      if (!gotC.length && !gotR.length) {
        say('bad', (wantC && wantR) ? '这个文件里没有卦例，也没有准则。'
          : wantC ? '这个文件里没有卦例。' : '这个文件里没有准则。');
        return;
      }
      const byTime = (k) => (a, b) => String(a[k] || '').localeCompare(String(b[k] || ''));
      const msg = [];
      if (gotC.length) {
        const cur = RecordsStore.loadCasesRaw();
        const seen = {};
        cur.forEach((r) => { if (r && r.id) seen[r.id] = 1; });
        let add = 0;
        gotC.forEach((r) => {
          if (r.id && seen[r.id]) return;
          if (!r.id) { r.id = 'c' + (Date.now() + add); }
          seen[r.id] = 1; cur.push(r); add++;
        });
        cur.sort(byTime('t'));
        RecordsStore.saveCases(cur);
        msg.push('卦例 ' + add + ' 则' + (gotC.length > add ? '（跳过重复 ' + (gotC.length - add) + ' 则）' : ''));
      }
      if (gotR.length) {
        const cur = RecordsStore.loadRules();
        const seen = {};
        cur.forEach((r) => { if (r && r.id) seen[r.id] = 1; });
        let add = 0;
        gotR.forEach((r) => {
          if (r.id && seen[r.id]) return;
          if (!r.id) { r.id = 'r' + (Date.now() + add); }
          seen[r.id] = 1; cur.push(r); add++;
        });
        cur.sort(byTime('at'));
        RecordsStore.saveRules(cur);
        msg.push('准则 ' + add + ' 条' + (gotR.length > add ? '（跳过重复 ' + (gotR.length - add) + ' 条）' : ''));
      }
      say('good', '✓ 导入完成：' + msg.join('；') + '。');
      renderLike();
    };
    rd.readAsText(f, 'utf-8');
  };

  /* （app 内更新·桌面档 B）：关于页那一行。
     分两步 —— 先「检查更新」拿清单，有新版时按钮变「立即更新」，再点才真下载换装。
     不合并成一下就装：换装会让窗口自己关掉再开，得让人先看见它在干什么。 */
  const [verTxt, setVerTxt] = useState('');
  const [updBusy, setUpdBusy] = useState(false);
  const [updReady, setUpdReady] = useState(false);
  const updInfo = useRef(null);

  /* （用户要进度条）：下载百分比来自 Rust 侧的 atomic，250ms 轮一次。
     不用 Tauri 事件 —— 那要在 capabilities 里多开一条 core:event 权限，为这点小数据不值。 */
  const [updPct, setUpdPct] = useState(-1);
  const pollRef = useRef(null);
  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };
  useEffect(() => () => stopPoll(), []);

  /* （用户要）：「点了去更新转到页面，检查更新的按钮应该会自动变成立即更新，
     需要用户点击立即更新才可以」⇒ 这里只预置清单条目与按钮状态，**不自动开始下载**；
     并把这页滚到「关于」那一节，省得人自己找。 */
  useEffect(() => {
    if (!open || !preload) return undefined;
    updInfo.current = preload;
    setUpdReady(true);
    say('', '发现新版本 ' + preload.version + '，点「立即更新」下载并装好。');
    const t = setTimeout(() => {
      const sec = document.getElementById('s-about');
      if (sec) sec.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 80);
    return () => clearTimeout(t);
  }, [open, preload]);

  /* Tauri 的 invoke 失败时 reject 的是 **字符串**（Rust 的 Err），不是 Error 对象 ⇒ 两种都收，
     否则界面上只会显示兜底那句，真实原因（下载不完整 / 校验不过）就丢了。 */
  const errText = (e, fallback) => (e && e.message) ? e.message : (typeof e === 'string' && e.trim() ? e : fallback);

  useEffect(() => {
    if (!open || verTxt || !Upd.isDesktop()) return;
    Upd.currentVersion().then((v) => { if (v) setVerTxt(v); });
  }, [open, verTxt]);

  const onUpdate = () => {
    if (updBusy) return;
    setUpdBusy(true);
    const done = (kind, txt) => { setUpdBusy(false); if (txt) say(kind, txt); };

    if (updInfo.current) {
      say('', '正在下载更新包，别关窗口……');
      setUpdPct(0);
      stopPoll();
      pollRef.current = setInterval(() => {
        Upd.progress().then((p) => { if (p >= 0) setUpdPct(p); }, () => { });
      }, 250);
      Upd.apply(updInfo.current).then(
        (r) => {
          stopPoll();
          setUpdPct(100);
          updInfo.current = null;
          setUpdReady(false);
          done('good', '✓ ' + r + '，马上重启完成更新（窗口会自己关掉再开）');
          setTimeout(() => Upd.quit(), 1400);
        },
        (e) => {
          stopPoll();
          setUpdPct(-1);
          done('bad', errText(e, '下载失败，请稍后再试'));
        }
      );
      return;
    }

    say('', '正在检查……');
    Upd.check().then(
      (r) => {
        if (!r.hasNew) { done('good', '✓ 已经是最新版本（' + (r.current || '—') + '）'); return; }
        updInfo.current = r.info;
        const mb = r.info.size ? (r.info.size / 1048576).toFixed(1) : '?';
        setUpdReady(true);
        done('', '发现新版本 ' + r.info.version + '（' + mb + ' MB）。点「立即更新」，下好会自动重启。');
      },
      (e) => done('bad', errText(e, '连不上更新服务，稍后再试'))
    );
  };

  /* （用户要「清空配置」）：一键把这页填过的东西全清掉。
     ⚠ 输入框是**非受控**的（defaultValue + ref）⇒ 清完必须手工把 5 个框写回默认值，
        否则屏幕上还留着旧字，看着像没清。 */
  const onClearAll = () => {
    if (!window.confirm('清空模型配置？服务商、接口地址、Key、模型名都会删掉，之后要重新填一遍。')) return;
    C.clearAll();
    const d = C.load();
    if (baseRef.current) baseRef.current.value = d.base;
    if (keyRef.current) keyRef.current.value = PORTABLE ? '' : d.key;
    if (modelRef.current) modelRef.current.value = d.model;
    if (tempRef.current) tempRef.current.value = d.temp;
    if (proxyRef.current) proxyRef.current.value = d.proxy;
    modelsRef.current = [];
    if (modelsBoxRef.current) { modelsBoxRef.current.innerHTML = ''; modelsBoxRef.current.style.display = 'none'; }
    setPv(C.guessProv(d));
    renderLike();
    say('good', '✓ 模型配置已清空，可以重新配一家。');
  };

  const s = C.load();                 /* L479 */
  const bad = C.missing(s);           /* L481 */
  const ok = !bad;                    /* L482 */
  /* 本地预设（没 Key + 地址是本机）要**真探过**才敢说「已配置」 */
  const localOnly = ok && !s.key && isLocalBase(s.base);
  const customs = C.loadCustoms();    /* gridHtml() 里那一支 */
  let caseN = 0;
  try { caseN = (JSON.parse(localStorage.getItem(C.KEYS.cases) || '[]') || []).length; } catch (e) { caseN = 0; }  /* L566-567 */
  /* （要求）：准则条数 —— 与 caseN 一样现读，renderLike() 之后自动跟上 */
  let ruleN = 0;
  try { ruleN = (RecordsStore.loadRules() || []).length; } catch (e) { ruleN = 0; }

  /* open()/close() 对 <html> 的两处副作用：L980-982 / L988-989（照抄，含 set-lock 类） */
  useEffect(() => {
    const de = document.documentElement;
    if (open) {
      de.style.overflow = 'hidden';
      de.classList.add('set-lock');
      /* L983：`open()` 末尾是 `render(); renderThemes(); quiet();` —— 三条都要照抄：
         · `quiet()`：否则"关掉再打开"时上一次的 #stMsg 提示会留在页面上（交互比对抓到过）
         · `renderThemes()`：**C1（2026-10-12）已落地** —— 早期版本每次打开都按 `XLR_SKIN_CUR()`
           重标 `.theme` 的 aria-current（皮肤也可能被面板改过）⇒ 这边等价物 = `setSkin(currentSkin())`，
           把 state 拉回"当前真实皮肤"，重渲染即重标（不能只在首帧取一次，否则面板改肤后此处会陈旧）。 */
      setSkin(currentSkin());
      const m = msgRef.current;
      if (m) m.style.display = 'none';
    } else {
      de.style.overflow = '';
      de.classList.remove('set-lock');
      /* 引导层层级归还 —— 设置页关掉了 ⇒ 回到 legacy 的基础值 90
         （见 onGuide 的 注：只在设置页里点「重看引导」时才抬到 640）。 */
      const ob = document.getElementById('onbLayer');
      if (ob) ob.style.zIndex = '';
    }
    return () => { de.style.overflow = ''; de.classList.remove('set-lock'); };
  }, [open]);

  /* L972-974：Esc 关闭（早期版本条件 = `el.setScreen.classList.contains('on')`，这里就是 `open`） */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /* L517-519：`render()` 每次都把字段值从存档写回输入框（早期版本就这么做，含 trim 归一）
     ＋ 提交后补 DOM 副作用（滚动 / 聚焦 / 闪高亮）。
     ⚠ **故意无依赖数组 = 每次重画都跑**，与早期版本"render() 会重写 .value"逐字一致。 */
  useEffect(() => {
    const s2 = C.load();
    if (baseRef.current) baseRef.current.value = s2.base;
    if (modelRef.current) modelRef.current.value = s2.model;
    if (keyRef.current) keyRef.current.value = PORTABLE ? '' : s2.key;
    if (tempRef.current) tempRef.current.value = s2.temp;
    if (proxyRef.current) proxyRef.current.value = s2.proxy;
    const pr = document.getElementById('stProxyRow');                  /* L563 */
    if (pr) pr.style.display = s2.wire === 'proxy' ? '' : 'none';
    const f = pending.current;
    if (f) { pending.current = null; f(); }
  });

  /* L958-970：滚动时同步左栏高亮。**照抄早期版本两处特征**：① 只算四个屏（**不含 `s-contact`**）
     ② 就地改 `aria-current`（不重画）⇒ 这里用 DOM 原语而非 state（避免与早期版本初始 DOM 不一致）。 */
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const secs = ['s-llm', 's-skin', 's-data', 's-mcp', 's-about', 's-faq', 's-note'];
    const onScroll = () => {
      let best = secs[0], top = 1e9;
      for (let i = 0; i < secs.length; i++) {
        const t = document.getElementById(secs[i]);
        if (!t) continue;
        const d = Math.abs(t.getBoundingClientRect().top - 90);
        if (d < top) { top = d; best = secs[i]; }
      }
      const nav = navRef.current;
      if (!nav) return;
      [].forEach.call(nav.querySelectorAll('button'), (b) => {
        b.setAttribute('aria-current', b.getAttribute('data-to') === best ? 'true' : 'false');
      });
    };
    /* 补：`#setNav` 点击 → 滚到对应段落 —— **早期版本 L789-794 逐字照抄**。
       此前只抄了下面的滚动高亮，漏了这一条 ⇒ 用户点「外观 / 数据」时页面纹丝不动
       （三臂实测：早期版本点「外观」`.setbody` scrollTop 0→1402、高亮跟着走；新版恒 0）。
       `block:'start'` + `behavior:'smooth'` 与早期版本一致；`closest('button[data-to]')` 同早期版本。 */
    const nav = navRef.current;
    const onNav = (e) => {
      const b = e.target && e.target.closest ? e.target.closest('button[data-to]') : null;
      if (!b) return;
      const t = document.getElementById(b.getAttribute('data-to'));
      if (t) t.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    if (nav) nav.addEventListener('click', onNav);
    body.addEventListener('scroll', onScroll);
    return () => {
      if (nav) nav.removeEventListener('click', onNav);
      body.removeEventListener('scroll', onScroll);
    };
  }, [open]);

  const provs = C.PROVS.filter(p => p.k !== 'custom');
  /* 「常见问题」按平台过滤（本端专属 + 通用），模块加载后算一次即可 */
  const faqs = faqList();
  /* L547-548：`p` **只在 PROVS 里找**（自定义家不在其中 ⇒ `p` 为 null ⇒ 走 else 分支），照抄 */
  const cur = C.PROVS.find(x => x.k === pv) || null;
  return (
    <div className={'setscreen' + (open ? ' on' : '')} id="setScreen">
      <div className="sethead">
        <button className="bk" type="button" id="setBack" onClick={onClose}>← 返回</button>
        <span className="ttl">设置</span>
        <span className="sp"></span>
        <span className="v">{verTxt ? 'v' + verTxt : VER}</span>
      </div>
      <div className="setbody" ref={bodyRef}>
        <div className="setgrid">
          <nav className="setnav" id="setNav" ref={navRef}>
            <button type="button" data-to="s-llm" aria-current="true">大模型</button>
            <button type="button" data-to="s-skin">外观</button>
            <button type="button" data-to="s-data">数据</button>
            <button type="button" data-to="s-mcp">小智 · MCP</button>
            <button type="button" data-to="s-about">关于</button>
            <button type="button" data-to="s-faq">常见问题</button>
            <button type="button" data-to="s-note">说明</button>
          </nav>
          <div className="setmain">
            <section className="setsec" id="s-llm">
              <h3>大模型</h3>
              <p className="lead">解卦台本身不联网：起卦、排盘、断卦依据都在本机算。配上模型，点「让模型解卦」直接出断辞。</p>
              <div className="sbtnrow" style={{ margin: '14px 0 22px' }}>
                <button className="sbtn" type="button" id="stGuide" onClick={onGuide}>重新看配置引导（图文）</button>
                <span className="hint" style={{ margin: '0', alignSelf: 'center' }}>不知道去哪申请 Key？点这个，一步步来。</span>
              </div>
              {/* L484–L499：状态卡三态。**内容全部由 localStorage 决定**（运行期填充）⇒ 按 原记录 的分工，
                  它不在结构核对器管辖内，由比对 06-settings 负责；这里的文字/结构与早期版本逐字相同
                  （`esc()` 走的是 JSX 文本节点，等价性见 原记录）。 */}
              <div className={'stcard' + (ok && (!localOnly || localUp === true) ? ' ok' : '')} id="stCard">
                {ok && s.key ? (
                  <><span className="dot"></span><div className="m"><b>{'已配置 · ' + s.model}</b><p>{s.base + '　·　' + (s.wire === 'proxy' ? '本地中转' : '浏览器直连')}</p></div><button className="sbtn" type="button" id="stAgain" onClick={onAgain}>重新配置</button></>
                ) : localOnly && localUp !== true ? (
                  <><span className="dot"></span><div className="m"><b>{localUp === false ? '连不上这台本机服务' : '正在检查本机…'}</b>
                    <p>{localUp === false ? (s.base + ' 连不上：服务没起来，或地址写错了。它起来之后再点「重新检查」。') : s.base}</p></div>
                    <button className="sbtn" type="button" id="stRecheck" onClick={() => probeLocal(C.load())}>重新检查</button></>
                ) : ok ? (
                  <><span className="dot"></span><div className="m"><b>{'已配置 · ' + s.model}</b><p>{s.base}</p></div><button className="sbtn" type="button" id="stAgain" onClick={onAgain}>重新配置</button></>
                ) : (
                  <><span className="dot"></span><div className="m"><b>还没配模型</b><p>{bad + '跟着下面走，一分钟就能好。'}</p></div><button className="sbtn pri" type="button" id="stStart" onClick={onStart}>开始配置</button></>
                )}
              </div>
              <div className="steps" id="stWiz" ref={wizRef}>
                <div className="step" id="stp1"><span className="no">1</span><span className="cn">选一个服务商</span>
                  <div className="bd"><div className="provs" id="stProvs" onClick={onProvsClick}>
                    {/* `gridHtml()` L69–L77 的**顺序**：内置各家（不含 custom）→ 自定义各家 → 「自定义」入口卡。
                        内容属运行期填充（原记录）⇒ 结构核对器已把这一段**切出去**，由比对 06-settings 负责。 */}
                    {provs.map(p => <ProvButton key={p.k} k={p.k} n={p.n} note={p.note} rec={!!p.rec} pv={pv} got={p.k === pv && ok} />)}
                    {customs.map(c => <ProvButton key={c.k} k={c.k} n={c.n} note="自定义" pv={pv} got={c.k === pv && ok} del />)}
                    <ProvButton k="custom" n="自定义" note="自己加一家（先起名）" pv={pv} got={'custom' === pv && ok} />
                  </div>
                  <div className="stf" id="stCustomRow" style={{ display: 'none', marginTop: '12px' }}>
                    <label htmlFor="stCustomName">给它起个名——比如 gemini（起完就出现在上面这一排里）</label>
                    <div className="strow"><input type="text" id="stCustomName" spellCheck="false" placeholder="比如 gemini" ref={nameRef} onKeyDown={onCustomNameKey} />
                    <button className="sbtn pri" type="button" id="stCustomGo" onClick={customCreate}>起名并添加</button></div></div>
                  <div className="hint">选完会自动填好接口地址和模型名，你只要补一个 Key。</div></div></div>
                <div className="step" id="stp2"><span className="no">2</span><span className="cn">核对接口地址</span>
                  <div className="bd">
                    <div className="stf"><label htmlFor="stBase">接口地址（Base URL）</label>
                      <input type="text" id="stBase" spellCheck="false" defaultValue={s.base} placeholder="https://api.deepseek.com" ref={baseRef} onChange={onField('base')} /></div>
                    {/* L522-524：两句提示二选一（`pv === 'custom' || pv.charAt(0) === 'u'` ⇒ 自定义那句）。 */}
                    <div className="hint" id="stBaseHint">{(pv === 'custom' || pv.charAt(0) === 'u')
                      ? <>{'自定义的这家：把服务商给你的'}<b>接口地址</b>{'填在这里（一般以 /v1 结尾），再往下填 Key。'}</>
                      : (pv === 'zhipu' && isAnth(s.base)
                        ? <>{'已切到 token plan 的地址（'}<code>api/anthropic</code>
                          {'）；普通 API Key 请点击'}<a href="#" role="button" id="stZipToggle" onClick={onZipToggle}
                            style={{ textDecoration: 'underline', cursor: 'pointer', color: 'inherit' }}>这里</a>{'切回标准地址。'}</>
                        : '预设已自动填好，一般不用改；要换成别家的地址，直接改这里。')}</div></div></div>
                <div className={'step' + (s.base ? '' : ' off')} id="stp3"><span className="no">3</span><span className="cn">把 API Key 粘进来</span>
                  <div className="bd">
                    <div className="stf"><label htmlFor="stKey">API Key<b>必填</b></label>
                      <div className="strow"><input type={eyeOn ? 'text' : 'password'} id="stKey" spellCheck="false" autoComplete="off" defaultValue={PORTABLE ? '' : s.key} placeholder={PORTABLE ? '已随包配置（不可查看）' : 'sk-...'} ref={keyRef} onChange={onField('key')} />
                      {PORTABLE ? null : <button className="sbtn" type="button" id="stEye" onClick={onEye}>{eyeOn ? '隐藏' : '显示'}</button>}</div>
                      {/* L547-558：三支（本地模型 / 有拿 Key 的地址 / 兜底）。`p` 只看 PROVS（见上面 `cur`）。 */}
                      <div className="hint" id="stKeyHint">{(cur && cur.url
                          ? <>{'去哪里拿：'}<a href={cur.url} target="_blank" rel="noopener">{cur.url.replace(/^https?:\/\//, '')}</a></>
                          : '填服务商给你的 API Key，一般以 sk- 开头。')}</div>
                    </div></div></div>
                <div className={'step' + (s.base ? '' : ' off')} id="stp4"><span className="no">4</span><span className="cn">从清单里挑一个模型</span>
                  <div className="bd">
                    <div className="sbtnrow" style={{ marginTop: '0' }}>
                      <button className="sbtn pri" type="button" id="stPull">拉取可用模型</button>
                      <span className="hint" id="stPullHint" style={{ margin: '0', alignSelf: 'center' }}>连上你填的服务商，把能用的模型列出来。</span></div>
                    <div id="stModels" className="mmodels" style={{ display: 'none' }}></div>
                    <div className="stf" style={{ margin: '16px 0 0' }}><label htmlFor="stModel">选中的模型</label>
                      <input type="text" id="stModel" spellCheck="false" defaultValue={s.model} placeholder="deepseek-chat" ref={modelRef} onChange={onField('model')} /></div>
                  </div></div>
                <div className={'step' + (ok ? '' : ' off')} id="stp5"><span className="no">5</span><span className="cn">点一下，看通不通</span>
                  <div className="bd"><div className="sbtnrow" style={{ marginTop: '0' }}>
                    <button className="sbtn pri" type="button" id="stTest">测试连接</button>
                    <button className="sbtn" type="button" id="stSave" onClick={onSave}>保存</button>
                    <button className="sbtn" type="button" id="stClearAll" onClick={onClearAll}>清空配置</button></div>
                    <div id="stMsg" className="stmsg" style={{ display: 'none' }} ref={msgRef}></div>
                  </div></div>
              </div>
              <details id="stAdv"><summary style={{ cursor: 'pointer', fontSize: '12.5px', color: 'var(--dim2)', letterSpacing: '.06em', padding: '6px 0' }}>进阶设置（温度 / 连接方式）</summary>
                <div style={{ padding: '16px 0 0' }}>
                  <div className="stf"><label htmlFor="stTemp">温度（0.2 更稳、0.8 更活，解卦建议 0.5 左右）</label>
                    <input type="number" id="stTemp" min="0" max="2" step="0.1" defaultValue={s.temp} ref={tempRef} onChange={onTemp} /></div>
                  <div className="stf"><label>连接方式</label>
                    <div className="sbtnrow" style={{ marginTop: '0' }}>
                      <button className={'sbtn' + (s.wire === 'direct' ? ' pri' : '')} type="button" id="stWireD" onClick={onWire('direct')}>浏览器直连</button>
                      <button className={'sbtn' + (s.wire === 'proxy' ? ' pri' : '')} type="button" id="stWireP" onClick={onWire('proxy')}>本地中转</button></div>
                    <div className="hint">直连最简单，一般不用改这里。只有这家服务商不让网页调用它、怎么换都连不上时，才需要切到「本地中转」——那要另有一个中转程序在这台电脑上跑着。</div></div>
                  {/* L563：`el.stProxyRow.style.display = s.wire === 'proxy' ? '' : 'none'` ——
                      `render()` 里**直接改 DOM**（源文件此处是静态 `display:none`）⇒ JSX 照做：
                      静态保持 `none`，切换在"每次重画后"的 effect 里赋同一表达式。 */}
                  <div className="stf" id="stProxyRow" style={{ display: 'none' }}><label htmlFor="stProxy">中转地址</label>
                    <input type="text" id="stProxy" spellCheck="false" defaultValue={s.proxy} placeholder="http://127.0.0.1:8080" ref={proxyRef} onChange={onProxy} /></div>
                </div></details>
            </section>

            <section className="setsec" id="s-skin">
              <h3>外观</h3>
              <p className="lead">八套主题，点一下立刻生效，会记住。每套不只是换颜色——字体和边框语言也跟着换。</p>
              {/* L127-131：`#stThemes` 的 9 个 `.theme` 按钮 —— **C1 落地**，数据源 `SkinsCore`（A6 共用一份）。
                  ⚠ 页面正文写「八套主题」是**早期版本文案，照抄不改**（表里实际 9 套：删了 4 个深色、补了 hei）。
                  每个按钮 = 一个 `.theme` 按钮，内含一个 `.sw` 色块（inline 的 background / border-color）
                  加一个 `<b>` 名字 —— 逐字对应 36-script.txt L127-131 那段拼串（见该处原文）。
                  ⚠ 早期版本 HTML 里**没有** aria-current —— 是 `open()` 时的 `renderThemes()`(L573-578) 补的
                    （判据 `data-k === XLR_SKIN_CUR()`）；React 版由 `skin` state 直接渲染出同一结果 ⇒ 打开时一致。
                  点击(L910-915)：`XLR_SKIN_APPLY(data-k)` + `renderThemes()` ⇒ 这边 `onTheme()` 两条都做。 */}
              <div className="themes" id="stThemes">
                {SkinsCore.SKINS.map((s) => (
                  <button key={s.k} type="button" className="theme" data-k={s.k}
                    aria-current={s.k === skin ? 'true' : 'false'}
                    onClick={() => onTheme(s.k)}>
                    <span className="sw" style={{ background: s.bg, borderColor: s.ac }}></span>
                    <b>{s.n}</b>
                  </button>
                ))}
              </div>
            </section>

            <section className="setsec" id="s-data">
              <h3>数据</h3>
              <div className="datarow"><div className="m"><b>卦例本</b>
                <p>记下来的卦。标过「应验/没应验」的，会在下次解卦时一并交给模型作校准。</p></div>
                <span className="n" id="stCaseN">{caseN + ' 则'}</span>
                {/* L569-570：`disabled = n === 0`（空卦例本 ⇒ 两个按钮都置灰） */}
                <button className="sbtn" type="button" id="stCaseExp" disabled={caseN === 0} onClick={onCaseExp}>导出</button>
                <button className="sbtn" type="button" id="stCaseClr" disabled={caseN === 0} onClick={onCaseClr}>清空</button>
                {/* （用户要）：导出后不用自己照路径去找 —— 点这个让资源管理器选中它 */}
                {IS_TAURI ? <button className="sbtn" type="button" onClick={onOpenFolder}>打开导出文件夹</button> : null}</div>
              {/* （要求）：准则一行 —— 与卦例本同构（导出 / 清空），空时两个按钮置灰 */}
              <div className="datarow"><div className="m"><b>准则</b>
                <p>复盘里你逐条确认过的修正，解卦时会一起交给模型。导出带得走，换机器不至于从零调教。</p></div>
                <span className="n" id="stRuleN">{ruleN + ' 条'}</span>
                <button className="sbtn" type="button" id="stRuleExp" disabled={ruleN === 0} onClick={onRuleExp}>导出</button>
                <button className="sbtn" type="button" id="stRuleClr" disabled={ruleN === 0} onClick={onRuleClr}>清空</button>
                {IS_TAURI ? <button className="sbtn" type="button" onClick={onOpenFolder}>打开导出文件夹</button> : null}</div>
              {/* （要求）：旧数据导入 —— 点「导入」先问导什么（卦例 / 准则 / 两者），再挑文件；
                 只加不覆盖，重复的跳过。隐藏 input 复用同一个 ref。 */}
              <div className="datarow"><div className="m"><b>旧数据导入</b>
                <p>从早期版本或别的机器带来的备份。只往里加，不覆盖本机已有的，重复的自动跳过。</p></div>
                <button className="sbtn" type="button" id="stImp" onClick={() => setImpAsk(true)}>导入</button>
                <input ref={impFile} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onImportFile} /></div>
              {/* 点了「导入」就在这一行下面展开三选一（行内展开，不另做浮层：
                  少一套遮罩/z-index，窄屏也自动折行） */}
              {impAsk ? (
                <div className="datarow" id="stImpAsk">
                  <div className="m"><b>导入什么</b><p>选好之后就开文件框挑备份。</p></div>
                  <button className="sbtn pri" type="button" onClick={() => impGo('cases')}>只导入卦例</button>
                  <button className="sbtn pri" type="button" onClick={() => impGo('rules')}>只导入准则</button>
                  <button className="sbtn pri" type="button" onClick={() => impGo('both')}>卦例 + 准则</button>
                  <button className="sbtn" type="button" onClick={() => setImpAsk(false)}>取消</button>
                </div>
              ) : null}
              <div className="datarow"><div className="m"><b>全部重置</b>
                <p>清掉模型配置、主题选择和卦例本，回到刚装好的状态。</p></div>
                <button className="sbtn" type="button" id="stReset" onClick={onReset}>重置</button></div>
            </section>

            {/* 「小智 · MCP」——把判据做成 MCP 工具，由本机主动连到小智的 MCP 接入点。
                只加这一节 + 左栏一项（见 #setNav 与上面 secs），不改任何既有节的内容与样式。 */}
            <section className="setsec" id="s-mcp">
              <h3>小智 · MCP</h3>
              <p className="lead">
                把卦台接进小智 AI：这一节填好 MCP 接入点，应用就自己连上去，
                设备说「起一卦」时由本机判据算完再回话。不填就是纯本机使用，什么都不会出网。
              </p>
              <McpSection />
            </section>

            {/* （用户定）：「关于移动到数据的后面」；这一栏只留版本号与更新入口 ——
                简介与三条前提已搬到「说明」栏最前面。 */}
            <section className="setsec about" id="s-about">
              <h3>关于</h3>
              <p><b>道家小六壬 · 卦台</b>　{verTxt ? 'v' + verTxt : VER}</p>
              {/* （app 内更新·桌面档 B）：下好整包 → 换装 → 自己重启。
                  只在桌面 exe 里出现（网页版没有 __TAURI__，也不能替换自己的文件 ⇒ 不显示这一行）。 */}
              {IS_TAURI ? (
                <div className="datarow"><div className="m"><b>版本更新</b>
                  <p>下好之后会自动重启完成更新；卦例、模型配置、皮肤都保留。</p></div>
                  <button className={'sbtn' + (updReady ? ' pri' : '')} type="button" id="stUpdBtn" disabled={updBusy} onClick={onUpdate}>
                    {updBusy ? (updPct >= 0 ? '下载中…' : '请稍等…') : (updReady ? '立即更新' : '检查更新')}
                  </button>
                  {/* 下载中才出这条：3px 细线 + accent 填充，跟 .sbtn/.datarow 一个口径（样式在 legacy.css） */}
                  {updPct >= 0 ? (
                    <div className="updbar">
                      <span className="updtrack"><i className="updfill" style={{ width: updPct + '%' }}></i></span>
                      <span className="updpct">{updPct >= 100 ? '收尾…' : updPct + '%'}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            {/* （要求）：常见问题 —— 只显示问题，点一下才出解法；
                条目按平台过滤（Win 端只出 Win + 通用、安卓只出安卓 + 通用、网页版不出安卓），
                样式不写死颜色：用 --ink / --line / --dim2 这些皮肤变量，九套皮肤与昼夜自动跟着变。 */}
            <section className="setsec" id="s-faq">
              <h3>常见问题</h3>
              <p className="lead">点一下问题，看怎么办。</p>
              <div id="stFaq">
                {faqs.map((it) => (
                  <details key={it.q} style={{ borderBottom: '1px solid var(--line)', padding: '11px 0' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--ink)' }}>{it.q}</summary>
                    <div className="hint" style={{ marginTop: '8px', lineHeight: 1.8 }}>{it.a}</div>
                  </details>
                ))}
              </div>
            </section>

            {/* （要求）：「设置里的关于里面加点内容，想加点免责条款……然后把联系的内容
                都移动到关于吧，再把联系栏删了。」⇒ 原 `#s-contact` 整节删除，两处联系方式并进本页；
                免责声明按「它是什么 → 不能拿它干什么 → 数据与模型 → 责任 → 用法」分层写。
                （用户定）：这一整块后续已拆成「关于」（数据之后，只留版本与更新）＋「说明」
                （末尾，简介 + 三条前提 + 免责声明 + 联系 + 仓库）—— 原位于此处的旧 `#s-about` 已删。 */}

            {/* （要求）：「既然你要放检查更新在关于里，那就再开一个说明栏」⇒
                免责声明 / 联系维护者 / 开源仓库 从「关于」搬到独立的「说明」栏。
                用 `setsec about` 类是为了复用 `.about .ab-h` / `.ab-list` 那套排版
                （样式唯一样源在 src/styles/legacy.css 与 tailwind.css，不在这边写样式）。 */}
            <section className="setsec about" id="s-note">
              <h3>说明</h3>
              <p>本软件以邵一尘先生的小六壬神通·卜法卷为基础，部分功能及生成内容由人工智能技术辅助完成，结果仅供参考。所有内容仅供交流、学习使用，不用于商业用途；如涉及版权争议，请权利人联系删除，造成不便敬请谅解。</p>
              <p>三条前提：<b>无事不卦、心动即卦、一事不二卦</b>。</p>

              <h4 className="ab-h">免责声明</h4>
              <ul className="ab-list">
                <li>本软件是传统术数文化的<b>学习与自用工具</b>。起卦、排盘、本机速断与模型断辞都只是按这套体系的推演，<b>不构成预测、承诺或任何专业意见</b>；请当作参考，不必据此替自己做重大决定。</li>
                <li>医疗、诉讼、投资、婚育、就业这类专业事项，请找有资质的专业人士；本软件的输出不能替代他们的判断，也不该被用来拖延就诊或决策。</li>
                <li>模型断辞由<b>你自己配置的</b>第三方模型服务生成，作者无法预知、也无法控制它写了什么；其中若有错漏、偏差或不当表述，作者不承担责任。</li>
                <li>请勿在「所问」「背景」里填身份证号、银行卡号、病历等敏感个人信息 —— 你填的内容会随请求发送给<b>你自己配置的那家服务商</b>。</li>
                <li>本软件按「现状」提供，不承诺无缺陷、不承诺永久可用。因使用本软件（含模型输出有误、服务中断、记录丢失）造成的任何直接或间接损失，由使用者自行承担。</li>
                <li>请在所在地法律与公序良俗的范围内使用；不得用它行骗、敛财，或做其他违法的事。</li>
              </ul>

              <h4 className="ab-h">反馈</h4>
              <p>问题与建议请提到仓库的 Issues。</p>

              <h4 className="ab-h">开源仓库</h4>
              <p><span>源码就是本仓库，clone 下来按 BUILD.md 编</span></p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
