package com.bhojanos.customer.data.tracking

import com.bhojanos.core.network.BhojanApiService
import com.bhojanos.customer.domain.tracking.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TrackingRepository @Inject constructor(
    private val apiService: BhojanApiService
) {
    private val cachedStates = mutableMapOf<String, OrderTrackingState>()

    suspend fun fetchOrderTracking(orderId: String): Result<OrderTrackingState> {
        return try {
            val response = apiService.getOrderTracking(orderId)
            if (!response.isSuccessful || response.body() == null) {
                return handleFetchFailure(orderId, "HTTP ${response.code()}")
            }

            val body = response.body()!!
            val isOk = body["ok"] as? Boolean ?: (body["success"] as? Boolean ?: false)
            if (!isOk) {
                val errorMsg = (body["error"] as? Map<*, *>)?.get("message") as? String ?: "Failed to fetch tracking"
                return handleFetchFailure(orderId, errorMsg)
            }

            @Suppress("UNCHECKED_CAST")
            val rawValue = (body["value"] as? Map<String, Any>) ?: body

            val trackingState = parseTrackingPayload(orderId, rawValue)
            val reconciled = reconcileState(orderId, trackingState)
            cachedStates[orderId] = reconciled
            Result.success(reconciled)
        } catch (e: Exception) {
            handleFetchFailure(orderId, e.message ?: "Network error")
        }
    }

    fun observeOrderTracking(orderId: String, pollIntervalMs: Long = 20_000L): Flow<OrderTrackingState> = flow {
        var isPolling = true
        while (isPolling) {
            val result = fetchOrderTracking(orderId)
            val currentState = result.getOrNull() ?: cachedStates[orderId]
            
            if (currentState != null) {
                emit(currentState)
                if (currentState.status.isTerminal()) {
                    isPolling = false
                    break
                }
            } else {
                emit(
                    OrderTrackingState(
                        orderId = orderId,
                        orderNumber = "#$orderId",
                        status = TrackingStatus.PLACED,
                        paymentStatus = "unknown",
                        timeline = emptyList(),
                        etaRange = null,
                        restaurant = RestaurantInfo(id = "", displayName = "Kitchen", slug = ""),
                        rider = null,
                        freshness = TrackingFreshness.UNAVAILABLE
                    )
                )
            }
            delay(pollIntervalMs)
        }
    }

    fun reconcileState(orderId: String, newState: OrderTrackingState): OrderTrackingState {
        val existing = cachedStates[orderId] ?: run {
            cachedStates[orderId] = newState
            return newState
        }

        // If existing state has a newer server timestamp, reject stale update
        if (existing.lastUpdatedAtMs > newState.lastUpdatedAtMs) {
            return existing
        }

        // Out of order safety: terminal state cannot be regressed back to non-terminal
        if (existing.status.isTerminal() && !newState.status.isTerminal()) {
            val stale = existing.copy(freshness = TrackingFreshness.STALE)
            cachedStates[orderId] = stale
            return stale
        }

        cachedStates[orderId] = newState
        return newState
    }

    private fun handleFetchFailure(orderId: String, message: String): Result<OrderTrackingState> {
        val cached = cachedStates[orderId]
        return if (cached != null) {
            val stale = cached.copy(freshness = TrackingFreshness.STALE)
            Result.success(stale)
        } else {
            Result.failure(Exception(message))
        }
    }

    fun parseTrackingPayload(orderId: String, raw: Map<String, Any>): OrderTrackingState {
        val orderNumber = raw["orderNumber"] as? String ?: "#$orderId"
        val rawStatus = (raw["status"] as? String)?.uppercase() ?: "PLACED"
        val status = parseTrackingStatus(rawStatus)
        val paymentStatus = raw["paymentStatus"] as? String ?: "pending"

        // Parse ETA
        @Suppress("UNCHECKED_CAST")
        val etaMap = raw["etaMinutes"] as? Map<String, Any>
        val etaRange = if (etaMap != null) {
            val min = (etaMap["min"] as? Number)?.toInt()
            val max = (etaMap["max"] as? Number)?.toInt()
            EtaRange(min, max)
        } else {
            val singleEta = (raw["eta"] as? Number)?.toInt()
            if (singleEta != null) EtaRange(Math.max(10, singleEta - 5), singleEta + 5) else null
        }

        // Parse Timeline
        @Suppress("UNCHECKED_CAST")
        val rawTimeline = (raw["timeline"] as? List<Map<String, Any>>) ?: emptyList()
        val timelineSteps = parseTimeline(rawTimeline, status)

        // Parse Restaurant
        @Suppress("UNCHECKED_CAST")
        val restMap = raw["restaurant"] as? Map<String, Any>
        val restaurant = RestaurantInfo(
            id = restMap?.get("restaurantId") as? String ?: raw["tenantId"] as? String ?: "",
            displayName = restMap?.get("displayName") as? String ?: raw["tenantName"] as? String ?: "Mana Inti Kitchen",
            slug = restMap?.get("slug") as? String ?: "mana-inti",
            location = parseLatLng(restMap?.get("location"))
        )

        // Parse Delivery / Rider (ONLY if server supplies details)
        @Suppress("UNCHECKED_CAST")
        val delivMap = raw["delivery"] as? Map<String, Any>
        val rider = if (delivMap != null) {
            val partner = delivMap["partner"] as? String
            val trackingUrl = delivMap["trackingUrl"] as? String
            val riderName = delivMap["riderName"] as? String
            val riderPhone = delivMap["riderPhone"] as? String
            val riderLoc = parseLatLng(delivMap["location"] ?: delivMap["riderLocation"])
            RiderInfo(
                name = riderName,
                phone = riderPhone,
                partner = partner,
                trackingUrl = trackingUrl,
                location = riderLoc
            )
        } else {
            val partner = raw["deliveryPartner"] as? String
            val trackingUrl = raw["trackingUrl"] as? String ?: raw["trackingLink"] as? String
            val riderName = raw["riderName"] as? String
            val riderPhone = raw["riderPhone"] as? String
            val riderLoc = parseLatLng(raw["riderLocation"])
            if (partner != null || trackingUrl != null || riderName != null || riderPhone != null || riderLoc != null) {
                RiderInfo(
                    name = riderName,
                    phone = riderPhone,
                    partner = partner,
                    trackingUrl = trackingUrl,
                    location = riderLoc
                )
            } else null
        }

        val customerLoc = parseLatLng(raw["customerLocation"] ?: raw["addressLocation"])
        
        @Suppress("UNCHECKED_CAST")
        val rawPolyline = raw["routePolyline"] as? List<Map<String, Any>>
        val polyline = rawPolyline?.mapNotNull { parseLatLng(it) }

        val serverTimestamp = parseServerTimestamp(raw["updatedAt"] ?: raw["lastUpdatedAt"])

        return OrderTrackingState(
            orderId = orderId,
            orderNumber = orderNumber,
            status = status,
            paymentStatus = paymentStatus,
            timeline = timelineSteps,
            etaRange = etaRange,
            restaurant = restaurant,
            rider = rider,
            customerLocation = customerLoc,
            routePolyline = polyline,
            lastUpdatedAtMs = serverTimestamp,
            freshness = TrackingFreshness.FRESH
        )
    }

    private fun parseTrackingStatus(statusStr: String): TrackingStatus {
        return when (statusStr.uppercase()) {
            "ACCEPTED", "CONFIRMED" -> TrackingStatus.ACCEPTED
            "PREPARING", "READY", "IN_PREPARATION" -> TrackingStatus.PREPARING
            "OUT_FOR_DELIVERY", "DISPATCHED", "PICKED_UP", "ON_THE_WAY" -> TrackingStatus.OUT_FOR_DELIVERY
            "DELIVERED", "COMPLETED" -> TrackingStatus.DELIVERED
            "CANCELLED", "REJECTED", "EXPIRED", "FAILED" -> TrackingStatus.CANCELLED
            else -> TrackingStatus.PLACED
        }
    }

    private fun parseTimeline(rawList: List<Map<String, Any>>, currentStatus: TrackingStatus): List<TimelineStep> {
        val canonicalOrder = listOf(
            TrackingStatus.PLACED,
            TrackingStatus.ACCEPTED,
            TrackingStatus.PREPARING,
            TrackingStatus.OUT_FOR_DELIVERY,
            TrackingStatus.DELIVERED
        )

        val rawMap = rawList.associate { entry ->
            val st = parseTrackingStatus(entry["status"] as? String ?: "")
            val at = entry["at"] as? String ?: entry["timestamp"] as? String ?: ""
            val msg = entry["message"] as? String
            st to Pair(at, msg)
        }

        if (currentStatus == TrackingStatus.CANCELLED) {
            return listOf(
                TimelineStep(TrackingStatus.PLACED, "", "Order received", isCompleted = true, isCurrent = false),
                TimelineStep(TrackingStatus.CANCELLED, "", "Order was cancelled", isCompleted = true, isCurrent = true)
            )
        }

        val currentIndex = canonicalOrder.indexOf(currentStatus)

        return canonicalOrder.mapIndexed { index, stepStatus ->
            val existing = rawMap[stepStatus]
            val isCompleted = index <= currentIndex
            val isCurrent = index == currentIndex
            TimelineStep(
                status = stepStatus,
                timestampIso = existing?.first ?: "",
                message = existing?.second ?: stepStatus.displaySubtitle(),
                isCompleted = isCompleted,
                isCurrent = isCurrent
            )
        }
    }

    private fun parseLatLng(raw: Any?): LatLngPoint? {
        if (raw !is Map<*, *>) return null
        val lat = (raw["lat"] as? Number)?.toDouble() ?: (raw["latitude"] as? Number)?.toDouble() ?: return null
        val lng = (raw["lng"] as? Number)?.toDouble() ?: (raw["longitude"] as? Number)?.toDouble() ?: return null
        return LatLngPoint(lat, lng)
    }

    private fun parseServerTimestamp(raw: Any?): Long {
        if (raw is Number) return raw.toLong()
        if (raw is String) {
            return try {
                java.time.Instant.parse(raw).toEpochMilli()
            } catch (e: Exception) {
                System.currentTimeMillis()
            }
        }
        return System.currentTimeMillis()
    }
}
