package com.bhojanos.customer.data.payment

import com.bhojanos.core.common.NetworkResult
import com.bhojanos.core.network.BhojanApiService

class PaymentRepository(
    private val apiService: BhojanApiService
) {
    suspend fun createRazorpayOrder(draftId: String, userId: String): NetworkResult<Map<String, Any>> {
        return try {
            val payload = mapOf("draftId" to draftId, "userId" to userId)
            val response = apiService.createRazorpayOrder(payload)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body["success"] == true) {
                    NetworkResult.Success(body)
                } else {
                    NetworkResult.Error(message = (body["error"] as? String) ?: "Razorpay order creation failed")
                }
            } else {
                NetworkResult.Error(code = response.code(), message = "HTTP error creating Razorpay order")
            }
        } catch (e: Exception) {
            NetworkResult.Error(message = e.message ?: "Network error creating Razorpay order")
        }
    }

    suspend fun verifyRazorpayPayment(
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String,
        draftId: String? = null
    ): NetworkResult<Boolean> {
        return try {
            val payload = mutableMapOf<String, Any>(
                "razorpay_order_id" to razorpayOrderId,
                "razorpay_payment_id" to razorpayPaymentId,
                "razorpay_signature" to razorpaySignature
            )
            if (!draftId.isNullOrEmpty()) payload["draftId"] = draftId

            val response = apiService.verifyRazorpayPayment(payload)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val isVerified = body["verified"] as? Boolean ?: (body["success"] as? Boolean ?: false)
                if (isVerified) {
                    NetworkResult.Success(true)
                } else {
                    NetworkResult.Error(message = (body["error"] as? String) ?: "Payment verification failed")
                }
            } else {
                NetworkResult.Error(code = response.code(), message = "Payment signature verification rejected")
            }
        } catch (e: Exception) {
            NetworkResult.Error(message = e.message ?: "Network error during payment verification")
        }
    }
}
