package com.bhojanos.customer.domain.discovery

data class DeliveryCapability(
    val serviceable: Boolean,
    val customerDeliveryFee: Double,
    val freeDeliveryThreshold: Double?,
    val isFreeDelivery: Boolean,
    val etaMinutes: Int
)

data class FoodCategory(
    val id: String,
    val name: String,
    val iconUrl: String? = null
)

data class FoodItem(
    val id: String,
    val name: String,
    val description: String,
    val price: Double,
    val category: String,
    val imageUrl: String? = null,
    val isVeg: Boolean = true,
    val inStock: Boolean = true
)

data class Restaurant(
    val id: String,
    val name: String,
    val slug: String,
    val rating: Double,
    val ratingCount: Int,
    val imageUrl: String? = null,
    val cuisineTypes: List<String>,
    val deliveryCapability: DeliveryCapability,
    val categories: List<FoodCategory>,
    val menuItems: List<FoodItem>
)
