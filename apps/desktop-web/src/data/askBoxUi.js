/* askBoxUi.js —— 「接着问」区在**每一次起卦**时收口：清掉上一卦的问答、收起来、补那行小字。
 *
 *   ① 「新开一卦之后，下面的『接着问』会带着第一个问题的内容。按理来说点了新开一卦之后，都要刷新的。」
 *   根因：#askBox 是 `showCore.js` 里「**没有才插**」的一次性节点；`window.__thread` 每次起卦
 *      都清（showWrap 第一行那三句），可 **DOM 里那些 `.ask-item` 没人清** ⇒ 列表一直挂着上一卦的
 *      问答，看着就像「累积」。⇒ 挂点必须落在**每一次 show**（任何入口起卦都走它），
 *      而不是落在「新开一卦」那颗按钮上 —— 按钮只是起卦的一条入口。
 *   ② 「给接着问下面标一行小字：在本卦的基础上接着问」⇒ `ASK_TIP`，插在输入行与消息槽之间。
 *
 *   手改会被下次生成覆盖。⇒ 收口放在本文件，由外壳在每次 `ShowCore.show()` 之后调一次。
 */
export var ASK_TIP = '在本卦的基础上接着问';

/** 每次起卦后调一次：清列表、清消息槽、收起、补小字。返回本次的「卦序」。 */
export function resetAskBox() {
  var box = document.getElementById('askBox');
  var seq = (window.__askSeq = (window.__askSeq | 0) + 1);
  if (!box) return seq;                       /* 首卦：还没插（早期实现没跑）⇒ 没东西可清 */
  var list = document.getElementById('askList');
  if (list) list.innerHTML = '';
  var note = document.getElementById('askNote');
  if (note) note.textContent = '';
  /* 这一卦还没有模型断辞 ⇒ 「接着问」先收起来（解完 askModel 会把 off 去掉） */
  box.classList.add('off');
  ensureTip(box);
  return seq;
}

/** 补那行小字（幂等：已经有一行了就不再加） */
export function ensureTip(box) {
  box = box || document.getElementById('askBox');
  if (!box || box.querySelector('.ask-tip')) return false;
  var line = box.querySelector('.ask-line');
  var d = document.createElement('div');
  d.className = 'ask-tip';
  d.textContent = ASK_TIP;
  if (line && line.parentNode) line.insertAdjacentElement('afterend', d);
  else box.appendChild(d);
  return true;
}

export const AskBoxUi = { resetAskBox: resetAskBox, ensureTip: ensureTip, ASK_TIP: ASK_TIP };
