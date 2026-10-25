package cn.luoshen.xiaoliuren;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * app 内更新（安卓）——2026-10-25 用户定：「安卓一起走」。
 *
 * 为什么这几件事必须放原生：
 *   ① 拉更新清单：WebView 的 origin 是 http://localhost，fetch 本站是跨域，会被 CORS 拦；
 *      走原生 HttpURLConnection 就没有跨域这回事。
 *   ② 装 APK：只能由原生发 Intent 交给系统安装器；网页层没有任何办法触发安装。
 *
 * 三条硬限制（系统定的，绕不过，所以 UI 上不要承诺「静默更新」）：
 *   ① 必须用户点「安装」确认一次；
 *   ② Android 8+ 首次还得给「安装未知应用」授权，得跳设置页让他开；
 *   ③ 签名必须一致、versionCode 必须更大，否则系统直接拒绝覆盖安装。
 *
 * 包名两个（cn.luoshen.xiaoliuren / .lite）共用这份代码：
 *   FileProvider authority 用 getPackageName() 现拼，⛔ 不要写死字面量。
 */
@CapacitorPlugin(name = "XlrUpdate")
public class XlrUpdatePlugin extends Plugin {

    private static final String APK = "xlr-update.apk";

    /** 当前装的版本 + 包名（前端拿它跟清单比） */
    @PluginMethod
    public void info(PluginCall call) {
        try {
            PackageInfo pi = getContext().getPackageManager()
                    .getPackageInfo(getContext().getPackageName(), 0);
            long code = (Build.VERSION.SDK_INT >= 28)
                    ? pi.getLongVersionCode()
                    : (long) pi.versionCode;
            JSObject o = new JSObject();
            o.put("packageName", getContext().getPackageName());
            o.put("versionName", pi.versionName == null ? "" : pi.versionName);
            o.put("versionCode", code);
            call.resolve(o);
        } catch (Exception e) {
            call.reject("读不到版本信息：" + e.getMessage());
        }
    }

    /** 拉一个文本地址（更新清单），绕开 WebView 的跨域限制 */
    @PluginMethod
    public void fetchText(PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("缺少地址");
            return;
        }
        getBridge().execute(() -> {
            HttpURLConnection conn = null;
            try {
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.setRequestProperty("Cache-Control", "no-cache");
                int code = conn.getResponseCode();
                InputStream in = (code >= 200 && code < 300)
                        ? conn.getInputStream()
                        : conn.getErrorStream();
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while (in != null && (n = in.read(buf)) > 0) {
                    bos.write(buf, 0, n);
                }
                if (in != null) {
                    in.close();
                }
                JSObject o = new JSObject();
                o.put("status", code);
                o.put("body", bos.toString("UTF-8"));
                call.resolve(o);
            } catch (Exception e) {
                call.reject("连不上更新服务器：" + e.getMessage());
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    /** 下载 APK 到 cache，边下边报进度，下完校验 sha256 再落盘 */
    @PluginMethod
    public void download(PluginCall call) {
        final String url = call.getString("url");
        final String want = call.getString("sha256", "");
        if (url == null || url.isEmpty()) {
            call.reject("缺少下载地址");
            return;
        }
        final File dir = getContext().getCacheDir();
        final File part = new File(dir, APK + ".part");
        final File dest = new File(dir, APK);

        getBridge().execute(() -> {
            HttpURLConnection conn = null;
            try {
                if (dest.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    dest.delete();
                }
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(60000);
                conn.connect();
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) {
                    call.reject("下载失败：服务器返回 " + code);
                    return;
                }
                int total = conn.getContentLength();
                InputStream in = conn.getInputStream();
                FileOutputStream out = new FileOutputStream(part);
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                byte[] buf = new byte[32 * 1024];
                int n, done = 0, lastPct = -1;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    md.update(buf, 0, n);
                    done += n;
                    if (total > 0) {
                        int pct = (int) (done * 100L / total);
                        if (pct != lastPct) {
                            lastPct = pct;
                            JSObject p = new JSObject();
                            p.put("percent", pct);
                            notifyListeners("progress", p);
                        }
                    }
                }
                out.flush();
                out.close();
                in.close();

                if (want != null && !want.trim().isEmpty()) {
                    StringBuilder sb = new StringBuilder();
                    for (byte b : md.digest()) {
                        sb.append(String.format("%02x", b));
                    }
                    if (!sb.toString().equalsIgnoreCase(want.trim())) {
                        //noinspection ResultOfMethodCallIgnored
                        part.delete();
                        call.reject("下载内容与清单对不上，已取消（请重试）");
                        return;
                    }
                }
                if (dest.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    dest.delete();
                }
                if (!part.renameTo(dest)) {
                    call.reject("更新包写不进缓存目录");
                    return;
                }
                JSObject o = new JSObject();
                o.put("bytes", done);
                call.resolve(o);
            } catch (Exception e) {
                //noinspection ResultOfMethodCallIgnored
                part.delete();
                call.reject("下载中断：" + e.getMessage());
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    /** 系统允不允许装未知来源（Android 8+ 要用户手动开） */
    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject o = new JSObject();
        boolean ok = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ok = getContext().getPackageManager().canRequestPackageInstalls();
        }
        o.put("allowed", ok);
        call.resolve(o);
    }

    /** 跳到本应用的「安装未知应用」设置页 */
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent it = new Intent(
                        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + getContext().getPackageName()));
                it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(it);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("打不开设置页：" + e.getMessage());
        }
    }

    /** 把下载好的 APK 交给系统安装器（用户还要再点一次「安装」） */
    @PluginMethod
    public void install(PluginCall call) {
        try {
            File apk = new File(getContext().getCacheDir(), APK);
            if (!apk.exists() || apk.length() == 0) {
                call.reject("更新包不在，请先下载");
                return;
            }
            Uri uri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apk);
            Intent it = new Intent(Intent.ACTION_VIEW);
            it.setDataAndType(uri, "application/vnd.android.package-archive");
            it.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(it);
            call.resolve();
        } catch (Exception e) {
            call.reject("调不起安装器：" + e.getMessage());
        }
    }
}
