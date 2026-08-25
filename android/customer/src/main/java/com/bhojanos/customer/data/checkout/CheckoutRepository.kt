package com.bhojanos.customer.data.checkout

import com.bhojanos.core.common.NetworkResult
import com.bhojanos.core.network.BhojanApiService
import com.bhojanos.customer.domain.cart.CartItem
import com.bhojanos.customer.domain.checkout.CheckoutQuote

/**
 * Checkout repository with ZERO client pricing authority.
 *
 * SECURITY (B3): The Android client must NEVER compute subtotal, delivery fee,
 * GST, discount, packing fee, free-delivery, subsidy, grand total or ETA. It
 * only forwards the cart lines + delivery coordinates to the backend
 * `POST /api/marketplace/quote` contract and displays the server-generated
 * [CheckoutQuote] verbatim. Any financial value the UI shows originates from
 * this server response.
 */
class CheckoutRepository(
    private val apiService: BhojanApiService
) {
    suspend fun getAuthoritativeQuote(
        items: List<CartItem>,
        latitude: Double,
        longitude: Double,
        couponCode: String? = null
    ): NetworkResult<CheckoutQuote> {
        return try {
            val restaurantId = items.firstOrNull()?.restaurantId?.trim().orEmpty()
            if (restaurantId.isEmpty()) {
                return NetworkResult.Error(message = "restaurantId is required before quoting")
            }

            val request = mapOf<String, Any>(
                "restaurantId" to restaurantId,
                "orderType" to "delivery",
                "lines" to items.map { line ->
                    mapOf(
                        "itemId" to line.itemId,
                        "quantity" to line.quantity,
                        "unitPrice" to line.price,
                        "name" to line.itemName
                    )
                },
                "deliveryAddress" to mapOf(
                    "lat" to latitude,
                    "lng" to longitude
                )
            ).let { base ->
                if (couponCode.isNullOrBlank()) base else base + ("couponCode" to couponCode)
            }

            val response = apiService.getCheckoutQuote(request)
            if (!response.isSuccessful || response.body() == null) {
                return NetworkResult.Error(
                    code = response.code(),
                    message = "Quote request rejected (HTTP ${response.code()})"
                )
            }

            val body = response.body()!!
            val ok = body["ok"] as? Boolean ?: false
            if (!ok) {
                val error = body["error"] as? Map<*, *>
                val msg = error?.get("message") as? String ?: "Failed to build checkout quote"
                return NetworkResult.Error(message = msg)
            }

            val rawValue = body["value"]
            val quoteJson = (rawValue as? Map<*, *>) ?: body
            val quote = CheckoutQuoteMapper.fromServer(quoteJson) ?: return NetworkResult.Error(
                message = "Malformed server quote response"
            )

            NetworkResult.Success(quote)
        } catch (e: Exception) {
            NetworkResult.Error(message = e.message ?: "Network error fetching checkout quote")
        }
    }

    suspend fun placeOrder(
        items: List<CartItem>,
        address: String,
        phone: String,
        userId: String,
        userName: String,
        paymentMethod: String,
        quote: CheckoutQuote,
        razorpayOrderId: String? = null,
        razorpayPaymentId: String? = null,
        scheduledSlot: String? = null
    ): NetworkResult<String> {
        return try {
            val payload = mutableMapOf<String, Any>(
                "items" to items.map {
                    mapOf(
                        "id" to it.itemId,
                        "name" to it.itemName,
                        "price" to it.price,
                        "quantity" to it.quantity
                    )
                },
                "address" to address,
                "phone" to phone,
                "userId" to userId,
                "userName" to userName,
                "paymentMethod" to paymentMethod,
                "quoteId" to quote.quoteId,
                "tenantId" to (items.firstOrNull()?.restaurantId ?: "default_tenant")
            )

            if (!razorpayOrderId.isNullOrEmpty()) payload["razorpayOrderId"] = razorpayOrderId
            if (!razorpayPaymentId.isNullOrEmpty()) payload["razorpayPaymentId"] = razorpayPaymentId
            if (!scheduledSlot.isNullOrEmpty()) payload["deliveryTimeSlot"] = scheduledSlot

            val response = apiService.createOrder(payload)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val orderId = body["orderId"] as? String ?: body["order_id"] as? String
                    ?: return NetworkResult.Error(code = response.code(), message = "Server did not return an order id")
                NetworkResult.Success(orderId)
            } else {
                NetworkResult.Error(code = response.code(), message = "Failed to place order: ${response.message()}")
            }
        } catch (e: Exception) {
            NetworkResult.Error(message = e.message ?: "Network error during order placement")
        }
    }
}

