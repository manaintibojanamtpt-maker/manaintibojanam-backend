package com.bhojanos.customer.domain.checkout

data class CheckoutQuote(
    val quoteId: String,
    val itemSubtotal: Double,
    val deliveryFee: Double,
    val packingFee: Double,
    val taxes: Double,
    val discount: Double,
    val isFreeDelivery: Boolean,
    val freeDeliveryThreshold: Double?,
    val etaMinutes: Int,
    val grandTotal: Double,
    val timestamp: Long = System.currentTimeMillis(),
    val ttlSeconds: Long = 300 // 5 minutes validity
) {
    val isExpired: Boolean
        get() = (System.currentTimeMillis() - timestamp) > (ttlSeconds * 1000)
}

data class ScheduledSlot(
    val slotId: String,
    val label: String,
    val startTime: String,
    val endTime: String,
    val isAvailable: Boolean = true
)

enum class PaymentMethodType {
    RAZORPAY,
    DIRECT_UPI,
    COD
}
