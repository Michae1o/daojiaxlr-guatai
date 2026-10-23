/*
 *
 *   —— 它产出的 DOM 是：
 *        div.skinmenu
 *          > div.sh            （文本「主题」）
 *          > button[type=button][data-k][aria-current]   × 9（顺序 = SKINS 顺序）
 *              > span.sw       （inline style: background:<bg>; border-color:<ac>）
 *              > span.nm       （皮肤名）
 *              > span.tg       （标签）
 *   ⇒ 本组件的 JSX 与它一一对应；class 名、属性名、顺序都不改（CSS 靠这些命中）。
 *
 * 两处**已知且有意**的写法差异：
 *   ① legacy 用 `innerHTML` 拼串 + `esc()` 转义；这里用 **文本节点**。
 *      静态字符串（皮肤名/标签都是 SKINS 里的常量）下**等价**：`esc()` 只转 & < > "，
 *      而"文本节点"与"转义后的 HTML"在 DOM 上产出同一个文本 ⇒ `outerHTML` 逐字相同。
 *   ② `aria-current` legacy 写的是**字符串** `'true'/'false'`（`(s.k === cur)` 拼进 HTML）
 *      ⇒ 这里也显式 `String(...)`，**不要**写成布尔（React 对 `aria-*` 布尔会写成 "true"/"false"
 *      其实也对，但显式更稳、且与 legacy 的取值路径一致）。
 *
 * 数据源：`SkinsCore`（**C1/C2 共用一份**，见 开发计划 A6）
 *   —— 面板与设置页的 #stThemes 都从这里取 SKINS，切换都走这里的 apply()，不留第二份实现。
 */
import { SkinsCore } from '../data/skinsCore.js';

export default function SkinMenu({ cur }) {
  return (
    <div className="skinmenu">
      <div className="sh">主题</div>
      {SkinsCore.SKINS.map((s) => (
        <button key={s.k} type="button" data-k={s.k} aria-current={String(s.k === cur)}>
          <span className="sw" style={{ background: s.bg, borderColor: s.ac }}></span>
          <span className="nm">{s.n}</span><span className="tg">{s.t}</span>
        </button>
      ))}
    </div>
  );
}
