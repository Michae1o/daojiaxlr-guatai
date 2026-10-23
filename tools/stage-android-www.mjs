#!/usr/bin/env node
/* stage-android-www.mjs —— 手机端打包（三步：注入安卓适配 → 调 protect.py 加密 → 落到 Capacitor 的 www/）
 *
 * 用法：
 *   node tools/stage-android-www.mjs                 # 默认取 apps/mobile-web/dist 的单文件产物
 *   node tools/stage-android-www.mjs --src a.html --out b.html --www dir
 *
 * 前置：先在 apps/mobile-web 里跑 `npm run build`。
 * 加密用的是 apps/mobile-web/build/protect.py（Python 3；可用环境变量 PYTHON 指定解释器）。
 *
 * 只有「文件缺失 / 加密脚本失败」这类真错误才会非零退出（exit 2）；
 * 它不替你判断改得对不对，产物好不好自己开起来看。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const die = (msg) => { console.error('注意：' + msg); process.exit(2); };

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const pick = (flag, dflt) => { const i = argv.indexOf(flag); return i >= 0 ? path.resolve(argv[i + 1]) : dflt; };

const defaultSrc = (() => {
  const a = path.join(REPO, 'apps', 'mobile-web', 'dist', '手机版-应用.html');
  const b = path.join(REPO, 'apps', 'mobile-web', 'dist', 'index.html');
  return fs.existsSync(a) ? a : b;
})();

const SRC = pick('--src', defaultSrc);
const WWW = pick('--www', path.join(REPO, 'apps', 'mobile-shell', 'www'));
const OUT = pick('--out', path.join(WWW, 'index.html'));
const PROTECT = path.join(REPO, 'apps', 'mobile-web', 'build', 'protect.py');
const PY = process.env.PYTHON || 'python';

if (!fs.existsSync(SRC)) die('找不到前端产物：' + SRC + '\n   先在 apps/mobile-web 里跑 npm run build');
if (!fs.existsSync(PROTECT)) die('找不到加密脚本：' + PROTECT);

const VP_OLD = '<meta name="viewport" content="width=device-width, initial-scale=1">';
const VP_NEW = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';

/* 安卓适配层：状态栏让位 / 禁横向滚动 / 去点按高亮 / 输入框不小于 16px（防系统强制缩放） */
const ADAPT = `
<style>
  body{padding-top:env(safe-area-inset-top,0)}
  html,body{overflow-x:hidden}
  *{-webkit-tap-highlight-color:transparent}
  input,select,textarea{font-size:16px}
</style>
`;

let html = fs.readFileSync(SRC, 'utf8');
if (html.includes(VP_OLD)) html = html.replace(VP_OLD, VP_NEW);
else if (!html.includes('viewport-fit=cover') && html.includes('<head>')) html = html.replace('<head>', '<head>\n' + VP_NEW);
html = html.replace('</body>', ADAPT + '</body>');

fs.mkdirSync(WWW, { recursive: true });
const tmp = path.join(WWW, '_adapted.html');
fs.writeFileSync(tmp, html, 'utf8');

const r = spawnSync(PY, [PROTECT, tmp, OUT], { encoding: 'utf8' });
const pyOut = ((r.stdout || '') + (r.stderr || '')).trim();
try { fs.unlinkSync(tmp); } catch { }   /* 中间明文不留 */

if (r.status !== 0) die('protect.py 执行失败（exit ' + r.status + '）：\n' + pyOut);
if (!fs.existsSync(OUT)) die('没有产出文件：' + OUT);

console.log('来源：' + SRC);
console.log('产物：' + OUT + '  ' + fs.statSync(OUT).size + ' B');
console.log('下一步：cd apps/mobile-shell && npx cap sync android && cd android && ./gradlew assembleDebug');
