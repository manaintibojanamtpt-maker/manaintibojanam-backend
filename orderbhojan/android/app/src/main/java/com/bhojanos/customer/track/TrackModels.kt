package com.bhojanos.customer.track

data class TrackTimelineEvent(
    val status: String,
    val at: String,
    val message: String?,
)

data class TrackSnapshot(
    val orderId: String,
    val orderNumber: String,
    val status: String,
    val timeline: List<TrackTimelineEvent>,
    val etaMin: Int?,
    val etaMax: Int?,
    val restaurantName: String?,
)
