package com.bhojanos.core.database

import org.junit.Assert.*
import org.junit.Test

class DatabaseHealthTest {

    @Test
    fun testHealthCheckEntityCreation() {
        val entity = HealthCheckEntity(timestamp = 1000L, isHealthy = true)
        assertEquals("health_status", entity.id)
        assertEquals(1000L, entity.timestamp)
        assertTrue(entity.isHealthy)
    }
}
