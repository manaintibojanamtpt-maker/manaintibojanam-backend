package com.bhojanos.customer.presentation.tracking

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bhojanos.customer.data.tracking.TrackingRepository
import com.bhojanos.customer.domain.tracking.OrderTrackingState
import com.bhojanos.customer.domain.tracking.TrackingFreshness
import com.bhojanos.customer.domain.tracking.TrackingStatus
import com.bhojanos.customer.presentation.tracking.components.BhojanOrderTimeline
import com.bhojanos.customer.presentation.tracking.components.BhojanOrderTrackingMap

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderTrackingScreen(
    orderId: String,
    repository: TrackingRepository,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val trackingState by repository.observeOrderTracking(orderId).collectAsState(initial = null)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = trackingState?.orderNumber ?: "#$orderId",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = trackingState?.restaurant?.displayName ?: "Order Tracking",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { innerPadding ->
        val state = trackingState

        if (state == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Offline / Stale Banner
                if (state.freshness != TrackingFreshness.FRESH) {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (state.freshness == TrackingFreshness.STALE) {
                                Color(0xFFFEF3C7)
                            } else Color(0xFFFEE2E2)
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = if (state.freshness == TrackingFreshness.STALE) {
                                    "Showing latest available order update"
                                } else {
                                    "Network disconnected"
                                },
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (state.freshness == TrackingFreshness.STALE) Color(0xFF92400E) else Color(0xFF991B1B)
                            )
                        }
                    }
                }

                // ETA Header Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = when (state.status) {
                                TrackingStatus.DELIVERED -> "Order Delivered 🎉"
                                TrackingStatus.CANCELLED -> "Order Cancelled"
                                else -> "Arriving in"
                            },
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )

                        Text(
                            text = when (state.status) {
                                TrackingStatus.DELIVERED -> "Enjoy your food!"
                                TrackingStatus.CANCELLED -> "Refund initiated if paid"
                                else -> state.etaRange?.displayString() ?: "25–35 min"
                            },
                            style = MaterialTheme.typography.headlineLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }

                // Map Component
                BhojanOrderTrackingMap(
                    restaurant = state.restaurant,
                    rider = state.rider,
                    customerLocation = state.customerLocation,
                    routePolyline = state.routePolyline,
                    freshness = state.freshness
                )

                // Order Status Timeline
                BhojanOrderTimeline(
                    steps = state.timeline,
                    currentStatus = state.status
                )

                // Contact Actions Card (ONLY when phone/url provided by server)
                val riderPhone = state.rider?.phone
                val trackingUrl = state.rider?.trackingUrl

                if (!riderPhone.isNullOrBlank() || !trackingUrl.isNullOrBlank()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Text(
                                text = "Delivery Partner Actions",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                if (!riderPhone.isNullOrBlank()) {
                                    Button(
                                        onClick = {
                                            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$riderPhone"))
                                            context.startActivity(intent)
                                        },
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                                    ) {
                                        Icon(Icons.Default.Call, contentDescription = null)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Call Rider")
                                    }
                                }

                                if (!trackingUrl.isNullOrBlank()) {
                                    OutlinedButton(
                                        onClick = {
                                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(trackingUrl))
                                            context.startActivity(intent)
                                        },
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Icon(Icons.Default.Share, contentDescription = null)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Web Track")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
