package com.bhojanos.customer.data.cart

import com.bhojanos.core.database.CartDao
import com.bhojanos.core.database.CartEntity
import com.bhojanos.customer.domain.cart.CartItem
import com.bhojanos.customer.domain.cart.CartState
import com.bhojanos.customer.domain.cart.SingleStoreConflictException

class CartRepository(
    private val cartDao: CartDao
) {
    suspend fun getCartState(): CartState {
        val entities = cartDao.getAllCartItems()
        if (entities.isEmpty()) {
            return CartState()
        }

        val items = entities.map { entity ->
            CartItem(
                id = entity.id,
                restaurantId = entity.restaurantId,
                restaurantName = entity.restaurantName,
                itemId = entity.itemId,
                itemName = entity.itemName,
                price = entity.price,
                quantity = entity.quantity,
                isVeg = entity.isVeg,
                imageUrl = entity.imageUrl,
                notes = entity.notes
            )
        }

        val first = items.first()
        val totalSubtotal = items.sumOf { it.subtotal }
        val count = items.sumOf { it.quantity }

        return CartState(
            items = items,
            restaurantId = first.restaurantId,
            restaurantName = first.restaurantName,
            displaySubtotal = totalSubtotal,
            itemCount = count
        )
    }

    suspend fun addItem(item: CartItem, forceClearIfConflict: Boolean = false) {
        val existingItems = cartDao.getAllCartItems()
        if (existingItems.isNotEmpty()) {
            val currentStoreId = existingItems.first().restaurantId
            val currentStoreName = existingItems.first().restaurantName

            if (currentStoreId != item.restaurantId) {
                if (forceClearIfConflict) {
                    cartDao.clearCart()
                } else {
                    throw SingleStoreConflictException(
                        currentStoreName = currentStoreName,
                        newStoreName = item.restaurantName
                    )
                }
            }
        }

        // Check if item already in cart
        val match = existingItems.find { it.itemId == item.itemId }
        if (match != null) {
            val updated = match.copy(quantity = match.quantity + item.quantity)
            cartDao.insertOrUpdate(updated)
        } else {
            cartDao.insertOrUpdate(
                CartEntity(
                    id = item.id,
                    restaurantId = item.restaurantId,
                    restaurantName = item.restaurantName,
                    itemId = item.itemId,
                    itemName = item.itemName,
                    price = item.price,
                    quantity = item.quantity,
                    isVeg = item.isVeg,
                    imageUrl = item.imageUrl,
                    notes = item.notes
                )
            )
        }
    }

    suspend fun updateQuantity(itemId: String, newQuantity: Int) {
        val entities = cartDao.getAllCartItems()
        val match = entities.find { it.itemId == itemId || it.id == itemId }
        if (match != null) {
            if (newQuantity <= 0) {
                cartDao.deleteById(match.id)
            } else {
                cartDao.insertOrUpdate(match.copy(quantity = newQuantity))
            }
        }
    }

    suspend fun clearCart() {
        cartDao.clearCart()
    }
}
