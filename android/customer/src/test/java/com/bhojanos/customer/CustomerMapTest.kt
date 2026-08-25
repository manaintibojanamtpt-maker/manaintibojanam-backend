package com.bhojanos.customer

import com.bhojanos.core.network.BhojanApiService
import com.bhojanos.customer.data.tracking.TrackingRepository
import org.junit.Assert.*
import org.junit.Test
import retrofit2.Response

class CustomerMapTest {

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
        override suspend fun registerFcmToken(payload: Map<String, String>): Response<Map<String, Any>> = Response.success(mapOf("ok" to true))
    }

    private val repository = TrackingRepository(fakeApiService)

    @Test
    fun testRiderMarkerOnlyRenderedWhenServerProvidesCoordinates() {
        val payloadWithoutRiderGps = mapOf<String, Any>(
            "orderId" to "ord_1",
            "orderNumber" to "#1",
            "status" to "OUT_FOR_DELIVERY",
            "delivery" to mapOf(
                "partner" to "BhojanOS Express",
                "riderName" to "Srinivas"
                // 0 riderLocation supplied
            )
        )

        val state1 = repository.parseTrackingPayload("ord_1", payloadWithoutRiderGps)
        assertNull("Rider location must be null when server gives 0 coordinates", state1.rider?.location)

        val payloadWithRiderGps = mapOf<String, Any>(
            "orderId" to "ord_2",
            "orderNumber" to "#2",
            "status" to "OUT_FOR_DELIVERY",
            "delivery" to mapOf(
                "partner" to "BhojanOS Express",
                "riderName" to "Srinivas",
                "location" to mapOf("lat" to 13.6288, "lng" to 79.4192)
            )
        )

        val state2 = repository.parseTrackingPayload("ord_2", payloadWithRiderGps)
        assertNotNull("Rider location must be present when server supplies valid coordinates", state2.rider?.location)
        assertEquals(13.6288, state2.rider!!.location!!.lat, 0.0001)
        assertEquals(79.4192, state2.rider!!.location!!.lng, 0.0001)
    }

    @Test
    fun testZeroManufacturedOrFakeGpsCoordinates() {
        val defaultNullState = repository.parseTrackingPayload("ord_3", emptyMap())
        assertNull(defaultNullState.rider?.location)
        assertNull(defaultNullState.restaurant.location)
        assertNull(defaultNullState.customerLocation)
        assertTrue(defaultNullState.routePolyline.isNullOrEmpty())
    }
}
