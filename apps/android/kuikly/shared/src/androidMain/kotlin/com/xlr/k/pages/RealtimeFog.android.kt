package com.xlr.k.pages

internal actual fun realtimeFogAvailable(): Boolean = android.os.Build.VERSION.SDK_INT >= 33
