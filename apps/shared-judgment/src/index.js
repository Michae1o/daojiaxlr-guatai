/* index.js —— shared-judgment 的**唯一公开入口**
   两端只许 `import { ... } from '@xlr/shared-judgment'`；
   深路径（@xlr/shared-judgment/src/xxx.js）与相对跨目录引用一律由 tools/check-isolation.mjs 拦下。 */
export * from './judgment.js';
export * from './cast.js';
export * from './plain-text.js';
export * from './asks.js';     /* 按问法取用的判据素材（原文＋白话），同理只准存在包内 */
export * from './tidy.js';      /* 断辞原文清洗（半角噪声收口）：两端共用同一份，2026-10-23 */
export * from './prompt.js';   /* SYS（解卦系统提示词）：含判据特征串，只准存在包内 */
export * from './corpus.js';    /* 查典素材（CORPUS / doc / sections）：MCP 的 xiaoliuren_chadian 用 */
export * from './mcp-tools.js';  /* MCP 内核：工具表 + 执行 + 卦 id 会话（桌面桥与 mcp/ 服务共用这一份，2026-10-30） */
