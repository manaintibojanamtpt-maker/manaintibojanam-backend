package com.bhojanos.customer.domain.cart

data class CartItem(
    val id: String,
    val restaurantId: String,
    val restaurantName: String,
    val itemId: String,
    val itemName: String,
    val price: Double,
    val quantity: Int,
    val isVeg: Boolean = true,
    val imageUrl: String? = null,
    val selectedCustomizations: List<String> = emptyList(),
    val notes: String = ""
) {
    val subtotal: Double get() = price * quantity
}

data class CartState(
    val items: List<CartItem> = emptyList(),
    val restaurantId: String? = null,
    val restaurantName: String? = null,
    val displaySubtotal: Double = 0.0,
    val itemCount: Int = 0
)

class SingleStoreConflictException(
    val currentStoreName: String,
    val newStoreName: String
) : Exception("Cart contains items from $currentStoreName. Clear cart to add items from $newStoreName?")
