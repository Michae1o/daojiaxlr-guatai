/* llmFetch.js —— 「真正发出去那一下」只住在这里（src/llm/）。
 *
 * 为什么不放 `src/data/`：构建检查 `构建检查` 第 ① 条要求
 *   换算逻辑（地址 / 头 / 正文形状）留在 data/llmEndpoint.js，发请求这一下搬到本目录 ——
 *
 * 选地址的规矩（2026-10-22，智谱那件事）：
 *   · 网页版 / 安卓 WebView（没有 window.__TAURI__）⇒ 只用本站中转（官方地址那边浏览器过不了预检）
 *   · 桌面 exe（有 __TAURI__，走 Rust 发请求）⇒ 先直连官方（Key 不经过任何别处），
 *     **直连在网络层失败时自动退回中转再试一次** —— 那台机器要是还有别的拦法，也照样能解卦。
 *   · HTTP 4xx/5xx 属于「连上了但被拒」（Key 错、没余额），**不换地址**，直接把服务商的原话报上去。
 */
import { endpoint, headers, payload, IS_TAURI, RELAY } from '../data/llmEndpoint.js';

var ZHIPU = /^https?:\/\/open\.bigmodel\.cn\//i;

function relayOnly(s) {
  var b = (RELAY + String((s && s.base) || '').replace(ZHIPU, '')).replace(/\/+$/, '');
  var anth = /\/anthropic(\/|$)/i.test(b);
  return { url: b + (anth ? '/v1/messages' : '/chat/completions'), proxy: false, anth: anth, base: b, s: s };
}

export function candidates(s) {
  var first = endpoint(s);
  if (IS_TAURI && s && s.wire !== 'proxy' && ZHIPU.test(String(s.base || ''))) return [first, relayOnly(s)];
  return [first];
}

export function fetchLLM(s, msgs, stream, maxTokens) {
  var list = candidates(s), i = 0;
  function one() {
    var ep = list[i];
    return fetch(ep.url, {
      method: 'POST', headers: headers(s, ep),
      body: JSON.stringify(payload(s, msgs, stream, maxTokens))
    }).catch(function (err) {
      if (++i < list.length) return one();
      throw err;
    });
  }
  return one();
}
