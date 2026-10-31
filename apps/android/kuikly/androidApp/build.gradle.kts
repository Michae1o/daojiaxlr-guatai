import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    kotlin("android")
}

/* 签名：在 apps/android/ 放一份 keystore.properties（格式见 keystore.properties.example）；
   没有这份文件就用调试签名，照样能编出安装包。 */
val ksProps = Properties()
val ksPath = file("../../keystore.properties")   /* 自己放一份；没有就用调试签名 */
if (ksPath.exists()) FileInputStream(ksPath).use { ksProps.load(it) }

android {
    namespace = "com.xlr.k"
    compileSdk = 34

    defaultConfig {
        /* 版本号规矩：versionCode 只用数字，且必须比上一版大，装上去是覆盖升级。 */
        applicationId = "cn.guatai.xiaoliuren"
        minSdk = 24
        targetSdk = 34
        versionCode = 12610317
        versionName = "2.261031.7"
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        if (ksProps.isNotEmpty()) {
            create("release") {
                storeFile = file(ksProps.getProperty("storeFile"))
                storePassword = ksProps.getProperty("storePassword")
                keyAlias = ksProps.getProperty("keyAlias")
                keyPassword = ksProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            /* 找不到钥匙文件时退回调试签名，保证别人拉下来也能编（自己出正式包时那把一定在） */
            signingConfig = if (ksProps.isNotEmpty()) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation(project(":shared"))
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.recyclerview:recyclerview:1.3.2")
}
