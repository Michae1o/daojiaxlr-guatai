/* gen-corpus.mjs —— 把 corpus/ 下的体系文档打成 src/corpus.js（唯一真源＝那些 .md）
 * 用法：node tools/gen-corpus.mjs
 * 说明：语料是给人读的 markdown，同时也是解卦提示词与「依据」页的取用来源；
 *       打包成 JS 是为了让 vite / tauri 两端都能直接 import，不必运行时读文件。
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dir = path.join(root, 'apps/shared-judgment/corpus');
const out = path.join(root, 'apps/shared-judgment/src/corpus.js');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
const items = files.map(f => {
  const text = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
  const id = f.replace(/\.md$/, '');
  const first = text.split('\n').find(l => l.startsWith('# ')) || ('# ' + id);
  const title = first.replace(/^#\s*/, '').trim();
  const heads = [...text.matchAll(/^##\s+(.+)$/gm)].map(m => m[1].trim());
  return { id, file: f, title, chars: text.replace(/\s/g, '').length, heads, text };
});

const header = '/* corpus.js —— 由 tools/gen-corpus.mjs 从 corpus/*.md 生成，请由工具生成，不要手改。\n'
  + ' * 这就是开源版判据的真源：解卦提示词（prompt.js）与依据页都从这里取。\n'
  + ' * 生成时间：' + new Date().toISOString().slice(0, 10) + '，共 ' + items.length + ' 份。\n'
  + ' */\n';
const body = 'export const CORPUS = ' + JSON.stringify(items, null, 1) + ';\n\n'
  + 'export const CORPUS_MAP = Object.fromEntries(CORPUS.map(c => [c.id, c]));\n\n'
  + '/* 取某一份；取不到返回 null（调用方要自己判） */\n'
  + 'export function doc(id) { return CORPUS_MAP[id] || null; }\n\n'
  + '/* 按小节标题找：返回 [{id,title,head,text}] —— 给「依据」页按需检索用 */\n'
  + 'export function sections(kw) {\n'
  + '  var q = String(kw || \'\');\n'
  + '  var out = [];\n'
  + '  CORPUS.forEach(function (c) {\n'
  + '    var parts = c.text.split(/^##\\s+/m);\n'
  + '    parts.forEach(function (p, i) {\n'
  + '      if (i === 0) return;\n'
  + '      var nl = p.indexOf(\'\\n\');\n'
  + '      var head = (nl < 0 ? p : p.slice(0, nl)).trim();\n'
  + '      var bodyTx = (nl < 0 ? \'\' : p.slice(nl + 1)).trim();\n'
  + '      if (!q || head.indexOf(q) >= 0 || bodyTx.indexOf(q) >= 0) {\n'
  + '        out.push({ id: c.id, title: c.title, head: head, text: bodyTx });\n'
  + '      }\n'
  + '    });\n'
  + '  });\n'
  + '  return out;\n'
  + '}\n';

fs.writeFileSync(out, header + body, 'utf8');
console.log('写入 ' + path.relative(root, out) + '：' + items.length + ' 份，'
  + items.reduce((a, b) => a + b.chars, 0) + ' 字');
