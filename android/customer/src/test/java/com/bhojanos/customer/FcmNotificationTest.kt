package com.bhojanos.customer

import com.bhojanos.core.network.BhojanApiService
import com.bhojanos.core.network.FcmManager
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import retrofit2.Response

class FcmNotificationTest {

    private var registeredToken: String? = null
    private var registeredPlatform: String? = null

    private val fakeApiService = object : BhojanApiService {
        override suspend fun getHealth() = Response.success(com.bhojanos.core.model.OpsHealthResponse(status = "ok"))
        override suspend fun getDiscovery(lat: Double, lng: Double, limit: Int, maxDistanceKm: Int) = Response.success(emptyMap<String, Any>())
        override suspend fun getOwnerDeliveryIntegrations(tenantId: String) = Response.success(emptyMap<String, Any>())
        override suspend fun createOrder(orderPayload: Map<String, Any>) = Response.success(emptyMap<String, Any>())
        override suspend fun createRazorpayOrder(payload: Map<String, Any>) = Response.success(emptyMap<String, Any>())
        override suspend fun verifyRazorpayPayment(payload: Map<String, Any>) = Response.success(emptyMap<String, Any>())
        override suspend fun validateCoupon(payload: Map<String, Any>) = Response.success(emptyMap<String, Any>())
        override suspend fun getCheckoutQuote(payload: Map<String, Any>) = Response.success(emptyMap<String, Any>())
        override suspend fun getOrderTracking(orderId: String) = Response.success(emptyMap<String, Any>())
        override suspend fun getUserOrders(limit: Int) = Response.success(emptyMap<String, Any>())
        override suspend fun registerFcmToken(payload: Map<String, String>): Response<Map<String, Any>> {
            registeredToken = payload["token"]
            registeredPlatform = payload["platform"]
            return Response.success(mapOf("ok" to true))
        }
    }

    private val fcmManager = FcmManager(fakeApiService)

    @Test
    fun testFcmTokenRegistrationPayload() = runBlocking {
        val result = fcmManager.registerDeviceToken("fcm_device_token_xyz_123")
        assertTrue(result.isSuccess)
        assertEquals("fcm_device_token_xyz_123", registeredToken)
        assertEquals("android", registeredPlatform)
    }

    @Test
    fun testNotificationPayloadParsing() {
        val dataPayload = mapOf(
            "orderId" to "ord_888",
            "eventType" to "OUT_FOR_DELIVERY"
        )

        val parsed = fcmManager.parseNotificationPayload(
            data = dataPayload,
            title = "Out for Delivery!",
            body = "Ramesh is on his way with your order."
        )

        assertEquals("ord_888", parsed.orderId)
        assertEquals("OUT_FOR_DELIVERY", parsed.eventType)
        assertEquals("Out for Delivery!", parsed.title)
        assertEquals("Ramesh is on his way with your order.", parsed.body)
    }

    @Test
    fun testNotificationPayloadParsingWithMissingOrderId() {
        val invalidPayload = mapOf(
            "eventType" to "PREPARING"
        )

        val parsed = fcmManager.parseNotificationPayload(
            data = invalidPayload,
            title = "Preparing Food",
            body = null
        )

        assertNull(parsed.orderId)
        assertEquals("PREPARING", parsed.eventType)
    }
}
