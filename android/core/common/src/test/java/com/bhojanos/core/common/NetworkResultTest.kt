package com.bhojanos.core.common

import org.junit.Assert.*
import org.junit.Test

class NetworkResultTest {

    @Test
    fun testNetworkResultSuccess() {
        val result = NetworkResult.Success("test_data")
        assertTrue(result is NetworkResult.Success)
        assertEquals("test_data", (result as NetworkResult.Success).data)
    }

    @Test
    fun testNetworkResultError() {
        val result = NetworkResult.Error(code = 404, message = "Not Found")
        assertTrue(result is NetworkResult.Error)
        assertEquals(404, (result as NetworkResult.Error).code)
        assertEquals("Not Found", result.message)
    }

    @Test
    fun testStartupMetricsRecording() {
        StartupMetrics.recordProcessStart()
        StartupMetrics.recordAppInitComplete()
        StartupMetrics.recordFirstComposeFrame()

        assertTrue(StartupMetrics.getAppInitDurationMs() >= 0)
        assertTrue(StartupMetrics.getFirstFrameDurationMs() >= 0)
    }
}
