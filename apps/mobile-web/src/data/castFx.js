/*
        安装器 installCastFx() 为手写（理由见工具注释：legacy 的 wireCastFx 用 `__xlrCasting` 当旗，
     判不过就不播四拍、也不补发那一次点击（提示由干跑自己写进 #err）。没注入 / 注入的抛了 ⇒ fail-open。
   ⚠ 与 legacy 的共存：外壳把 `window.__xlrCasting` **常置 1** ⇒ legacy 那个拦截器整体空转，
     只剩本模块这一份在播 ⇒ 不会播两遍。
   源 sha16 = 1eb17e2ab562b52b
*/
/* eslint-disable */

function syncGo() {
    var go = document.getElementById('btnGo'), q = document.getElementById('q');
    if (!go || !q) return;
    var empty = !String(q.value || '').trim();
    if (empty && !go.disabled) go.disabled = true;
    else if (!empty && go.disabled) go.disabled = false;
  }
function castSeq(go, cx, cy) {
    var W = window.innerWidth, H = window.innerHeight;
    /*
       落卦位置＝问卦卡（结果卡会长在同一块地方）那一栏的中心 —— 现场量，换主题/换窗口都对。 */
    var host = document.querySelector('.cmain') || document.querySelector('.wrap');
    var hr = host ? host.getBoundingClientRect() : null;
    var tx = hr ? Math.round(hr.left + hr.width / 2) : Math.round(W / 2);
    var ty = hr ? Math.round(hr.top + Math.min(hr.height, H * .72) / 2) : Math.round(H * .46);
    var box = document.createElement('div');
    box.className = 'xseq';
    box.setAttribute('aria-hidden', 'true');
    box.style.setProperty('--sx', cx + 'px');
    box.style.setProperty('--sy', cy + 'px');
    box.style.setProperty('--tx', tx + 'px');
    box.style.setProperty('--ty', ty + 'px');
    box.style.setProperty('--dx', (tx - cx) + 'px');
    box.style.setProperty('--dy', (ty - cy) + 'px');
    box.innerHTML =
      '<span class="xs-veil"></span>' +
      '<i class="xs-br"></i><i class="xs-b2"></i><i class="xs-b3"></i>' +
      '<span class="xs-orb"></span>' +
      '<i class="xs-r1"></i><i class="xs-r2"></i><i class="xs-r3"></i>' +
      '<span class="xs-core"></span>' +
      '<span class="xs-six"><b></b><b></b><b></b><b></b><b></b><b></b></span>';
    document.body.appendChild(box);
    go.classList.add('xpress');
    /* ★ 第六轮：按钮发光要跟「念起涟漪」一起播完（原来 150ms 就收，光还没看清就没了） */
    setTimeout(function () { go.classList.remove('xpress'); }, 380);
    requestAnimationFrame(function () { box.classList.add('on'); });
    /* 落卦：2400ms 之后撤幕、放行起卦；3150ms 清掉这一层 */
    setTimeout(function () { box.classList.add('shrink'); }, 2450);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 3150);
  }

/* 安装器（手写，非切片）：语义照 38-script 的 wireCastFx()，但**旗子换名**、并把每次播放报给外壳 */
export function installCastFx(opts) {
  const hooks = opts || {};
  if (window.__xlrFxInstalled) return false;
  window.__xlrFxInstalled = 1;
  document.addEventListener('click', function (e) {
    const t = e.target;
    if (!t || !t.closest) return;
    const go = t.closest('#btnGo');
    if (!go) return;
    if (window.__xlrFxBusy) return;            /* 2400ms 后补发的那一次：放行给应用（= React 的 goCast） */
    e.preventDefault();
    e.stopPropagation();
    if (go.disabled) return;                    /* 空框：不给动效也不给提交（与 legacy 同） */
    /*
       先问一句「这一击到底能不能起卦」——不能就**不播动画**（提示已经由那一问自己写好了），
       也不补发那一次点击（这一击到这就结束了）。判定由调用方注入；没注入或它自己抛了
        */
    if (hooks.canCast) {
      let ok = true;
      try { ok = hooks.canCast() !== false; } catch (eG) { ok = true; }
      if (!ok) return;
    }
    const r = go.getBoundingClientRect();
    castSeq(go, r.left + r.width / 2, r.top + r.height / 2);
    if (hooks.onPlay) { try { hooks.onPlay(); } catch (eP) { } }
    window.__xlrFxBusy = 1;
    setTimeout(function () {
      try { go.click(); } catch (e2) { }
      setTimeout(function () { window.__xlrFxBusy = 0; }, 0);
    }, 2400);
  }, true);
  return true;
}

export const CastFx = { syncGo, castSeq, installCastFx };
