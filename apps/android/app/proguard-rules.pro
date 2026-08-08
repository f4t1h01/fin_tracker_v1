# R8 rules for release builds.

# Retrofit/Moshi-style reflection over DTOs: keep the data layer's model shapes so
# JSON field names survive shrinking.
-keep class com.duet.android.data.** { *; }
-keepclassmembers class com.duet.android.data.** { *; }

# Retrofit interfaces are proxied at runtime, and generic signatures are needed to
# resolve response types.
-keepattributes Signature, InnerClasses, EnclosingMethod, RuntimeVisibleAnnotations, AnnotationDefault
-keep,allowobfuscation interface com.duet.android.data.DuetApi
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation

# Retrofit / OkHttp housekeeping.
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

# Kotlin serialization/reflection metadata used by the JSON converter.
-keepattributes *Annotation*
-keep class kotlin.Metadata { *; }

# androidx.security keystore integration.
-keep class androidx.security.crypto.** { *; }
-dontwarn androidx.security.crypto.**
