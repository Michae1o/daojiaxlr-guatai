/* McpSection.jsx —— 设置页「MCP接入」一节的 DOM；状态来自 data/mcpBridge.js（subscribe）。
 * 类名复用 legacy.css 已有的（stcard / stf / strow / sbtn），不新增样式表。
 *
 * 要求：把「地址怎么拿」的长说明、四个工具的清单、回包计数/最近错误那一行、
 * 以及日志框都从界面撤掉（只留状态卡 + 接入点输入 + 连接按钮）。
 * ⚠ 只是不显示：桥本身照旧跑，connect / 重连 / 工具调用 / 日志（内存里仍然记着，供自检读）都不动。
 *   以后要排查问题，仍可用宿主自检读 window.__xlrMcp.logsSnapshot()。 */
import { useEffect, useState } from 'react';
import { McpBridge } from '../data/mcpBridge.js';

const STATE_TXT = {
  idle: ['未连接', '填好接入点地址，点「连接」就挂上去了。'],
  connecting: ['正在连接…', '连上之后对面就能调用这几个工具。'],
  online: ['在线 · 等调用', '这一条连接是你这台机器主动连出去的，不用开别的程序。'],
  retry: ['断线，正在重连', '网络断了或对面重启了；退避重连 1s→60s，不用管。'],
  error: ['出错了', '多半是地址写错或不是 ws/wss；改好再点「连接」。'],
  gaveup: ['自动连接已停', '开机自动试了 3 次没连上就不再请求了；要用时点「连接」，或先检查地址对不对。'],
  stopped: ['已断开', '点「连接」可以重新挂上去。'],
};

export default function McpSection() {
  const [st, setSt] = useState(() => McpBridge.status());
  const [ep, setEp] = useState(() => McpBridge.cfg.endpoint || '');

  useEffect(() => McpBridge.subscribe((snap) => {
    setSt(snap.status);
  }), []);

  const online = st.state === 'online';
  const busy = st.state === 'connecting';
  const [tt, sub] = STATE_TXT[st.state] || STATE_TXT.idle;

  return (
    <>
      <div className={'stcard' + (online ? ' ok' : '')} id="mcpCard">
        <span className="dot"></span>
        <div className="m">
          <b>{tt}</b>
          <p>{sub}</p>
        </div>
        <button className="sbtn" type="button" id="mcpToggle"
          onClick={() => (online || busy ? McpBridge.disconnect(true) : McpBridge.connect(ep))}>
          {online || busy ? '断开' : '连接'}
        </button>
      </div>

      <div className="stf" style={{ marginTop: '18px' }}>
        <label htmlFor="mcpEndpoint">平台 MCP 接入点（连出去）</label>
        <div className="strow">
          <input type="text" id="mcpEndpoint" spellCheck="false" autoComplete="off"
            value={ep} placeholder="wss://api.xiaozhi.me/mcp/?token=…"
            onChange={(e) => setEp(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') McpBridge.connect(ep); }} />
          <button className="sbtn pri" type="button" id="mcpSave"
            onClick={() => McpBridge.connect(ep)}>保存并连接</button>
        </div>
      </div>
    </>
  );
}
