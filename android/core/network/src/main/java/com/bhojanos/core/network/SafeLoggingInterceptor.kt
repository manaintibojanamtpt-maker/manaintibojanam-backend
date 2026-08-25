package com.bhojanos.core.network

import android.util.Log
import okhttp3.Interceptor
import okhttp3.Response

class SafeLoggingInterceptor(
    private val isDebug: Boolean = false
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val url = request.url.toString()
        val method = request.method

        if (isDebug) {
            Log.d("BhojanNetwork", "--> $method $url")
        }

        val startTime = System.nanoTime()
        val response: Response = try {
            chain.proceed(request)
        } catch (e: Exception) {
            if (isDebug) {
                Log.e("BhojanNetwork", "<-- $method $url FAILED: ${e.message}")
            }
            throw e
        }
        val durationMs = (System.nanoTime() - startTime) / 1e6

        if (isDebug) {
            Log.d("BhojanNetwork", "<-- ${response.code} $method $url (${String.format("%.1f", durationMs)}ms)")
        }

        return response
    }
}
