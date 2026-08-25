package com.bhojanos.customer.di

import android.content.Context
import com.bhojanos.customer.BuildConfig
import com.bhojanos.core.database.BhojanRoomDatabase
import com.bhojanos.core.database.CartDao
import com.bhojanos.core.network.ApiClient
import com.bhojanos.core.network.BhojanApiService
import com.bhojanos.core.storage.EncryptedSessionStore
import com.bhojanos.customer.data.cart.CartRepository
import com.bhojanos.customer.data.checkout.CheckoutRepository
import com.bhojanos.customer.domain.discovery.DiscoveryRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object CustomerHiltModule {

    @Provides
    @Singleton
    fun provideEncryptedSessionStore(@ApplicationContext context: Context): EncryptedSessionStore {
        return EncryptedSessionStore(context)
    }

    @Provides
    @Singleton
    fun provideBhojanApiService(sessionStore: EncryptedSessionStore): BhojanApiService {
        // Token provider reads from EncryptedSessionStore at call time
        return ApiClient.create(
            baseUrl = ApiClient.PROD_BASE_URL,
            tokenProvider = { sessionStore.getAuthToken() },
            isDebug = BuildConfig.DEBUG
        )
    }

    @Provides
    @Singleton
    fun provideBhojanRoomDatabase(@ApplicationContext context: Context): BhojanRoomDatabase {
        return BhojanRoomDatabase.getInstance(context)
    }

    @Provides
    @Singleton
    fun provideCartDao(database: BhojanRoomDatabase): CartDao {
        return database.cartDao()
    }

    @Provides
    @Singleton
    fun provideCartRepository(cartDao: CartDao): CartRepository {
        return CartRepository(cartDao)
    }

    @Provides
    @Singleton
    fun provideDiscoveryRepository(apiService: BhojanApiService): DiscoveryRepository {
        return DiscoveryRepository(apiService)
    }

    @Provides
    @Singleton
    fun provideCheckoutRepository(apiService: BhojanApiService): CheckoutRepository {
        return CheckoutRepository(apiService)
    }
}