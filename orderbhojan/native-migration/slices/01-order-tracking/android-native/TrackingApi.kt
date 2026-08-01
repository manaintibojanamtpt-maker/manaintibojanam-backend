package com.bhojanos.app.tracking.data

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.Response

/**
 * Phase 2 Native Slice: Order Tracking API
 * Contract-compatible with BhojanOS Marketplace API.
 */
interface TrackingApi {

    /**
     * Authenticated Tracking Endpoint
     * Headers (like Authorization) should be injected via OkHttp Interceptor
     * in the main Retrofit instance.
     */
    @GET("api/marketplace/orders/{orderId}/tracking")
    suspend fun getTracking(
        @Path("orderId") orderId: String
    ): Response<OrderTrackingResponseDTO>

    /**
     * Guest Tracking Endpoint (Requires Phone Number validation)
     */
    @GET("api/marketplace/orders/{orderId}/guest-tracking")
    suspend fun getGuestTracking(
        @Path("orderId") orderId: String,
        @Query("phone") phone: String
    ): Response<OrderTrackingResponseDTO>
}

// Data Transfer Objects matching `src/types/marketplace.ts`

data class OrderTrackingResponseDTO(
    val orderId: String,
    val orderNumber: String,
    val status: String,
    val paymentStatus: String? = null,
    val expiresAt: String? = null,
    val timeline: List<TrackingTimelineEventDTO>,
    val etaMinutes: TrackingEtaDTO? = null,
    val restaurant: TrackingRestaurantDTO? = null,
    val delivery: TrackingDeliveryDTO? = null
    // Ignoring invoice/feedback/reorder for now as tracking is the core scope
)

data class TrackingTimelineEventDTO(
    val status: String,
    val at: String,
    val message: String? = null
)

data class TrackingEtaDTO(
    val min: Int,
    val max: Int
)

data class TrackingRestaurantDTO(
    val displayName: String,
    val slug: String,
    val restaurantId: String
)

data class TrackingDeliveryDTO(
    val partner: String? = null,
    val trackingUrl: String? = null,
    val riderName: String? = null,
    val riderPhone: String? = null
)
