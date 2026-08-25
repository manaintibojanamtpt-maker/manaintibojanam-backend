package com.bhojanos.core.database

import androidx.room.*

@Entity(tableName = "cart_items")
data class CartEntity(
    @PrimaryKey val id: String,
    val restaurantId: String,
    val restaurantName: String,
    val itemId: String,
    val itemName: String,
    val price: Double,
    val quantity: Int,
    val isVeg: Boolean,
    val imageUrl: String? = null,
    val selectedCustomizationsJson: String = "",
    val notes: String = ""
)

@Dao
interface CartDao {

    @Query("SELECT * FROM cart_items")
    suspend fun getAllCartItems(): List<CartEntity>

    @Query("SELECT * FROM cart_items WHERE restaurantId = :restaurantId")
    suspend fun getItemsByRestaurant(restaurantId: String): List<CartEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(item: CartEntity)

    @Query("DELETE FROM cart_items WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM cart_items")
    suspend fun clearCart()

    @Query("SELECT COUNT(*) FROM cart_items")
    suspend fun getCartCount(): Int
}
