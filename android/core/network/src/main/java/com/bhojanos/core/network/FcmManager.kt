package com.bhojanos.core.network

data class BhojanPushPayload(
    val orderId: String?,
    val eventType: String?,
    val title: String,
    val body: String
)

class FcmManager(
    private val apiService: BhojanApiService
) {
    private var lastRegisteredToken: String? = null

    suspend fun registerDeviceToken(token: String): Result<Boolean> {
        if (token.isBlank()) return Result.failure(IllegalArgumentException("Token cannot be blank"))
        if (token == lastRegisteredToken) return Result.success(true)

        return try {
            val response = apiService.registerFcmToken(
                mapOf(
                    "token" to token,
                    "platform" to "android"
                )
            )
            if (response.isSuccessful) {
                lastRegisteredToken = token
                Result.success(true)
            } else {
                Result.failure(Exception("HTTP ${response.code()} register token failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun parseNotificationPayload(data: Map<String, String>, title: String?, body: String?): BhojanPushPayload {
        val orderId = data["orderId"] ?: data["id"]
        val eventType = data["eventType"] ?: data["type"] ?: "ORDER_STATUS"
        val resolvedTitle = title ?: data["title"] ?: "Order Update"
        val resolvedBody = body ?: data["body"] ?: "Tap to view order status"

        return BhojanPushPayload(
            orderId = orderId,
            eventType = eventType,
            title = resolvedTitle,
            body = resolvedBody
        )
    }

    fun isDuplicateNotification(eventId: String, processedEvents: Set<String>): Boolean {
        return processedEvents.contains(eventId)
    }
}
