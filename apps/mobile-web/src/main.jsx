import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

/* ★ （现象：「安卓版无法更新」，气泡里只有 `s.then is not a function`）：
   安卓 release 包里没有 devtools，压缩后的变量名（s）根本定位不到行。
   这里挂全局捕获，把最后一条错误的 message + 栈存进 localStorage；
   在「设置 → 关于」连点版本号 5 次可以看到（普通用户不会看到，不碍界面）。
   以后任何安卓侧报错，截图这一块就能直接指到代码。 */
(function hookErrors() {
  const keep = (kind, msg, stack) => {
    try {
      localStorage.setItem('xlr-last-error', JSON.stringify({
        kind: kind,
        msg: String(msg == null ? '' : msg),
        stack: String(stack || '').slice(0, 4000),
        at: new Date().toISOString(),
      }));
    } catch (e) { /* 存不下就算了，不能因为诊断把主流程搞坏 */ }
  };
  window.addEventListener('error', (e) => {
    keep('error', e && e.message,
      (e && e.error && e.error.stack) || (e && e.filename ? e.filename + ':' + e.lineno : ''));
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason;
    keep('promise', (r && r.message) || r, (r && r.stack) || '');
  });
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
