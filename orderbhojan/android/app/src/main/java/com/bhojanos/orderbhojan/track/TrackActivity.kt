package com.bhojanos.orderbhojan.track

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bhojanos.orderbhojan.nativehost.NativeFeatureFlags
import com.bhojanos.orderbhojan.nativehost.NativeSessionManager
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume

/**
 * True-native order tracking using Jetpack Compose.
 * Closing returns to hybrid MainActivity (fallback intact).
 */
class TrackActivity : ComponentActivity() {

    private val bgColor = Color(0xFF070504)
    private val fgColor = Color(0xFFF5EDE4)
    private val subfgColor = Color(0xFFB8A99A)
    private val surfaceColor = Color(0xFF1E1A17)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val orderId = intent.getStringExtra(EXTRA_ORDER_ID).orEmpty()
        if (orderId.isBlank()) {
            finish()
            return
        }
        
        val guestPhone = NativeSessionManager.getGuestPhone(this, orderId)

        setContent {
            var state by remember { mutableStateOf<TrackUiState>(TrackUiState.Loading) }

            LaunchedEffect(orderId) {
                val client = TrackApiClient(
                    apiBaseUrl = NativeFeatureFlags.apiBaseUrl(this@TrackActivity),
                    apiVersion = NativeFeatureFlags.apiVersion(this@TrackActivity),
                )
                while (isActive) {
                    try {
                        val snap = withContext(Dispatchers.IO) {
                            if (!guestPhone.isNullOrBlank() && guestPhone.replace(Regex("\\D"), "").length >= 4) {
                                client.fetchGuestTracking(orderId, guestPhone)
                            } else {
                                val token = fetchAuthToken()
                                client.fetchTracking(orderId, token)
                            }
                        }
                        state = TrackUiState.Success(snap)
                        if (isTerminal(snap.status)) break
                    } catch (e: Exception) {
                        state = TrackUiState.Error(e.message ?: "tracking_error")
                    }
                    delay(5_000)
                }
            }

            TrackScreen(
                state = state,
                onBack = { finish() },
                onRetry = {
                    state = TrackUiState.Loading
                    // Retry logic will wait for the next loop iteration in LaunchedEffect
                }
            )
        }
    }

    private suspend fun fetchAuthToken(): String? {
        val user = FirebaseAuth.getInstance().currentUser ?: return null
        return suspendCancellableCoroutine { cont ->
            user.getIdToken(false)
                .addOnSuccessListener { result -> cont.resume(result.token) }
                .addOnFailureListener { _ -> cont.resume(null) }
        }
    }

    private fun isTerminal(status: String): Boolean {
        val normalized = status.trim().uppercase()
        return normalized == "DELIVERED" || normalized == "CANCELLED" || normalized == "REJECTED"
    }

    @Composable
    private fun TrackScreen(
        state: TrackUiState,
        onBack: () -> Unit,
        onRetry: () -> Unit
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(bgColor)
                .padding(20.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Button(
                onClick = onBack,
                colors = ButtonDefaults.buttonColors(containerColor = surfaceColor, contentColor = fgColor),
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text("← Back", fontSize = 14.sp)
            }

            Text(
                "Order tracking",
                color = fgColor,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold
            )

            when (state) {
                is TrackUiState.Loading -> {
                    Spacer(modifier = Modifier.height(32.dp))
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = fgColor)
                    }
                    Text(
                        "Loading status…",
                        color = subfgColor,
                        fontSize = 16.sp,
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    )
                }
                is TrackUiState.Error -> {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(state.message, color = Color.Red, fontSize = 16.sp)
                    Button(
                        onClick = onRetry,
                        colors = ButtonDefaults.buttonColors(containerColor = surfaceColor, contentColor = fgColor)
                    ) {
                        Text("Retry")
                    }
                    Text(
                        "Hybrid fallback remains available when native track is disabled.",
                        color = subfgColor,
                        fontSize = 12.sp
                    )
                }
                is TrackUiState.Success -> {
                    val snap = state.snapshot
                    val orderNum = snap.orderNumber.ifBlank { snap.orderId }
                    
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(surfaceColor, RoundedCornerShape(12.dp))
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("Order $orderNum", color = fgColor, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                        Text("Status: ${snap.status}", color = fgColor, fontSize = 16.sp)
                        snap.restaurantName?.let { Text(it, color = subfgColor, fontSize = 14.sp) }
                        if (snap.etaMin != null && snap.etaMax != null) {
                            Text("ETA ${snap.etaMin}–${snap.etaMax} min", color = subfgColor, fontSize = 14.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    
                    if (snap.timeline.isEmpty()) {
                        Text("No timeline events yet.", color = subfgColor, fontSize = 14.sp)
                    } else {
                        snap.timeline.forEach { event ->
                            Column(modifier = Modifier.padding(bottom = 12.dp)) {
                                Text(event.status, color = fgColor, fontSize = 16.sp, fontWeight = FontWeight.Medium)
                                if (!event.message.isNullOrBlank()) {
                                    Text(event.message, color = subfgColor, fontSize = 14.sp)
                                }
                                Text(event.at, color = subfgColor, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }

    sealed class TrackUiState {
        object Loading : TrackUiState()
        data class Success(val snapshot: TrackSnapshot) : TrackUiState()
        data class Error(val message: String) : TrackUiState()
    }

    companion object {
        const val EXTRA_ORDER_ID = "orderId"
        const val EXTRA_GUEST_PHONE = "guestPhone"
        const val EXTRA_USER_EMAIL = "userEmail"
        const val EXTRA_DEVICE_ID = "deviceId"
    }
}
