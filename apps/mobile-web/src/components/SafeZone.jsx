/* SafeZone.jsx —— 一块渲染出错时**只废掉这一块**，不让整棵 React 树连带整个界面静默失灵。
 *
 *   出过一次真实的：记录抽屉里有一条**带断辞**的记录 ⇒ `CaseRow` 里调了个不存在的全局函数
 *   ⇒ 抛 TypeError ⇒ 没有边界 ⇒ **`#sdb` 连遮罩一起消失**、只剩 `html.sdb-lock`
 *   ⇒ 用户看到的就是「点『记录』完全没反应」，而且不报错、不提示。
 *
 * 用法：把可能因数据而出错的子树包起来
 *   <SafeZone what="记录">
 *     <Records … />
 *   </SafeZone>
 * 出错时它渲染一块**跟皮肤走的**提示（用它自己那几个 CSS 变量，不写死颜色），
 */
import { Component } from 'react';

export default class SafeZone extends Component {
  constructor(p) {
    super(p);
    this.state = { err: null };
  }

  static getDerivedStateFromError(err) {
    return { err: (err && (err.message || String(err))) || '未知错误' };
  }

  componentDidCatch(err, info) {
    try {
      const list = (window.__xlrSafeErrors = window.__xlrSafeErrors || []);
      list.push({ what: this.props && this.props.what, msg: String((err && err.message) || err), at: Date.now() });
      if (window.__xlrSafeErrors.length > 50) window.__xlrSafeErrors.shift();
    } catch (e) { }
    /* 控制台留全栈：出问题时按 F12 就能看见是谁炸的（原来什么线索都没有） */
    try { console.error('[SafeZone] ' + ((this.props && this.props.what) || '') + ' 这块渲染出错：', err, info); } catch (e2) { }
  }

  render() {
    if (!this.state.err) return this.props.children;
    const what = this.props && this.props.what ? this.props.what : '这块';
    return (
      <div
        role="alert"
        style={{
          margin: '12px 16px',
          padding: '12px 14px',
          border: '1px solid var(--line2, rgba(128,128,128,.35))',
          borderRadius: '10px',
          background: 'var(--accent-bg, rgba(128,128,128,.08))',
          color: 'var(--ink, inherit)',
          fontSize: '12.5px',
          lineHeight: 1.8,
        }}>
        <b style={{ color: 'var(--accent, inherit)' }}>{what}出错了</b>
        <div style={{ color: 'var(--dim, inherit)', marginTop: 4 }}>
          数据或渲染有问题，这一块先跳过了——其它部分照常用。
        </div>
        <div style={{ color: 'var(--dim2, #888)', marginTop: 4, wordBreak: 'break-all' }}>{this.state.err}</div>
        <button
          type="button"
          className="btn sm"
          style={{ marginTop: 8 }}
          onClick={() => this.setState({ err: null })}>重试</button>
      </div>
    );
  }
}
