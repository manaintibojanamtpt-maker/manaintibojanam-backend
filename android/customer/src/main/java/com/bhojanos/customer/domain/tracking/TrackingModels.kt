package com.bhojanos.customer.domain.tracking

enum class TrackingStatus {
    PLACED,
    ACCEPTED,
    PREPARING,
    OUT_FOR_DELIVERY,
    DELIVERED,
    CANCELLED;

    fun displayTitle(): String {
        return when (this) {
            PLACED -> "Order Placed"
            ACCEPTED -> "Order Confirmed"
            PREPARING -> "Preparing Food"
            OUT_FOR_DELIVERY -> "Out for Delivery"
            DELIVERED -> "Delivered"
            CANCELLED -> "Order Cancelled"
        }
    }

    fun displaySubtitle(): String {
        return when (this) {
            PLACED -> "Kitchen received your order"
            ACCEPTED -> "Kitchen confirmed your order"
            PREPARING -> "Your delicious meal is being prepared"
            OUT_FOR_DELIVERY -> "Rider is on the way to your address"
            DELIVERED -> "Enjoy your meal!"
            CANCELLED -> "This order was cancelled"
        }
    }

    fun isTerminal(): Boolean = this == DELIVERED || this == CANCELLED
}

enum class TrackingFreshness {
    FRESH,
    STALE,
    UNAVAILABLE
}

data class LatLngPoint(
    val lat: Double,
    val lng: Double
)

data class TimelineStep(
    val status: TrackingStatus,
    val timestampIso: String,
    val message: String? = null,
    val isCompleted: Boolean = false,
    val isCurrent: Boolean = false
)

data class EtaRange(
    val minMinutes: Int?,
    val maxMinutes: Int?
) {
    fun displayString(): String {
        if (minMinutes == null && maxMinutes == null) return "ETA Updating..."
        if (minMinutes != null && maxMinutes != null && minMinutes != maxMinutes) {
            return "$minMinutes–$maxMinutes min"
        }
        val mins = minMinutes ?: maxMinutes ?: 30
        return "$mins min"
    }
}

data class RiderInfo(
    val name: String? = null,
    val phone: String? = null,
    val partner: String? = null,
    val trackingUrl: String? = null,
    val location: LatLngPoint? = null
)

data class RestaurantInfo(
    val id: String,
    val displayName: String,
    val slug: String,
    val location: LatLngPoint? = null
)

data class OrderTrackingState(
    val orderId: String,
    val orderNumber: String,
    val status: TrackingStatus,
    val paymentStatus: String,
    val timeline: List<TimelineStep>,
    val etaRange: EtaRange?,
    val restaurant: RestaurantInfo,
    val rider: RiderInfo?,
    val customerLocation: LatLngPoint? = null,
    val routePolyline: List<LatLngPoint>? = null,
    val lastUpdatedAtMs: Long = System.currentTimeMillis(),
    val freshness: TrackingFreshness = TrackingFreshness.FRESH
)
