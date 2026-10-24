/*
        （源里逐字有 / 声明差异逆回去 == 源切片 / 产物里就是这份正文）。
        改行为要改 legacy 源再重跑本工具。
   ★ 与原文的差异：**零处**。幂等闸是**共用节点判定**（document.getElementById('castPanel')）——
     谁先建谁赢、后来者跳过 ⇒ 它本身就是封条，不属于「必须改自用名」那几种情形。
   ⚠ 源里的调用点：**只在早期实现看门狗里**（38-script L2090，每 125ms 一次），实测落在 133/170/189ms。
     本仓的调用点 = src/components/AskPanel.jsx（等 .cbar 出现后建一次）。
   ⚠ 它做的是**搬节点**（把 #castFields 的子节点搬进 #castPanel），不是重建 —— 所以换主人之后
     仍然必须**由同一次调用**把节点搬完（不能只建个空壳）。
   ⚠ 切片末尾那句 setCastOpen(castOpen()) 在本仓走成空操作（那两个函数是早期实现全局）；
   来*/
function buildCastPanel() {
    var cf = document.getElementById('castFields');
    var cbar = document.querySelector('.cbar');
    var cmain = document.querySelector('.cbar .cmain');
    if (!cf || !cbar || !cmain) return;
    if (document.getElementById('castPanel')) return;
    var panel = document.createElement('div');
    panel.id = 'castPanel';
    panel.className = 'off';
    var move = [], i;
    for (i = 0; i < cf.children.length; i++) {
      if (cf.children[i] !== document.getElementById('castToggle')) move.push(cf.children[i]);
    }
    for (i = 0; i < move.length; i++) panel.appendChild(move[i]);
    if (cmain.nextSibling) cbar.insertBefore(panel, cmain.nextSibling);
    else cbar.appendChild(panel);
    if (typeof setCastOpen === 'function' && typeof castOpen === 'function') setCastOpen(castOpen());
  }

export const CastPanel = {
  buildCastPanel,
};
