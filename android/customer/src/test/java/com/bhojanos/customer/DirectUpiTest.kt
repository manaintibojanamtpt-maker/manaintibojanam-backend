package com.bhojanos.customer

import com.bhojanos.customer.domain.payment.UpiAppOption
import org.junit.Assert.*
import org.junit.Test

class DirectUpiTest {

    @Test
    fun testUpiAppOptionDetection() {
        val upiApps = listOf(
            UpiAppOption("com.google.android.apps.nfc.phone", "Google Pay", true),
            UpiAppOption("com.phonepe.app", "PhonePe", true),
            UpiAppOption("net.one97.paytm", "Paytm", false)
        )

        val installed = upiApps.filter { it.isInstalled }
        assertEquals(2, installed.size)
        assertTrue(installed.any { it.appName == "Google Pay" })
        assertFalse(installed.any { it.appName == "Paytm" })
    }
}
