package com.bhojanos.customer

import com.bhojanos.customer.domain.cart.CartItem
import com.bhojanos.customer.domain.cart.CartState
import com.bhojanos.customer.domain.cart.SingleStoreConflictException
import org.junit.Assert.*
import org.junit.Test

class CartEngineTest {

    @Test
    fun testCartItemSubtotalCalculation() {
        val item = CartItem(
            id = "cart_1",
            restaurantId = "rest_a",
            restaurantName = "Kitchen A",
            itemId = "item_101",
            itemName = "Andhra Thali",
            price = 180.0,
            quantity = 3
        )

        assertEquals(540.0, item.subtotal, 0.01)
    }

    @Test
    fun testSingleStoreConflictDetection() {
        val storeAItem = CartItem("1", "store_a", "Store A", "item_1", "Thali", 150.0, 1)
        val storeBItem = CartItem("2", "store_b", "Store B", "item_2", "Biryani", 220.0, 1)

        val cart = CartState(items = listOf(storeAItem), restaurantId = "store_a", restaurantName = "Store A")

        if (cart.restaurantId != null && cart.restaurantId != storeBItem.restaurantId) {
            val exception = SingleStoreConflictException(cart.restaurantName!!, storeBItem.restaurantName)
            assertEquals("Cart contains items from Store A. Clear cart to add items from Store B?", exception.message)
        } else {
            fail("Expected single store conflict exception")
        }
    }

    @Test
    fun testEmptyCartState() {
        val emptyState = CartState()
        assertTrue(emptyState.items.isEmpty())
        assertNull(emptyState.restaurantId)
        assertEquals(0.0, emptyState.displaySubtotal, 0.0)
        assertEquals(0, emptyState.itemCount)
    }
}
