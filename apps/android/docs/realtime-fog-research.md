# 实时雾气可行性研究

。仅研究，没有修改当前应用效果，也没有接入新渲染器。

## 结论

可以保持 Kuikly + Compose 页面，用 Kuikly 的原生组件扩展承载实时雾气。现有 Compose Canvas 不提供已验证的任意 Android RuntimeShader 透传能力。建议先做 Android 13+ 的 AGSL 自定义 View 原型，老系统保留现有淡雾；如果要求老系统也用实时程序雾，再评估 OpenGL ES。

## 本地版本证据

依赖实际为 com.tencent.kuikly-open:compose-android 与 core-render-android 2.30.0-2.1.21。检查的是本地 AAR 内 classes.jar，不以远端 main 分支代替当前版本。

- Brush.Companion 公开 linearGradient/horizontalGradient/verticalGradient，没有 ShaderBrush 类。
- Paint 虽然有 Object 类型的 shader 属性，但 KuiklyCanvas.fillOrStroke 调用 toKuiklyLinearGradient，随后将渐变或纯色发送给 CanvasContext，不能凭 shader 属性存在推断支持 Android RuntimeShader。
- KuiklyRenderViewBaseDelegatorDelegate 确有 registerExternalRenderView(IKuiklyRenderExport)。
- IKuiklyRenderExport 确有 renderViewExport(name, creator, shadowCreator)。
- IKuiklyRenderViewExport 确有 setProp、onDestroy、onAddToParent、onRemoveFromParent 等接口。
- Compose 扩展 MakeKuiklyComposeNode 可以承载 DeclarativeBaseView，不需要引入 androidx.compose.foundation 或 WebView。
- 当前 MainActivity 的 delegate 为空实现，尚未注册自定义雾气 View。
- 当前应用 minSdk 24，compileSdk/targetSdk 34；当前模拟器 ro.build.version.sdk=35，具备测试 AGSL 的系统版本条件。实际着色器编译和绘制尚未验证。

## 视觉算法

首选实时程序雾：在着色器内用随时间连续变化的三维低频噪声计算二维浓度，再用缓慢变化的流向扭曲坐标。浓度和轮廓本身会变化，区别于移动固定 PNG。只用少量低频层，避免高频叠加和窄阈值产生皱褶。以低透明度、大尺度过渡和有色雾为目标。

这属于程序化雾感，不等于物理流体。若要求两股雾相撞后受力、形成涡旋、扩散并保持流场状态，需要低分辨率速度/密度网格及多步迭代求解；可考虑 OpenGL ES 多遍渲染，工作量与耗电控制都更复杂。真实三维体积雾的光线步进还需要额外采样，当前背景需求尚不值得直接采用。

## 路线比较

| 路线 | 能力与代价 |
| --- | --- |
| AGSL RuntimeShader + 原生 View | Android 13/API 33 起；直接绘制透明雾；接入相对小；当前优先原型路线 |
| OpenGL ES + Kuikly 自定义组件 | 可覆盖更老的 Android，需核查设备 GPU 能力；适合程序雾或有状态流体；增加 EGL、合成、线程和生命周期管理 |
| 现有 Kuikly Canvas 逐帧大量绘制 | 可做低分辨率近似，但跨层绘制指令、平滑程度和帧率未验证，不作为最高质量主路线 |

## 最小验证方案（尚未执行）

1. 先验证单个原生 View 的透明 AGSL 随时间变化，再通过注册接口与 MakeKuiklyComposeNode 接入 Kuikly。
2. 仅传皮肤色、浓度、流速、动画开关等低频属性；帧时钟留在原生绘制层，不逐帧经 Platform 桥往返。
3. 输出预乘透明颜色，雾层不接收触摸，文字和输入卡位于其上。避免给整页设置 RenderEffect。
4. 使用真实 elapsed time，暂停/离屏停止刷新，恢复时避免相位跳变。先以 30fps 为实验目标；不把目标当成实测成绩。
5. 检查切肤、动效开关、键盘弹起、翻页、后台恢复、full/lite，以及实机耗时与发热。性能、观感和透明层叠加都必须实际验。
6. Android 13 以下先回退现有淡雾，不提高 minSdk。是否补 OpenGL ES 统一效果另作决定。

## 官方资料

- Kuikly 自定义组件说明：https://github.com/Tencent-TDS/KuiklyUI-AI/blob/main/skills/kuikly-expand-view/SKILL.md
- Android AGSL：https://developer.android.com/develop/ui/views/graphics/agsl
- 使用 RuntimeShader 绘制与动画：https://developer.android.com/develop/ui/views/graphics/agsl/using-agsl
- Android OpenGL ES：https://developer.android.com/develop/ui/views/graphics/opengl

上述是能力与接口可行性结论，不是已完成的实时雾气或性能承诺。

## 首版实测（）

已接入 MakeKuiklyComposeNode → RealtimeFogNode → XLRRealtimeFog 注册组件 → 原生 FogSurface。Android 13+ 走 AGSL；旧系统保留 PNG 回退。RealtimeFogView.kt 内是完整实现。当前模拟器 API 35：assembleDebug 成功，XLRFOG 日志确认 AGSL compiled、1080×2412 hardware=true；三项判据自检 PASS 7/7、QUICK PASS 24/24、PASS 198/198。通过安卓调试连接实际点击进入页面、打开皮肤菜单、从宣纸切到梦幻，内容与触摸正常，色雾正常显示。只做了模拟器短时检查，没有实机耗电/发热数据，不把 30fps 的调度目标视作全部设备的性能保证。未打正式包，待用户看效果。

## 当前皮肤分流更新

要求敦煌、莫高窟退出实时雾，恢复原 PNG 路线；黑白、黑夜、梦幻、宣纸、青瓷、豆沙使用完整实时形变与随机游走，卡通保持平面。最新详细实现与验证记录见 `实时雾气实现说明.md`。本文件此前“莫高窟实时试版”的内容属于历史。
