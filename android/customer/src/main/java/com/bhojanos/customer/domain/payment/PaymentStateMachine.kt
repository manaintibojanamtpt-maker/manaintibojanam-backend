package com.bhojanos.customer.domain.payment

sealed class PaymentState {
    object Idle : PaymentState()
    object CreatingOrder : PaymentState()
    data class PaymentPending(val razorpayOrderId: String, val amountPaise: Long) : PaymentState()
    object SdkOpen : PaymentState()
    data class PaymentResultReceived(val paymentId: String, val signature: String) : PaymentState()
    object Verifying : PaymentState()
    data class Paid(val orderId: String) : PaymentState()

    data class PaymentCancelled(val reason: String = "User cancelled payment") : PaymentState()
    data class PaymentFailed(val errorCode: Int, val description: String) : PaymentState()
    data class VerificationFailed(val reason: String) : PaymentState()
    data class NetworkError(val message: String) : PaymentState()
}

data class UpiAppOption(
    val packageName: String,
    val appName: String,
    val isInstalled: Boolean
)
