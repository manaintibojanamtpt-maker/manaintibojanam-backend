package com.bhojanos.orderbhojan.nativehost

import android.content.Context

/**
 * Native-side kill switches. Defaults OFF — hybrid WebView remains default.
 * Synced from JS via OrderBhojanNativeTrack.configure.
 */
object NativeFeatureFlags {
    private const val PREFS = "ob_native_flags"
    private const val KEY_HOST = "FF_NATIVE_HOST"
    private const val KEY_TRACK = "FF_NATIVE_TRACK"
    private const val KEY_PCT = "FF_NATIVE_TRACK_PCT"
    private const val KEY_EMAILS = "FF_NATIVE_TRACK_INTERNAL_EMAILS"
    private const val KEY_API_BASE = "api_base_url"
    private const val KEY_API_VERSION = "api_version"

    fun isNativeHostEnabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_HOST, false)

    fun isNativeTrackEnabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_TRACK, false)

    fun trackPercent(context: Context): Int =
        prefs(context).getInt(KEY_PCT, 0).coerceIn(0, 100)

    fun internalEmails(context: Context): Set<String> =
        prefs(context)
            .getString(KEY_EMAILS, "")
            .orEmpty()
            .split(',')
            .map { it.trim().lowercase() }
            .filter { it.isNotEmpty() }
            .toSet()

    fun apiBaseUrl(context: Context): String =
        prefs(context).getString(KEY_API_BASE, "https://manaintibojanam-backend.onrender.com")
            .orEmpty()
            .trimEnd('/')

    fun apiVersion(context: Context): String =
        prefs(context).getString(KEY_API_VERSION, "1.0") ?: "1.0"

    fun configure(
        context: Context,
        nativeHost: Boolean,
        nativeTrack: Boolean,
        percent: Int,
        internalEmails: String,
        apiBaseUrl: String,
        apiVersion: String,
    ) {
        prefs(context).edit()
            .putBoolean(KEY_HOST, nativeHost)
            .putBoolean(KEY_TRACK, nativeTrack)
            .putInt(KEY_PCT, percent.coerceIn(0, 100))
            .putString(KEY_EMAILS, internalEmails)
            .putString(KEY_API_BASE, apiBaseUrl.trimEnd('/'))
            .putString(KEY_API_VERSION, apiVersion.ifBlank { "1.0" })
            .apply()
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
