#!/usr/bin/env node
/* assemble-desktop.mjs —— 把桌面端拼成一份单文件 HTML
 *
 * 输入（都在 apps/desktop-web 里）：
 *   src/legacy/doc-frame.html   文档外壳：head 开 / body 开 / 尾，三段用注释标记隔开
 *   src/legacy/shell.html       body 骨架（第一段注释头之后才是本体）
 *   src/styles/legacy.css       样式主体，用 /*@xlrblk:N@*\/ 分成 5 段
 *
 * 输出：
 *   dist/新版-现代.html          拼好的整份文档（各段样式分别放进 <style>）
 *   带 --append <shell.js> 时，把外壳模块作为 <script type="module"> 追加到 </body> 前
 *
 * 用法：node tools/assemble-desktop.mjs [--out <路径>] [--append <外壳模块 js>]
 *
 * 说明：块的位置照旧是「块 1/2 在 head，块 3/4 在 body 开头，块 5 在骨架之后」，
 *       按 @xlrblk 标记切段，所以你改样式加减行都不会错位。
 *       每段样式各自包一层 @layer components —— 这样每段 <style> 自身括号是配平的，
 *       下游（Vite + Tailwind）逐段解析不会报 Missing brace。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const WEB = path.join(REPO, 'apps', 'desktop-web');
const LEGACY = path.join(WEB, 'src', 'legacy');
const FRAME = path.join(LEGACY, 'doc-frame.html');
const SHELL_HTML = path.join(LEGACY, 'shell.html');
const CSS_FILE = path.join(WEB, 'src', 'styles', 'legacy.css');

const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const OUT = outIdx >= 0
  ? path.resolve(argv[outIdx + 1])
  : path.join(WEB, 'dist', '新版-现代.html');
const appIdx = argv.indexOf('--append');
const APPEND = appIdx >= 0 ? path.resolve(argv[appIdx + 1]) : null;

const lf = (s) => s.replace(/\r\n/g, '\n');
const die = (msg) => { console.error('✗ ' + msg); process.exit(3); };

/* ---- ① 文档帧：三段 ---- */
const frameRaw = lf(fs.readFileSync(FRAME, 'utf8'));
const MK1 = '<!--@head@-->\n', MK2 = '<!--@body-open@-->\n', MK3 = '<!--@tail@-->\n';
const g1 = frameRaw.indexOf(MK1), g2 = frameRaw.indexOf(MK2), g3 = frameRaw.indexOf(MK3);
if (g1 < 0 || g2 < 0 || g3 < 0 || !(g1 < g2 && g2 < g3)) die('文档帧的三段标记不全或顺序不对：' + FRAME);
const docHead = frameRaw.slice(g1 + MK1.length, g2);
const docBodyOpen = frameRaw.slice(g2 + MK2.length, g3);
const docTail = frameRaw.slice(g3 + MK3.length);

/* ---- ② 骨架：shell.html（跳过第一段注释头） ---- */
const shellRaw = lf(fs.readFileSync(SHELL_HTML, 'utf8'));
const cmtEnd = shellRaw.indexOf('-->');
if (cmtEnd < 0) die('骨架文件没有注释头：' + SHELL_HTML);
const skeleton = shellRaw.slice(cmtEnd + 3).replace(/^\n/, '').replace(/\n$/, '');
if (skeleton.length < 5000) die('骨架太短（' + skeleton.length + ' 字符）：' + SHELL_HTML);

/* ---- ③ 样式：按 @xlrblk 标记切 5 段 ---- */
const cssLfAll = lf(fs.readFileSync(CSS_FILE, 'utf8'));

/* 整份外面那层 @layer 摘掉，稍后给每段各包一层（等价：原来 5 段都在同一个 components 层里）。 */
let cssBody = cssLfAll;
{
  const m = /@layer\s+components\s*\{/.exec(cssBody);
  if (m) {
    const openEnd = m.index + m[0].length;
    const lastClose = cssBody.lastIndexOf('}');
    if (lastClose > openEnd) {
      cssBody = cssBody.slice(0, m.index) + cssBody.slice(openEnd, lastClose) + cssBody.slice(lastClose + 1);
    }
  }
}

const MARKS = [...cssBody.matchAll(/\/\*@xlrblk:(\d)@\*\//g)];
let cssBlocks;
if (MARKS.length >= 5) {
  const byIdx = {};
  MARKS.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = (i + 1 < MARKS.length) ? MARKS[i + 1].index : cssBody.length;
    byIdx[m[1]] = cssBody.slice(start, end).replace(/^\n+/, '').replace(/\n+$/, '');
  });
  cssBlocks = ['1', '2', '3', '4', '5'].map((n) => byIdx[n] || '');
  console.log('  样式：按 @xlrblk 切成 5 段，字符数 ' + cssBlocks.map((b) => b.length).join(' / '));
} else {
  console.log('  样式：没找到 @xlrblk 标记 ⇒ 整份放 head');
  cssBlocks = [cssBody.replace(/\/\*@xlrblk:\d@\*\//g, ''), '', '', '', ''];
}

/* ---- ④ 拼文档 ---- */
const S = (b) => b.trim() ? '<style>\n@layer components{\n' + b + '\n}\n</style>\n' : '';
let finalDoc = docHead + S(cssBlocks[0]) + S(cssBlocks[1]) + docBodyOpen +
  S(cssBlocks[2]) + S(cssBlocks[3]) + skeleton + '\n' + S(cssBlocks[4]) + docTail;

/* ---- ⑤ 组装期注入：记录抽屉底部按钮的样式（必须晚于上面那些样式，插在 </body> 前） ---- */
const STYLE_CHUNK = '<style id="xlr-fix-20261012">\n' +
  '/* 记录抽屉：列表页内容自己滚、底部按钮钉在面板底部；详情页不显示底部按钮。 */\n' +
  '#sdb .sdb-b{display:flex;flex-direction:column;overflow:hidden}\n' +
  '#sdb #sdbCases,#sdb #sdbRules{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain}\n' +
  '#sdb #sdbCases>*,#sdb #sdbRules>*{flex:0 0 auto}\n' +
  '#sdb .sdb-b>.sdb-foot{flex:0 0 auto;margin:12px 2px 6px}\n' +
  '#sdb .sdb-b:has(> #sdbCases > .cd) > .sdb-foot{display:none!important}\n' +
  '/* 记录列表的分组标签（只在桌面宽度 ≥561px 生效）；右端那条细线拉到列表右缘。 */\n' +
  '@media (min-width:561px){\n' +
  '  #sdb .sdb-grp{display:flex;align-items:center;gap:10px;font-size:12.5px;line-height:1.2;color:var(--dim2);letter-spacing:.08em;font-weight:600;padding:16px 2px 8px 29px}\n' +
  '  #sdb .sdb-grp::after{content:"";flex:1 1 auto;height:1px;background:currentColor;opacity:.35;margin:0 4px 1px 2px}\n' +
  '}\n' +
  '/* 自绘日历弹层：把整个详情面板抬到侧栏之上（castPanel 带 backdrop-filter 会自成层叠上下文）。 */\n' +
  '@media (min-width:561px){\n' +
  '  #castPanel{z-index:1}\n' +
  '  .cbar>.cside{z-index:0}\n' +
  '}\n' +
  '</style>\n';

{
  const at = finalDoc.indexOf('</body>');
  if (at < 0) die('注入底栏样式：找不到 </body>');
  if (finalDoc.indexOf('</body>', at + 1) >= 0) die('注入底栏样式：</body> 不唯一');
  finalDoc = finalDoc.slice(0, at) + STYLE_CHUNK + finalDoc.slice(at);
}

/* ---- ⑥ 追加外壳模块（可选） ---- */
if (APPEND) {
  const js = lf(fs.readFileSync(APPEND, 'utf8'));
  if (js.includes('</script')) die('外壳模块里含 </script 字面量，内联会截断脚本：' + APPEND);
  const appendChunk = '<script type="module">\n/* 外壳：React 启动/路由/加载（Phase 2） */\n' + js + '\n</script>\n';
  const at = finalDoc.lastIndexOf('</body>');
  if (at < 0) die('找不到 </body>，无法追加外壳模块');
  finalDoc = finalDoc.slice(0, at) + appendChunk + finalDoc.slice(at);
  console.log('  外壳模块：' + js.length + ' 字符');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, finalDoc, 'utf8');
console.log('  输出：' + OUT + '  ' + finalDoc.length + ' 字符');
