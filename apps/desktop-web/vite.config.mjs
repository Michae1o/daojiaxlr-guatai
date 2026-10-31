/* 桌面端前端构建配置（A 方案：vite-plugin-singlefile 出单 HTML，再走旧加密链）
   */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  define: {
    __XLR_PLATFORM__: JSON.stringify('desktop'),   /* 这条线是手机还是电脑（不看屏幕宽度） */
  },
  build: {
    target: 'esnext',
    cssCodeSplit: false,            /* 单文件必需 */
    assetsInlineLimit: 100000000,   /* 图片/字体全内联成 data URI */
    modulePreload: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 100000,
    rollupOptions: {
      output: { inlineDynamicImports: true }   /* 动态 import 也摊平，避免多 chunk */
    }
  }
});
