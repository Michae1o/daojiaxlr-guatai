/* settingsCore.js —— **由工具生成，勿手改**（S2/C2）
   规矩：**提取不重写** —— 下面每一段都是从源文件**逐字节切片**搬过来的原文；工具每次运行都会
   共用/边界：本篇的 SKIN_KEY 与 skinsCore.js 的 KEY 是**同一个键名的两份字面量**（各按自己的源段逐字提取）；
   源 sha16 = 0b71b790ca1ec608
*/
/* eslint-disable */
var LLM_KEY = 'xlr-llm';
var CASE_KEY = 'xlr-cases';
var SKIN_KEY = 'xlr-skin';
var DEF = { wire: 'direct', base: 'https://api.deepseek.com', model: 'deepseek-chat',
              key: '', temp: 0.5, proxy: 'http://127.0.0.1:8788' };
var PROVS = [
    { k: 'deepseek', n: 'DeepSeek', base: 'https://api.deepseek.com', model: 'deepseek-chat',
      note: '便宜、稳，实测可直接连', rec: 1, url: 'https://platform.deepseek.com/api_keys' },
    { k: 'zhipu', n: '智谱 GLM', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-5.3-flash',
      note: '新号送 2000 万 tokens · 推荐先试', url: 'https://open.bigmodel.cn/login' },
    { k: 'silicon', n: '硅基流动', base: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3',
      note: '模型多、常有赠额', url: 'https://cloud.siliconflow.cn/account/ak' },
    { k: 'kimi', n: 'Kimi（月之暗面）', base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k',
      note: '长文写作强', url: 'https://platform.moonshot.cn/console/api-keys' },
    { k: 'openai', n: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini',
      note: '要能访问外网', url: 'https://platform.openai.com/api-keys' },
    { k: 'minimax', n: 'MiniMax', base: 'https://api.minimax.cn/v1', model: 'MiniMax-M3.1-Flash',
      note: '长文与角色扮演强', url: 'https://platform.minimax.cn/user-center' },
    { k: 'gemini', n: 'Gemini', base: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash',
      note: '要能访问外网', url: 'https://aistudio.google.com/apikey' },
    { k: 'custom', n: '自定义', base: '', model: '', note: '自己加一家（先起名）' }
  ];
var FALLBACK = {
    deepseek: ['deepseek-chat', 'deepseek-reasoner'],
    zhipu: ['glm-5.3-flash', 'glm-5.3-flashx', 'glm-5.3'],
    silicon: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-7B-Instruct', 'THUDM/glm-4-9b-chat'],
    kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'kimi-latest'],
    openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    minimax: ['MiniMax-M3.1-Flash', 'MiniMax-M3.1', 'MiniMax-Text-01', 'abab6.5s-chat'],
    gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    custom: []
  };
var CUSTOM_KEY = 'xlr-llm-customs';
var PROV_KEY = 'xlr-prov';
var SVC_KEY = 'xlr-llm-svcs';
function loadCustoms() { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]') || []; } catch (e) { return []; } }
function saveCustoms(a) { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(a)); } catch (e) { } }
function loadProv() { try { return localStorage.getItem(PROV_KEY) || ''; } catch (e) { return ''; } }
function saveProv(k) { try { localStorage.setItem(PROV_KEY, k); } catch (e) { } }

/*
   ⚠ 只清「模型配置」这四个键：llm（当前配置）/ customs（自定义服务商）/ prov（选中哪家）/ svcs（各家分存的 Key）。
   卦例本（xlr-cases）与皮肤（xlr-skin）**不动** —— 那是作品与外观，不是"配置"。 */
function clearAll() {
  try {
    var ks = [LLM_KEY, CUSTOM_KEY, PROV_KEY, SVC_KEY];
    for (var i = 0; i < ks.length; i++) localStorage.removeItem(ks[i]);
  } catch (e) { }
}
function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(LLM_KEY) || '{}') || {}; } catch (e) { s = {}; }
    for (var k in DEF) if (s[k] === undefined) s[k] = DEF[k];
    return s;
  }
function save(s) { try { localStorage.setItem(LLM_KEY, JSON.stringify(s)); } catch (e) { } }
function loadSvcs() { try { return JSON.parse(localStorage.getItem(SVC_KEY) || '{}') || {}; } catch (e) { return {}; } }
function saveSvcs(m) { try { localStorage.setItem(SVC_KEY, JSON.stringify(m)); } catch (e) { } }
function pvValid(k) {
    if (!k) return false;
    for (var i = 0; i < PROVS.length; i++) if (PROVS[i].k === k) return true;
    var ok = false;
    loadCustoms().forEach(function (x) { if (x.k === k) ok = true; });
    return ok;
  }
function guessProv(s) {
    var b = String(s.base || '').toLowerCase();
    for (var i = 0; i < PROVS.length; i++) {
      var pb = String(PROVS[i].base || '').toLowerCase();
      if (!pb || !b) continue;
      var host = pb.replace(/^https?:\/\//, '');
      if (b === pb || b.indexOf(host) >= 0) return PROVS[i].k;
    }
    return 'custom';
  }
function missing(s) {
    if (!s.base) return '还没选服务商，接口地址是空的。';
    if (!s.model) return '还没挑模型。';
    if (s.wire === 'direct' && !s.key && !/localhost|127\.0\.0\.1/.test(s.base)) return '直连需要 API Key。';
    return '';
  }
function svcGet(k) { var m = loadSvcs(); return m[k] || null; }
function svcPut(k, v) { var m = loadSvcs(); m[k] = v; saveSvcs(m); }
function apiURL(s) {
    if (s.wire === 'proxy') return { url: String(s.proxy || '').replace(/\/+$/, '') + '/proxy', proxy: true };
    return { url: String(s.base || '').replace(/\/+$/, '') + '/chat/completions', proxy: false };
  }
function hdr(s, proxy) {
    var h = { 'Content-Type': 'application/json' };
    if (!proxy) h['Authorization'] = 'Bearer ' + s.key;
    return h;
  }
function esc(x) {
    return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

export const SettingsCore = {
  KEYS: { llm: LLM_KEY, cases: CASE_KEY, skin: SKIN_KEY, customs: CUSTOM_KEY, prov: PROV_KEY, svcs: SVC_KEY },
  DEF, PROVS, FALLBACK,
  load, save, loadSvcs, saveSvcs, loadCustoms, saveCustoms, loadProv, saveProv, clearAll,
  pvValid, guessProv, missing, apiURL, hdr, esc, svcGet, svcPut,
};
