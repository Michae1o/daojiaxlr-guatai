/* phoneNav.js —— 手机端底栏那一组（**逐字照抄早期实现**，由 （生成过程） 按行区间抽）
 * 来源：上游 `apps/mobile-web/src/modern.js`（只读历史出处）
 *   · NAV_ICONS          行 539–544（三颗图标的内联 SVG 路径）
 *   · navSvg()           行 545–548
 *   · LENS_MAP           行 648（PNG data-URI，位移贴图）
 *   · ensureLensFilter() 行 650–668
 *   · buildNav()         行 669–714
 *   · syncNav()          行 716–739
 *   · wireLiquidDrag()   行 742–1004
 *   · wireNavCollapse()  行 1007–1071
 *   （同一批函数互相可见 ⇒ 行为不变）。
 * ⚠ 依赖复查（2026-10-16）：块内除了这些函数，还用到 `NAV_ICONS`（常量，已一并抽入）。
 *   首次搬运时漏了它 ⇒ 运行时 `NAV_ICONS is not defined` ⇒ `buildNav()` 静默失败、`.mgbar` 不出现。
 *   教训：**自由变量粗筛只抓函数调用会漏常量** —— 搬完必须在真页面上跑一次 install()。
 * ⚠ 文件末尾的「装配」段（`resyncOnClick` / `PhoneNav.install` / `PhoneNav.state`）是本仓**新写**的，
 *   不是早期实现原样；重新生成会一并写回（本文件由该脚本整份产出，改尾巴要改脚本）。
 */

  var NAV_ICONS = {
    cast: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
    sum: '<path d="M4 6h16M4 11h16M4 16h10"/>',
    set: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
    theme: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>'
  };

  function navSvg(k) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + NAV_ICONS[k] + '</svg>';
  }

  var LENS_MAP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAAwCAIAAABxHTMoAAAT5klEQVR4nO1di3bbuA4kJTvpZ+9n320s8R5ggOGQkt13m3TNw/JATOI47gwJgnjUf/75pzzbj7R6Jp9OPphBaw9n2sPJZ/uudvm+H/urmsOx1sRlTRl9+cJjl7M3eSkINlNG+R62IbVRTsFmjn3vcv3iY76UyeXJn7+bANUh5yisid26jALGdXjETBlnTnotDQQQGeg/GRP6zWW0A8ID9K35TCL+ZASs91E+65XCNszUnKl8bKNA2vzVPLn8HRCviene1xxTWFwumJFeOC42WicBkgYtZQNxzkA2QIvQRsQD7sM4ckAW6MB9FzgKH9jLPgoJdMyUrc+UTQiwWTfQbz7jo3bMLHj0n+oC6JEksRf5+PT4GASA1hEQrw5lR/mSsA7hcjZeHOgYXSAHAPcB66tjnaBf7oA7+34H3AOs/ZF6/2O0KBmOL3JKEpsnK85IYiPpkXzorNg6DUy4JehdWG4mGB8OI0gSgrPCBCcGdo/Qst53e3cEMJQT64B4At36paw+svMRWKfQQe8jgU7dpgNdtJfjah2wqwMo8bUGVENpwbs/k0++9ODP5/dgcxsfKXeqqOyPO/8Qf4edReOuAt2ppe5EhoReRFbcDmS4DcLq88v0mMRYwApuGu+PFX+YAMS6oTzhvgLWqwveFwrX/qg04HpfD0APrI+ayby4AgoJ7o6eNghca+3xKMv3n4w81H7xMxmtSYtwshLi/tHZb/S/a5KxL+3+IksK+NvjE+CHUEtbvYMq09lDzxJJjKr7gEKf45uNfAx5M26Y4JSwUVjxXyGAYb0I3BcDunVH/HopFwD92gVyYL0m7ldBfCrucVSdVHD+p26uhACgRHOO549OCZX52PYUTrsoJMOKK0xQuVtEc42fjst9zKV9ER1MuxFgkU2gll0eKcdjDW5Mj/YpqRZXyw6GXLt+hS/HQcJZ0fkAlN/KmjRYU76o4HtFjMmHoET5rZT45QQwlX2xD9dW9ET85VIuiXjr1z7apOCeoOcplljvujj+q3ZHuWjGiul9HwXgO+X+OApNhdQZ2qkw6t9hxBzR3y2bB11I7w+I/m4yAqvL+TkEoJ+EToY8r+9LcmAUdnIjZbCCgm0p42knuIFXVuNsGpd4PJj2gUsS4PImI760uYCNArtEc0q0j0YAaDWG+CUQf0FPuF85OuKvDnd8KXAPtZ5mHLG1B7i3Qa8NZE9Y38sm+Db5YSfWuyyPHeuwPCb6Z+ukWusno/6IelWH6kgCqECDuk8dJj+E2cZKYxTlHHcVBPqQ9/t9o1xTVnpw95jOS7U0NzNgiuYjAzRXfXDAhWsy4eozGKNv1oMPu/HhV+hLP4cA9skT8QL669rhbv0aAnAfoE8VKI65aaeP/85UYDrQITi4NwCdcD+MgftNCLDdR7/QAPIEdMX6DPTxXmlQ979e9T8+yixv0HjLNhFDWTERI1ZrbgjCh33qqxDA5S3JcDLWHF3A8YPE4EaBd2L2N0AZm0OqQIA7mHBFdz6QEtdtIAP4YGQof5oAWOkD9Esi3kGP8SVxHwJ1Ht8QDPR+8IVxM1Y7II+nr1zXDeUtFnUg+6Q7uCFsgnvM9+6P1GrmNV6UGUV5LPC/2ex93CiknSAgjUIDSY6K07Qt1CRDoj84kATYV6eBj5gHK449totqrAjdCawQkwM0WBjocCAOGpAM3l+SCS9JgxhBhj3J8GPbwvcQwNQbX+8v6In7lzWA/oKuHBDQr7D24C7Wz31tG6wQHe7owHQKN4H4LQXO8HFY9afFXvSZDnRC/J3Z6b6t+ZvXy6mZJGILKkc+kAlHdYigFzJAuMl8yL4tdMFpgHGywoV3SfGlcHNdIMnQaXArL5sJIfsjmXDZrUNHWtqvJECs97Xj/mVx3DvWMb5O0Hdi2HkXuPfTsDU3ylC3Iei5zN8A9xZwvyXub4l7CJzpuCf6eZadzq96SP0Ptry7nYjRxkP2kQ8GX+4Aivhkwi2ZgJlbkuGWZLjJ5lBIhtwcosFkchGd4mJAVxq8kg+Y38rL3pmwtm/bEy5fqd+vrupcqmN6ccR7f3Xo2wj0rwPuL9COYP3MK0kiHhrOJt1Q7uPUCfrbhP4J+gn60G2ecP/qVrF1tHNKBBPScBSq/7QDJAduSoZD32pSIruRIW2vrZRb8tNQt9hx+lIdeItj3bFnHFjL65Zj9uvu20Jz7QiH5h8hgG1MvupflnLFO/BVP+AunRwAPa4OeruJSo8Rc00RLZAajq30QLyO2d8oE/pUgVwIjX80bqrp/dl+CiXW8TqCFiEs7btoPgPckw9v03zto/EhDwwbLdq5J7w5iO2mx8lwbb4h1PJSy+viowvohkxniGlH1b7ZVCNsCN9KgA594N5f3X6Boz+6yPbVWq7+cuBfOEvhYkWcW/piz564N7i3AL2O826QhwFagfQ69tl+Uavi9xZWiiRDqPip8R9X/bdprEkJ/+bVOXBLDmBDoEuV/74wgK7NAVacA9gKSnaQoRoHXqspRS+702A3QD6gwQkBDPrYd3zhB+5flvIJiIcA5vmvfClOTSecrfrVoT+6cBlYiyz5zcgduCfoXTjSgNtCQD93jyfu/ywZluYw3Q3BTU66Aw3qCfTfXJfGzBv0HF9tbz4GDZxgVcxHpQRsVsf052YL7r/cBJojs5XPxfqnUt6cGJuD044HcItpDwmAhR9a15Xo99/xCWNxwX/BaysvzXnmq75tN/4H0A0BB02YwIj7m6A/EK+CMKFvDnk2APR5G9Dtks/2R5lQ3aNjcciu1fVS1x2CAL6SYnyjBcWZYIqNC2FXzH0A/UY/vxSoQRBFgM1nx/1bsdd/K/FLP5GNu4F5d9oY08at4HJEv20cvq6bjiWIR39t5dNuM/YNzbeY1PjhkkUTHA35t1z7O+6nPtFAVSM5IvNa4In7d9Wq/5fjyAfDv6211Q38MJ/kMm9wp2uMCrn2o/Pi/5bo3/wXxT7glAsy7Adbefh3+zdUB4yP4VQCrgoHggAI84i1v1h/8R0kEF9sc/m0h2BqD9Z+p4qxCi778i7D7Qzv0ncA636sYf98kEkPfn9f+PM1n+h/t63C7NEcx03AXdxOn/ie4D6EmIqvRw8qcnBCL5riJQavRIkQGo7S+d4isMQncQU1EgDKDw4Z4EBzGjjioWOZ2uM7gx15gX4/oavnugZwYNnuHJDxTYRT2db+/FnekT3R/85b9XFJDnR/1zFOWp38BnfX0QfWdKqU8QITxqZnqmQ9/MDfDP0nw63M31snQIR3O2VX15NMp29hfzVKYNxDgMKDhR9rf4/V4PtJvIbekkLsUDwTj499lJ/q/vS/+T/z2b6rhSoA8MGbC4ZUKAX0F/LR/YMC6Jjc0gwDPQqmRKBWGxWNih/JRXYVdaOPPr86uuwXOSVAqr4DBHXIB6FOf0OHRxKbb2vi6BB3IqxQA5GGcQ/hS2N/to/Sao4dUdgTFFS5eg5rsyypUydKNaXAnAyg3X084ur+PUBYX6VN6PtuMNYfm3y2D932s8lTLP0sgH2F/2AQ4Bg22j0xxW1hfgQj5UzdyaokTnkZhRi5peRhWhcM/vhH91L7T7V2XHG5+Y8QohNkd4U8+6keqnp0wj9AqJ+85XHYTxJRQQB9ZzywrmKK0Stb06XcMsPbtaPjkf6m6c2ZnZgGYz9ddI/ZsxgLE0AwOvo+2/tuTbBLrIexUlwB9GK0z58x5NT+wZU0HCXgpskjq1819Efv9j2wTeXyOuwAdo2Hg4ueAfIWmqlgIipnjCq3HxH/W0IfR/g4yE+xrWeJRu7pfTUNuk8OvPPWzjwduYaqjXuSu2uMmr/TkEgaoHWApTXSLJPqHQSjJeZxtZUWznBWyJcSAuRrhxfU9DdJ/owpYAo+qHYRJm8Rp2y8xW7WPUC8Z0DJmxGNqOT1ONwG7fojt4hne4etiZ48O33Bw+XOvad20oAbQgenKNiwQ4a3DlwWml/aLn5b5W4RvMY1Dni3fUAuAYZDMDYBGIfioiHX3eAiTZZjHBb8jehyRHguGXjRTa1y9zHfBUJI9+m4J6enlH81Qu9SZeqBs8/2R1vzf1P4XnfyJfod7nDxOtJg2gfAHBpz0KAJw3GIPtLhpolLW6Cfd7hAP+52oQWNy/9sBTJHZde5w9l1D1cK+KxaT3eLt2J3t7bRwO0uaTCFqEGVsl+DU4hCn+GUiDSA0paeUhd1o03PKjpawemKGXJ6sOyz/d7WJM1MD+LToA76+Yqb48QEbg7EvR4GVO0hZrqTMlDuiz3Xe7iuQR0y7+g8EuAgOrUTMyhDEwxtOBPD08j97D4T+tC0QDJ3jDMOZDhCHBXSDIzdIFQ3ol/ibG7OgWs6yup4jKjo4aea+ubJhN/VmqZXon9ueuMcPdhnF/f0ehz8HQ9OX7xHptYAqJinwpJuClT6GRjgDsvYFkASg34agr42HgBbAVQgc2F1XH7ey79bEguO1+mN/eKUCE3LmTAELLdhNyANeHLHMg+fwevBj1xDK25j7EXEJUmIhp62n+2ng74l6CPxDNIUjFFKt0MY0xzXIUEgXPIjukMiJCu8bCTxAs675qSDgJgpKitDUyIqyxH1APqPCDDRwFSgVj7jzLGV/yXDIlQg95o4dN8yPCCDY2xDYLpt/GFpi4VmDxowWO5k1Z9owDhUic5mqB7IECGtklLq2b4V8UXTP2qSpcxDg2jsjn6JWdVg7imeic7tR09Hro8wjURksAZmMfR8DEVER9Ci6foIxH0I/S8TgDSAjmFbQSufF3cKWk3bMe3f4zIjSBnBmotHZ9788LFFtABuD5D+LvyWZEOAsQhM2CWAOiihNGDAtcRia5KCnsKAKdAkTVo3vD4pcR/uTTNAZjYNQyrTzGhiDslOMCcuYNy2JDrQ7AfqERPePjCHpO+0LbhIOIJsI0C8JGFAAPqLh88j0gBH5Mlx6IcI0D8jmCOL22SapTZBHL5lufIcFRGlj8QVyF3BpC7MfedXbJHo60AGOD/hj4/wIs2uwVVfk3DcSdfBFAZTH/igCdUkWcjf3MYEME0diUfEa2eamWP6mb4DMFHNmMamJ/sg6OV0i3wLlckzoeh7Eh1k01Ho96Q7mYmHuKc58XfkBYIhsiy2ISyp5FigWmZrYRqjQP+b0IBZ725uk5IswUoGxMLFzbFklWHqpfPOTGZAvyRyOiY/07QfJ3wYcw/6/1VaJN4zQ6Y0jGd5vgbE7yPuxwxiTDQW6JdEY/dyk/XkZWP4nkY2BuglKzjTxTJ5ZkD/KqmlmHANiXZSQfqm9f4nZ4aLPcETG1kARDLBcht5Bw3OU94xMWqmyGNGedTnMQ8I3DGnmkQHCiap7Kn57qTvi01Ad4OJDJo0U7JnMpfgUD1gvM4jN4aiYPnJ9PYjhDlNJ6rg1mykR7hrEl9NdSoJIfepJweAe80weTKKFShOxhK1R9DjIIsqVcyDz5SYAfrrnRSaDvqLZJdCgqmv0e9/X27QOCesppHDAIrUvkoGJj3taVCRDpIZg5lGOIssMLVqbA4jH8zLfHQiGtIap6l0TvV6px8Tx07ZlTlqQrVjIbCZGMd0hfjEDv97UzpRTcM4AV1T8E5A7/Ixu/VZAuD9fu959dLUMyTZ1tV99HIH4gP0md6YxU2Q/5i5kCNFrCOeiZN7/swxpVqEj73z7NCsHWQqTu4Mxgfkc/QUp9CCiHtNls0k2lpkgem2gw9j5UM6L0VhiByZ+f4k6/eUEPxOAvEhu/KdROSnKcu5LfSY7rOTt4ZQ9/V9TKfe4X6vFNJZ0nYmw9M016dZ4PdjsvgxoXykmBefzSHkUMIa16zOxnT2WtyEie+nhPiRE5+ZMyV5Jlb6j10fwNSk1YOaLxkekdUQkBW1F0rgJpBMmIoskAy9cBXrvSUr2siKXbnB0g+8RR4rRAyPh9ISvfCEGFhP+ljMQi8l6OJaDn4cTGpEV8rB9H4sunHWO+g5cyjzcbcgSOtpZiYFRvN4BtCR0DNLkwTiUa2HoB+Lm0T1EwqSFTxyJEOxgTpd/9IKMREJuhol0OhqGpRAruA8Ekz7AMvvsCAPO4v2RLE3qQoaBbDyUIGIVZywm9DDgvfGPYRU6ZzRVIFHWb7/ZFRBPpOpWNO5G/04nhRlGuVYpw/fP6zfp0X4aigwQDnLqLHkFAsNdsSzWBvHhL6u/VT6WQgr4P4LtJqPVCMsFIYl8l50SsD1mvWkeES+V5XtUL9tKvBWDsTQuqK91IWkj4U/H/wQLQmUI4NG627ArufykNvsW+IZ5ggSefyCzO9vZ/Uq61hY1hX0JlVfJ6BHLU0pNHisRHi3ZqFUe2BJz54D4j21d1clkjo0jhBoLLsJg6nW5RyKdZ4W9FQyuKBVQUkMFg8dKoqyzKhmllZB1PT8A4a41R7LlrfgjzmgeZKnvWIywgaSZM2mOt6PIizzqvUCpSxslVqxAXqpJ9tBf1aCdihQmyU96dwe+tK7b++OAKet21jW6QuxWvd4HfZDneflYWlolo+ey0qP5XW1ruhJteojNw46DN72eaNpLws89hPFoTbeXKNbqr5OBY/n0t+sLLjeLRvOcmxaaXyoQ57lHRis90HbxyDA3UbLI26Sp0ZlJqPYImWvClkDVB9VU+LMSU/dSeXBOqnjZNihxbD/KfNxebaxjkXBeGXY5bMeNQWlbixmgOmij3UUuKt8cIj/1QR43MS14ZHiwTzgPAOMZ8PHj8cz7FAybDTkq71/UpOCA3p1cEgpdRI1qhlF8rLp0SNPAuPN3X+2/dUE+Mp2sNB/W6DZiZ5+Z/L+DDWfY0WjE/lnXTOXZyv/B2HMjvKs7bsfAAAAAElFTkSuQmCC';

  function ensureLensFilter() {
    if (!document.getElementById('xlrLensSvg')) {
      var wrap = document.createElement('div');
      wrap.innerHTML =
        '<svg id="xlrLensSvg" width="0" height="0" style="position:absolute" aria-hidden="true">' +
        '<filter id="xlrLens" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">' +
        '<feImage href="' + LENS_MAP + '" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" scale="15" xChannelSelector="R" yChannelSelector="G"/>' +
        '</filter></svg>';
      document.body.appendChild(wrap.firstChild);
    }
    /* 折射透镜独立层：拖动时罩在胶囊正上方（嵌在底栏里的 url() 不渲染，独立元素才行） */
    if (!document.querySelector('.nplens')) {
      var lens = document.createElement('div');
      lens.className = 'nplens';
      lens.setAttribute('aria-hidden', 'true');
      document.body.appendChild(lens);
    }
  }

  function buildNav() {
    if (document.querySelector('.mgbar')) return;
    var nav = document.createElement('nav');
    nav.className = 'mgbar';
    nav.innerHTML =
      '<span class="nptail" aria-hidden="true"></span>' +
      '<span class="npill" aria-hidden="true"></span>' +
      '<button type="button" data-nav="cast"><span class="nin">' + navSvg('cast') + '起卦</span></button>' +
      '<button type="button" data-nav="sum"><span class="nin">' + navSvg('sum') + '记录</span></button>' +
      '<button type="button" data-nav="set"><span class="nin">' + navSvg('set') + '设置</span></button>';
    document.body.appendChild(nav);
    try { ensureLensFilter(); } catch (e) { }
    nav.addEventListener('click', function (e) {
      if (nav.__suppressClick) return;
      var b = e.target && e.target.closest ? e.target.closest('button[data-nav]') : null;
      if (!b) return;
      var k = b.getAttribute('data-nav');
      var set = document.querySelector('.setscreen');
      var setOn = !!(set && set.classList.contains('on'));
      var sdb = document.getElementById('sdb');
      var sdbOn = !!(sdb && sdb.classList.contains('on'));
      var closeSet = function () {
        var sb = document.getElementById('setBack');
        if (sb) sb.click(); else if (set) set.classList.remove('on');
      };
      var closeSdb = function () {
        var sx = sdb && sdb.querySelector('.sdb-h .x');
        if (sx) sx.click(); else if (sdb) sdb.classList.remove('on');
      };
      if (k === 'cast') {
        /* 回起卦页：设置/记录都收起来 */
        if (setOn) closeSet();
        if (sdbOn) closeSdb();
      } else if (k === 'sum') {
        if (setOn) closeSet();
        if (!sdbOn) { var s2 = document.getElementById('btnSum'); if (s2) s2.click(); }
      } else if (k === 'set') {
        if (sdbOn) closeSdb();
        if (!setOn) { var st2 = document.getElementById('btnSet'); if (st2) st2.click(); }
      }
      setTimeout(syncNav, 80);
    });
    try { wireLiquidDrag(nav); } catch (e) { }
    try { wireNavCollapse(nav); } catch (e) { }
    syncNav();
  }

  function syncNav() {
    var nav = document.querySelector('.mgbar');
    if (!nav) return;
    if (nav.classList.contains('dragging')) return;   /* ★ 拖动中不改滑块几何，免得和变形动画打架 */
    var set = document.querySelector('.setscreen');
    var sdb = document.getElementById('sdb');
    var act = (set && set.classList.contains('on')) ? 'set'
      : (sdb && sdb.classList.contains('on')) ? 'sum' : 'cast';
    var bs = nav.querySelectorAll('button[data-nav]');
    var target = null;
    for (var i = 0; i < bs.length; i++) {
      if (bs[i].getAttribute('data-nav') === act) { bs[i].classList.add('on'); target = bs[i]; }
      else bs[i].classList.remove('on');
    }
    var pill = nav.querySelector('.npill');
    if (pill && target) {
      pill.style.left = target.offsetLeft + 'px';
      pill.style.width = target.offsetWidth + 'px';
      var tail = nav.querySelector('.nptail');
      if (tail) {
        tail.style.left = (target.offsetLeft + (target.offsetWidth - 64) / 2) + 'px';
      }
    }
  }

  function wireLiquidDrag(nav) {
    var pill = nav.querySelector('.npill');
    var tail = nav.querySelector('.nptail');
    var lens = document.querySelector('.nplens');
    var st = null;
    /*
       图标+字、再稍大一点」；松手丝滑长回。几何变形（宽/高/位置逐帧算），不整体缩放。 */
    var sh = { k: 0, raf: 0 };   /* k: 0=原样，1=缩到目标 */
    function confirmDrag() {
      if (!st || st.confirmed) return;
      st.confirmed = true;
      nav.classList.add('armed');
      /* 九版：缩到原来的 2/3 宽；十版：上下微微盖住整条导航栏 */
      st.tw = Math.max(34, Math.min(st.fw - 6, Math.round(st.fw * 2 / 3)));
      st.th = st.fh + 18;
      animMorph(1, 260);
      startDyn();
    }
    function paint() {
      if (!pill || !st) return;
      var W = st.fw + (st.tw - st.fw) * sh.k;
      var H = st.fh + (st.th - st.fh) * sh.k;
      var lx = st.bl + (st.fw - W) / 2;
      var lt = st.btop + (st.fh - H) / 2;
      pill.style.width = W + 'px';
      pill.style.height = H + 'px';
      pill.style.left = lx + 'px';
      pill.style.top = lt + 'px';
      /* ★ 十二版：形变 = 速度弹簧的实时拉伸（sy 反相压缩，保持体积感） */
      var sx = (sh.k > 0 && dy.str) ? dy.str : 1;
      var sy = 1 - (sx - 1) * 0.5;
      pill.style.transform = 'translate(' + (st.tx || 0) + 'px,0px) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
      if (lens) {
        lens.style.left = (st.navL + lx + (st.tx || 0)) + 'px';
        lens.style.top = (st.navT + lt) + 'px';
        lens.style.width = W + 'px';
        lens.style.height = H + 'px';
        lens.style.transform = 'scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
      }
    }
    function animMorph(to, ms) {
      if (sh.raf) { cancelAnimationFrame(sh.raf); sh.raf = 0; }
      var from = sh.k, t0 = (window.performance && window.performance.now) ? window.performance.now() : Date.now();
      function step(now) {
        var k = (now - t0) / ms;
        if (k > 1) k = 1;
        /* ★ 九版：弹簧感（回弹过冲），比原来的三次缓出更非线性 */
        var q = k - 1;
        var e = 1 + 2.1 * q * q * q + 1.1 * q * q;
        sh.k = from + (to - from) * e;
        paint();
        if (k < 1) sh.raf = requestAnimationFrame(step);
        else sh.raf = 0;
      }
      sh.raf = requestAnimationFrame(step);
    }
    function growBack(rH, rB) {
      if (!pill) return;
      var H1 = parseFloat(pill.style.height) || rH;
      var t0 = (window.performance && window.performance.now) ? window.performance.now() : Date.now();
      function step(now) {
        var k = (now - t0) / 300;
        if (k > 1) k = 1;
        var q = k - 1;
        var e = 1 + 2.0 * q * q * q + 1.0 * q * q;
        var H = H1 + (rH - H1) * e;
        pill.style.height = H + 'px';
        pill.style.top = (rB + (rH - H) / 2) + 'px';
        if (k < 1) requestAnimationFrame(step);
        else { pill.style.height = ''; pill.style.top = ''; }
      }
      requestAnimationFrame(step);
    }
    /*
       速度弹簧（轻微欠阻尼）→ 拉伸/压缩的 Q 弹；色相 = 位置基色 + 速度偏移；
       分光随方向换边；越快色散越明显；彩环随速度轻微转动。幅度克制。 */
    var dy = { raf: 0, vel: 0, str: 1, sv: 0, hue: null, rot: null, dir: 1 };
    function startDyn() {
      if (dy.raf) return;
      dy.vel = 0; dy.str = 1; dy.sv = 0; dy.hue = null; dy.rot = null;
      var last = 0;
      function tick(now) {
        if (!st) { dy.raf = 0; return; }
        if (!last) last = now - 16;
        var dt = Math.max(8, Math.min(48, now - last)) / 16.7;
        last = now;
        var tv = st.vRaw || 0;                                  /* 手指速度 px/ms */
        st.vRaw = tv * Math.pow(0.86, dt);                      /* ★ 停住无新事件→自然衰减→回正 */
        dy.vel += (tv - dy.vel) * Math.min(1, 0.30 * dt);
        /* ★ 拉伸只看速度大小（方向管分光/转动；换向的 Q 弹靠弹簧惯性） */
        var ts2 = 1 + Math.min(0.09, Math.abs(dy.vel) * 0.065);
        dy.sv += ((ts2 - dy.str) * 0.42 - dy.sv * 0.34) * dt;   /* 欠阻尼弹簧 */
        dy.str += dy.sv * dt;
        if (dy.str < 0.90) { dy.str = 0.90; dy.sv = 0; }
        if (dy.str > 1.12) { dy.str = 1.12; dy.sv = 0; }
        var hb = (st.tx || 0) * 0.55 + dy.vel * 26;             /* 色相：位置+速度 */
        var rb = Math.max(-30, Math.min(30, dy.vel * 8));       /* 彩环转动 */
        if (dy.hue === null) { dy.hue = hb; dy.rot = rb; }
        dy.hue += (hb - dy.hue) * Math.min(1, 0.22 * dt);
        dy.rot += (rb - dy.rot) * Math.min(1, 0.22 * dt);
        var o = 0.55 + Math.min(0.22, Math.abs(dy.vel) * 0.08); /* 越快色散越亮 */
        if (dy.vel > 0.015) dy.dir = 1; else if (dy.vel < -0.015) dy.dir = -1;
        nav.style.setProperty('--mg-hue', (Math.round(dy.hue) % 360) + 'deg');
        nav.style.setProperty('--mg-rot', dy.rot.toFixed(1) + 'deg');
        nav.style.setProperty('--mg-ring', o.toFixed(3));
        if (dy.dir === -1) {
          nav.style.setProperty('--mg-fl', 'rgba(104,182,255,.48)');
          nav.style.setProperty('--mg-fr', 'rgba(255,104,170,.46)');
        } else {
          nav.style.setProperty('--mg-fl', 'rgba(255,104,170,.46)');
          nav.style.setProperty('--mg-fr', 'rgba(104,182,255,.48)');
        }
        paint();
        dy.raf = requestAnimationFrame(tick);
      }
      dy.raf = requestAnimationFrame(tick);
    }
    function reset() {
      nav.classList.remove('dragging');
      nav.classList.remove('armed');
      if (sh.raf) { cancelAnimationFrame(sh.raf); sh.raf = 0; }
      sh.k = 0;
      if (pill) { pill.style.height = ''; pill.style.top = ''; }
      nav.style.transform = '';
      nav.style.transformOrigin = '';
      if (pill) pill.style.transform = '';
      var all = nav.querySelectorAll('.nin');
      for (var q = 0; q < all.length; q++) all[q].style.transform = '';
      if (tail) { tail.style.opacity = '0'; tail.style.transform = ''; }
      if (lens) { lens.classList.remove('on'); lens.style.transform = ''; }
      nav.style.removeProperty('--mg-dragx');
      nav.style.removeProperty('--mg-hue');
      nav.style.removeProperty('--mg-rot');
      nav.style.removeProperty('--mg-ring');
      nav.style.removeProperty('--mg-fl');
      nav.style.removeProperty('--mg-fr');
      /* ★ 十版：轻点抖动也可能触发过几何变形，收尾必须把胶囊宽/位复位到当前格 */
      syncNav();
    }
    nav.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return;
      if (nav.classList.contains('mgc')) return;   /* 收起成细条时：点击=展开，不进入拖拽 */
      st = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false, id: e.pointerId };
      if (pill) {
        var nr = nav.getBoundingClientRect();
        st.baseL = nr.left + pill.offsetLeft;
        st.baseT = nr.top + pill.offsetTop;
        st.pW = pill.offsetWidth;
        st.pH = pill.offsetHeight;
        /* ★ 八版：记下原样几何与目标尺寸，供几何变形用 */
        st.fw = pill.offsetWidth; st.fh = pill.offsetHeight;
        st.bl = pill.offsetLeft; st.btop = pill.offsetTop;
        st.navL = nr.left; st.navT = nr.top;
        st.tw = st.fw; st.th = st.fh;
      }
      try { nav.setPointerCapture(e.pointerId); } catch (err) { }
      nav.classList.add('dragging');
      if (lens && pill) {
        lens.style.left = st.baseL + 'px';
        lens.style.top = st.baseT + 'px';
        lens.style.width = st.pW + 'px';
        lens.style.height = st.pH + 'px';
        lens.classList.add('on');
      }
    });
    nav.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      st.dx = e.clientX - st.x;
      st.dy = e.clientY - st.y;
      var dx = st.dx, dy = st.dy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (!st.moved && dist > 6) {
        /*
           进入跟手态先不形变：位移>26px，或拖动持续 90ms 以上且还有新移动事件，
           才「确认拖动」。轻点整个生命周期内都不会触发变形/点亮/彩边。 */
        st.moved = true;
        st.movedAt = e.timeStamp || Date.now();
      }
      if (st.moved && !st.confirmed &&
          ((e.timeStamp || Date.now()) - st.movedAt > 90 || dist > 26)) confirmDrag();
      if (!st.moved) return;
      /*
         这样"起卦→设置"可以一口气拖过去，不用分两次。 */
      var barW = nav.clientWidth - 10;
      var pL = pill ? parseFloat(pill.style.left || '0') || 0 : 0;
      var pW = pill ? parseFloat(pill.style.width || '0') || 0 : 0;
      var tx = dx * 0.95, ty = 0;   /* 拖拽只允许左右，垂直恒为 0 */
      if (pill) {
        var lo = -pL, hi = barW - pW - pL;
        if (lo > hi) { lo = hi = 0; }
        if (tx < lo) tx = lo;
        if (tx > hi) tx = hi;
        var tms = e.timeStamp || Date.now();
        if (st.lastT) {
          var ddt = Math.max(1, tms - st.lastT);
          st.vRaw = (tx - (st.lastTx === undefined ? tx : st.lastTx)) / ddt;
        }
        st.lastT = tms; st.lastTx = tx;
        st.tx = tx;
        paint();
      }
      /* 液滴尾巴：药丸与手指之间那截"拉丝"（★ 十一版：确认拖动后才出现） */
      if (tail && st.confirmed) {
        var k = Math.min(1, dist / 200);
        tail.style.opacity = (0.75 * k).toFixed(3);
        tail.style.transform = 'translate(' + (dx * 0.34) + 'px,' + 0 + 'px) scale(' +
          (1 + Math.min(0.9, dist / 260)) + ',' + (1 - Math.min(0.25, dist / 900)) + ')';
      }
      /* 玻璃高光随手指偏移；光谱与形变由动态循环实时演算（见 startDyn） */
      nav.style.setProperty('--mg-dragx', (dx * 0.45) + 'px');
    });
    function finish(e) {
      if (!st) return;
      var wasMoved = st.moved, id = st.id, tx = st.tx || 0;
      var rH = st.fh, rB = st.btop;   /* ★ 九版：快照留给 growBack（st 马上就置空） */
      st = null;
      try { nav.releasePointerCapture(id); } catch (err) { }
      /*
         手指微抖 >6px 会进拖拽态，松手时合成 click 被吞。位移 <18px 一律按轻点：
         复位放行，click 正常触发。 */
      if (!wasMoved || Math.abs(tx) < 18) { reset(); return; }
      /*
         先把拖动位移"过户"到 left 上（视觉位置完全不变），再让它
         单程滑向目标格。这样"回弹"和"滑格"不再是两个打架的动画。 */
      var bs = nav.querySelectorAll('button[data-nav]');
      var pL = pill ? parseFloat(pill.style.left || '0') || 0 : 0;
      var pW = pill ? parseFloat(pill.style.width || '0') || 0 : 0;
      var visLeft = pL + tx;
      var cur = 0, target = 0, best = 1e9;
      for (var i = 0; i < bs.length; i++) {
        if (bs[i].classList.contains('on')) cur = i;
        var bcx = bs[i].offsetLeft + bs[i].offsetWidth / 2;
        var dd = Math.abs(bcx - (visLeft + pW / 2));
        if (dd < best) { best = dd; target = i; }
      }
      /* 过渡还关着（.dragging 在）——这几步都是瞬时的 */
      if (pill) { pill.style.transform = ''; pill.style.left = visLeft + 'px'; }
      if (tail) { tail.style.opacity = '0'; tail.style.transform = ''; }
      if (lens) lens.classList.remove('on');
      if (dy.raf) { cancelAnimationFrame(dy.raf); dy.raf = 0; }
      nav.style.removeProperty('--mg-dragx');
      nav.style.removeProperty('--mg-hue');
      nav.style.removeProperty('--mg-rot');
      nav.style.removeProperty('--mg-ring');
      nav.style.removeProperty('--mg-fl');
      nav.style.removeProperty('--mg-fr');
      void nav.offsetWidth;                 /* 强制回流，让上面的瞬时值生效 */
      nav.classList.remove('dragging');     /* 打开过渡 */
      nav.classList.remove('armed');        /* ★ 十一版：点亮态随拖动一起收 */
      /* 触发切页（如果要换），并把胶囊滑向目标格 —— 单程动画 */
      if (target !== cur) bs[target].click();
      if (pill && bs[target]) {
        pill.style.left = bs[target].offsetLeft + 'px';
        pill.style.width = bs[target].offsetWidth + 'px';
      }
      /* 拖动结束后系统补发的 click 一律吞掉 */
      nav.__suppressClick = true;
      setTimeout(function () { nav.__suppressClick = false; }, 500);
      growBack(rH, rB);   /* ★ 九版：松手丝滑长回（st 已置空，用快照值） */
    }
    nav.addEventListener('pointerup', finish);
    nav.addEventListener('pointercancel', finish);
  }

  function wireNavCollapse(nav) {
    var lastT = null, lastY = 0;   /* 记「哪个滚动容器」+ 上次位置 */
    function narrow(v) {
      var c = nav.classList.contains('mgc');
      if (v && !c) nav.classList.add('mgc');
      else if (!v && c) nav.classList.remove('mgc');
    }
    /*
       用捕获阶段统一接所有 scroll（含浮层内部），换容器时先记基准再判方向。 */
    document.addEventListener('scroll', function (e) {
      try {
        if (!window.matchMedia || !({matches:true}).matches) { narrow(false); return; }
      } catch (err) { return; }
      if (nav.classList.contains('dragging')) return;
      var t = e.target;
      var el = (t === document) ? document.documentElement : t;
      if (!el || typeof el.scrollTop !== 'number') return;
      if (el !== lastT) { lastT = el; lastY = el.scrollTop; return; }
      var y = el.scrollTop, dy = y - lastY;
      lastY = y;
      if (y < 90) { narrow(false); return; }
      if (dy > 3) narrow(true);
      else if (dy < -3) narrow(false);
    }, true);
    nav.addEventListener('click', function () { narrow(false); });
    /* */
    var vv = window.visualViewport;
    function kbCheck() {
      try {
        /*
           起因是「进页面就检测键盘」的开机检查，在 APP 里把启动瞬间的视口抖动
           误判成键盘态（底栏被淡出）。改成双条件：有输入框正在编辑 且 可视区
           明显变矮（>100px）才算键盘；只有聚焦、高度没变，一律不算。 */
        var ae = document.activeElement;
        var editable = !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA'));
        var open = !!(vv && editable && (window.innerHeight - vv.height) > 100);
        /*
           第一次碰屏幕（工具条收起）才露出来 ⇒ 按「可视区底部」锚定：
           布局视口比可视区多出来的带子（最多按 56px）垫在底栏下面。
           键盘弹起时不垫（走淡出）。 */
        var vb = 0;
        /* ★ 十二版：APP（Capacitor）里没有浏览器工具栏，一律不垫；网页里也只认
           「合理值」（0<gap≤56）——启动瞬间的大差值是视口抖动，不采信。 */
        if (vv && !open && !window.Capacitor) {
          var lp = document.documentElement.clientHeight || window.innerHeight;
          var gap = Math.round(lp - (vv.offsetTop + vv.height));
          if (gap > 0 && gap <= 56) vb = gap;
        }
        nav.style.setProperty('--mg-vb', vb + 'px');
        var c = nav.classList.contains('kb');
        if (open && !c) nav.classList.add('kb');
        else if (!open && c) nav.classList.remove('kb');
      } catch (e) { }
    }
    if (vv) {
      vv.addEventListener('resize', kbCheck);
      vv.addEventListener('scroll', kbCheck);
    }
    window.addEventListener('focusin', function () { setTimeout(kbCheck, 60); });
    window.addEventListener('focusout', function () { setTimeout(kbCheck, 60); });
    /* ★ 十版：进页面 / 加载完 / 每次滚动都校一次（工具条收起时可视区会变化） */
    setTimeout(kbCheck, 300);
    window.addEventListener('load', function () { setTimeout(kbCheck, 150); });
    document.addEventListener('scroll', function () { kbCheck(); }, true);
  }

/* ===== 装配（新写，非早期实现原样）===== */
/* ⚠ 新仓与早期实现的**结构差异**（接线时要处理的）：
   新仓的设置页按需挂载 —— `SettingsScreen.jsx` L592 才渲染 `<div className="setscreen on?" id="setScreen">`
   ＋ `#setBack`，首次打开前这两个节点**不存在**（早期实现是初始 HTML 里就有、隐藏）。
   所以 `syncNav()` 的 `setOn` 在"从未开过设置"时为 false ⇒ 点 设置 会走 `#btnSet.click()` 打开
   （外壳捕获链路 ⇒ openSettings()），随后节点出现、判定恢复正常。
   ⇒ 只需在**点击之后**补一次同步（覆盖：顶栏 #btnSet 开设置 / #setBack 关设置 / #btnSum 开关记录抽屉），
     不引入观察者、不加轮询（syncNav 自身很轻，且有 dragging 守卫）。 */
function resyncOnClick() {
  if (window.__xlrNavClickSync) return;
  window.__xlrNavClickSync = 1;
  document.addEventListener('click', function () {
    setTimeout(function () { try { syncNav(); } catch (e) { } }, 120);
  }, true);
}

export const PhoneNav = {
  navSvg: navSvg,
  ensureLensFilter: ensureLensFilter,
  buildNav: buildNav,
  syncNav: syncNav,
  wireLiquidDrag: wireLiquidDrag,
  wireNavCollapse: wireNavCollapse,
  install: function (opts) {
    /*
       但是肯定不能出现在屏幕上，也不能有功能。」
       ⇒ 手机端调 `install({ enabled: false })`：**不建节点、不接线**（比"建了再 display:none"更彻底 ——
         以后任何皮肤/CSS 都不可能把它露出来，也不存在任何监听器）。本文件的搬入内容留作备用，
         将来宽屏/桌面版要用 ⇒ 把这一处传 `{ enabled: true }` 即可。 */
    var enabled = !(opts && opts.enabled === false);
    var ev = { enabled: enabled, nav: false, lens: false, error: null };
    if (!enabled) return ev;
    try { ensureLensFilter(); ev.lens = !!document.getElementById('xlrLensSvg'); } catch (e1) { ev.error = String((e1 && e1.message) || e1); }
    try { buildNav(); ev.nav = !!document.querySelector('.mgbar'); } catch (e2) { if (!ev.error) ev.error = String((e2 && e2.message) || e2); }
    try { syncNav(); } catch (e3) { }
    try { resyncOnClick(); ev.clickSync = !!window.__xlrNavClickSync; } catch (e4) { }
    return ev;
  },
  state: function () {
    var nav = document.querySelector('.mgbar');
    if (!nav) return { nav: false };
    var pill = nav.querySelector('.npill'), tail = nav.querySelector('.nptail');
    var bs = [].map.call(nav.querySelectorAll('button[data-nav]'), function (b) {
      var r = b.getBoundingClientRect();
      return { k: b.getAttribute('data-nav'), on: b.classList.contains('on'), box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] };
    });
    return {
      nav: true,
      display: getComputedStyle(nav).display,
      pill: pill ? { left: pill.style.left, width: pill.style.width } : null,
      tail: tail ? { left: tail.style.left } : null,
      lensSvg: !!document.getElementById('xlrLensSvg'),
      lens: document.querySelectorAll('.nplens').length,
      btns: bs,
    };
  },
};
