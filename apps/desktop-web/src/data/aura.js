/*
        （源里逐字有 / 声明差异逆回去 == 源切片 / 产物里就是这份正文）。
        改行为要改 legacy 源再重跑本工具。
   与原文的差异：**零处**（本族里第一个「一字不改」的件）。源里那道幂等闸是**共用的 id**
     （谁先建谁赢、后来者看到 #xlrAura 就跳过）⇒ 它本身就是封条，不属于"必须改自用名"那几种情形。
   ⚠ 源里的调用点：**只在看门狗里**（38-script L2089，每 125ms 一次、共 20 秒），不是加载期建。
   来*/
function buildAura() {
    if (document.getElementById('xlrAura')) return;
    var d = document.createElement('div');
    d.id = 'xlrAura';
    d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<i></i><i></i><i></i><i></i>';
    if (document.body.firstChild) document.body.insertBefore(d, document.body.firstChild);
    else document.body.appendChild(d);
  }

export const Aura = {
  buildAura,
};
