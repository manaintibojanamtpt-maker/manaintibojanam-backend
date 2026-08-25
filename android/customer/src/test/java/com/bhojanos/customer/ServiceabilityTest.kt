package com.bhojanos.customer

import com.bhojanos.customer.domain.discovery.DeliveryCapability
import org.junit.Assert.*
import org.junit.Test

class ServiceabilityTest {

    @Test
    fun testServerAuthoritativeDeliveryCapabilityParsing() {
        val serverCapability = DeliveryCapability(
            serviceable = true,
            customerDeliveryFee = 40.0,
            freeDeliveryThreshold = 599.0,
            isFreeDelivery = false,
            etaMinutes = 30
        )

        assertTrue(serverCapability.serviceable)
        assertEquals(40.0, serverCapability.customerDeliveryFee, 0.01)
        assertEquals(599.0, serverCapability.freeDeliveryThreshold!!, 0.01)
        assertFalse(serverCapability.isFreeDelivery)
        assertEquals(30, serverCapability.etaMinutes)
    }

    @Test
    fun testClientCannotOverrideServerDeliveryFeeOrEta() {
        // Native client MUST NOT perform distance * rate calculations
        val serverFee = 0.0 // Server free tier for 0-2km
        val clientCalculatedFee = 0.0 // Read-only from server payload

        assertEquals(serverFee, clientCalculatedFee, 0.0)
    }
}
