/* McpSection.jsx —— 设置页「小智 · MCP」一节的 DOM；状态/日志都来自 data/mcpBridge.js（subscribe）。
 * 类名复用 legacy.css 已有的（stcard / stf / strow / sbtn / hint），不新增样式表。 */
import { useEffect, useRef, useState } from 'react';
import { McpBridge, MCP_TOOLS } from '../data/mcpBridge.js';

const STATE_TXT = {
  idle: ['未连接', '填好接入点地址，点「连接」就挂上去了。'],
  connecting: ['正在连接…', '连上之后小智那边就能看见下面这几个工具。'],
  online: ['在线 · 等小智调用', '这一条连接是你这台机器主动连出去的，不用开别的程序。'],
  retry: ['断线，正在重连', '网络断了或对面重启了；退避重连 1s→60s，不用管。'],
  error: ['出错了', '看下面的日志，多半是地址写错或不是 ws/wss。'],
  gaveup: ['自动连接已停', '开机自动试了 3 次没连上就不再请求了；要用时点「连接」，或先检查地址对不对。'],
  stopped: ['已断开', '点「连接」可以重新挂上去。'],
};

export default function McpSection() {
  const [st, setSt] = useState(() => McpBridge.status());
  const [logs, setLogs] = useState(() => McpBridge.logsSnapshot());
  const [ep, setEp] = useState(() => McpBridge.cfg.endpoint || '');
  const logRef = useRef(null);

  useEffect(() => McpBridge.subscribe((snap) => {
    setSt(snap.status);
    setLogs(snap.logs);
  }), []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

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
        <label htmlFor="mcpEndpoint">小智 MCP 接入点</label>
        <div className="strow">
          <input type="text" id="mcpEndpoint" spellCheck="false" autoComplete="off"
            value={ep} placeholder="wss://api.xiaozhi.me/mcp/?token=…"
            onChange={(e) => setEp(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') McpBridge.connect(ep); }} />
          <button className="sbtn pri" type="button" id="mcpSave"
            onClick={() => McpBridge.connect(ep)}>保存并连接</button>
        </div>
        <div className="hint">
          地址在哪儿拿：小智控制台对应智能体的「MCP接入点」（形如 <code>wss://…/mcp/?token=…</code>）；
          自建 xiaozhi-esp32-server 的话，用 mcp-endpoint-server 打印的
          <code>ws://局域网IP:8004/mcp_endpoint/mcp/?token=…</code>，并在智控台把「MCP接入点」勾上。
          这条地址等于权限，别贴到公开的地方。
        </div>
      </div>

      <div className="hint" style={{ marginTop: '14px' }}>
        挂上之后，小智能调用这几个工具（判据全在本机算，不出网）：
        {MCP_TOOLS.map((t) => <div key={t.name} style={{ marginTop: '4px' }}>· <code>{t.name}</code>　{t.description.split('。')[0]}。</div>)}
      </div>

      <div className="hint" style={{ marginTop: '14px' }}>
        本次已回包 {st.calls} 次{st.attempt ? `　·　重连尝试 ${st.attempt} 次` : ''}
        {st.lastError ? `　·　最近错误：${st.lastError}` : ''}
      </div>

      <div ref={logRef} id="mcpLog"
        style={{
          marginTop: '10px', maxHeight: '190px', overflowY: 'auto', padding: '10px 12px',
          border: '1px solid currentColor', borderRadius: '10px', opacity: 0.85,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '12px',
          lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
        {logs.length === 0
          ? '（还没有日志）'
          : logs.map((l, i) => (
            <div key={i}>{l.ts}　{l.level === 'err' ? '✗' : l.level === 'warn' ? '!' : l.level === 'ok' ? '✓' : '·'}　{l.text}</div>
          ))}
      </div>
    </>
  );
}
