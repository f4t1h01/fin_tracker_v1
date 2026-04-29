package com.duet.android.data

import com.squareup.moshi.Moshi
import com.squareup.moshi.FromJson
import com.squareup.moshi.JsonReader
import com.squareup.moshi.JsonWriter
import com.squareup.moshi.ToJson
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.io.InterruptedIOException
import java.net.SocketTimeoutException
import java.util.concurrent.TimeUnit

class AuthHeaderInterceptor(private val tokenProvider: () -> String?) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenProvider()
        val request = if (token.isNullOrBlank()) {
            chain.request()
        } else {
            chain.request().newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        }
        return chain.proceed(request)
    }
}

object NetworkModule {
    fun createMoshi(): Moshi = Moshi.Builder()
        .add(LenientDoubleJsonAdapter())
        .add(KotlinJsonAdapterFactory())
        .build()

    fun createApi(tokenProvider: () -> String?): DuetApi {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        val client = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(120, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .callTimeout(180, TimeUnit.SECONDS)
            .addInterceptor(AuthHeaderInterceptor(tokenProvider))
            .addInterceptor(logging)
            .build()

        return Retrofit.Builder()
            .baseUrl(ApiConfig.BASE_URL)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(createMoshi()))
            .build()
            .create(DuetApi::class.java)
    }
}

class LenientDoubleJsonAdapter {
    @FromJson
    fun fromJson(reader: JsonReader): Double {
        return when (reader.peek()) {
            JsonReader.Token.NUMBER -> reader.nextDouble()
            JsonReader.Token.STRING -> reader.nextString().toDoubleOrNull() ?: 0.0
            JsonReader.Token.NULL -> {
                reader.nextNull<Unit>()
                0.0
            }
            else -> {
                reader.skipValue()
                0.0
            }
        }
    }

    @ToJson
    fun toJson(writer: JsonWriter, value: Double?) {
        if (value == null) {
            writer.nullValue()
        } else {
            writer.value(value)
        }
    }
}

fun Throwable.toUserMessage(moshi: Moshi = NetworkModule.createMoshi()): String {
    if (this is SocketTimeoutException || (this is InterruptedIOException && message == "timeout")) {
        return "AI request timed out. Try a smaller image or a shorter voice note."
    }
    if (this is HttpException) {
        val rawBody = response()?.errorBody()?.string()
        if (!rawBody.isNullOrBlank()) {
            runCatching {
                val payload = moshi.adapter(ApiErrorPayload::class.java).fromJson(rawBody)
                val message = payload?.message
                when (message) {
                    is String -> return message
                    is List<*> -> return message.filterIsInstance<String>().joinToString(", ")
                }
            }
        }
        return "Request failed with status ${code()}"
    }
    return message ?: "Network request failed"
}
