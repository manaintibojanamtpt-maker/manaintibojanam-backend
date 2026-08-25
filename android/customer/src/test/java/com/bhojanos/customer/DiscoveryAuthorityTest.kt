package com.bhojanos.customer

import com.bhojanos.core.common.NetworkResult
import com.bhojanos.core.model.OpsHealthResponse
import com.bhojanos.core.network.BhojanApiService
import com.bhojanos.customer.domain.discovery.DiscoveryRepository
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Response

/**
 * B4 authority test: discovery returns ONLY server-projected restaurants. No
 * hardcoded/sample restaurant may ever leak through the repository.
 */
class DiscoveryAuthorityTest {

    @Test
    fun discovery_returnsServerProjectedRestaurants() = runBlocking {
        val api = object : BhojanApiService {
            override suspend fun getHealth() = Response.success(OpsHealthResponse(status = "ok"))
            override suspend fun getDiscovery(lat: Double, lng: Double, limit: Int, maxDistanceKm: Int) =
                Response.success(
                    mapOf(
                        "ok" to true,
                        "value" to mapOf(
                            "collections" to listOf(
                                mapOf(
                                    "id" to "nearby",
                                    "title" to "Nearby",
                                    "restaurants" to listOf(
                                        mapOf(
                                            "restaurantId" to "server-rest-1",
                                            "restaurantSlug" to "server-slug-1",
                                            "displayName" to "Server Kitchen",
                                            "rating" to 4.9,
                                            "ratingCount" to 200,
                                            "cuisines" to listOf("North Indian"),
                                            "deliveryFee" to 30,
                                            "isOpen" to true,
                                            "etaMinutes" to mapOf("min" to 25, "max" to 35)
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            override suspend fun getOwnerDeliveryIntegrations(tenantId: String) =
                Response.success(emptyMap<String, Any>())
            override suspend fun createOrder(orderPayload: Map<String, Any>) =
                Response.success(emptyMap<String, Any>())
            override suspend fun createRazorpayOrder(payload: Map<String, Any>) =
                Response.success(emptyMap<String, Any>())
            override suspend fun verifyRazorpayPayment(payload: Map<String, Any>) =
                Response.success(emptyMap<String, Any>())
            override suspend fun validateCoupon(payload: Map<String, Any>) =
                Response.success(emptyMap<String, Any>())
            override suspend fun getCheckoutQuote(payload: Map<String, Any>) =
                Response.success(emptyMap<String, Any>())
            override suspend fun getOrderTracking(orderId: String) =
                Response.success(emptyMap<String, Any>())
            override suspend fun getUserOrders(limit: Int) = Response.success(emptyMap<String, Any>())
            override suspend fun registerFcmToken(payload: Map<String, String>) =
                Response.success(emptyMap<String, Any>())
        }

        val repo = DiscoveryRepository(api)
        val result = repo.getDiscovery(17.44, 78.35)
        assertTrue("expected a success", result is NetworkResult.Success)
        val restaurants = (result as NetworkResult.Success).data

        assertEquals(1, restaurants.size)
        val r = restaurants.first()
        assertEquals("server-rest-1", r.id)
        assertEquals("Server Kitchen", r.name)
        assertEquals(30.0, r.deliveryCapability.customerDeliveryFee, 0.001)
        assertEquals(25, r.deliveryCapability.etaMinutes)

        // No hardcoded demo restaurant may leak through.
        assertTrue(restaurants.none { it.id.contains("mana_inti") || it.name.contains("Inti Bhojanam") })
    }
}
