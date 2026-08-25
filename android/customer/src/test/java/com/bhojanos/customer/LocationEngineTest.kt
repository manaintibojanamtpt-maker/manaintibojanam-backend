package com.bhojanos.customer

import com.bhojanos.customer.domain.location.LocationResult
import org.junit.Assert.*
import org.junit.Test

class LocationEngineTest {

    @Test
    fun testLocationResultSuccessCoordinates() {
        val result = LocationResult.Success(18.499594, 73.978589)
        assertTrue(result is LocationResult.Success)
        assertEquals(18.499594, (result as LocationResult.Success).latitude, 0.0001)
        assertEquals(73.978589, result.longitude, 0.0001)
    }

    @Test
    fun testLocationResultPermissionDenied() {
        val result = LocationResult.PermissionDenied
        assertTrue(result is LocationResult.PermissionDenied)
    }

    @Test
    fun testLocationResultDisabled() {
        val result = LocationResult.LocationDisabled
        assertTrue(result is LocationResult.LocationDisabled)
    }

    @Test
    fun testLocationResultError() {
        val result = LocationResult.Error("Location timeout after 10s")
        assertTrue(result is LocationResult.Error)
        assertEquals("Location timeout after 10s", (result as LocationResult.Error).message)
    }
}
