package com.bhojanos.core.network

import com.bhojanos.core.model.OpsHealthResponse
import retrofit2.Response
import retrofit2.http.*

interface BhojanApiService {

    @GET("api/health")
    suspend fun getHealth(): Response<OpsHealthResponse>

    @GET("api/marketplace/discovery")
    suspend fun getDiscovery(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("limit") limit: Int = 24,
        @Query("maxDistanceKm") maxDistanceKm: Int = 18
    ): Response<Map<String, Any>>

    @GET("api/owner/delivery-integrations/{tenantId}")
    suspend fun getOwnerDeliveryIntegrations(
        @Path("tenantId") tenantId: String
    ): Response<Map<String, Any>>

    @POST("api/orders")
    suspend fun createOrder(
        @Body orderPayload: Map<String, Any>
    ): Response<Map<String, Any>>

    @POST("api/marketplace/quote")
    suspend fun getCheckoutQuote(
        @Body payload: Map<String, Any>
    ): Response<Map<String, Any>>

    @POST("api/create-razorpay-order")
    suspend fun createRazorpayOrder(
        @Body payload: Map<String, Any>
    ): Response<Map<String, Any>>

    @POST("api/verify-razorpay-payment")
    suspend fun verifyRazorpayPayment(
        @Body payload: Map<String, Any>
    ): Response<Map<String, Any>>

    @POST("api/coupons/validate")
    suspend fun validateCoupon(
        @Body payload: Map<String, Any>
    ): Response<Map<String, Any>>

    @GET("api/marketplace/orders/{orderId}/tracking")
    suspend fun getOrderTracking(
        @Path("orderId") orderId: String
    ): Response<Map<String, Any>>

    @GET("api/marketplace/orders")
    suspend fun getUserOrders(
        @Query("limit") limit: Int = 20
    ): Response<Map<String, Any>>

    @POST("api/marketplace/notifications/register")
    suspend fun registerFcmToken(
        @Body payload: Map<String, String>
    ): Response<Map<String, Any>>
}

