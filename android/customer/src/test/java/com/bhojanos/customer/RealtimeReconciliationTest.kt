package com.bhojanos.customer

import com.bhojanos.core.network.BhojanApiService
import com.bhojanos.customer.data.tracking.TrackingRepository
import com.bhojanos.customer.domain.tracking.OrderTrackingState
import com.bhojanos.customer.domain.tracking.RestaurantInfo
import com.bhojanos.customer.domain.tracking.TrackingFreshness
import com.bhojanos.customer.domain.tracking.TrackingStatus
import org.junit.Assert.*
import org.junit.Test
import retrofit2.Response

class RealtimeReconciliationTest {

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
    private val dummyRestaurant = RestaurantInfo(id = "r1", displayName = "Kitchen", slug = "kitchen")

    @Test
    fun testReconciliationRejectsStaleTimestamp() {
        val currentState = OrderTrackingState(
            orderId = "ord_100",
            orderNumber = "#100",
            status = TrackingStatus.OUT_FOR_DELIVERY,
            paymentStatus = "PAID",
            timeline = emptyList(),
            etaRange = null,
            restaurant = dummyRestaurant,
            rider = null,
            lastUpdatedAtMs = 2000L
        )

        val incomingStaleState = OrderTrackingState(
            orderId = "ord_100",
            orderNumber = "#100",
            status = TrackingStatus.PREPARING,
            paymentStatus = "PAID",
            timeline = emptyList(),
            etaRange = null,
            restaurant = dummyRestaurant,
            rider = null,
            lastUpdatedAtMs = 1000L // Older than current
        )

        // Seed repository cache with currentState
        repository.reconcileState("ord_100", currentState)

        // Reconcile incoming stale state against cache
        val reconciled = repository.reconcileState("ord_100", incomingStaleState)
        assertEquals(TrackingStatus.OUT_FOR_DELIVERY, reconciled.status)
        assertEquals(2000L, reconciled.lastUpdatedAtMs)
    }

    @Test
    fun testReconciliationAcceptsNewerTimestamp() {
        val currentState = OrderTrackingState(
            orderId = "ord_100",
            orderNumber = "#100",
            status = TrackingStatus.PREPARING,
            paymentStatus = "PAID",
            timeline = emptyList(),
            etaRange = null,
            restaurant = dummyRestaurant,
            rider = null,
            lastUpdatedAtMs = 1000L
        )

        val incomingNewerState = OrderTrackingState(
            orderId = "ord_100",
            orderNumber = "#100",
            status = TrackingStatus.OUT_FOR_DELIVERY,
            paymentStatus = "PAID",
            timeline = emptyList(),
            etaRange = null,
            restaurant = dummyRestaurant,
            rider = null,
            lastUpdatedAtMs = 2000L
        )

        // Seed repository cache
        repository.reconcileState("ord_100", currentState)

        // Reconcile incoming newer state
        val reconciled = repository.reconcileState("ord_100", incomingNewerState)
        assertEquals(TrackingStatus.OUT_FOR_DELIVERY, reconciled.status)
        assertEquals(2000L, reconciled.lastUpdatedAtMs)
        assertEquals(TrackingFreshness.FRESH, reconciled.freshness)
    }

    @Test
    fun testTerminalStateIsNeverOverwritten() {
        val terminalState = OrderTrackingState(
            orderId = "ord_100",
            orderNumber = "#100",
            status = TrackingStatus.DELIVERED,
            paymentStatus = "PAID",
            timeline = emptyList(),
            etaRange = null,
            restaurant = dummyRestaurant,
            rider = null,
            lastUpdatedAtMs = 3000L
        )

        val rogueNewerState = OrderTrackingState(
            orderId = "ord_100",
            orderNumber = "#100",
            status = TrackingStatus.OUT_FOR_DELIVERY,
            paymentStatus = "PAID",
            timeline = emptyList(),
            etaRange = null,
            restaurant = dummyRestaurant,
            rider = null,
            lastUpdatedAtMs = 4000L
        )

        // Seed repository cache with terminal state
        repository.reconcileState("ord_100", terminalState)

        // Attempt non-terminal update
        val reconciled = repository.reconcileState("ord_100", rogueNewerState)
        assertEquals(TrackingStatus.DELIVERED, reconciled.status)
    }
}
