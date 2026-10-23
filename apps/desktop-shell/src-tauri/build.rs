// 小六壬 · Tauri 版构建脚本
//
// 作用：tauri-build 会在这里生成 Windows 资源文件，**把 icons/icon.ico 嵌进 exe**。
//
// ★ 换图标后必须让这个脚本重跑，否则 exe 里还是旧图标：
//     cargo 只在 build.rs / tauri.conf.json 等文件变动时才重跑构建脚本，
//     光换 icons/ 里的图不会触发（实测 `cargo build` 会「Finished in 0.6s」什么都不做）。
//     笨但可靠的办法：改一下本文件的注释（哪怕加个空格），或者 `cargo clean` 整个重建。
//     （`cargo clean -p xiaoliuren` 实测删 0 个文件，靠不住。）
fn main() {
    tauri_build::build()
}
// ★ 2026-10-16（(会话)）：图标换成 `out-ref/图标/阴阳定.png`（阴阳定）—— 按上面这条规矩，
//    动本文件就是为了让构建脚本重跑、把新 icons/icon.ico 嵌进 exe；
// ★ 2026-10-16（第二轮：透明背景）—— 用户「我想要透明背景」⇒ 图标改成抠掉外部白底的透明版，
//    再动一次本文件触发重嵌（否则 exe 里还是白底那版）。
// ★ 2026-10-16（第三轮：抠掉中心那块椭圆） —— 再触发一次重嵌（不改这条，exe 里还是早前的版本图标）。
