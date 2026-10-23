/* vite.shell.config.mjs —— 只构建「外壳模块」：单个 ES module JS，**不产出 HTML、不产出 CSS**
   产物：apps/desktop-web/shell-dist/shell.js
   由 tools\构建-桌面端.ps1 在组装前调用；组装器把它作为 <script type="module"> 追加到文档末尾。 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: DIR,
  plugins: [react()],
  define: {
    __XLR_PLATFORM__: JSON.stringify('desktop'),   /* ★ 这条线是手机还是电脑（不看屏幕宽度） */
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    outDir: path.join(DIR, 'shell-dist'),
    emptyOutDir: true,
    cssCodeSplit: false,          /* 外壳不引 css；关掉以免产出多余文件 */
    minify: 'esbuild',
    target: 'esnext',
    lib: {
      entry: path.join(DIR, 'src', 'shell', 'main.jsx'),
      formats: ['es'],
      fileName: () => 'shell.js'
    },
    rollupOptions: { output: { inlineDynamicImports: true } }
  }
});
