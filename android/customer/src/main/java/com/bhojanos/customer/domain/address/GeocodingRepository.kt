package com.bhojanos.customer.domain.address

import android.content.Context
import android.location.Address
import android.location.Geocoder
import java.util.Locale

data class ReverseGeocodedAddress(
    val formattedAddress: String,
    val houseNumber: String? = null,
    val road: String? = null,
    val locality: String? = null,
    val city: String? = null,
    val state: String? = null,
    val pincode: String? = null
)

class GeocodingRepository(private val context: Context) {

    suspend fun reverseGeocode(latitude: Double, longitude: Double): ReverseGeocodedAddress? {
        return try {
            val geocoder = GeocodeProvider.create(context)
            val addresses: List<Address>? = geocoder.getFromLocation(latitude, longitude, 1)

            if (!addresses.isNullOrEmpty()) {
                val address = addresses[0]
                val formatted = address.getAddressLine(0) ?: "${address.locality ?: ""}, ${address.adminArea ?: ""}"
                ReverseGeocodedAddress(
                    formattedAddress = formatted,
                    houseNumber = address.subThoroughfare,
                    road = address.thoroughfare,
                    locality = address.subLocality ?: address.locality,
                    city = address.locality ?: address.subAdminArea,
                    state = address.adminArea,
                    pincode = address.postalCode
                )
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
}

object GeocodeProvider {
    fun create(context: Context): Geocoder {
        return Geocoder(context, Locale.getDefault())
    }
}
