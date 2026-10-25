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

/* ===== 换版本就自动清 WebView2 的 HTTP 缓存 =====
 *
 * 为什么要它（2026-10-14 报：换版本后界面还是旧画面、样式错位）：
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
 * 口径：win 免安装先走 B，安卓一起走。
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

/// 更新落点：`root` = 包根（有 app 子目录那层）；`flat` = 本体不在 app 里，按「就地更新」处理。
struct Plan {
    root: std::path::PathBuf,
    flat: bool,
    how: &'static str,
}

/// 判断这次更新该落在哪。
///
/// ★ 修（用户的朋友实测：官网下的 win 包，点「立即更新」报「这份软件不是免安装包结构」）：
///   上一版只认一条 —— 「exe 就在 <包>\app\ 里」。可启动器在部分机器上会把本体**复制到 %TEMP% 再跑**
///   （实测过：%TEMP% 里 11 秒后仍在）⇒ 那时 exe 的父目录是临时目录名，
///   判定当场失败，用户看到的就是「请到下载页重新下一个完整包」。
///   现在按 ① app 目录 → ② 启动时工作目录（含向上 4 级）→ ③ 本体在包根 → ④ 就地更新 逐级退。
///   只有连「就地」都不成立才报错，且报错里带真实路径，不再让人猜。
fn plan_update() -> Result<Plan, String> {
    let exe = std::env::current_exe().map_err(|e| format!("拿不到程序路径：{e}"))?;
    let exe_dir = exe.parent().ok_or("拿不到程序目录")?.to_path_buf();
    let cwd = std::env::current_dir().unwrap_or_else(|_| exe_dir.clone());

    let is_app_dir = |p: &std::path::Path| {
        p.file_name()
            .map(|n| n.eq_ignore_ascii_case("app"))
            .unwrap_or(false)
    };
    let has_app = |p: &std::path::Path| p.join("app").join("xiaoliuren.exe").is_file();

    /* ① 标准包结构 */
    if is_app_dir(&exe_dir) {
        if let Some(r) = exe_dir.parent() {
            return Ok(Plan { root: r.to_path_buf(), flat: false, how: "app 目录" });
        }
    }
    /* ② 本体被挪到别处跑（启动器复制到 %TEMP% 那种）⇒ 用启动时的工作目录反推 */
    let mut cur = Some(cwd.clone());
    for _ in 0..4 {
        let Some(d) = cur else { break };
        if has_app(&d) {
            return Ok(Plan { root: d, flat: false, how: "工作目录" });
        }
        if is_app_dir(&d) {
            if let Some(r) = d.parent() {
                return Ok(Plan { root: r.to_path_buf(), flat: false, how: "工作目录的上级" });
            }
        }
        cur = d.parent().map(|p| p.to_path_buf());
    }
    /* ③ 本体被放到包根（用户自己拷出来过） */
    if let Some(p) = exe_dir.parent() {
        if has_app(p) {
            return Ok(Plan { root: p.to_path_buf(), flat: false, how: "包根" });
        }
    }
    /* ④ 就地更新：把更新包里 app\ 的东西提到本体同级，覆盖自己 */
    Ok(Plan { root: exe_dir, flat: true, how: "就地" })
}

/// 更新日志：`%LOCALAPPDATA%\<identifier>\update.log`（每次覆盖写）。
/// 出问题时用户把这一行发过来就能定位，不用再猜「他那台是什么结构」。
fn write_update_log(app: &tauri::AppHandle, head: &str, result: &Result<String, String>) {
    use tauri::Manager;
    let id = app.config().identifier.clone();
    let Ok(local) = std::env::var("LOCALAPPDATA") else { return };
    let dir = std::path::PathBuf::from(local).join(id);
    let _ = std::fs::create_dir_all(&dir);
    let tail = match result {
        Ok(m) => format!("结果：OK · {m}"),
        Err(e) => format!("结果：失败 · {e}"),
    };
    let _ = std::fs::write(dir.join("update.log"), format!("{head}\n{tail}\n"));
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
async fn apply_update(
    app: tauri::AppHandle,
    url: String,
    sha256: String,
    size: u64,
) -> Result<String, String> {
    /* 先把「这台机器是什么结构」记下来 —— 出问题时 update.log 里能直接看到 */
    let plan = plan_update();
    let head = match &plan {
        Ok(p) => format!(
            "exe={}\ncwd={}\nroot={}\nflat={}\nhow={}\nurl={}",
            std::env::current_exe().map(|x| x.display().to_string()).unwrap_or_default(),
            std::env::current_dir().map(|x| x.display().to_string()).unwrap_or_default(),
            p.root.display(),
            p.flat,
            p.how,
            url
        ),
        Err(e) => format!(
            "exe={}\ncwd={}\nplan=失败：{e}\nurl={}",
            std::env::current_exe().map(|x| x.display().to_string()).unwrap_or_default(),
            std::env::current_dir().map(|x| x.display().to_string()).unwrap_or_default(),
            url
        ),
    };
    let r = match plan {
        Ok(p) => apply_update_inner(&p, &url, &sha256, size).await,
        Err(e) => Err(e),
    };
    write_update_log(&app, &head, &r);
    /* 出口一律复位：成功失败都不能把「进行中」留在那儿，否则界面上的进度条不收 */
    UPD_PCT.store(-1, Ordering::Relaxed);
    r
}

async fn apply_update_inner(plan: &Plan, url: &str, sha256: &str, size: u64) -> Result<String, String> {
    let root = plan.root.clone();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(900))
        .build()
        .map_err(|e| e.to_string())?;

    let mut resp = client.get(url).send().await.map_err(|e| format!("下载失败：{e}"))?;
    if !resp.status().is_success() {
        return Err(format!("下载失败：服务器返回 {}", resp.status()));
    }

    /* ★ （用户要进度条）：改分块读 —— 以前 `resp.bytes()` 一口气等完，界面只能干等。
       total 优先取服务器的 Content-Length，取不到才用清单里的 size。 */
    let total = resp.content_length().unwrap_or(size);
    let mut buf: Vec<u8> = Vec::new();
    UPD_PCT.store(0, Ordering::Relaxed);
    while let Some(chunk) = resp.chunk().await.map_err(|e| format!("下载中断：{e}"))? {
        buf.extend_from_slice(&chunk);
        if total > 0 {
            let pct = ((buf.len() as u64).saturating_mul(100) / total).min(99) as i32;
            UPD_PCT.store(pct, Ordering::Relaxed);
        }
    }
    let bytes = buf;
    UPD_PCT.store(100, Ordering::Relaxed);   /* 下完了；后面校验 + 解压不再报细粒度进度 */

    if size > 0 && bytes.len() as u64 != size {
        return Err(format!(
            "下载不完整（{} / {} 字节），请重试",
            bytes.len(),
            size
        ));
    }
    if !sha256.trim().is_empty() {
        let got = sha256_hex(&bytes);
        if !got.eq_ignore_ascii_case(sha256.trim()) {
            return Err("下载内容与清单对不上，已取消更新（请重试；反复失败就手动下包）".to_string());
        }
    }

    let tmp = std::env::temp_dir().join(format!("xlr-update-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&tmp);
    std::fs::create_dir_all(&tmp).map_err(|e| format!("建临时目录失败：{e}"))?;
    {
        let mut za = zip::ZipArchive::new(std::io::Cursor::new(bytes.as_slice()))
            .map_err(|e| format!("更新包打不开：{e}"))?;
        za.extract(&tmp).map_err(|e| format!("解压失败：{e}"))?;
    }

    let payload = find_payload(&tmp).ok_or("更新包里没有主程序（app\\xiaoliuren.exe），已放弃")?;

    let upd = root.join("_update");
    let _ = std::fs::remove_dir_all(&upd);
    std::fs::create_dir_all(&upd).map_err(|e| format!("建 _update 失败：{e}"))?;

    let mut n = 0usize;
    if plan.flat {
        /* ★ 就地更新（本体不在 app 子目录）：把更新包 app\ 里的东西提到 _update 根，
           换装时直接盖在同级 —— 否则会凭空多出一层 app\，而用户运行的那个 exe 根本没被换掉。 */
        let inner = payload.join("app");
        if !inner.is_dir() {
            return Err("更新包里没有 app 目录，没法就地更新；请到下载页重新下一个完整包".to_string());
        }
        copy_dir_all(&inner, &upd).map_err(|e| format!("铺开文件失败：{e}"))?;
        n = 1;
    } else {
        for e in std::fs::read_dir(&payload)
            .map_err(|e| format!("读更新包失败：{e}"))?
            .flatten()
        {
            let p = e.path();
            let to = upd.join(e.file_name());
            if p.is_dir() {
                copy_dir_all(&p, &to).map_err(|e| format!("铺开 app 目录失败：{e}"))?;
                n += 1;
            } else {
                // ★ 顶层 .exe = 启动器，一律不换（见上面口径①）；txt 之类照换
                let is_exe = p
                    .extension()
                    .map(|x| x.eq_ignore_ascii_case("exe"))
                    .unwrap_or(false);
                if !is_exe {
                    std::fs::copy(&p, &to).map_err(|e| format!("铺开文件失败：{e}"))?;
                    n += 1;
                }
            }
        }
    }

    // ★ 必须 CRLF：LF 的 .bat 在这台机器上会被 cmd 直接拒掉（双击一闪就没）
    let bat = concat!(
        "@echo off\r\n",
        "setlocal\r\n",
        "cd /d \"%~dp0\"\r\n",
        "set /a N=0\r\n",
        ":wait\r\n",
        "tasklist /FI \"IMAGENAME eq xiaoliuren.exe\" 2>nul | find /I \"xiaoliuren.exe\" >nul\r\n",
        "if errorlevel 1 goto go\r\n",
        /* 等等上限：90 × 2 秒 = 3 分钟。程序万一没退干净也别让它无限转 —— 到点照样换装重启。 */
        "set /a N+=1\r\n",
        "if %N% GEQ 90 goto go\r\n",
        "ping -n 2 127.0.0.1 >nul\r\n",
        "goto wait\r\n",
        ":go\r\n",
        "ping -n 2 127.0.0.1 >nul\r\n",
        // ★ 源/目标用相对路径：`"%~dp0"` 结尾带反斜杠 ⇒ 引号被转义，robocopy 会把后面的参数
        //   当成目标路径的一部分（实测 Dest 变成 `...\包" \E \MOVE \R:20 ...`，ERROR 123）。
        //   上面已经 `cd /d "%~dp0"`，用 `_update` 和 `.` 最稳。
        "robocopy \"_update\" \".\" /E /MOVE /R:20 /W:1 /NFL /NDL /NJH /NJS >nul\r\n",
        "if exist \"%~dp0app\\xiaoliuren.exe\" start \"\" \"%~dp0app\\xiaoliuren.exe\"\r\n",
        /* 就地更新那种结构（本体就在这一层）：第一条不存在，靠这条拉起来 */
        "if exist \"%~dp0xiaoliuren.exe\" start \"\" \"%~dp0xiaoliuren.exe\"\r\n",
        "if exist \"%~dp0_update\" rmdir /S /Q \"%~dp0_update\"\r\n",
        "(goto) 2>nul & del /F /Q \"%~f0\"\r\n",
    );
    let bat_path = root.join("_update.bat");
    std::fs::write(&bat_path, bat).map_err(|e| format!("写换装脚本失败：{e}"))?;

    /* ★ 修（用户实测：「提示 2 秒打开新版，但没打开」）：
       光把 .bat 写出来不算数，必须**启动**它 —— 上一版只写不跑，程序退出之后就静默结束了。
       用 CREATE_NO_WINDOW 起 `cmd /C`：bat 立刻开始等本进程退出，进程一退它就 robocopy 并重新拉起；
       spawn 完不等待（父进程退出不影响子进程）。 */
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        std::process::Command::new("cmd.exe")
            .arg("/C")
            .arg(&bat_path)
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("启动换装脚本失败：{e}"))?;
    }

    let _ = std::fs::remove_dir_all(&tmp);
    Ok(format!("已就绪（{n} 项）"))
}

/// 前端在「更新就绪」提示画完之后调：让进程干净退出，好让 .bat 接手覆盖。
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(700));
        app.exit(0);
    });
}

/// 打开导出所在的文件夹（有具体文件就选中它，没有就开「下载」）。
///
/// ★ （用户要）：「导出按钮后面都加一个打开导出文件夹」——
///   桌面上导出走 `save_export` 落 `Downloads`，路径虽然会显示在提示条里，
///   但一串 `(upstream)` 没人想照着找一遍。
///
/// ⚠ explorer.exe 的退出码不可信（它总是回 1）⇒ 只看能不能起进程，不看 status。
#[tauri::command]
fn open_folder(path: Option<String>) -> Result<(), String> {
    let mut target: Option<std::path::PathBuf> = None;
    let mut is_file = false;

    if let Some(p) = path.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        let p = std::path::PathBuf::from(p);
        if p.is_file() {
            target = Some(p);
            is_file = true;
        } else if p.is_dir() {
            target = Some(p);
        }
    }
    if target.is_none() {
        let home = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .map_err(|e| e.to_string())?;
        let dl = std::path::Path::new(&home).join("Downloads");
        target = Some(if dl.exists() { dl } else { std::path::Path::new(&home).to_path_buf() });
    }
    let t = target.unwrap();

    #[cfg(target_os = "windows")]
    {
        if is_file {
            /* /select 让资源管理器把那个文件高亮出来，省得在一堆下载里找 */
            std::process::Command::new("explorer.exe")
                .arg(format!("/select,{}", t.display()))
                .spawn()
                .map_err(|e| format!("打不开资源管理器：{e}"))?;
        } else {
            std::process::Command::new("explorer.exe")
                .arg(t.as_os_str())
                .spawn()
                .map_err(|e| format!("打不开资源管理器：{e}"))?;
        }
    }
    #[cfg(target_os = "macos")]
    {
        let flag = if is_file { "-R" } else { "" };
        let mut c = std::process::Command::new("open");
        if !flag.is_empty() {
            c.arg(flag);
        }
        c.arg(&t).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&t)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn main() {
    /* 先把 context 建出来，是为了拿 `tauri.conf.json` 里的 identifier 当**唯一来源**
       （WebView2 的数据目录就是 `%LOCALAPPDATA%\<identifier>\EBWebView`）；
       ⛔ 别在 Rust 里再写一份字面量，那样就有了第二处定义。 */
    let ctx = tauri::generate_context!();
    let _ = purge_webview_cache_on_upgrade(ctx.config().identifier.as_str());

    let builder = tauri::Builder::default();
    builder
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
