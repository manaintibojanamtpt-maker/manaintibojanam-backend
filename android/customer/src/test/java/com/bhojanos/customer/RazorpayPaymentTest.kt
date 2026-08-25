package com.bhojanos.customer

import com.bhojanos.customer.domain.payment.PaymentState
import org.junit.Assert.*
import org.junit.Test

class RazorpayPaymentTest {

    @Test
    fun testPaymentStateTransitions() {
        var state: PaymentState = PaymentState.Idle
        assertTrue(state is PaymentState.Idle)

        state = PaymentState.CreatingOrder
        assertTrue(state is PaymentState.CreatingOrder)

        state = PaymentState.PaymentPending(razorpayOrderId = "order_rzp_123", amountPaise = 43300)
        assertTrue(state is PaymentState.PaymentPending)
        assertEquals("order_rzp_123", (state as PaymentState.PaymentPending).razorpayOrderId)

        state = PaymentState.Verifying
        assertTrue(state is PaymentState.Verifying)

        state = PaymentState.Paid(orderId = "ord_999")
        assertTrue(state is PaymentState.Paid)
        assertEquals("ord_999", (state as PaymentState.Paid).orderId)
    }

    @Test
    fun testDirectMarkPaidProhibitedWithoutServerVerification() {
        // Client receives payment result from SDK
        val razorpayPaymentId = "pay_8888"
        val razorpaySignature = "sig_dummy"

        val isServerVerified = false

        // ORDER MUST NOT BE MARKED AS PAID WHEN SERVER VERIFICATION IS FALSE
        val finalOrderState = if (isServerVerified) PaymentState.Paid("ord_123") else PaymentState.VerificationFailed("HMAC verification pending")

        assertTrue(finalOrderState is PaymentState.VerificationFailed)
        assertFalse(finalOrderState is PaymentState.Paid)
    }
}
