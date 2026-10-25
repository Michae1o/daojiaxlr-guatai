package cn.luoshen.xiaoliuren;

import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.MediaStore;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * 导出落盘（安卓）——2026-10-25 现象：：「手机导出之后，没出现导出的路径在哪里」。
 *
 * 为什么原来的写法在手机上什么都不会发生：
 *   网页层那套是 `Blob + <a download>`。Capacitor 的 WebView **没有挂 DownloadListener**，
 *   点下去既不下文件也不报错 —— 所以用户看到的只有一句「✓ 已导出」，然后找不到东西。
 *
 * 现在走系统正规通道（Android 10+ 的 scoped storage）：
 *   MediaStore.Downloads + RELATIVE_PATH = Download/道家小六壬 ⇒ 文件真的出现在「下载」目录里，
 *   而且**不需要任何存储权限**（这正是 MediaStore 存在的意义）。
 *   Android 9 及以下没有 MediaStore.Downloads，退回 app 外部目录（也不需要权限），路径会一并返回。
 *
 * FileProvider 的 authority 用 getPackageName() 现拼 —— full / lite 两个包名各自成立，⛔ 不写死。
 */
@CapacitorPlugin(name = "XlrFiles")
public class XlrFilesPlugin extends Plugin {

    private static final String SUB = "道家小六壬";

    /** 写一份文本到「下载/道家小六壬/」，回 {path, uri}。path 是给人看的（提示条里显示） */
    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        final String name = call.getString("name");
        final String text = call.getString("text", "");
        if (name == null || name.trim().isEmpty()) {
            call.reject("缺少文件名");
            return;
        }
        getBridge().execute(() -> {
            try {
                byte[] data = (text == null ? "" : text).getBytes(StandardCharsets.UTF_8);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    cv.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                    cv.put(MediaStore.Downloads.RELATIVE_PATH,
                            Environment.DIRECTORY_DOWNLOADS + "/" + SUB);
                    Uri uri = getContext().getContentResolver()
                            .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (uri == null) {
                        call.reject("系统没给出写入位置（下载目录不可用）");
                        return;
                    }
                    OutputStream os = getContext().getContentResolver().openOutputStream(uri);
                    if (os == null) {
                        call.reject("打不开写入流");
                        return;
                    }
                    os.write(data);
                    os.flush();
                    os.close();
                    JSObject o = new JSObject();
                    o.put("path", "下载/" + SUB + "/" + name);
                    o.put("uri", uri.toString());
                    call.resolve(o);
                } else {
                    File dir = new File(
                            getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), SUB);
                    if (!dir.exists() && !dir.mkdirs()) {
                        call.reject("建不了导出目录");
                        return;
                    }
                    File f = new File(dir, name);
                    FileOutputStream fos = new FileOutputStream(f);
                    fos.write(data);
                    fos.flush();
                    fos.close();
                    JSObject o = new JSObject();
                    o.put("path", f.getAbsolutePath());
                    o.put("uri", "");
                    call.resolve(o);
                }
            } catch (Exception e) {
                call.reject("写文件失败：" + e.getMessage());
            }
        });
    }

    /**
     * 打开导出所在的文件夹。
     *   Android 10+：用系统的 externalstorage provider 打开 `Download/道家小六壬` 这个目录
     *                （MIME_TYPE_DIR）—— 小米/华为/OV 自带的文件管理器都认这条；
     *   老系统：用 FileProvider 打开 app 自己的导出目录。
     * 起不来的机型（少数第三方 ROM）会走 reject，前端就把路径原样显示给人看。
     */
    @PluginMethod
    public void openExportFolder(PluginCall call) {
        try {
            Intent it = new Intent(Intent.ACTION_VIEW);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                Uri folder = DocumentsContract.buildDocumentUri(
                        "com.android.externalstorage.documents",
                        "primary:" + Environment.DIRECTORY_DOWNLOADS + "/" + SUB);
                it.setDataAndType(folder, DocumentsContract.Document.MIME_TYPE_DIR);
            } else {
                File dir = new File(
                        getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), SUB);
                Uri u = FileProvider.getUriForFile(
                        getContext(), getContext().getPackageName() + ".fileprovider", dir);
                it.setDataAndType(u, DocumentsContract.Document.MIME_TYPE_DIR);
            }
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            it.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getContext().startActivity(it);
            call.resolve();
        } catch (Exception e) {
            call.reject("这台机器打不开文件管理器（导出位置：下载/" + SUB + "）");
        }
    }
}
