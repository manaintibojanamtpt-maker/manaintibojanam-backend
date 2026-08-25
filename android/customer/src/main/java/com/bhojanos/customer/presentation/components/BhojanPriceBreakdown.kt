package com.bhojanos.customer.presentation.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bhojanos.customer.domain.checkout.CheckoutQuote

@Composable
fun BhojanPriceBreakdown(
    quote: CheckoutQuote,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(text = "Bill Details (Server Authoritative)", style = MaterialTheme.typography.titleMedium)
            Divider(modifier = Modifier.padding(vertical = 4.dp))

            PriceRow("Item Total", "₹${quote.itemSubtotal.toInt()}")
            PriceRow("Delivery Fee", if (quote.isFreeDelivery) "FREE" else "₹${quote.deliveryFee.toInt()}", isHighlight = quote.isFreeDelivery)
            PriceRow("Packing & Service Charge", "₹${quote.packingFee.toInt()}")
            PriceRow("Taxes (GST)", "₹${quote.taxes.toInt()}")

            if (quote.discount > 0) {
                PriceRow("Coupon Discount", "-₹${quote.discount.toInt()}", isHighlight = true)
            }

            Divider(modifier = Modifier.padding(vertical = 4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = "To Pay", style = MaterialTheme.typography.titleLarge)
                Text(text = "₹${quote.grandTotal.toInt()}", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}

@Composable
private fun PriceRow(
    label: String,
    value: String,
    isHighlight: Boolean = false
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f))
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge,
            color = if (isHighlight) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
        )
    }
}
