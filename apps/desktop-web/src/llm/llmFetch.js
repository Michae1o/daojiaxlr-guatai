/* llmFetch.js —— 「真正发出去那一下」只住在这里（src/llm/）。
 *
 * 为什么不放 `src/data/`：构建检查 `构建检查` 第 ① 条要求
 *   换算逻辑（地址 / 头 / 正文形状）留在 data/llmEndpoint.js，发请求这一下搬到本目录 ——
 *
 * 地址就一个：用户填什么发什么（没有中转、没有备用地址）。
 */
import { endpoint, headers, payload } from '../data/llmEndpoint.js';

export function candidates(s) {
  return [endpoint(s)];
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
