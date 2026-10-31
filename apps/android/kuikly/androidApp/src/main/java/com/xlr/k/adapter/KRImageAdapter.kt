package com.xlr.k.adapter

import android.content.Context
import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.util.Base64
import android.util.Log
import com.tencent.kuikly.core.render.android.KuiklyRenderViewContext
import com.tencent.kuikly.core.render.android.adapter.HRImageLoadOption
import com.tencent.kuikly.core.render.android.adapter.IKRImageAdapter
import java.io.File

/**
 * 最小可用图片适配器：base64 / assets / 本地文件 走 BitmapFactory，网络图暂不处理。
 */
class KRImageAdapter(private val context: Context) : IKRImageAdapter {

    override fun fetchDrawable(
        imageLoadOption: HRImageLoadOption,
        callback: (drawable: Drawable?) -> Unit,
    ) {
        execOnSubThread {
            val drawable = try {
                when {
                    imageLoadOption.isBase64() -> decodeBase64(imageLoadOption)
                    imageLoadOption.isAssets() -> decodeAssets(imageLoadOption)
                    imageLoadOption.isFile() -> decodeFile(imageLoadOption)
                    else -> null
                }
            } catch (e: Throwable) {
                Log.e(TAG, "fetchDrawable failed: ${e.message}")
                null
            }
            callback.invoke(drawable)
        }
    }

    override fun getDrawableWidth(
        kuiklyRenderViewContext: KuiklyRenderViewContext,
        drawable: Drawable
    ): Float = drawable.intrinsicWidth.toFloat()

    override fun getDrawableHeight(
        kuiklyRenderViewContext: KuiklyRenderViewContext,
        drawable: Drawable
    ): Float = drawable.intrinsicHeight.toFloat()

    private fun decodeBase64(option: HRImageLoadOption): Drawable? {
        val payload = option.src.substringAfter(",", "")
        val bytes = Base64.decode(payload, Base64.DEFAULT)
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, sampleOptions(option))
        return bitmap?.let { BitmapDrawable(Resources.getSystem(), it) }
    }

    private fun decodeAssets(option: HRImageLoadOption): Drawable? {
        val path = option.src.substring(HRImageLoadOption.SCHEME_ASSETS.length)
        val bytes = context.assets.open(path).use { it.readBytes() }
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, sampleOptions(option))
        return bitmap?.let { BitmapDrawable(context.resources, it) }
    }

    private fun decodeFile(option: HRImageLoadOption): Drawable? {
        val path = option.src.removePrefix("file://")
        val file = File(path)
        if (!file.exists()) return null
        val bytes = file.readBytes()
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, sampleOptions(option))
        return bitmap?.let { BitmapDrawable(context.resources, it) }
    }

    private fun sampleOptions(option: HRImageLoadOption): BitmapFactory.Options {
        val options = BitmapFactory.Options()
        options.inPreferredConfig = Bitmap.Config.ARGB_8888
        return options
    }

    companion object {
        private const val TAG = "KRImageAdapter"
    }
}
