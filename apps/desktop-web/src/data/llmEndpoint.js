/* llmEndpoint.js —— 「设置里填的那几格」换算成「真正要发出去的请求」：全仓只此一处。
 *
 * ★★ 2026-10-22（现象：：智谱预设填官方地址连不上，红字只写「Failed to fetch」）：
 *   实测（在线上 https://fairy-deepdive.cn/xlr/ 里直接 fetch，Origin 就是本站）——
 *     open.bigmodel.cn/api/paas/v4/chat/completions  → Failed to fetch
 *     open.bigmodel.cn/api/anthropic/v1/messages     → Failed to fetch
 *     api.deepseek.com / api.siliconflow.cn / api.moonshot.cn → 401（通，只是测试用的是假 key）
 *     api.openai.com                                 → Failed to fetch（国内网络到不了，跟软件无关）
 *   原因在「预检」：智谱那个网关只在 Origin == open.bigmodel.cn 时才回 Access-Control-Allow-Origin，
 *   别的域名一律 200 但**没有**这条头 ⇒ 浏览器直接把请求拦掉，页面只能看到 Failed to fetch。
 *   这跟「智谱是不是 OpenAI 兼容」没关系：/api/paas/v4 就是 OpenAI 那套的形状，
 *   拦人的是浏览器的同源策略，不是接口形状。
 *
 *   ⇒ 不在 Tauri 里的（网页版 /xlr/、安卓 WebView、手机网页版）把智谱官方地址换成
 *     本站同源中转 `/llm/zhipu/<原路径>`（nginx 原样转给 open.bigmodel.cn，
 *     见 tools/_add-llm-relay-nginx.py：不记日志、不缓冲、只给必要的 CORS 头）。
 *     桌面 exe 走 Rust 侧 http_fetch 发请求、没有跨域这回事 ⇒ 仍然直连官方地址，不依赖本站。
 *
 *   ★ 两种地址都能用：`.../api/paas/v4`（标准 API）与 `.../api/anthropic`（Claude 协议，编码套餐）。
 *     中转是**按原路径转发**的，两种都通。
 *
 * 第二个换算：Anthropic 协议。地址里带 `/anthropic` 的（智谱的 /api/anthropic、真 Anthropic），
 *   请求/响应形状与 OpenAI 不同：x-api-key 头、max_tokens 必填、正文在 content[].text、
 *   流式是 content_block_delta。这里统一兜住，调用方不用各写一份。
 */

/* 桌面 exe（Tauri）里才有 window.__TAURI__（tauri.conf.json 的 withGlobalTauri = true）；
   网页版 / 安卓 WebView 里没有 ⇒ 走本站中转。 */
export var IS_TAURI = (typeof window !== 'undefined') && !!window.__TAURI__;

var ZHIPU = /^https?:\/\/open\.bigmodel\.cn\//i;
export var RELAY = 'https://fairy-deepdive.cn/llm/zhipu/';

/* 只在「非 Tauri」且「智谱官方域名」时换成中转；自定义家 / 别家一律原样 */
export function resolveBase(base) {
  var b = String(base || '');
  if (IS_TAURI || !ZHIPU.test(b)) return b;
  return RELAY + b.replace(ZHIPU, '');
}

export function isAnth(base) { return /\/anthropic(\/|$)/i.test(String(base || '')); }

/* 返回值形如 { url, proxy, anth, base, s } —— 与早期版本 apiURL() 的 { url, proxy, s } 兼容 */
export function endpoint(s) {
  s = s || {};
  if (s.wire === 'proxy') {
    return { url: String(s.proxy || '').replace(/\/+$/, '') + '/proxy', proxy: true, anth: false, base: s.base, s: s };
  }
  var base = resolveBase(s.base);
  var anth = isAnth(base);
  return {
    url: base.replace(/\/+$/, '') + (anth ? '/v1/messages' : '/chat/completions'),
    proxy: false, anth: anth, base: base, s: s
  };
}

export function headers(s, ep) {
  var h = { 'Content-Type': 'application/json' };
  if (ep && ep.proxy) return h;                       /* 本地中转：key 在 JSON 正文里，不放头 */
  if (ep && ep.anth) {
    /* Anthropic 那套认 x-api-key；智谱的 /api/anthropic 两种都认 ⇒ 都带上，撞不着 */
    h['x-api-key'] = String(s.key || '');
    h['Authorization'] = 'Bearer ' + s.key;
    h['anthropic-version'] = '2023-06-01';
    return h;
  }
  h['Authorization'] = 'Bearer ' + s.key;
  return h;
}

/* msgs 是 OpenAI 形状的 [{role, content}]；Anthropic 那条把 system 拆出来、补 max_tokens。 */
export function payload(s, msgs, stream, maxTokens) {
  msgs = msgs || [];
  var anth = isAnth(resolveBase(s && s.base));
  var p;
  if (anth) {
    var sys = '', mm = [];
    msgs.forEach(function (m) {
      if (!m) return;
      if (m.role === 'system') sys += (sys ? '\n\n' : '') + String(m.content == null ? '' : m.content);
      else mm.push({ role: m.role, content: m.content });
    });
    p = { model: s.model, messages: mm, stream: !!stream, max_tokens: maxTokens || 4096 };
    if (sys) p.system = sys;
    var t = Number(s.temp);
    p.temperature = isNaN(t) ? 0.5 : Math.min(1, Math.max(0, t));   /* Anthropic 只收 0–1 */
  } else {
    p = { model: s.model, messages: msgs, temperature: s.temp, stream: !!stream };
    /* ⚠ OpenAI 那套**不加** max_tokens：早期版本就没加，而各家上限不一（Kimi 8k 那种写大了直接报错） */
  }
  if (s && s.wire === 'proxy') return { base: s.base, key: s.key, payload: p };
  return p;
}

/* 流式：从一行 SSE 的 JSON 里取增量。OpenAI = choices[0].delta.content；Anthropic = content_block_delta */
export function deltaOf(j) {
  if (!j) return '';
  var c = j.choices && j.choices[0];
  if (c && c.delta && typeof c.delta.content === 'string') return c.delta.content;
  if (j.delta && typeof j.delta.text === 'string') return j.delta.text;
  return '';
}

/* 非流式：OpenAI = choices[0].message.content；Anthropic = content[].text */
export function textOf(j) {
  if (!j) return '';
  var c = j.choices && j.choices[0];
  if (c && c.message && typeof c.message.content === 'string') return c.message.content;
  if (Array.isArray(j.content)) {
    var t = '';
    j.content.forEach(function (b) {
      if (b && typeof b.text === 'string' && (!b.type || b.type === 'text')) t += b.text;
    });
    return t;
  }
  return '';
}

/* 错误正文：两家形状不同，提示时给一句人能读的 */
export function errOf(j) {
  if (!j) return '';
  if (j.error && typeof j.error === 'string') return j.error;
  if (j.error && j.error.message) return j.error.message;
  if (j.msg) return String(j.msg);
  return '';
}
