package com.bhojanos.core.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [AddressEntity::class, CartEntity::class],
    version = 3,
    exportSchema = false
)
abstract class BhojanRoomDatabase : RoomDatabase() {

    abstract fun addressDao(): AddressDao
    abstract fun cartDao(): CartDao

    companion object {
        @Volatile
        private var INSTANCE: BhojanRoomDatabase? = null

        fun getInstance(context: Context): BhojanRoomDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    BhojanRoomDatabase::class.java,
                    "bhojan_room_db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
