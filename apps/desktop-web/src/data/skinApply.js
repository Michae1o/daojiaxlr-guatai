/*
 *
 *   **无**「已定」字样 ⇒ 此处不写归因）要求皮肤数据/逻辑**只提一份**，
 *   `cur` 状态。若 React 侧只调 `SkinsCore.apply()`，legacy 那份 `cur` 会**分叉**
 *   （`window.XLR_SKIN_CUR()` 返回旧值、legacy 的 openMenu 会用旧值标 aria-current）。
 *   ⇒ 这里统一成：**先 `SkinsCore.apply(k)`（主），再同步调一次 legacy 的 `XLR_SKIN_APPLY(k)`（桥）**。
 *     两者写同一个 localStorage 键、同样的 `data-skin` / `data-theme`，**幂等**，所以调两次无副作用差别。
 *
 *   （届时 `skinsCore.js` 升为真源，直接 `SkinsCore.apply` 即可）。
 *   （`src/shell/main.jsx` 的 `mountSkins()`；模块期晚于 legacy 的解析期 ⇒ 本仓赢）
 *   ⇒ 下面那句 `legacyApply !== SkinsCore.apply` **恒为假**、永远不会再调 legacy 那份。
 *   保留这三行只为「删段」时一眼看到它该**整段删除**（不是它还有用）。
 */
import { SkinsCore } from './skinsCore.js';

export function applySkin(k) {
  SkinsCore.apply(k);
  try {
    const legacyApply = window.XLR_SKIN_APPLY;
    if (typeof legacyApply === 'function' && legacyApply !== SkinsCore.apply) legacyApply(k);
  } catch (eB) { }
}

/** 供判据用：当前皮肤（读同一份状态，不另存） */
export function currentSkin() { return SkinsCore.cur(); }
