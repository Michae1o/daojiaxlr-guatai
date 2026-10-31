/* UpdateTip.jsx —— 启动时静默查到新版本后，右下角那一条（2026-10-25 用户要）。
 *
 * 原文：「小提示里可以有一个按钮叫去更新，点了之后就转到设置的更新页面，
 *            如果用户点了这个按钮转到页面，则检查更新的按钮应该会自动变成立即更新，
 *            需要用户点击立即更新才可以，而且立即更新的按钮颜色变一下，不要和检查更新的颜色一样。」
 *
 * 口径：
 *   · **只提示，不自动下** —— 用户点了「去更新」只是跳到设置页并把信息带过去；
 *     真正下载要他再点一次「立即更新」（那时按钮是强调色 `.sbtn pri`）。
 *   · 点「以后」就收起，本进程内不再弹（不打扰）。
 *   · 这里不写样式：`.updtip` 在 src/styles/legacy.css（样式唯一样源），只用皮肤变量。
 */
export default function UpdateTip({ info, onGo, onLater }) {
  if (!info) return null;
  return (
    <div className="updtip" id="updTip">
      <div className="t"><b>有新版本</b><span>v{info.version}</span></div>
      <div className="b">
        <button className="sbtn pri" type="button" id="updTipGo" onClick={onGo}>去更新</button>
        <button className="sbtn" type="button" id="updTipLater" onClick={onLater}>以后</button>
      </div>
    </div>
  );
}
