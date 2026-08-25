package com.bhojanos.core.network

import org.junit.Assert.*
import org.junit.Test

class ApiClientTest {

    @Test
    fun testApiClientCreation() {
        val service = ApiClient.create(
            baseUrl = ApiClient.PROD_BASE_URL,
            tokenProvider = { "test_token" },
            isDebug = true
        )
        assertNotNull(service)
    }

    @Test
    fun testProdBaseUrlFormatting() {
        assertEquals("https://manaintibojanam-backend.onrender.com/", ApiClient.PROD_BASE_URL)
    }
}
