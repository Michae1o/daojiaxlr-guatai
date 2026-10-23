/* index.js —— shared-judgment 的**唯一公开入口**
   两端只许 `import { ... } from '@xlr/shared-judgment'`；
   */
export * from './judgment.js';
export * from './cast.js';
export * from './plain-text.js';
export * from './asks.js';     /* 按问法取用的判据素材（原文＋白话），同理只准存在包内 */
export * from './corpus.js';   /* 开源判据语料（00–08 九份体系文档）：解卦与「依据」页的真源 */
export * from './prompt.js';   /* SYS（解卦系统提示词）：含判据特征串，只准存在包内 */
