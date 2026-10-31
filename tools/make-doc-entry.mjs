/* make-doc-entry.mjs —— 生成 Vite 的文档入口（把组装产物拆成「骨架 + 两个模块输入」）
 *
 * 链路：
 *   ① tools/assemble-desktop.mjs --append <shell.js> 产出 dist/新版-现代.html
 *      （拼好的整份文档，尾部带一个 <script type="module"> 外壳块）
 *   ② 本脚本：把那个外壳块剥掉，得到骨架，再在 </body> 前挂上两件 Vite 的输入：
 *        <link rel="stylesheet" href="/src/tailwind.css">            ← Tailwind
 *        <script type="module" src="/shell-dist/shell.js"></script>  ← 外壳模块
 *      同时在 </head> 前内联 src/data/skinPrepaint.js（首屏预绘：皮肤 + 明暗，
 *      必须赶在第一帧之前落到 html 上，否则会先按默认皮肤画一遍再切）。
 *      ⇒ 写成 apps/desktop-web/doc-entry.html（入口，不入库）
 *   ③ Vite（apps/desktop-web/vite.doc.config.mjs）以它为入口产出 dist/新版-现代.html 单文件。
 *
 * 用法：node tools/make-doc-entry.mjs [--final <html>] [--out <entry>]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const DIST = path.join(REPO, 'apps', 'desktop-web', 'dist');

const argv = process.argv.slice(2);
const pick = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const FINAL = pick('--final', path.join(DIST, '新版-现代.html'));
const OUT = pick('--out', path.join(REPO, 'apps', 'desktop-web', 'doc-entry.html'));

const sha16 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const finalDoc = fs.readFileSync(FINAL, 'utf8');

/* ---- ① 定位并剥掉「外壳追加块」= 最后一个 <script type="module"> … </script> ---- */
const MARK = '<script type="module">';
const n = finalDoc.split(MARK).length - 1;
if (n !== 1) { console.error('✗ 外壳块不唯一：<script type="module"> 出现 ' + n + ' 次（期望 1）'); process.exit(3); }
const at = finalDoc.lastIndexOf(MARK);
const close = finalDoc.indexOf('</script>', at);
if (close < 0) { console.error('✗ 找不到外壳块的 </script>'); process.exit(3); }
const end = close + '</script>'.length;
const shellBlock = finalDoc.slice(at, end);
const skeleton = finalDoc.slice(0, at) + finalDoc.slice(end);

/* */
if (shellBlock.indexOf('外壳：React 启动/路由/加载') < 0) { console.error('✗ 剥掉的块不像外壳块（缺特征串）'); process.exit(3); }
if (skeleton.indexOf('</body>') < 0 || skeleton.indexOf(MARK) >= 0) { console.error('✗ 骨架不干净（还有 module 脚本或没有 </body>）'); process.exit(3); }




/* ---- ② 首屏预绘（）＋ 在 </body> 前挂上 Vite 的两个输入 ---- */
/* （2026-10-14，已定「路线 1」）：首屏预绘（皮肤 + 明暗）内联进文档。
   ⚠ 为什么必须内联：皮肤/明暗要在**画第一帧之前**定到 html 上；本仓 React 产物全是 defer 模块、赶不上
     第一帧 ⇒ 不内联就会先按默认皮肤画一遍再切（看得见的闪一下）。
   ⚠ **位置 = `</body>` 之前、紧挨着那两个标签**（2026-10-14 铜古改为这里，原在 `</head>` 前）：
     legacy 的 `32-script`（body 中段）里那句 `apply(cur)` 也在解析期跑，而**它那份 SKINS 表里没有本仓
     新增的皮肤** ⇒ 它见到 'tonggu' 会判未知、`apply('bw')`，把预绘设好的皮肤**盖回去**
     （实测：预置 `xlr-skin=tonggu` 重开 ⇒ 预绘写了 tonggu、最终 `html[data-skin]` 却是 bw）。
     放 body 末尾就**晚于**它 ⇒ 本仓赢；同时仍是解析期（`readyState = loading`）⇒ 依然赶在第一帧之前。
   */
const PREP_SRC = path.join(REPO, 'apps', 'desktop-web', 'src', 'data', 'skinPrepaint.js');
if (!fs.existsSync(PREP_SRC)) { console.error('✗ 找不到首屏预绘脚本（）：' + path.relative(REPO, PREP_SRC) + '　⇒ 先跑 node tools/extract-skin-prepaint.mjs'); process.exit(3); }
const prepSrc = fs.readFileSync(PREP_SRC, 'utf8');
if (prepSrc.indexOf('window.__xlrPrepaint') < 0) { console.error('✗ 首屏预绘脚本缺特征串 window.__xlrPrepaint'); process.exit(3); }
if (/<\/script/i.test(prepSrc)) { console.error('✗ 首屏预绘脚本里含 </script ⇒ 内联会提前闭合'); process.exit(3); }
const TAG_PRE = '<script>\n' + prepSrc + '</script>\n';

/* 预绘内联在 **`</head>` 之前**（一处）：
   ⚠ 它比 legacy 的 `32-script`（body 中段那句 apply(cur)）**早**，所以读到的 storage 是干净的
     （预绘脚本自带的 MutationObserver 守护）负责把 legacy 随后的覆盖改回来。
   */
const HEAD_END = skeleton.indexOf('</head>');
if (HEAD_END < 0) { console.error('✗ 骨架里找不到 </head>'); process.exit(3); }
const withPre = skeleton.slice(0, HEAD_END) + TAG_PRE + skeleton.slice(HEAD_END);

const ENTRY_AT = withPre.lastIndexOf('</body>');
if (ENTRY_AT < 0) { console.error('✗ 骨架里找不到 </body>'); process.exit(3); }
const TAG_CSS = '<link rel="stylesheet" href="/src/tailwind.css">';
const TAG_JS = '<script type="module" src="/shell-dist/shell.js"></script>';
const entry = withPre.slice(0, ENTRY_AT) + TAG_CSS + '\n' + TAG_JS + '\n' + withPre.slice(ENTRY_AT);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, entry, 'utf8');

console.log('文档入口生成（make-doc-entry.mjs）');
console.log('  输入 = ' + path.relative(REPO, FINAL) + '  ' + Buffer.byteLength(finalDoc, 'utf8') + ' B  sha16=' + sha16(finalDoc));
console.log('  剥掉外壳块：' + Buffer.byteLength(shellBlock, 'utf8') + ' B');
console.log('  骨架：' + Buffer.byteLength(skeleton, 'utf8') + ' B');
console.log('  挂载：tailwind.css + 首屏预绘（内联 ' + Buffer.byteLength(prepSrc, 'utf8') + ' B，；自带 MutationObserver 守护）+ shell-dist/shell.js');
console.log('  输出 = ' + path.relative(REPO, OUT) + '  ' + Buffer.byteLength(entry, 'utf8') + ' B  sha16=' + sha16(entry));
