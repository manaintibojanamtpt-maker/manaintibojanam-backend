package com.bhojanos.app.tracking.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.delay

/**
 * Phase 2 Native Slice: Order Tracking Repository
 * Orchestrates API calls, handles mapping to domain models, and manages polling.
 */
class TrackingRepository(
    private val trackingApi: TrackingApi
) {
    /**
     * Fetches tracking data continuously every [intervalMs].
     */
    fun streamOrderTracking(orderId: String, intervalMs: Long = 10000L): Flow<Result<OrderTrackingResponseDTO>> = flow {
        while (true) {
            try {
                val response = trackingApi.getTracking(orderId)
                if (response.isSuccessful && response.body() != null) {
                    emit(Result.success(response.body()!!))
                } else {
                    emit(Result.failure(Exception("API Error: ${response.code()}")))
                }
            } catch (e: Exception) {
                emit(Result.failure(e))
            }
            delay(intervalMs)
        }
    }

    /**
     * Fetches guest tracking data.
     */
    suspend fun fetchGuestTracking(orderId: String, phone: String): Result<OrderTrackingResponseDTO> {
        return try {
            val response = trackingApi.getGuestTracking(orderId, phone)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("API Error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
