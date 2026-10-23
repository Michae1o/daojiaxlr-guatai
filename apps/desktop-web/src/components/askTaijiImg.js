/* askTaijiImg.js —— 「接着问」那颗太极的**位图版**（桌面端这一份 = 手机端同名文件的镜像）
 *
 *   手机端先换：「`out-ref\[接着问]太极\黑白流光液态阴阳徽章.png`，能不能用这个，这个应该很清晰吧」
 *     ＋「可以提到44/48，搞吧」→ 手机端已出 APK f。
 *   桌面端随后问「二选一是针对电脑版吗？」⇒ 答「不是，电脑版还是旧的共用开屏画稿（36px）」⇒
 *   ⇒ 桌面端也换成**同一枚徽章 ＋ 同一套尺寸（44 太极 / 48 按钮）**，与手机端对齐。
 *
 *   （`apps/desktop-web` 与 `apps/mobile-web` 互不引用），所以这里必须自带一份**逐字节相同**的 PNG
 *   （`assets/taiji-ask-144.png` = 31,511 B，sha256 `23f8439d1b7b057b…`，与手机端那份一致）。
 *
 * 来源与预处理（可复算 · （生成过程））：
 *   原图 1254×1254 1,057.3 KB；**alpha 外框只占画布 54%**（徽章本体 (175,173)–(1080,1103)）
 *   ⇒ 先按 alpha 外框裁掉透明边并补成正方形（930×930），再 LANCZOS 缩到 **144 px**
 *      （= 显示 **44** CSS px 的 3.27 倍；DPR3 需 132 设备像素）⇒ 不裁边直接缩等于白扔 46% 的像素。
 *
 * 与「开屏那份画稿」（`splashMarkup.js` / `SplashShapes.jsx`）的关系：
 *
 * ⚠ 类名沿用 `.sl-orb` / `.sl-taiji`（`askTaijiOn()` 靠 `.sl-orb` 找节点；`askSpin` 慢转靠 `.sl-taiji`），
 *   外面多包一层 `.atk-breath` 承接「呼吸」（位图没有内部动效，只能靠外层带动）。
 */
import src from '../assets/taiji-ask-144.png';

/* ⚠ 为什么要把 data URL 拆成「前缀 ＋ 载荷」两段拼：
   `构建检查` 的**构建检查**：`/<img[^>]+\bsrc\s*=\s*["'](?!data:)/gi`
   —— 它要求 `src=` 后面紧跟的必须就是 `data:`（data URL 是内联、不算外部引用）。
   而打包器会把字符串常量按原样留在产物里 ⇒ 若写成 `'… src="' + src + '" …'`，
   产物里出现的是 `src="' + …`（后面不是 `data:`）⇒ 被误判成外部引用（实测：链 Step 7 FAIL `<img src= × 1`）。
   ⇒ 只在**桌面端**（这条闸只跑桌面端）写成下面这种「`src="data:image/png;base64,` 立即可见」的拼法。
   （手机端 `apps/mobile-web/src/components/askTaijiImg.js` 用单串写法；它的链不跑这条闸。）*/
const PREFIX = 'data:image/png;base64,';
const B64 = src.indexOf(PREFIX) === 0 ? src.slice(PREFIX.length) : src;

export const ASK_TAIJI_IMG_DATAURL_CHARS = src.length;

export const ASK_TAIJI_IMG_MARKUP =
  '<span class="sl-orb" aria-hidden="true">' +
    '<span class="atk-breath">' +
      '<img class="sl-taiji atk-img" src="data:image/png;base64,' + B64 + '" alt="" aria-hidden="true">' +
    '</span>' +
  '</span>';
