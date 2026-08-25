package com.bhojanos.core.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "addresses")
data class AddressEntity(
    @PrimaryKey val id: String,
    val label: String, // Home, Work, Other
    val houseFlat: String,
    val building: String,
    val street: String,
    val area: String,
    val landmark: String = "",
    val city: String,
    val state: String,
    val pincode: String,
    val latitude: Double,
    val longitude: Double,
    val formattedAddress: String,
    val isDefault: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Dao
interface AddressDao {

    @Query("SELECT * FROM addresses ORDER BY isDefault DESC, updatedAt DESC")
    fun getAllAddressesFlow(): Flow<List<AddressEntity>>

    @Query("SELECT * FROM addresses ORDER BY isDefault DESC, updatedAt DESC")
    suspend fun getAllAddresses(): List<AddressEntity>

    @Query("SELECT * FROM addresses WHERE isDefault = 1 LIMIT 1")
    suspend fun getDefaultAddress(): AddressEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAddress(address: AddressEntity)

    @Update
    suspend fun updateAddress(address: AddressEntity)

    @Query("DELETE FROM addresses WHERE id = :id")
    suspend fun deleteAddressById(id: String)

    @Query("UPDATE addresses SET isDefault = 0")
    suspend fun clearDefaultFlags()

    @Transaction
    suspend fun setDefaultAddress(id: String) {
        clearDefaultFlags()
        _setDefaultFlag(id)
    }

    @Query("UPDATE addresses SET isDefault = 1 WHERE id = :id")
    suspend fun _setDefaultFlag(id: String)
}
