package com.bhojanos.orderbhojan.nativehost

/**
 * Route ID `track` → `/orders/:orderId/track`
 */
object NativeRouteDispatcher {
    private val TRACK_PATH = Regex("""^/orders/([^/]+)/track/?$""")

    fun parseTrackOrderId(pathOrUrl: String): String? {
        val pathname = extractPathname(pathOrUrl) ?: return null
        return TRACK_PATH.matchEntire(pathname)?.groupValues?.getOrNull(1)
    }

    fun shouldOpenNativeTrack(
        hostEnabled: Boolean,
        trackEnabled: Boolean,
        inCohort: Boolean,
    ): Boolean = hostEnabled && trackEnabled && inCohort

    private fun extractPathname(pathOrUrl: String): String? {
        val raw = pathOrUrl.trim()
        if (raw.startsWith("/")) {
            return raw.substringBefore('?').substringBefore('#')
        }
        return try {
            val uri = android.net.Uri.parse(raw)
            val host = uri.host.orEmpty()
            val path = uri.path.orEmpty()
            when {
                host == "app" || host.isEmpty() -> path
                else -> "/$host$path"
            }.substringBefore('?')
        } catch (_: Exception) {
            null
        }
    }
}
