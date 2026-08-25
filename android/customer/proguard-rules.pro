# OrderBhojan Native customer — R8 / ProGuard keep rules
# Retrofit
-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-dontwarn retrofit2.**
-dontwarn okhttp3.**
-dontwarn okio.**
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
# Gson reflection on generic types
-keep class com.google.gson.reflect.TypeToken { *; }
-keep class * extends com.google.gson.reflect.TypeToken
# Hilt / Dagger
-dontwarn dagger.hilt.**
-dontwarn javax.inject.**
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper
-keepattributes *Annotation*
-keep class * extends androidx.room.RoomDatabase
# Compose
-dontwarn androidx.compose.**
