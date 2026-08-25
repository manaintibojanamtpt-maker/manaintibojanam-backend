package com.bhojanos.customer.presentation.checkout

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bhojanos.core.database.AddressEntity
import com.bhojanos.customer.domain.cart.CartItem
import com.bhojanos.customer.domain.checkout.CheckoutQuote
import com.bhojanos.customer.domain.checkout.PaymentMethodType
import com.bhojanos.customer.domain.checkout.ScheduledSlot
import com.bhojanos.customer.presentation.components.BhojanCheckoutSection
import com.bhojanos.customer.presentation.components.BhojanPaymentMethodCard
import com.bhojanos.customer.presentation.components.BhojanPriceBreakdown
import com.bhojanos.customer.presentation.components.BhojanQuoteExpiryBanner

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutScreen(
    quote: CheckoutQuote?,
    items: List<CartItem>,
    selectedAddress: AddressEntity?,
    selectedPaymentMethod: PaymentMethodType,
    scheduledSlots: List<ScheduledSlot>,
    selectedSlot: ScheduledSlot?,
    onSelectSlot: (ScheduledSlot?) -> Unit,
    onSelectPaymentMethod: (PaymentMethodType) -> Unit,
    onRefreshQuote: () -> Unit,
    onPlaceOrder: () -> Unit,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Checkout & Payment") }
            )
        },
        bottomBar = {
            if (quote != null) {
                Surface(
                    shadowElevation = 8.dp,
                    color = MaterialTheme.colorScheme.surface
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = "Grand Total", style = MaterialTheme.typography.labelSmall)
                            Text(
                                text = "₹${quote.grandTotal.toInt()}",
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        Button(
                            onClick = onPlaceOrder,
                            enabled = !quote.isExpired && selectedAddress != null,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.height(48.dp)
                        ) {
                            Text("Place Order & Pay ➔")
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Quote Expiration Warning Banner
            if (quote != null && quote.isExpired) {
                item {
                    BhojanQuoteExpiryBanner(onRefresh = onRefreshQuote)
                }
            }

            // 1. Delivery Address Section
            item {
                BhojanCheckoutSection(title = "Delivery Address") {
                    if (selectedAddress != null) {
                        Text(text = selectedAddress.label, style = MaterialTheme.typography.titleSmall)
                        Text(text = selectedAddress.formattedAddress, style = MaterialTheme.typography.bodyMedium)
                    } else {
                        Text(text = "No address selected", color = MaterialTheme.colorScheme.error)
                    }
                }
            }

            // 2. Delivery Time Window / Slot Section
            if (scheduledSlots.isNotEmpty()) {
                item {
                    BhojanCheckoutSection(title = "Delivery Schedule") {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            FilterChip(
                                selected = selectedSlot == null,
                                onClick = { onSelectSlot(null) },
                                label = { Text("ASAP (~25 mins)") }
                            )
                            scheduledSlots.forEach { slot ->
                                FilterChip(
                                    selected = selectedSlot?.slotId == slot.slotId,
                                    onClick = { onSelectSlot(slot) },
                                    label = { Text(slot.label) },
                                    enabled = slot.isAvailable
                                )
                            }
                        }
                    }
                }
            }

            // 3. Items Summary Section
            item {
                BhojanCheckoutSection(title = "Order Items (${items.size})") {
                    items.forEach { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(text = "${item.quantity}x ${item.itemName}", style = MaterialTheme.typography.bodyMedium)
                            Text(text = "₹${item.subtotal.toInt()}", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }

            // 4. Payment Method Options
            item {
                BhojanCheckoutSection(title = "Select Payment Method") {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        BhojanPaymentMethodCard(
                            methodType = PaymentMethodType.RAZORPAY,
                            title = "Razorpay Native (Cards, NetBanking, Wallet)",
                            subtitle = "Secured end-to-end via Razorpay Native SDK",
                            isSelected = selectedPaymentMethod == PaymentMethodType.RAZORPAY,
                            onSelect = { onSelectPaymentMethod(PaymentMethodType.RAZORPAY) }
                        )

                        BhojanPaymentMethodCard(
                            methodType = PaymentMethodType.DIRECT_UPI,
                            title = "Direct UPI (GPay / PhonePe / Paytm)",
                            subtitle = "Fast direct UPI app intent invocation",
                            isSelected = selectedPaymentMethod == PaymentMethodType.DIRECT_UPI,
                            onSelect = { onSelectPaymentMethod(PaymentMethodType.DIRECT_UPI) }
                        )

                        BhojanPaymentMethodCard(
                            methodType = PaymentMethodType.COD,
                            title = "Cash on Delivery",
                            subtitle = "Pay cash when your hot thali arrives",
                            isSelected = selectedPaymentMethod == PaymentMethodType.COD,
                            onSelect = { onSelectPaymentMethod(PaymentMethodType.COD) }
                        )
                    }
                }
            }

            // 5. Server Authoritative Price Breakdown
            if (quote != null) {
                item {
                    BhojanPriceBreakdown(quote = quote)
                }
            }
        }
    }
}
