package com.bhojanos.orderbhojan

import android.content.Intent
import com.bhojanos.orderbhojan.nativehost.NativeFeatureFlags
import com.bhojanos.orderbhojan.nativehost.NativeTrackCohort
import com.bhojanos.orderbhojan.nativehost.NativeSessionManager
import com.bhojanos.orderbhojan.track.TrackActivity
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor bridge: configure flags + open native Track when cohort allows.
 * JS name: OrderBhojanNativeTrack
 */
@CapacitorPlugin(name = "OrderBhojanNativeTrack")
class OrderBhojanNativeTrackPlugin : Plugin() {

    @PluginMethod
    fun configure(call: PluginCall) {
        val host = call.getBoolean("nativeHost", false) ?: false
        val track = call.getBoolean("nativeTrack", false) ?: false
        val percent = call.getInt("percent", 0) ?: 0
        val emails = call.getString("internalEmails") ?: ""
        val apiBase = call.getString("apiBaseUrl")
            ?: "https://manaintibojanam-backend.onrender.com"
        val apiVersion = call.getString("apiVersion") ?: "1.0"
        NativeFeatureFlags.configure(
            context = context,
            nativeHost = host,
            nativeTrack = track,
            percent = percent,
            internalEmails = emails,
            apiBaseUrl = apiBase,
            apiVersion = apiVersion,
        )
        call.resolve()
    }

    @PluginMethod
    fun openTracking(call: PluginCall) {
        val orderId = call.getString("orderId")?.trim().orEmpty()
        if (orderId.isEmpty()) {
            call.resolve(result(false, "missing_order_id"))
            return
        }

        val userEmail = NativeSessionManager.getCurrentUserEmail()
        val deviceId = NativeSessionManager.getTelemetryDeviceId(context)

        if (!NativeTrackCohort.shouldOpenNative(context, userEmail, deviceId)) {
            call.resolve(result(false, "flags_or_cohort_deny"))
            return
        }

        if (!NativeSessionManager.hasValidSession(context, orderId)) {
            // Explicit rejection for anonymous web-initiated guests missing native identity
            call.resolve(result(false, "unauthenticated"))
            return
        }

        val intent = Intent(context, TrackActivity::class.java).apply {
            putExtra(TrackActivity.EXTRA_ORDER_ID, orderId)
            // We pass natively resolved guest phone instead of bridge param
            val guestPhone = NativeSessionManager.getGuestPhone(context, orderId)
            if (guestPhone != null) {
                putExtra(TrackActivity.EXTRA_GUEST_PHONE, guestPhone)
            }
            if (userEmail != null) {
                putExtra(TrackActivity.EXTRA_USER_EMAIL, userEmail)
            }
            putExtra(TrackActivity.EXTRA_DEVICE_ID, deviceId)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        call.resolve(result(true, "opened"))
    }

    private fun result(opened: Boolean, reason: String): JSObject =
        JSObject().apply {
            put("opened", opened)
            put("reason", reason)
        }
}
