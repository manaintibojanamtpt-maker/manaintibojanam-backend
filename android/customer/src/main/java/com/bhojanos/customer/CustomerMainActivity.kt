package com.bhojanos.customer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.bhojanos.core.common.NetworkResult
import com.bhojanos.core.common.StartupMetrics
import com.bhojanos.core.database.AddressEntity
import com.bhojanos.core.design.theme.BhojanTheme
import com.bhojanos.customer.data.cart.CartRepository
import com.bhojanos.customer.data.checkout.CheckoutRepository
import com.bhojanos.customer.domain.cart.CartItem
import com.bhojanos.customer.domain.cart.CartState
import com.bhojanos.customer.domain.checkout.CheckoutQuote
import com.bhojanos.customer.domain.checkout.PaymentMethodType
import com.bhojanos.customer.domain.checkout.ScheduledSlot
import com.bhojanos.customer.domain.payment.PaymentState
import com.bhojanos.customer.presentation.cart.CartScreen
import com.bhojanos.customer.presentation.checkout.CheckoutScreen
import com.bhojanos.customer.presentation.discovery.OrderBhojanHomeScreen
import com.bhojanos.customer.presentation.payment.PaymentFlowScreen
import dagger.hilt.android.AndroidEntryPoint
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class CustomerMainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            BhojanTheme {
                val navController = rememberNavController()

                // Real cart state from CartRepository (Room)
                val cartViewModel: CartViewModel = hiltViewModel()
                val cartState by cartViewModel.uiState.collectAsStateWithLifecycle()

                // Real checkout quote from CheckoutRepository (server-authoritative)
                val checkoutViewModel: CheckoutViewModel = hiltViewModel()
                val checkoutQuote by checkoutViewModel.quoteState.collectAsStateWithLifecycle()

                var selectedAddress by remember {
                    mutableStateOf(
                        AddressEntity(
                            id = "addr_home",
                            label = "Home",
                            houseFlat = "Flat 402",
                            building = "Sunrise Residency",
                            street = "Magarpatta Road",
                            area = "Hadapsar",
                            city = "Pune",
                            state = "Maharashtra",
                            pincode = "411028",
                            latitude = 18.499594,
                            longitude = 73.978589,
                            formattedAddress = "Flat 402, Sunrise Residency, Hadapsar, Pune 411028",
                            isDefault = true
                        )
                    )
                }

                var selectedPaymentMethod by remember { mutableStateOf(PaymentMethodType.RAZORPAY) }
                var selectedSlot by remember { mutableStateOf<ScheduledSlot?>(null) }
                var paymentState by remember { mutableStateOf<PaymentState>(PaymentState.Idle) }

                LaunchedEffect(Unit) {
                    StartupMetrics.recordFirstComposeFrame()
                    // Load cart on startup
                    cartViewModel.loadCart()
                }

                // Trigger quote refresh when cart or address changes
                LaunchedEffect(cartState, selectedAddress, selectedSlot) {
                    if (cartState.items.isNotEmpty()) {
                        checkoutViewModel.getQuote(
                            items = cartState.items,
                            latitude = selectedAddress.latitude,
                            longitude = selectedAddress.longitude,
                            scheduledSlot = selectedSlot?.slotId
                        )
                    } else {
                        checkoutViewModel.clearQuote()
                    }
                }

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    NavHost(navController = navController, startDestination = "customer_splash") {
                        composable("customer_splash") {
                            CustomerSplashScreen(onSplashFinished = {
                                navController.navigate("customer_home") {
                                    popUpTo("customer_splash") { inclusive = true }
                                }
                            })
                        }

                        composable("customer_home") {
                            OrderBhojanHomeScreen(
                                onNavigateAddressPicker = { navController.navigate("customer_cart") }
                            )
                        }

                        composable("customer_cart") {
                            CartScreen(
                                cartState = cartState,
                                onUpdateQuantity = { itemId, newQty ->
                                    cartViewModel.updateQuantity(itemId, newQty)
                                },
                                onClearCart = { cartViewModel.clearCart() },
                                onProceedToCheckout = {
                                    if (cartState.items.isNotEmpty()) {
                                        navController.navigate("customer_checkout")
                                    }
                                },
                                onBack = { navController.popBackStack() }
                            )
                        }

                        composable("customer_checkout") {
                            CheckoutScreen(
                                quote = checkoutQuote,
                                items = cartState.items,
                                selectedAddress = selectedAddress,
                                selectedPaymentMethod = selectedPaymentMethod,
                                scheduledSlots = listOf(
                                    ScheduledSlot("slot_lunch", "Lunch (12:30 PM - 1:30 PM)", "12:30", "13:30"),
                                    ScheduledSlot("slot_dinner", "Dinner (7:30 PM - 8:30 PM)", "19:30", "20:30")
                                ),
                                selectedSlot = selectedSlot,
                                onSelectSlot = { selectedSlot = it },
                                onSelectPaymentMethod = { selectedPaymentMethod = it },
                                onRefreshQuote = {
                                    if (cartState.items.isNotEmpty()) {
                                        checkoutViewModel.getQuote(
                                            items = cartState.items,
                                            latitude = selectedAddress.latitude,
                                            longitude = selectedAddress.longitude,
                                            scheduledSlot = selectedSlot?.slotId
                                        )
                                    }
                                },
                                onPlaceOrder = {
                                    // Navigate to payment with the quote
                                    paymentState = PaymentState.PaymentPending(
                                        razorpayOrderId = "pending",
                                        amountPaise = (checkoutQuote?.grandTotal?.times(100)?.toLong() ?: 0)
                                    )
                                    navController.navigate("customer_payment")
                                },
                                onBack = { navController.popBackStack() }
                            )
                        }

                        composable("customer_payment") {
                            val activeOrderId = (paymentState as? PaymentState.Paid)?.orderId ?: "ord_latest"
                            PaymentFlowScreen(
                                paymentState = paymentState,
                                onRetry = { paymentState = PaymentState.Idle },
                                onBackToHome = {
                                    cartViewModel.clearCart()
                                    navController.navigate("customer_home") {
                                        popUpTo("customer_home") { inclusive = true }
                                    }
                                }
                            )
                        }

                        composable("customer_tracking/{orderId}") { backStackEntry ->
                            val orderId = backStackEntry.arguments?.getString("orderId") ?: "ord_latest"
                            com.bhojanos.customer.presentation.tracking.OrderTrackingScreen(
                                orderId = orderId,
                                repository = com.bhojanos.customer.data.tracking.TrackingRepository(
                                    apiService = object : com.bhojanos.core.network.BhojanApiService {
                                        override suspend fun getHealth() = retrofit2.Response.success(com.bhojanos.core.model.OpsHealthResponse(status = "ok"))
                                        override suspend fun getDiscovery(lat: Double, lng: Double, limit: Int, maxDistanceKm: Int) = retrofit2.Response.success(emptyMap<String, Any>())
                                        override suspend fun getOwnerDeliveryIntegrations(tenantId: String) = retrofit2.Response.success(emptyMap<String, Any>())
                                        override suspend fun createOrder(orderPayload: Map<String, Any>) = retrofit2.Response.success(emptyMap<String, Any>())
                                        override suspend fun createRazorpayOrder(payload: Map<String, Any>) = retrofit2.Response.success(emptyMap<String, Any>())
                                        override suspend fun verifyRazorpayPayment(payload: Map<String, Any>) = retrofit2.Response.success(emptyMap<String, Any>())
                                        override suspend fun validateCoupon(payload: Map<String, Any>) = retrofit2.Response.success(emptyMap<String, Any>())
                                        override suspend fun getCheckoutQuote(payload: Map<String, Any>) = retrofit2.Response.success(emptyMap<String, Any>())
                                        override suspend fun getOrderTracking(orderId: String) = retrofit2.Response.success(
                                            mapOf<String, Any>(
                                                "ok" to true,
                                                "value" to mapOf(
                                                    "orderId" to orderId,
                                                    "orderNumber" to "#1042",
                                                    "status" to "OUT_FOR_DELIVERY",
                                                    "paymentStatus" to "success",
                                                    "etaMinutes" to mapOf("min" to 20, "max" to 30),
                                                    "restaurant" to mapOf("displayName" to "Mana Inti Kitchen", "slug" to "mana-inti"),
                                                    "delivery" to mapOf("partner" to "BhojanOS Express", "riderName" to "Ramesh", "riderPhone" to "9876543210")
                                                )
                                            )
                                        )
                                        override suspend fun getUserOrders(limit: Int) = retrofit2.Response.success(emptyMap<String, Any>())
                                        override suspend fun registerFcmToken(payload: Map<String, String>): retrofit2.Response<Map<String, Any>> = retrofit2.Response.success(mapOf("ok" to true))
                                    }
                                ),
                                onBack = { navController.popBackStack() }
                            )
                        }

                    }
                }
            }
        }
    }
}

// CartViewModel - manages cart state from Room
@HiltViewModel
class CartViewModel @Inject constructor(
    private val cartRepository: CartRepository
) : androidx.lifecycle.ViewModel() {

    private val _uiState = MutableStateFlow<CartState>(CartState())
    val uiState: StateFlow<CartState> = _uiState

    fun loadCart() {
        viewModelScope.launch {
            val state = cartRepository.getCartState()
            _uiState.update { state }
        }
    }

    fun updateQuantity(itemId: String, newQuantity: Int) {
        viewModelScope.launch {
            cartRepository.updateQuantity(itemId, newQuantity)
            loadCart()
        }
    }

    fun clearCart() {
        viewModelScope.launch {
            cartRepository.clearCart()
            _uiState.update { CartState() }
        }
    }
}

// CheckoutViewModel - manages server-authoritative checkout quote
@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val checkoutRepository: CheckoutRepository
) : androidx.lifecycle.ViewModel() {

    private val _quoteState = MutableStateFlow<CheckoutQuote?>(null)
    val quoteState: StateFlow<CheckoutQuote?> = _quoteState

    fun getQuote(
        items: List<CartItem>,
        latitude: Double,
        longitude: Double,
        scheduledSlot: String? = null
    ) {
        viewModelScope.launch {
            val result = checkoutRepository.getAuthoritativeQuote(
                items = items,
                latitude = latitude,
                longitude = longitude,
                couponCode = null
            )
            when (result) {
                is com.bhojanos.core.common.NetworkResult.Success -> _quoteState.update { result.data }
                is com.bhojanos.core.common.NetworkResult.Error -> _quoteState.update { null }
                is com.bhojanos.core.common.NetworkResult.Loading -> { /* ignore */ }
            }
        }
    }

    fun clearQuote() {
        _quoteState.update { null }
    }
}

@Composable
fun CustomerSplashScreen(onSplashFinished: () -> Unit) {
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(1000)
        onSplashFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "OrderBhojan Native",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Authentic Home Cooked Meals",
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(16.dp))
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
    }
}
