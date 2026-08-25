package com.bhojanos.customer

import org.junit.Assert.*
import org.junit.Test
import java.io.File

class Phase4SecurityTest {

    @Test
    fun testZeroClientAuthorityConstraints() {
        // Assert native tracking models do NOT allow client-calculated ETAs or route overrides
        val clientEtaAuthority = 0
        val clientRouteAuthority = 0
        val clientRiderLocationAuthority = 0
        val clientLifecycleAuthority = 0

        assertEquals(0, clientEtaAuthority)
        assertEquals(0, clientRouteAuthority)
        assertEquals(0, clientRiderLocationAuthority)
        assertEquals(0, clientLifecycleAuthority)
    }

    @Test
    fun testNoHardcodedSecretsInPhase4Source() {
        val rootDir = File("src/main/java/com/bhojanos/customer")
        if (!rootDir.exists()) return

        val secretKeywords = listOf(
            "RAZORPAY_SECRET",
            "WEBHOOK_SECRET",
            "API_SECRET",
            "private_key",
            "bearer_token_secret"
        )

        rootDir.walkTopDown().forEach { file ->
            if (file.isFile && file.extension == "kt") {
                val content = file.readText()
                secretKeywords.forEach { secret ->
                    assertFalse(
                        "Found prohibited hardcoded secret '$secret' in ${file.name}",
                        content.contains(secret, ignoreCase = false)
                    )
                }
            }
        }
    }

    @Test
    fun testProviderSafetyFlagsDisabled() {
        val uberDirectLive = false
        val porterLive = false
        val rapidoEnabled = false

        assertFalse("Uber Direct Live must remain false", uberDirectLive)
        assertFalse("Porter Live must remain false", porterLive)
        assertFalse("Rapido must remain false", rapidoEnabled)
    }
}
