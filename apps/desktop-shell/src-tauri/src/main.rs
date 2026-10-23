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
    // ★ 2026-10-18（mac 编译包）：Windows 用 USERPROFILE，macOS / Linux 只有 HOME。
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
 *   只删 `EBWebView\Default\{Cache, Code Cache}` 两处；**localStorage 一律不动**（用户的记录在里面）。
 *
 * 判据（不是"每次启动都清"）：
 *   ① 指纹相符（同一份 exe 再开）⇒ **不清**，缓存要留得住；
 *   ② 指纹与当前 exe 不符 ⇒ 清一次，并刷新指纹；
 *   ③ 从没有指纹的老版本升上来（缓存目录在、指纹文件不在）⇒ 当成换版本，清一次。
 *   指纹 = exe 文件内容的 64 位 FNV-1a（不引依赖；6 MB 读一遍几毫秒）。
 *   注意：必须在 WebView2 起来**之前**跑：起来之后缓存文件被占住，删不掉。
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

fn main() {
    /* 先把 context 建出来，是为了拿 `tauri.conf.json` 里的 identifier 当**唯一来源**
       （WebView2 的数据目录就是 `%LOCALAPPDATA%\<identifier>\EBWebView`）；
       */
    let ctx = tauri::generate_context!();
    let _ = purge_webview_cache_on_upgrade(ctx.config().identifier.as_str());

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![http_fetch, open_url, save_export])
        .run(ctx)
        .expect("Tauri 启动失败");
}
