/*
 *
 * 为什么需要这一层：src/data/skinsCore.js / skinPrepaint.js / skinExtra.json 是**两端逐字节相同的共享源**
 *   （2026-10-15 实测：skinsCore 各 3895 B、skinExtra 各 1416 B、skinPrepaint 各 5848 B，两端 sha 一致）
 * 为什么手机端不要铜古：
 *   ② 铜古素材包在手机端**本批未 fork**（变更记录：src/tailwind.css 里 `@import "./skins/tonggu/tonggu.css";`
 *      那行被注释掉，素材 56 个二进制件 ≈1.5 MB）⇒ 手机端就算列出来也选不出效果；
 *   ③ 早期版本手机端本来就是 9 项（无铜古）—— 去掉后与早期版本面板 9 行一致（07 屏那 31px 差随之归零）。
 *   skinApply.js 原样保留：用户若在桌面端选过铜古，手机端开机仍认这个键（html[data-skin] 照写），
 *   不会回落 bw；只是列表里不再呈现这个选项。
 */
import { SkinsCore } from './skinsCore.js';

const HIDDEN = new Set(['tonggu']);          /* 手机端不呈现的皮肤键（暂：铜古） */

export const VISIBLE_SKINS = SkinsCore.SKINS.filter((s) => !HIDDEN.has(s.k));
