/*
        （源里逐字有 / 声明差异逆回去 == 源切片 / 产物里就是这份正文）。
        改行为要改 legacy 源再重跑本工具。
   ★ 与原文的差异：**零处**。源里那道幂等闸是**共用节点判定**（document.querySelector('.mfoot')）——
     谁先建谁赢、后来者看到就跳过 ⇒ 它本身就是封条，不属于「必须改自用名」那几种情形。
   ⚠ 源里的调用点有两处：载入期 ready()（38-script L1984，**实测就是它建的**）与看门狗（L2085，
     被它自己的 !document.querySelector('.vstep') 挡着，实测没轮到）。本仓的调用点 = src/shell/main.jsx 模块顶层。
     .left > .pane」那段**至今是死代码**；.mfoot 里只有 .mf-bar；**摘掉后不会自己回来**
   来源 sha16 = 1eb17e2ab562b52b
*/
function buildFooter() {
    var wrap = document.querySelector('.wrap');
    if (!wrap || document.querySelector('.mfoot')) return;
    var foot = document.createElement('footer');
    foot.className = 'mfoot';
    /* 「使用纪律」是左栏第二个 .pane；搬进脚注，主流程只剩「问 → 起卦 → 看」 */
    var panes = document.querySelectorAll('.left > .pane');
    var rules = panes.length > 1 ? panes[panes.length - 1] : null;
    var bar = document.createElement('div');
    bar.className = 'mf-bar';
    bar.innerHTML =
      '<div class="mf-r1">' +
      '<span class="mf-name">道家小六壬 · 卦台</span>' +
      '<span>基于邵一尘老师 · 道家小六壬所作</span>' +
      '</div>' +
      '<div class="mf-r2">' +
      '<span>中华传统民俗文化 · 仅供娱乐参考</span>' +
      '</div>';
    if (rules) foot.appendChild(rules);
    foot.appendChild(bar);
    wrap.parentNode.insertBefore(foot, wrap.nextSibling);
  }

export const Footer = {
  buildFooter,
};
