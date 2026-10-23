/*
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
    { k: 'ollama', n: '本地 Ollama', base: 'http://localhost:11434/v1', model: 'qwen2.5:7b',
      note: '不联网、不用 Key', local: 1 },
    { k: 'custom', n: '自定义', base: '', model: '', note: '自己加一家（先起名）' }
  ];
var FALLBACK = {
    deepseek: ['deepseek-chat', 'deepseek-reasoner'],
    zhipu: ['glm-5.3-flash', 'glm-5.3-flashx', 'glm-5.3'],
    silicon: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-7B-Instruct', 'THUDM/glm-4-9b-chat'],
    kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'kimi-latest'],
    openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    ollama: ['qwen2.5:7b', 'qwen2.5:14b', 'llama3.1:8b'],
    custom: []
  };
var CUSTOM_KEY = 'xlr-llm-customs';
var PROV_KEY = 'xlr-prov';
var SVC_KEY = 'xlr-llm-svcs';
function loadCustoms() { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]') || []; } catch (e) { return []; } }
function saveCustoms(a) { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(a)); } catch (e) { } }
function loadProv() { try { return localStorage.getItem(PROV_KEY) || ''; } catch (e) { return ''; } }
function saveProv(k) { try { localStorage.setItem(PROV_KEY, k); } catch (e) { } }
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
      // 站点域名对得上就算同一家（用户可能把地址又粘了一遍，别指望完全相等）
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
  load, save, loadSvcs, saveSvcs, loadCustoms, saveCustoms, loadProv, saveProv,
  pvValid, guessProv, missing, apiURL, hdr, esc, svcGet, svcPut,
};
