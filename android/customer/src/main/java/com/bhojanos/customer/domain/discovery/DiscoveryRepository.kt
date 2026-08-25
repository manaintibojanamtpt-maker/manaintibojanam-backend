package com.bhojanos.customer.domain.discovery

import com.bhojanos.core.common.NetworkResult
import com.bhojanos.core.network.BhojanApiService

/**
 * Discovery repository backed by the REAL backend `GET /api/marketplace/discovery`
 * contract. It returns NO hardcoded sample restaurants — every [Restaurant] is
 * projected from the server-owned `RestaurantPublic` payload received over the
 * network. Financial fields (delivery fee / ETA) are copied verbatim from the
 * server; no client pricing or ETA is invented here.
 */
class DiscoveryRepository(
    private val apiService: BhojanApiService
) {
    suspend fun getDiscovery(latitude: Double, longitude: Double): NetworkResult<List<Restaurant>> {
        return try {
            val response = apiService.getDiscovery(lat = latitude, lng = longitude)
            if (!response.isSuccessful || response.body() == null) {
                return NetworkResult.Error(code = response.code(), message = "Failed to fetch discovery")
            }

            val body = response.body()!!
            val ok = body["ok"] as? Boolean ?: false
            if (!ok) {
                val error = body["error"] as? Map<*, *>
                val message = error?.get("message") as? String ?: "Failed to fetch discovery"
                return NetworkResult.Error(message = message)
            }

            val value = body["value"] as? Map<*, *> ?: return NetworkResult.Error(
                message = "Malformed discovery response"
            )
            val collections = value["collections"] as? List<*> ?: emptyList<Any?>()

            val seen = LinkedHashSet<String>()
            val restaurants = collections
                .filterIsInstance<Map<*, *>>()
                .flatMap { collection -> (collection["restaurants"] as? List<*>) ?: emptyList<Any?>() }
                .filterIsInstance<Map<*, *>>()
                .mapNotNull { json -> RestaurantProjection.fromServer(json) }
                .filter { restaurant -> seen.add(restaurant.id) }

            NetworkResult.Success(restaurants)
        } catch (e: Exception) {
            NetworkResult.Error(message = e.message ?: "Network error fetching discovery")
        }
    }
}

/**
 * Projects a server `RestaurantPublic` record (see backend
 * `projectDiscovery.ts`) into the native [Restaurant] model without fabricating
 * any financial or catalogue data. Menu/category data is left empty because the
 * discovery feed only conveys restaurant summaries; menus come from the order
 * page contract, never invented here.
 */
object RestaurantProjection {

    fun fromServer(json: Map<*, *>): Restaurant? {
        val id = text(json, "restaurantId")
        val name = text(json, "displayName")
        val slug = text(json, "restaurantSlug")
        if (id.isNullOrEmpty() || name.isNullOrEmpty() || slug.isNullOrEmpty()) return null

        val isOpen = json["isOpen"] as? Boolean ?: false
        val deliveryFee = (json["deliveryFee"] as? Number)?.toDouble() ?: 0.0
        val eta = json["etaMinutes"] as? Map<*, *>
        val etaMin = (eta?.get("min") as? Number)?.toInt() ?: 0

        val cuisines = (json["cuisines"] as? List<*>)?.filterIsInstance<String>().orEmpty()

        return Restaurant(
            id = id,
            name = name,
            slug = slug,
            rating = (json["rating"] as? Number)?.toDouble() ?: 0.0,
            ratingCount = (json["ratingCount"] as? Number)?.toInt() ?: 0,
            imageUrl = text(json, "coverUrl") ?: text(json, "logoUrl"),
            cuisineTypes = cuisines,
            deliveryCapability = DeliveryCapability(
                serviceable = isOpen,
                customerDeliveryFee = deliveryFee,
                freeDeliveryThreshold = null,
                isFreeDelivery = deliveryFee == 0.0,
                etaMinutes = etaMin
            ),
            categories = emptyList(),
            menuItems = emptyList()
        )
    }

    private fun text(json: Map<*, *>, key: String): String? {
        val v = json[key]
        return (v as? String)?.takeIf { it.isNotBlank() }
    }
}

