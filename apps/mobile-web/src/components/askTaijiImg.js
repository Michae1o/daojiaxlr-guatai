/* askTaijiImg.js —— 「接着问」那颗太极的**位图候选**（给的徽章）
 *
 * ★ 原文（本(会话)收工之后）：
 *   「`(upstream)`，**能不能用这个，这个应该很清晰吧**」
 *
 * 来源与预处理（可复算，脚本 （生成过程））：
 *   原图 1254×1254 1,057.3 KB；**alpha 外框只占画布 54%**（徽章本体 (175,173)–(1080,1103)）
 *   ⇒ 先按 alpha 外框裁掉透明边并补成正方形（930×930），再 LANCZOS 缩到 **144 px**
 *      （= 显示 **44** CSS px 的 3.27 倍；DPR3 需 132 设备像素，DPR4 需 176 —— DPR4 机器上会略软，实测没有再加）
 *      ⇒ `assets/taiji-ask-144.png` = **31,511 B**（sha256 `23f8439d1b7b057b…`）。⚠ 不裁边直接缩，等于白扔掉 46% 的像素。
 *
 * 与矢量版（`askTaijiMarkup.js`）的关系：**二选一**，都挂在同一个 `.sl-orb` 位置上；
 *   本文件是候选（用户在问「能不能用这个」），结论由用户在真机上看过再定。
 *   · 位图的优点：细节丰富（流光/材质是画出来的，不是我用几何拼的）；
 *   · 位图的代价：① 二进制进载荷（内联 data URL，+42 KB base64）；
 *     ② 36px 下高频碎屑（二阶差分均值）**35.3**，而矢量版 ~10.7 ⇒ 真机那一格会更「花」；
 *     ③ 内部流光**不会动**（只能靠外层的转动/呼吸带动）。
 *
 * ⚠ 类名沿用 `.sl-orb` / `.sl-taiji`（`askTaijiOn()` 靠 `.sl-orb` 找节点；`askSpin` 慢转靠 `.sl-taiji`），
 *   外面多包一层 `.atk-breath` 承接「呼吸」（跟矢量版的 `.atk-flow` 同一个意思）。
 */
import src from '../assets/taiji-ask-144.png';

export const ASK_TAIJI_IMG_DATAURL_CHARS = src.length;

export const ASK_TAIJI_IMG_MARKUP =
  '<span class="sl-orb" aria-hidden="true">' +
    '<span class="atk-breath">' +
      '<img class="sl-taiji atk-img" src="' + src + '" alt="" aria-hidden="true">' +
    '</span>' +
  '</span>';
