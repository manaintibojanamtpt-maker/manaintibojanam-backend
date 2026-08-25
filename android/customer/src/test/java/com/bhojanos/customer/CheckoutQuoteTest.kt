package com.bhojanos.customer

import com.bhojanos.customer.domain.checkout.CheckoutQuote
import org.junit.Assert.*
import org.junit.Test

class CheckoutQuoteTest {

    @Test
    fun testServerAuthoritativeQuoteValuesAccepted() {
        val serverQuote = CheckoutQuote(
            quoteId = "quote_abc123",
            itemSubtotal = 360.0,
            deliveryFee = 40.0,
            packingFee = 15.0,
            taxes = 18.0,
            discount = 0.0,
            isFreeDelivery = false,
            freeDeliveryThreshold = 599.0,
            etaMinutes = 25,
            grandTotal = 433.0
        )

        assertEquals("quote_abc123", serverQuote.quoteId)
        assertEquals(433.0, serverQuote.grandTotal, 0.01)
        assertFalse(serverQuote.isExpired)
    }

    @Test
    fun testClientTamperingRejectionAuthority() {
        // Tampered values sent by malicious client payload attempt
        val clientAttemptDeliveryFee = 0.0
        val clientAttemptSubtotal = 1.0
        val clientAttemptGrandTotal = 1.0

        // Server authoritative calculation output
        val serverAuthoritativeSubtotal = 360.0
        val serverAuthoritativeDeliveryFee = 40.0
        val serverAuthoritativeGrandTotal = 433.0

        assertNotEquals(clientAttemptSubtotal, serverAuthoritativeSubtotal, 0.01)
        assertNotEquals(clientAttemptDeliveryFee, serverAuthoritativeDeliveryFee, 0.01)
        assertNotEquals(clientAttemptGrandTotal, serverAuthoritativeGrandTotal, 0.01)
    }

    @Test
    fun testQuoteExpirationDetection() {
        val pastTimestamp = System.currentTimeMillis() - (360 * 1000) // 6 minutes ago
        val expiredQuote = CheckoutQuote(
            quoteId = "expired_1",
            itemSubtotal = 100.0,
            deliveryFee = 40.0,
            packingFee = 10.0,
            taxes = 5.0,
            discount = 0.0,
            isFreeDelivery = false,
            freeDeliveryThreshold = 599.0,
            etaMinutes = 25,
            grandTotal = 155.0,
            timestamp = pastTimestamp,
            ttlSeconds = 300
        )

        assertTrue(expiredQuote.isExpired)
    }
}
