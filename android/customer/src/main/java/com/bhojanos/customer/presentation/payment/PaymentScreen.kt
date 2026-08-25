package com.bhojanos.customer.presentation.payment

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.bhojanos.customer.domain.payment.PaymentState

@Composable
fun PaymentFlowScreen(
    paymentState: PaymentState,
    onRetry: () -> Unit,
    onBackToHome: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        when (paymentState) {
            is PaymentState.CreatingOrder -> {
                PaymentStatusCard(title = "Creating Order...", description = "Communicating securely with BhojanOS server.")
            }

            is PaymentState.PaymentPending, is PaymentState.SdkOpen -> {
                PaymentStatusCard(title = "Payment SDK / Intent Active", description = "Complete payment in your banking application.")
            }

            is PaymentState.Verifying -> {
                PaymentStatusCard(title = "Verifying Payment Signature...", description = "Checking backend HMAC signature authority.")
            }

            is PaymentState.Paid -> {
                OrderConfirmationCard(orderId = paymentState.orderId, onHomeClick = onBackToHome)
            }

            is PaymentState.PaymentFailed -> {
                PaymentErrorCard(
                    title = "Payment Failed",
                    description = paymentState.description,
                    onRetry = onRetry,
                    onBack = onBackToHome
                )
            }

            is PaymentState.VerificationFailed -> {
                PaymentErrorCard(
                    title = "Payment Verification Failed",
                    description = paymentState.reason,
                    onRetry = onRetry,
                    onBack = onBackToHome
                )
            }

            is PaymentState.PaymentCancelled -> {
                PaymentErrorCard(
                    title = "Payment Cancelled",
                    description = paymentState.reason,
                    onRetry = onRetry,
                    onBack = onBackToHome
                )
            }

            else -> {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}

@Composable
private fun PaymentStatusCard(title: String, description: String) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(24.dp)
    ) {
        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        Spacer(modifier = Modifier.height(16.dp))
        Text(text = title, style = MaterialTheme.typography.titleLarge)
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
    }
}

@Composable
private fun OrderConfirmationCard(orderId: String, onHomeClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = "🎉 Order Confirmed!", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = "Order ID: $orderId", style = MaterialTheme.typography.titleSmall)
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = "Your kitchen has received the order and will begin preparing your authentic thali shortly.", style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(24.dp))
            Button(onClick = onHomeClick, modifier = Modifier.fillMaxWidth()) {
                Text("Back to Home")
            }
        }
    }
}

@Composable
private fun PaymentErrorCard(title: String, description: String, onRetry: () -> Unit, onBack: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = title, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.error)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = description, style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(24.dp))
            Button(onClick = onRetry, modifier = Modifier.fillMaxWidth()) {
                Text("Try Again")
            }
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
                Text("Cancel")
            }
        }
    }
}
