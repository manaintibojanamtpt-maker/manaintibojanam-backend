package com.bhojanos.customer

import com.bhojanos.core.common.NetworkResult
import com.bhojanos.core.model.OpsHealthResponse
import com.bhojanos.core.network.BhojanApiService
import com.bhojanos.customer.data.checkout.CheckoutRepository
import com.bhojanos.customer.domain.cart.CartItem
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Response

/**
 * B3 authority test: the checkout quote returned to the UI is taken VERBATIM
 * from the backend and never recomputed on the client. Client pricing authority
 * = 0.
 */
class CheckoutAuthorityTest {

    @Test
    fun checkoutQuote_returnsServerValuesVerbatim() = runBlocking {
        val api = object : BhojanApiService {
            override suspend fun getHealth() = Response.success(OpsHealthResponse(status = "ok"))
            override suspend fun getDiscovery(lat: Double, lng: Double, limit: Int, maxDistanceKm: Int) =
                Response.success(emptyMap<String, Any>())
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
            override suspend fun getCheckoutQuote(payload: Map<String, Any>) = Response.success(
                mapOf(
                    "ok" to true,
                    "value" to mapOf(
                        "subtotal" to 360,
                        "gstAmount" to 18,
                        "gstPercent" to 5,
                        "packagingFee" to 15,
                        "deliveryFee" to 40,
                        "deliveryPending" to false,
                        "discountAmount" to 0,
                        "grandTotal" to 433,
                        "freeDeliveryApplied" to false,
                        "deliveryDecision" to mapOf("eta" to mapOf("minMinutes" to 30, "maxMinutes" to 45))
                    )
                )
            )
            override suspend fun getOrderTracking(orderId: String) =
                Response.success(emptyMap<String, Any>())
            override suspend fun getUserOrders(limit: Int) = Response.success(emptyMap<String, Any>())
            override suspend fun registerFcmToken(payload: Map<String, String>) =
                Response.success(emptyMap<String, Any>())
        }

        val repo = CheckoutRepository(api)
        val items = listOf(
            CartItem(
                id = "c1", restaurantId = "mana-inti", restaurantName = "Mana Inti",
                itemId = "item-thali", itemName = "Andhra Thali", price = 180.0,
                quantity = 2, isVeg = true
            )
        )

        val result = repo.getAuthoritativeQuote(items, 17.44, 78.35)
        assertTrue("expected a success", result is NetworkResult.Success)
        val quote = (result as NetworkResult.Success).data

        // Values are taken verbatim from the server — none recomputed client-side.
        assertEquals(360.0, quote.itemSubtotal, 0.001)
        assertEquals(40.0, quote.deliveryFee, 0.001)
        assertEquals(15.0, quote.packingFee, 0.001)
        assertEquals(18.0, quote.taxes, 0.001)
        assertEquals(0.0, quote.discount, 0.001)
        assertEquals(433.0, quote.grandTotal, 0.001)
        assertEquals(30, quote.etaMinutes)
        assertFalse(quote.isFreeDelivery)
    }

    @Test
    fun checkoutQuote_rejectsWhenRestaurantMissing() = runBlocking {
        val api = object : BhojanApiService {
            override suspend fun getHealth() = Response.success(OpsHealthResponse(status = "ok"))
            override suspend fun getDiscovery(lat: Double, lng: Double, limit: Int, maxDistanceKm: Int) =
                Response.success(emptyMap<String, Any>())
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
                Response.success(mapOf("ok" to true, "value" to mapOf("grandTotal" to 433)))
            override suspend fun getOrderTracking(orderId: String) =
                Response.success(emptyMap<String, Any>())
            override suspend fun getUserOrders(limit: Int) = Response.success(emptyMap<String, Any>())
            override suspend fun registerFcmToken(payload: Map<String, String>) =
                Response.success(emptyMap<String, Any>())
        }

        val repo = CheckoutRepository(api)
        val items = listOf(
            CartItem(
                id = "c1", restaurantId = "  ", restaurantName = "X",
                itemId = "i1", itemName = "T", price = 10.0, quantity = 1, isVeg = true
            )
        )
        val result = repo.getAuthoritativeQuote(items, 17.44, 78.35)
        assertTrue(result is NetworkResult.Error)
    }
}
