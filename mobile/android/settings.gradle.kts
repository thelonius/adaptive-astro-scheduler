pluginManagement {
    val flutterSdkPath =
        run {
            val properties = java.util.Properties()
            file("local.properties").inputStream().use { properties.load(it) }
            val flutterSdkPath = properties.getProperty("flutter.sdk")
            require(flutterSdkPath != null) { "flutter.sdk not set in local.properties" }
            flutterSdkPath
        }

    includeBuild("$flutterSdkPath/packages/flutter_tools/gradle")

    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

// AGP 8.9, а не 9.0 из шаблона Flutter 3.44: под девятую версию сборка падает
// на плагинах из pub — shared_preferences_android, sqflite_android и
// path_provider_android объявляют себя через com.android.library так, как
// AGP 9 уже не принимает («'kotlin-android' plugin requires one of the Android
// Gradle plugins»). Поднимать версию обратно можно, когда плагины переедут.
plugins {
    id("dev.flutter.flutter-plugin-loader") version "1.0.0"
    id("com.android.application") version "8.10.1" apply false
    id("org.jetbrains.kotlin.android") version "2.1.0" apply false
}

include(":app")
