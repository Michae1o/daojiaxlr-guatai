/*
 *
 * 输入：apps/desktop-web/doc-entry.html
 *   ← 由 tools/make-doc-entry.mjs 生成 =「组装器产物剥掉外壳块」得到的**注入后骨架**
 *     + <link rel="stylesheet" href="/src/tailwind.css">（Tailwind，scope 化）
 *     + <script type="module" src="/shell-dist/shell.js"></script>（外壳模块，与今天同一份产物）
 * 输出：apps/desktop-web/dist/新版-现代.html（单文件：脚本 / 样式全部内联）
 *
 * 分界线（变更记录）：**对早期产物的核对仍用组装器产的「上一版」**；本配置只负责"最终文档"这一半。
 */
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));

/* ★ Vite 对 HTML 入口的产物名 = **入口文件名**（不看 rollupOptions.input 的键），
   而入口必须放在 root 下 ⇒ 用一个小插件在产物阶段改名到「新版-现代.html」。
   （这样入口文件可以待在不起眼的位置，产物名仍是出货名。） */
function xlrRenameHtml() {
  return {
    name: 'xlr-rename-html',
    enforce: 'post',
    generateBundle(_opts, bundle) {
      for (const key of Object.keys(bundle)) {
        const f = bundle[key];
        if (f && f.type === 'asset' && /(^|\/)doc-entry\.html$/.test(key)) {
          delete bundle[key];
          f.fileName = '新版-现代.html';
          bundle[f.fileName] = f;
        }
      }
    }
  };
}

export default defineConfig({
  root: DIR,
  logLevel: 'info',
  plugins: [tailwindcss(), viteSingleFile(), xlrRenameHtml()],
  define: {
    __XLR_PLATFORM__: JSON.stringify('desktop'),   /* ★ 这条线是手机还是电脑（不看屏幕宽度） */
  },
  build: {
    outDir: path.join(DIR, 'dist'),
    emptyOutDir: false,
    target: 'esnext',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    modulePreload: false,
    reportCompressedSize: false,
    minify: 'esbuild',
    rollupOptions: {
      input: { '新版-现代': path.join(DIR, 'doc-entry.html') },
      output: { inlineDynamicImports: true }
    }
  }
});
