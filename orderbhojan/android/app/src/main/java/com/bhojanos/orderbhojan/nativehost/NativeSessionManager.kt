package com.bhojanos.orderbhojan.nativehost

import android.content.Context
import android.content.SharedPreferences
import com.google.firebase.auth.FirebaseAuth
import java.util.UUID

object NativeSessionManager {
    private const val PREFS_NAME = "NativeSessionPrefs"
    private const val KEY_UUID = "app_scoped_uuid"
    private const val KEY_GUEST_PHONE_PREFIX = "guest_phone_"
    private const val KEY_GUEST_PHONE_TIME_PREFIX = "guest_time_"
    
    // 1 hour TTL for guest identity
    private const val TTL_MS = 60 * 60 * 1000L

    fun getTelemetryDeviceId(context: Context): String {
        // We use app-scoped UUID as fallback telemetry identifier.
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var uuid = prefs.getString(KEY_UUID, null)
        if (uuid == null) {
            uuid = "ob-native-" + UUID.randomUUID().toString()
            prefs.edit().putString(KEY_UUID, uuid).apply()
        }
        return uuid
    }

    fun cacheGuestPhone(context: Context, orderId: String, phone: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(KEY_GUEST_PHONE_PREFIX + orderId, phone)
            .putLong(KEY_GUEST_PHONE_TIME_PREFIX + orderId, System.currentTimeMillis())
            .apply()
    }

    fun getGuestPhone(context: Context, orderId: String): String? {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val time = prefs.getLong(KEY_GUEST_PHONE_TIME_PREFIX + orderId, 0)
        if (System.currentTimeMillis() - time > TTL_MS) {
            // Expired
            prefs.edit()
                .remove(KEY_GUEST_PHONE_PREFIX + orderId)
                .remove(KEY_GUEST_PHONE_TIME_PREFIX + orderId)
                .apply()
            return null
        }
        return prefs.getString(KEY_GUEST_PHONE_PREFIX + orderId, null)
    }

    fun getCurrentUserEmail(): String? {
        return FirebaseAuth.getInstance().currentUser?.email
    }

    fun hasValidSession(context: Context, orderId: String): Boolean {
        if (FirebaseAuth.getInstance().currentUser != null) {
            return true
        }
        return getGuestPhone(context, orderId) != null
    }
}
