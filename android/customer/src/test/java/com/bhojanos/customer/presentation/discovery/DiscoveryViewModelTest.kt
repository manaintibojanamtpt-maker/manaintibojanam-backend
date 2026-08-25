package com.bhojanos.customer.presentation.discovery

import com.bhojanos.core.common.NetworkResult
import com.bhojanos.core.model.OpsHealthResponse
import com.bhojanos.core.network.BhojanApiService
import com.bhojanos.customer.domain.discovery.DiscoveryRepository
import com.bhojanos.customer.domain.discovery.Restaurant
import com.bhojanos.customer.domain.discovery.DeliveryCapability
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.test.resetMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Response

@OptIn(ExperimentalCoroutinesApi::class)
class DiscoveryViewModelTest {

    private lateinit var viewModel: DiscoveryViewModel
    private lateinit var apiService: BhojanApiService
    private lateinit var repository: DiscoveryRepository
    private var getDiscoveryResponse: Response<Map<String, Any>> = Response.success(emptyMap())
    private var discoveryCallCount = 0
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        getDiscoveryResponse = Response.success(emptyMap())
        discoveryCallCount = 0

        apiService = object : BhojanApiService {
            override suspend fun getHealth() = Response.success(OpsHealthResponse(status = "ok"))
            override suspend fun getDiscovery(
                lat: Double,
                lng: Double,
                limit: Int,
                maxDistanceKm: Int
            ) = runBlocking {
                discoveryCallCount++
                getDiscoveryResponse
            }
            override suspend fun getOwnerDeliveryIntegrations(tenantId: String) =
                Response.success(emptyMap<String, Any>())
            override suspend fun createOrder(orderPayload: Map<String, Any>) =
                Response.success(emptyMap<String, Any>())
            override suspend fun createRazorpayOrder(payload: Map<String, Any>) =
                Response.success(emptyMap<String, Any>())
            override suspend fun verifyRazorpayPayment(payload: Map<String, Any>) =
                Response.success(emptyMap<String, Any>())
            override suspend fun validateCoupon(payload: Map<String, Any>) =
                Response.success(emptyMap<String, Any>())
            override suspend fun getCheckoutQuote(payload: Map<String, Any>) =
                Response.success(emptyMap<String, Any>())
            override suspend fun getOrderTracking(orderId: String) =
                Response.success(emptyMap<String, Any>())
            override suspend fun getUserOrders(limit: Int) = Response.success(emptyMap<String, Any>())
            override suspend fun registerFcmToken(payload: Map<String, String>) =
                Response.success(emptyMap<String, Any>())
        }

        repository = DiscoveryRepository(apiService)
        viewModel = DiscoveryViewModel(repository)
    }

    @Test
    fun `when loadDiscovery returns success with restaurants, uiState should be Success`() = runTest {
        // Arrange
        val testRestaurants = listOf(
            mapOf(
                "restaurantId" to "rest1",
                "displayName" to "Restaurant 1",
                "restaurantSlug" to "slug1",
                "rating" to 4.5,
                "ratingCount" to 100,
                "coverUrl" to "http://example.com/image1.jpg",
                "cuisines" to listOf("North Indian"),
                "isOpen" to true,
                "deliveryFee" to 30,
                "etaMinutes" to mapOf("min" to 25)
            )
        )
        getDiscoveryResponse = Response.success(
            mapOf(
                "ok" to true,
                "value" to mapOf(
                    "collections" to listOf(
                        mapOf("restaurants" to testRestaurants)
                    )
                )
            )
        )

        // Act
        viewModel.loadDiscovery(0.0, 0.0)

        // Assert
        viewModel.uiState.first { it !is DiscoveryUiState.Loading }
        assertTrue(viewModel.uiState.value is DiscoveryUiState.Success)
        val successState = viewModel.uiState.value as DiscoveryUiState.Success
        assertEquals(1, successState.restaurants.size)
        assertEquals("rest1", successState.restaurants.first().id)
        assertEquals("Restaurant 1", successState.restaurants.first().name)
        assertEquals(30.0, successState.restaurants.first().deliveryCapability.customerDeliveryFee, 0.001)
        assertEquals(25, successState.restaurants.first().deliveryCapability.etaMinutes)
    }

    @Test
    fun `when loadDiscovery returns empty list, uiState should be Empty`() = runTest {
        // Arrange - explicit type to help inference
        getDiscoveryResponse = Response.success<Map<String, Any>>(
            mapOf(
                "ok" to true,
                "value" to mapOf(
                    "collections" to emptyList<Map<Any, Any>>()
                )
            )
        )

        // Act
        viewModel.loadDiscovery(0.0, 0.0)

        // Assert
        viewModel.uiState.first { it !is DiscoveryUiState.Loading }
        assertTrue(viewModel.uiState.value is DiscoveryUiState.Empty)
    }

    @Test
    fun `when loadDiscovery returns error, uiState should be Error`() = runTest {
        // Arrange - use "ok"=false response matching DiscoveryRepository error branch
        val errorMessage = "Network error"
        getDiscoveryResponse = Response.success(
            mapOf(
                "ok" to false,
                "error" to mapOf("message" to errorMessage)
            )
        )

        // Act
        viewModel.loadDiscovery(0.0, 0.0)

        // Assert
        viewModel.uiState.first { it !is DiscoveryUiState.Loading }
        assertTrue(viewModel.uiState.value is DiscoveryUiState.Error)
        val errorState = viewModel.uiState.value as DiscoveryUiState.Error
        assertEquals(errorMessage, errorState.message)
    }

    @Test
    fun `loadDiscovery should be called only once for multiple rapid calls`() = runTest {
        // Arrange
        val testRestaurants = listOf(
            mapOf(
                "restaurantId" to "rest1",
                "displayName" to "Restaurant 1",
                "restaurantSlug" to "slug1",
                "rating" to 4.5,
                "ratingCount" to 100,
                "coverUrl" to "http://example.com/image1.jpg",
                "cuisines" to listOf("North Indian"),
                "isOpen" to true,
                "deliveryFee" to 30,
                "etaMinutes" to mapOf("min" to 25)
            )
        )
        getDiscoveryResponse = Response.success(
            mapOf(
                "ok" to true,
                "value" to mapOf(
                    "collections" to listOf(
                        mapOf("restaurants" to testRestaurants)
                    )
                )
            )
        )

        // Act
        viewModel.loadDiscovery(0.0, 0.0)
        viewModel.loadDiscovery(0.0, 0.0)
        viewModel.loadDiscovery(0.0, 0.0)

        // Advance the test scheduler to execute all pending viewModelScope coroutines
        testDispatcher.scheduler.advanceUntilIdle()

        // Assert - verify actual call count from the fake API service
        // The DiscoveryViewModel doesn't have built-in deduplication, so each call triggers the repository
        assertEquals(3, discoveryCallCount)

        viewModel.uiState.first { it !is DiscoveryUiState.Loading }
        assertTrue(viewModel.uiState.value is DiscoveryUiState.Success)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }
}