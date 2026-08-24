package com.bhojanos.customer.track

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

/**
 * Marketplace tracking client — same headers as hybrid MarketplaceHttpClient.
 */
class TrackApiClient(
    private val apiBaseUrl: String,
    private val apiVersion: String,
) {
    fun fetchTracking(orderId: String, bearerToken: String?): TrackSnapshot {
        val path = "/api/marketplace/orders/${encode(orderId)}/tracking"
        return get(path, bearerToken)
    }

    fun fetchGuestTracking(orderId: String, phone: String): TrackSnapshot {
        val path =
            "/api/marketplace/orders/${encode(orderId)}/guest-tracking?phone=${encode(phone)}"
        return get(path, bearerToken = null)
    }

    private fun get(path: String, bearerToken: String?): TrackSnapshot {
        val url = URL("$apiBaseUrl$path")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 15_000
            readTimeout = 15_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("X-Marketplace-API-Version", apiVersion)
            setRequestProperty("X-Correlation-Id", UUID.randomUUID().toString())
            if (!bearerToken.isNullOrBlank()) {
                setRequestProperty("Authorization", "Bearer $bearerToken")
            }
        }
        try {
            val code = conn.responseCode
            val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader()
                ?.use { it.readText() }
                .orEmpty()
            if (code !in 200..299) {
                throw IllegalStateException("tracking_http_$code")
            }
            return parseEnvelope(body)
        } finally {
            conn.disconnect()
        }
    }

    private fun parseEnvelope(body: String): TrackSnapshot {
        val root = JSONObject(body)
        val value = when {
            root.has("value") && !root.isNull("value") -> root.getJSONObject("value")
            root.has("orderId") -> root
            else -> throw IllegalStateException("tracking_bad_envelope")
        }
        val timelineJson = value.optJSONArray("timeline")
        val timeline = buildList {
            if (timelineJson != null) {
                for (i in 0 until timelineJson.length()) {
                    val item = timelineJson.getJSONObject(i)
                    add(
                        TrackTimelineEvent(
                            status = item.optString("status"),
                            at = item.optString("at"),
                            message = item.optString("message").ifBlank { null },
                        ),
                    )
                }
            }
        }
        val eta = value.optJSONObject("etaMinutes")
        val restaurant = value.optJSONObject("restaurant")
        return TrackSnapshot(
            orderId = value.optString("orderId"),
            orderNumber = value.optString("orderNumber"),
            status = value.optString("status"),
            timeline = timeline,
            etaMin = eta?.optInt("min"),
            etaMax = eta?.optInt("max"),
            restaurantName = restaurant?.optString("displayName"),
        )
    }

    private fun encode(value: String): String =
        java.net.URLEncoder.encode(value, Charsets.UTF_8.name())
}
