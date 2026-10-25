// 小六壬 · 起卦解卦台 —— Tauri 版主进程
//
// 和 Electron 版的区别：
//   不打包 Chromium（用系统 WebView2），体积 6 MB，对比 Electron 的 268 MB。
//
// 为什么自己写 http_fetch 而不用 tauri-plugin-http：
//   实测（信标报告）`window.__TAURI__.http` 并不存在——该插件不往全局挂，
//   要在打包器里 import @tauri-apps/plugin-http 才行，而本应用是单个静态 HTML，没有打包器。
//   所以直接在 Rust 侧提供命令：请求由 Rust 发出，**没有跨域这回事**，也不需要本地中转服务。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::sync::atomic::{AtomicI32, Ordering};

#[derive(serde::Deserialize)]
struct Req {
    url: String,
    method: Option<String>,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
}

/// 代发一次 HTTP 请求，回 {status, body}。给前端的 fetch 适配层用。
#[tauri::command]
async fn http_fetch(req: Req) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())?;

    let m = req.method.unwrap_or_else(|| "GET".to_string());
    let method = reqwest::Method::from_bytes(m.as_bytes()).map_err(|e| e.to_string())?;
    let mut rb = client.request(method, &req.url);

    if let Some(h) = req.headers {
        for (k, v) in h.iter() {
            rb = rb.header(k.as_str(), v.as_str());
        }
    }
    if let Some(b) = req.body {
        rb = rb.body(b);
    }

    let resp = rb.send().await.map_err(|e| format!("请求失败: {e}"))?;
    let status = resp.status().as_u16();
    let text = resp.text().await.map_err(|e| format!("读响应失败: {e}"))?;

    Ok(serde_json::json!({ "status": status, "body": text }).to_string())
}

/// 用系统默认浏览器打开外链（桌面版专用；网页端/安卓端不走这里）。
/// 只放行 http/https；不经 shell，参数直传，无注入面。
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    let u = url.trim();
    if !(u.starts_with("https://") || u.starts_with("http://")) {
        return Err("只放行 http/https 链接".into());
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("rundll32.exe")
            .args(["url.dll,FileProtocolHandler", u])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(u)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(u)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 导出文件：写进用户的「下载」文件夹（桌面版的 WebView 不处理浏览器式下载，用它替代）。
#[tauri::command]
fn save_export(name: String, text: String) -> Result<String, String> {
    let safe: String = name
        .chars()
        .filter(|c| c.is_alphanumeric() || "._-（）·（）".contains(*c) || (*c as u32) > 127)
        .collect();
    let safe = if safe.is_empty() { "导出.json".to_string() } else { safe };
    // ★ （mac 编译包）：Windows 用 USERPROFILE，macOS / Linux 只有 HOME。
    //   ⛔ 原来的单取值写法在 mac 上必然 Err ⇒ 「导出」按钮直接失败（编译却完全正常）。
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|e| e.to_string())?;
    let dl = std::path::Path::new(&home).join("Downloads");
    let dir = if dl.exists() { dl } else { std::path::Path::new(&home).to_path_buf() };
    let path = dir.join(&safe);
    std::fs::write(&path, text).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

/* ===== 变更记录：换版本就自动清 WebView2 的 HTTP 缓存 =====
 *
 * 为什么要它（报，见 变更记录 变更记录）：
 *   exe 一重建，WebView2 的缓存里可能还留着**旧文档**（旧开屏结构配新样式/新脚本）⇒ 画面失配
 *   （实测表现：主内容区被渐变面板 ＋ 巨型箭头盖住）。手动跑 `清缓存重开-小六壬.bat` 即恢复；
 *   Chromium 侧（明文/壳 × 老版/当前版 四组）**复现不出** ⇒ 定性为缓存残留，不是代码问题。
 *
 * 口径（与那个 bat 的第 3 步**逐条一致**，不自行扩大）：
 *   只删 `EBWebView\Default\{Cache, Code Cache}` 两处；**localStorage 一律不动**（用户的记录在里面）。
 *
 * 判据（不是"每次启动都清"）：
 *   ① 指纹相符（同一份 exe 再开）⇒ **不清**，缓存要留得住；
 *   ② 指纹与当前 exe 不符 ⇒ 清一次，并刷新指纹；
 *   ③ 从没有指纹的老版本升上来（缓存目录在、指纹文件不在）⇒ 当成换版本，清一次。
 *   指纹 = exe 文件内容的 64 位 FNV-1a（不引依赖；6 MB 读一遍几毫秒）。
 *   ⛔ 任何失败都不许崩（release 是 `panic = "abort"`）：本函数全程吞错，只把结果写进指纹文件第 3 行。
 *   ⛔ 必须在 WebView2 起来**之前**跑：起来之后缓存文件被占住，删不掉。
 */

/// 64 位 FNV-1a（只用来"是不是同一份 exe"，不是密码学用途）
fn fnv1a_64(bytes: &[u8]) -> u64 {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for b in bytes {
        h ^= *b as u64;
        h = h.wrapping_mul(0x0000_0100_0000_01b3);
    }
    h
}

fn exe_fingerprint() -> Option<String> {
    let p = std::env::current_exe().ok()?;
    let bytes = std::fs::read(p).ok()?;
    Some(format!("{:016x}", fnv1a_64(&bytes)))
}

/// 清缓存（需要时）并把指纹写回；返回这一句动作记录（探针读它，人也能直接看）。
fn purge_webview_cache_on_upgrade(identifier: &str) -> String {
    let base = match std::env::var("LOCALAPPDATA") {
        Ok(v) => std::path::PathBuf::from(v).join(identifier),
        Err(_) => return "skipped（环境里没有 LOCALAPPDATA）".to_string(),
    };
    let cur = match exe_fingerprint() {
        Some(s) => s,
        None => return "skipped（读不到 exe 自己）".to_string(),
    };

    let stamp = base.join(".web-cache-stamp");
    let prev = std::fs::read_to_string(&stamp)
        .ok()
        .and_then(|s| s.lines().next().map(|l| l.trim().to_string()))
        .unwrap_or_default();

    let dflt = base.join("EBWebView").join("Default");
    let caches = [dflt.join("Cache"), dflt.join("Code Cache")];
    let has_cache = caches.iter().any(|p| p.exists());

    let need = if prev.is_empty() { has_cache } else { prev != cur };
    let action = if !need {
        format!("kept（指纹相符 {cur}，不清）")
    } else {
        let (mut done, mut failed) = (0usize, 0usize);
        for p in &caches {
            if !p.exists() {
                continue;
            }
            match std::fs::remove_dir_all(p) {
                Ok(_) => done += 1,
                Err(_) => failed += 1,
            }
        }
        let why = if prev.is_empty() { "老版本升上来（有缓存、无指纹）" } else { "换版本" };
        format!("cleared（{why}：{} → {cur}；删 {done} 处，失败 {failed} 处）", if prev.is_empty() { "(无)" } else { &prev })
    };

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let _ = std::fs::create_dir_all(&base);
    let _ = std::fs::write(&stamp, format!("{cur}\n{now}\n{action}\n"));
    action
}


/* ===== app 内更新（桌面档 B：下载整包 → 后台换装 → 自己重启）=====
 *
 * 定：「win免安装先走B，安卓一起走」。
 *
 * 为什么不用 Tauri 官方 updater：
 *   `tauri.conf.json` 里 `bundle.active = false`（本软件是免安装 zip：启动器 + app\ 本体 + dll），
 *   官方 updater 要的是 NSIS/MSI 装出来的安装目录 + minisign 签名链，这里一条都不成立。
 *
 * 换装为什么必须借 .bat：
 *   Windows 不允许覆盖**正在运行**的 exe（os error 5）。所以下载/校验/解压都在 Rust 里做完，
 *   只把「等本进程退出 → 覆盖 app\ → 重新拉起」交给一个两秒的小批处理。
 *
 * 三条口径：
 *   ① 只覆盖 `app\` 里的东西 + 包根的 txt，**不动启动器 exe**（那个没有源码在本仓，改了没法复现）；
 *   ② 校验不过就整个放弃，一个文件都不落进包里（宁可不更新，也不留半套）；
 *   ③ 换装失败时旧 exe 还在 —— bat 里先 move 再起，覆盖不了就还是旧的，用户看到的是「没更新」而不是「打不开」。
 */
fn sha256_hex(b: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut h = Sha256::new();
    h.update(b);
    h.finalize().iter().map(|x| format!("{:02x}", x)).collect()
}

fn copy_dir_all(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for e in std::fs::read_dir(src)? {
        let e = e?;
        let to = dst.join(e.file_name());
        if e.file_type()?.is_dir() {
            copy_dir_all(&e.path(), &to)?;
        } else {
            std::fs::copy(e.path(), &to)?;
        }
    }
    Ok(())
}

/// 免安装包的根目录（启动器 + `app\` 那一层）。不是这个结构就拒绝更新。
fn package_root() -> Result<std::path::PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = exe.parent().ok_or("拿不到软件目录")?.to_path_buf();
    let in_app = dir
        .file_name()
        .map(|n| n.eq_ignore_ascii_case("app"))
        .unwrap_or(false);
    if !in_app {
        return Err("这份软件不是免安装包结构，没法自动更新；请到下载页重新下一个完整包".to_string());
    }
    dir.parent()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| "拿不到包目录".to_string())
}

/// 更新包里「含 app\xiaoliuren.exe」的那一层（zip 顶层目录名每个版本都不一样，不写死）。
fn find_payload(dir: &std::path::Path) -> Option<std::path::PathBuf> {
    fn marker(p: &std::path::Path) -> bool {
        p.join("app").join("xiaoliuren.exe").is_file()
    }
    if marker(dir) {
        return Some(dir.to_path_buf());
    }
    for e in std::fs::read_dir(dir).ok()?.flatten() {
        let p = e.path();
        if p.is_dir() && marker(&p) {
            return Some(p);
        }
    }
    None
}

/// 当前版本（Cargo.toml 那处，`tools\版本号.py` 与 tauri.conf 一起写，不会漂）
#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// 下载进度：-1 = 没在下载 · 0..=99 = 百分比 · 100 = 下完了（在解压换装）
///
/// 为什么用「全局原子量 + 前端轮询」而不是 Tauri 事件：
///   事件得在 capabilities 里额外放开 core:event，而进度这种一次性小数据犯不上多开一条权限；
///   250ms 轮一次，读一个 atomic，开销可以忽略。
static UPD_PCT: AtomicI32 = AtomicI32::new(-1);

#[tauri::command]
fn update_progress() -> i32 {
    UPD_PCT.load(Ordering::Relaxed)
}

/// 下载 → 校验 → 解压 → 摆好 → 写换装脚本。成功返回一句给人看的话，前端拿到后调 quit_app。
#[tauri::command]
async fn apply_update(url: String, sha256: String, size: u64) -> Result<String, String> {
    let r = apply_update_inner(&url, &sha256, size).await;
    /* 出口一律复位：成功失败都不能把「进行中」留在那儿，否则界面上的进度条不收 */
    UPD_PCT.store(-1, Ordering::Relaxed);
    r
}

async fn apply_update_inner(url: &str, sha256: &str, size: u64) -> Result<String, String> {
    let root = package_root()?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(900))
        .build()
        .map_err(|e| e.to_string())?;

    let mut resp = client.get(url).send().await.map_err(|e| format!("下载失败：{e}"))?;
    if !resp.status().is_success() {
        return Err(format!("下载失败：服务器返回 {}", resp.status()));
    }

    /* 先把 context 建出来，是为了拿 `tauri.conf.json` 里的 identifier 当**唯一来源**
       （WebView2 的数据目录就是 `%LOCALAPPDATA%\<identifier>\EBWebView`）；
       ⛔ 别在 Rust 里再写一份字面量，那样就有了第二处定义。
       */
    let ctx = tauri::generate_context!();
    let _ = purge_webview_cache_on_upgrade(ctx.config().identifier.as_str());

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            http_fetch,
            open_url,
            save_export,
            app_version,
            apply_update,
            update_progress,
            quit_app,
            open_folder
        ])
        .run(ctx)
        .expect("Tauri 启动失败");
}
