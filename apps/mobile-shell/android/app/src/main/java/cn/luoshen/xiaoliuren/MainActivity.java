package cn.luoshen.xiaoliuren;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /**
     * ★ 注册 app 内更新插件（XlrUpdate）+ 导出落盘插件（XlrFiles）。
     * ⛔ registerPlugin 必须在 super.onCreate 之前调用 —— Capacitor 在 super 里就把插件表交给 Bridge 了，
     *    放后面注册的插件前端永远调不到（表现是 window.Capacitor.Plugins.XlrUpdate 为 undefined）。
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(XlrUpdatePlugin.class);
        registerPlugin(XlrFilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
