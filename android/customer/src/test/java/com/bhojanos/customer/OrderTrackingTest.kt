package com.bhojanos.customer

import com.bhojanos.core.network.BhojanApiService
import com.bhojanos.customer.data.tracking.TrackingRepository
import com.bhojanos.customer.domain.tracking.TrackingStatus
import com.bhojanos.customer.domain.tracking.EtaRange
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import retrofit2.Response

class OrderTrackingTest {

    private val fakeApiService = object : BhojanApiService {
        override suspend fun getHealth() = Response.success(com.bhojanos.core.model.OpsHealthResponse(status = "ok"))
        override suspend fun getDiscovery(lat: Double, lng: Double, limit: Int, maxDistanceKm: Int) = Response.success(emptyMap<String, Any>())
        override suspend fun getOwnerDeliveryIntegrations(tenantId: String) = Response.success(emptyMap<String, Any>())
        override suspend fun createOrder(orderPayload: Map<String, Any>) = Response.success(emptyMap<String, Any>())
        override suspend fun createRazorpayOrder(payload: Map<String, Any>) = Response.success(emptyMap<String, Any>())
        override suspend fun verifyRazorpayPayment(payload: Map<String, Any>) = Response.success(emptyMap<String, Any>())
        override suspend fun validateCoupon(payload: Map<String, Any>) = Response.success(emptyMap<String, Any>())
        override suspend fun getCheckoutQuote(payload: Map<String, Any>) = Response.success(emptyMap<String, Any>())
        override suspend fun getOrderTracking(orderId: String): Response<Map<String, Any>> {
            return Response.success(
                mapOf(
                    "ok" to true,
                    "value" to mapOf(
                        "orderId" to orderId,
                        "orderNumber" to "#1042",
                        "status" to "OUT_FOR_DELIVERY",
                        "paymentStatus" to "success",
                        "etaMinutes" to mapOf("min" to 25, "max" to 35),
                        "restaurant" to mapOf("displayName" to "Mana Inti Kitchen", "slug" to "mana-inti"),
                        "delivery" to mapOf(
                            "partner" to "BhojanOS Express",
                            "riderName" to "Ramesh",
                            "riderPhone" to "9876543210"
                        )
                    )
                )
            )
        }
        override suspend fun getUserOrders(limit: Int) = Response.success(emptyMap<String, Any>())
        override suspend fun registerFcmToken(payload: Map<String, String>): Response<Map<String, Any>> = Response.success(mapOf("ok" to true))
    }

    private val repository = TrackingRepository(fakeApiService)

    @Test
    fun testOrderTrackingLoadsSuccessfully() = runBlocking {
        val result = repository.fetchOrderTracking("ord_1042")
        assertTrue(result.isSuccess)

        val state = result.getOrNull()!!
        assertEquals("ord_1042", state.orderId)
        assertEquals("#1042", state.orderNumber)
        assertEquals(TrackingStatus.OUT_FOR_DELIVERY, state.status)
        assertEquals("Mana Inti Kitchen", state.restaurant.displayName)
        assertEquals("Ramesh", state.rider?.name)
        assertEquals("9876543210", state.rider?.phone)
    }

    @Test
    fun testEtaRangeFormatting() {
        val etaRange = EtaRange(25, 35)
        assertEquals("25–35 min", etaRange.displayString())

        val sameEta = EtaRange(30, 30)
        assertEquals("30 min", sameEta.displayString())

        val nullEta = EtaRange(null, null)
        assertEquals("ETA Updating...", nullEta.displayString())
    }

    @Test
    fun testTerminalStatesDetection() {
        assertTrue(TrackingStatus.DELIVERED.isTerminal())
        assertTrue(TrackingStatus.CANCELLED.isTerminal())
        assertFalse(TrackingStatus.PLACED.isTerminal())
        assertFalse(TrackingStatus.PREPARING.isTerminal())
        assertFalse(TrackingStatus.OUT_FOR_DELIVERY.isTerminal())
    }

    @Test
    fun testPayloadParsingWithMissingRiderDetails() {
        val rawPayload = mapOf<String, Any>(
            "orderId" to "ord_999",
            "orderNumber" to "#999",
            "status" to "PREPARING",
            "paymentStatus" to "success",
            "restaurant" to mapOf("displayName" to "Ghar Ka Khana", "slug" to "ghar-khana")
        )

        val state = repository.parseTrackingPayload("ord_999", rawPayload)
        assertEquals(TrackingStatus.PREPARING, state.status)
        assertNull(state.rider)
        assertNull(state.etaRange)
    }
}
