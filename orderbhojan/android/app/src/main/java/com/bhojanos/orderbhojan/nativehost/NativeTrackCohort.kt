package com.bhojanos.orderbhojan.nativehost

import android.content.Context

/**
 * Cohort: internal email allowlist and/or sticky % bucket.
 * Mirror of JS evaluateNativeTrackRollout (native double-check).
 */
object NativeTrackCohort {
    fun inCohort(
        context: Context,
        userEmail: String?,
        deviceId: String?,
    ): Boolean {
        val email = userEmail?.trim()?.lowercase().orEmpty()
        if (email.isNotEmpty() && NativeFeatureFlags.internalEmails(context).contains(email)) {
            return true
        }
        val percent = NativeFeatureFlags.trackPercent(context)
        if (percent <= 0) return false
        if (percent >= 100) return true
        val key = deviceId?.trim().orEmpty().ifEmpty { "anonymous" }
        val bucket = stickyBucket0to99("native-track|$key")
        return bucket < percent
    }

    fun shouldOpenNative(context: Context, userEmail: String?, deviceId: String?): Boolean {
        return NativeFeatureFlags.isNativeHostEnabled(context) &&
            NativeFeatureFlags.isNativeTrackEnabled(context) &&
            inCohort(context, userEmail, deviceId)
    }

    fun stickyBucket0to99(cohortKey: String): Int {
        var hash = 0x811c9dc5.toInt()
        for (ch in cohortKey) {
            hash = hash xor ch.code
            hash *= 0x01000193
        }
        val unsigned = hash.toLong() and 0xffffffffL
        return (unsigned % 100L).toInt()
    }
}
