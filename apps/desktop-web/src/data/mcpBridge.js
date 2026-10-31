/* mcpBridge.js —— 桌面 App 里的「小智 · MCP」桥。
 *
 * 重写：工具表与算法全部搬到 `@xlr/shared-judgment` 的 mcp-tools.js（内核），
 * 这里只剩「怎么连、怎么重连、日志怎么给设置页看」——也就是一条传输。
 * 同一份内核的另一批出口在仓根 `mcp/`：stdio（本地客户端）、HTTP（通用/远程）、
 * 小智 WS（就是这个文件的 Node 版）。改工具只需改内核，三个出口自动同步。
 *
 * 约束（照旧）：
 *   · 不碰判据：一切计算走内核。
 *   · 不碰 DOM / 样式：状态经 subscribe 抛给 UI。
 *   · 不自动出网：填了接入点并点「连接」（或上次退出时是开着的）才连。
 *   · 开机自动连接最多 3 次（BOOT_MAX_ATTEMPTS），之后必须手动重来；
 *     在线 ≥ 5s 后断开的不受此限。
 *   · 断线退避重连 1s→60s，失败原因进日志。
 */
import { MCP_TOOLS, listTools, callMcpTool, createCastStore } from '@xlr/shared-judgment';

export { MCP_TOOLS };

const CFG_KEY = 'xlr-mcp';
const LOG_MAX = 200;
const BACKOFF = [1, 2, 4, 8, 15, 30, 60];
/* 开机自动连接的上限：试到这个次数还没连上就不再请求 */
const BOOT_MAX_ATTEMPTS = 3;
/* 在线保持这么久之后才断 ⇒ 当作「正常在用」，断线重连不受 3 次上限约束 */
const STABLE_ONLINE_MS = 5000;

/* ---------------- 配置存哪儿 ---------------- */
/* 与全仓一致：只碰 localStorage；Node 里跑（自测）时退化成内存，方便测试。 */
const mem = {};
const store = {
  get(k) {
    try { if (typeof localStorage !== 'undefined') return localStorage.getItem(k); } catch (e) { /* ignore */ }
    return k in mem ? mem[k] : null;
  },
  set(k, v) {
    try { if (typeof localStorage !== 'undefined') { localStorage.setItem(k, v); return; } } catch (e) { /* ignore */ }
    mem[k] = v;
  },
};

const DEFAULT_CFG = { endpoint: '', enabled: false, autostart: true, detail: false };

function readCfg() {
  try {
    const raw = store.get(CFG_KEY);
    if (!raw) return { ...DEFAULT_CFG };
    const o = JSON.parse(raw);
    return { ...DEFAULT_CFG, ...(o && typeof o === 'object' ? o : {}) };
  } catch (e) {
    return { ...DEFAULT_CFG };
  }
}

/* ---------------- 桥本体 ---------------- */

const PROTOCOLS = ['2024-11-05', '2025-03-26', '2025-06-18'];

class McpBridgeClass {
  constructor() {
    this.cfg = readCfg();
    this.ws = null;
    this.state = 'idle';       /* idle | connecting | online | retry | stopped | error | gaveup */
    this.attempt = 0;
    this.lastError = '';
    this.connectedAt = 0;
    this.timer = null;
    this.calls = 0;
    this.logs = [];
    this.subs = new Set();
    this.stoppedByUser = false;
    this.autoSeq = false;     /* 当前这串连接是不是「开机自动」发起的（受 3 次上限约束） */
    this.autoTries = 0;       /* 这串连接里已经真正往接入点发的次数 */
    this.onlineAt = 0;        /* 本次连上的时间点（判断断得快不快） */
    this.Transport = (typeof WebSocket !== 'undefined' ? WebSocket : null);
    /* 卦 id 会话：同一次连着用同一个，断开也不清（同一台机器上接着问还是那一卦） */
    this.castStore = createCastStore();
  }

  /* 测试/特殊宿主可换掉 WebSocket 实现 */
  useTransport(Ctor) { this.Transport = Ctor; }

  status() {
    return {
      state: this.state, endpoint: this.cfg.endpoint, enabled: this.cfg.enabled,
      attempt: this.attempt, lastError: this.lastError, connectedAt: this.connectedAt,
      calls: this.calls, tools: listTools({}).length,
      autoSeq: this.autoSeq, autoTries: this.autoTries, maxAutoTries: BOOT_MAX_ATTEMPTS,
    };
  }

  logsSnapshot() { return this.logs.slice(); }

  subscribe(fn) {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  emit() {
    const snap = { status: this.status(), logs: this.logs.slice() };
    this.subs.forEach((fn) => { try { fn(snap); } catch (e) { /* UI 出错不影响桥 */ } });
  }

  log(level, text) {
    const t = new Date();
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    const ss = String(t.getSeconds()).padStart(2, '0');
    this.logs.push({ at: Date.now(), level, text, ts: `${hh}:${mm}:${ss}` });
    if (this.logs.length > LOG_MAX) this.logs.splice(0, this.logs.length - LOG_MAX);
    this.emit();
  }

  saveCfg(patch) {
    this.cfg = { ...this.cfg, ...(patch || {}) };
    try { store.set(CFG_KEY, JSON.stringify(this.cfg)); } catch (e) { /* ignore */ }
    this.emit();
    return this.cfg;
  }

  /* 应用启动时调一次：上次是开着的、且填了地址 ⇒ 自己连上（最多试 BOOT_MAX_ATTEMPTS 次） */
  boot() {
    if (this.cfg.enabled && this.cfg.endpoint) {
      this.autoSeq = true;
      this.autoTries = 0;
      this.attempt = 0;
      this.log('info', `按上次的设置自动连接…（最多试 ${BOOT_MAX_ATTEMPTS} 次）`);
      this.connect('', { internal: true });
    } else {
      this.log('info', 'MCP 接入未开启（设置 → 小智 · MCP）');
    }
    return this;
  }

  /* 手动点「连接」：解除 3 次上限，从头再数；opts.internal 只给重连自己用 */
  connect(endpoint, opts) {
    const internal = !!(opts && opts.internal);
    if (endpoint) this.saveCfg({ endpoint: String(endpoint).trim(), enabled: true });
    if (!this.cfg.endpoint) { this.state = 'error'; this.lastError = '没填接入点地址'; this.emit(); return; }
    if (!this.Transport) { this.state = 'error'; this.lastError = '这个环境没有 WebSocket'; this.emit(); return; }

    if (!internal) {
      /* 用户手点的：算一次新开始，不受上次「已试满 3 次」的限制 */
      this.autoSeq = false;
      this.autoTries = 0;
      this.attempt = 0;
    } else if (this.autoSeq) {
      if (this.autoTries >= BOOT_MAX_ATTEMPTS) { this.stopAuto('已到上限'); return; }
      this.autoTries += 1;
    }

    this.stoppedByUser = false;
    this.clearTimer();
    this.closeSocket();

    this.state = 'connecting';
    this.emit();
    this.log('info', '正在连接 ' + this.maskEndpoint(this.cfg.endpoint));

    let ws;
    try {
      ws = new this.Transport(this.cfg.endpoint);
    } catch (e) {
      this.fail('地址不合法：' + (e && e.message ? e.message : e));
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.state = 'online';
      this.attempt = 0;
      this.onlineAt = Date.now();
      this.connectedAt = Date.now();
      this.lastError = '';
      this.saveCfg({ enabled: true });
      this.log('ok', '已连上接入点，等小智调用');
    };
    ws.onmessage = (ev) => this.onMessage(ev && ev.data !== undefined ? ev.data : ev);
    ws.onerror = () => { /* 随后必有一次 close，错误在 close 里统一处理 */ };
    ws.onclose = (ev) => {
      const wasOnline = this.state === 'online';
      /* 稳稳连过一阵才算「在用」：此时把自动计次清零，之后断线可以正常重连 */
      if (wasOnline && this.onlineAt && Date.now() - this.onlineAt >= STABLE_ONLINE_MS) this.autoTries = 0;
      this.ws = null;
      if (this.stoppedByUser) { this.state = 'idle'; this.emit(); return; }
      this.lastError = '连接断开' + (ev && ev.code ? '（code ' + ev.code + '）' : '');
      this.log(wasOnline ? 'warn' : 'err', this.lastError + '，准备重连');
      this.scheduleReconnect();
    };
  }

  disconnect(user) {
    this.stoppedByUser = true;
    this.clearTimer();
    this.closeSocket();
    this.autoSeq = false;
    this.autoTries = 0;
    if (user) this.saveCfg({ enabled: false });
    this.state = 'idle';
    this.attempt = 0;
    this.emit();
    if (user) this.log('info', '已断开');
  }

  clearTimer() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } }
  closeSocket() {
    const w = this.ws;
    this.ws = null;
    if (w) { try { w.onclose = null; w.close(); } catch (e) { /* ignore */ } }
  }

  /* 开机自动连接试满 BOOT_MAX_ATTEMPTS 次 ⇒ 停手，之后不再往接入点发任何请求 */
  stopAuto(reason) {
    this.clearTimer();
    this.autoSeq = false;
    this.state = 'gaveup';
    this.lastError = `接入点没连上（已试 ${BOOT_MAX_ATTEMPTS} 次）` + (reason && reason !== '已到上限' ? '：' + reason : '');
    this.log('err', `自动连接已停：试了 ${BOOT_MAX_ATTEMPTS} 次都没连上，不再重试（要用请到设置 → 小智 · MCP 手动「连接」）`);
    this.emit();
  }

  scheduleReconnect() {
    this.clearTimer();
    if (this.autoSeq && this.autoTries >= BOOT_MAX_ATTEMPTS) { this.stopAuto('已到上限'); return; }
    const sec = BACKOFF[Math.min(this.attempt, BACKOFF.length - 1)];
    this.attempt += 1;
    this.state = 'retry';
    this.emit();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.stoppedByUser) return;
      if (this.autoSeq && this.autoTries >= BOOT_MAX_ATTEMPTS) { this.stopAuto('已到上限'); return; }
      this.log('info', this.autoSeq
        ? `第 ${this.autoTries + 1}/${BOOT_MAX_ATTEMPTS} 次尝试连接…`
        : `第 ${this.attempt} 次重连…`);
      const ep = this.cfg.endpoint;
      this.state = 'connecting';
      this.emit();
      this.connect(ep, { internal: true });
    }, sec * 1000);
  }

  fail(msg) {
    this.state = 'error';
    this.lastError = msg;
    this.log('err', msg);
  }

  maskEndpoint(u) {
    return String(u || '').replace(/(token=)([^&]{4})[^&]*/i, (m, a, b) => a + b + '****');
  }

  /* 一条 WS 消息 = 一条 JSON-RPC 报文（也容忍换行拼在一起的多条） */
  onMessage(data) {
    let text = data;
    if (typeof text !== 'string') {
      if (text && typeof text.text === 'function') { text.text().then((t) => this.onMessage(t)); return; }
      try { text = String(text); } catch (e) { return; }
    }
    text.split('\n').forEach((line) => {
      const s = line.trim();
      if (!s) return;
      let msg;
      try { msg = JSON.parse(s); } catch (e) { this.log('err', '收到不是 JSON 的报文：' + s.slice(0, 80)); return; }
      this.handle(msg).catch((e) => {
        this.log('err', '处理出错：' + (e && e.message ? e.message : e));
      });
    });
  }

  send(obj) {
    const w = this.ws;
    if (!w || w.readyState !== 1) { this.log('err', '连接不可用，回包丢失：' + (obj && obj.id)); return; }
    try { w.send(JSON.stringify(obj)); } catch (e) { this.log('err', '发送失败：' + (e && e.message ? e.message : e)); }
  }

  async handle(msg) {
    if (!msg || typeof msg !== 'object') return;
    const id = msg.id;
    const method = msg.method;
    const isNote = id === undefined || id === null;

    if (method === 'initialize') {
      const asked = msg.params && msg.params.protocolVersion;
      this.log('info', '小智握手：initialize');
      this.send({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: PROTOCOLS.indexOf(asked) >= 0 ? asked : PROTOCOLS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'xiaoliuren-guatai', version: '2.0.0' },
          instructions:
            '道家小六壬（邵一尘 · 卜法卷）起卦断卦。先 xiaoliuren_qigua 起卦，回包里有一个卦 id（gid）；'
            + '接着要细说、要专门取象，都用同一个 gid 再调，别重新起卦。问依据用 xiaoliuren_chadian。'
            + '口播保持简短：结论一句、依据两三条。凡断辞以工具返回为准，不自行发挥；民俗内容，仅供娱乐参考。',
        },
      });
      return;
    }
    if (method === 'notifications/initialized' || method === 'notifications/cancelled') return;
    if (method === 'ping') { if (!isNote) this.send({ jsonrpc: '2.0', id, result: {} }); return; }
    if (method === 'tools/list') {
      this.log('info', '小智取工具清单');
      this.send({ jsonrpc: '2.0', id, result: { tools: listTools({}) } });
      return;
    }
    if (method === 'tools/call') {
      const name = msg.params && msg.params.name;
      const args = (msg.params && msg.params.arguments) || {};
      const t0 = Date.now();
      try {
        const result = await callMcpTool(name, args, { store: this.castStore });
        this.calls += 1;
        this.log('ok', `调用 ${name}（${Date.now() - t0}ms）：${String(args.question || args.keyword || '').slice(0, 24) || '—'}`);
        this.send({ jsonrpc: '2.0', id, result });
      } catch (e) {
        const m = e && e.message ? e.message : String(e);
        this.log('err', `调用 ${name} 失败：${m}`);
        this.send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: '调用失败：' + m }], isError: true } });
      }
      return;
    }
    if (!isNote) {
      this.send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found: ' + method } });
    }
  }
}

export const McpBridge = new McpBridgeClass();

/* 调试口：控制台里 `__xlrMcp.status()` 能看到当前状态（也方便自动化验证） */
if (typeof window !== 'undefined') {
  window.__xlrMcp = McpBridge;
}
