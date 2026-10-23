/* 手机端前端构建配置（A 方案：singlefile 出单 HTML，再走 stage → protect.py）
   */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  define: {
    __XLR_PLATFORM__: JSON.stringify('phone'),   /* ★ 这条线是手机还是电脑（不看屏幕宽度） */
  },
  build: {
    target: 'esnext',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    modulePreload: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 100000,
    rollupOptions: { output: { inlineDynamicImports: true } }
  }
});
