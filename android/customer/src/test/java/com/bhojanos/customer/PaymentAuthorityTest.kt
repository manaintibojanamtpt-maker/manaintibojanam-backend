package com.bhojanos.customer

import com.bhojanos.core.common.NetworkResult
import com.bhojanos.core.model.OpsHealthResponse
import com.bhojanos.core.network.BhojanApiService
import com.bhojanos.customer.data.payment.PaymentRepository
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Response

/**
 * B3 payment authority test: an order is reported PAID only after the backend
 * verification step confirms it. A client-side success flag (e.g. an SDK
 * callback) can never mark an order paid on its own. Client payment authority
 * = 0.
 */
class PaymentAuthorityTest {

    @Test
    fun payment_isPaidOnlyAfterServerVerification() = runBlocking {
        var verified = false

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
            override suspend fun verifyRazorpayPayment(payload: Map<String, Any>): Response<Map<String, Any>> =
                Response.success(mapOf("verified" to verified, "success" to verified))
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

        val repo = PaymentRepository(api)

        // Server rejects the signature -> MUST NOT succeed even though the SDK
        // callback may have returned control successfully.
        verified = false
        val unverified = repo.verifyRazorpayPayment("ord_1", "pay_1", "sig_1", "draft_1")
        assertTrue("server rejected -> must NOT be success", unverified is NetworkResult.Error)

        // Only after the backend confirms is the payment reported verified.
        verified = true
        val confirmed = repo.verifyRazorpayPayment("ord_1", "pay_1", "sig_1", "draft_1")
        assertTrue("server verified -> success", confirmed is NetworkResult.Success)
        assertEquals(true, (confirmed as NetworkResult.Success).data)
    }
}
