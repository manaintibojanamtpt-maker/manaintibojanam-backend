/**
 * SCAFFOLD - OrderBhojan native Order Tracking (Jetpack Compose).
 *
 * Package continuity: com.bhojanos.orderbhojan
 * Mount behind FF_NATIVE_TRACK; on false host WebView -> /orders/{orderId}/track
 *
 * Next eng steps:
 * 1. Add Gradle module :features:track under orderbhojan/android or sibling android-native/
 * 2. Implement TrackRepository calling marketplace tracking endpoints
 * 3. Wire MainActivity route dispatcher (native vs WebView)
 *
 * This scaffold includes:
 * - Material 3 Bottom Sheet for the tracking timeline.
 * - Accompanist Permissions scaffold for Location (to view driver on map).
 */
package com.bhojanos.orderbhojan.track

import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier

// Placeholder types
data class TrackUiState(
    val orderId: String,
    val status: String = "loading",
    val timeline: List<String> = emptyList(),
    val error: String? = null,
)

interface TrackRepository {
    suspend fun fetchTracking(orderId: String, bearerToken: String?): TrackUiState
    suspend fun fetchGuestTracking(orderId: String, phone: String): TrackUiState
}

/**
 * Compose entry for Tracking.
 * Demonstrates the Material 3 Bottom Sheet UI and permission scaffold.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrackScreen(orderId: String, repo: TrackRepository, onFallbackHybrid: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)
    var showBottomSheet by remember { mutableStateOf(true) }

    // Scaffold for Map + Location Permissions (e.g. using accompanist permissions)
    /*
    val locationPermissionState = rememberPermissionState(
        android.Manifest.permission.ACCESS_FINE_LOCATION
    )
    
    LaunchedEffect(Unit) {
        if (!locationPermissionState.status.isGranted) {
            locationPermissionState.launchPermissionRequest()
        }
    }
    */

    Scaffold { paddingValues ->
        // Main content: Map View showing driver/restaurant location
        // MapView(modifier = Modifier.padding(paddingValues))
        
        if (showBottomSheet) {
            ModalBottomSheet(
                onDismissRequest = { showBottomSheet = false },
                sheetState = sheetState
            ) {
                // Bottom sheet content: The Timeline
                // Text("Order Status: Cooking", style = MaterialTheme.typography.headlineMedium)
                // TimelineSteps(steps = uiState.timeline)
            }
        }
    }
}

object TrackScreenContract {
    const val ROUTE_ID = "track"
    const val PATH_TEMPLATE = "/orders/{orderId}/track"
    const val FLAG = "FF_NATIVE_TRACK"
}
