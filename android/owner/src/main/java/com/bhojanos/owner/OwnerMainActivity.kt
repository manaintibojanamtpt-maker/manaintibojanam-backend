package com.bhojanos.owner

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.bhojanos.core.common.StartupMetrics
import com.bhojanos.core.design.theme.BhojanTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class OwnerMainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            BhojanTheme {
                val navController = rememberNavController()
                LaunchedEffect(Unit) {
                    StartupMetrics.recordFirstComposeFrame()
                }

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    NavHost(navController = navController, startDestination = "owner_splash") {
                        composable("owner_splash") {
                            OwnerSplashScreen(onSplashFinished = { navController.navigate("owner_dashboard") { popUpTo("owner_splash") { inclusive = true } } })
                        }
                        composable("owner_dashboard") {
                            OwnerDashboardScreen(
                                onNavigateOrders = { navController.navigate("owner_orders") },
                                onNavigateSettings = { navController.navigate("owner_settings") }
                            )
                        }
                        composable("owner_orders") {
                            OwnerOrdersScreen(onBack = { navController.popBackStack() })
                        }
                        composable("owner_settings") {
                            OwnerSettingsScreen(onBack = { navController.popBackStack() })
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun OwnerSplashScreen(onSplashFinished: () -> Unit) {
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(1200)
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
                text = "BhojanOS Partner Native",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(16.dp))
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OwnerDashboardScreen(onNavigateOrders: () -> Unit, onNavigateSettings: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("BhojanOS Partner (Kitchen KOS)") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Kitchen Terminal Native Foundation", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Foreground service & high-decibel alert architecture ready for Phase 5 KOS integration.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            Button(
                onClick = onNavigateOrders,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text("Kitchen Orders Queue")
            }

            OutlinedButton(
                onClick = onNavigateSettings,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Delivery Integrations & Settings")
            }
        }
    }
}

@Composable
fun OwnerOrdersScreen(onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Kitchen Orders Queue Shell", style = MaterialTheme.typography.titleLarge)
        Spacer(modifier = Modifier.height(12.dp))
        Text("Pending / Preparing / Ready Tabs Placeholder", style = MaterialTheme.typography.bodyMedium)
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = onBack) {
            Text("Back to Dashboard")
        }
    }
}

@Composable
fun OwnerSettingsScreen(onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Owner Portal Integration Settings Shell", style = MaterialTheme.typography.titleLarge)
        Spacer(modifier = Modifier.height(12.dp))
        Text("Entitlement & Mana Inti Delivery Integration Ready", style = MaterialTheme.typography.bodyMedium)
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = onBack) {
            Text("Back to Dashboard")
        }
    }
}
