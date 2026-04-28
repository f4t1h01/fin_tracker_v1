package com.duet.android.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.duet.android.DuetUiState
import com.duet.android.DuetViewModel
import com.duet.android.ui.screens.AuthScreen
import com.duet.android.ui.screens.DashboardScreen
import com.duet.android.ui.screens.DashboardTrendsScreen
import com.duet.android.ui.screens.RatesScreen
import com.duet.android.ui.screens.GoodsAdvisorScreen
import com.duet.android.ui.screens.GoodsOverviewScreen
import com.duet.android.ui.screens.GoodsSetupScreen
import com.duet.android.ui.screens.GoodsStockScreen
import com.duet.android.ui.screens.ProfileScreen
import com.duet.android.ui.screens.SettingsScreen
import com.duet.android.ui.screens.SplashScreen
import com.duet.android.ui.screens.TransactionAddScreen
import com.duet.android.ui.theme.DuetBackground
import com.duet.android.ui.theme.duetColors

enum class DuetDestination(val label: String, val icon: ImageVector) {
    Goods("Goods", Icons.Default.Inventory2),
    Dashboard("Dashboard", Icons.Default.Dashboard),
    AddTransaction("Add", Icons.Default.Add),
    Rates("Rates", Icons.Default.Payments),
    Profile("Profile", Icons.Default.Person),
    Trends("Trends", Icons.Default.Dashboard),
    Settings("Settings", Icons.Default.Home),
    GoodsAdvisor("Advisor", Icons.Default.Inventory2),
    GoodsStock("Stock", Icons.Default.Inventory2),
    GoodsSetup("Setup", Icons.Default.Inventory2)
}

private val bottomDestinations = listOf(
    DuetDestination.Goods,
    DuetDestination.Dashboard,
    DuetDestination.Rates,
    DuetDestination.Profile
)

@Composable
fun DuetApp(state: DuetUiState, actions: DuetViewModel) {
    var destination by rememberSaveable { mutableStateOf(DuetDestination.Profile) }
    val colors = duetColors()

    DuetBackground {
        when {
            state.isBootstrapping -> SplashScreen()
            state.token == null -> AuthScreen(state = state, actions = actions)
            else -> Scaffold(
                containerColor = Color.Transparent,
                bottomBar = { DuetBottomBar(destination = destination, onNavigate = { destination = it }) }
            ) { innerPadding ->
                Box(modifier = Modifier.padding(innerPadding)) {
                    when (destination) {
                        DuetDestination.Profile -> ProfileScreen(state = state, actions = actions, current = destination, onNavigate = { destination = it })
                        DuetDestination.Dashboard -> DashboardScreen(state = state, actions = actions, current = destination, onNavigate = { destination = it })
                        DuetDestination.Trends -> DashboardTrendsScreen(state = state, actions = actions, current = destination, onNavigate = { destination = it })
                        DuetDestination.Goods -> GoodsOverviewScreen(state = state, actions = actions, current = destination, onNavigate = { destination = it })
                        DuetDestination.GoodsAdvisor -> GoodsAdvisorScreen(state = state, actions = actions, current = destination, onNavigate = { destination = it })
                        DuetDestination.GoodsStock -> GoodsStockScreen(state = state, actions = actions, current = destination, onNavigate = { destination = it })
                        DuetDestination.GoodsSetup -> GoodsSetupScreen(state = state, actions = actions, current = destination, onNavigate = { destination = it })
                        DuetDestination.Rates -> RatesScreen(state = state, actions = actions, current = destination, onNavigate = { destination = it })
                        DuetDestination.Settings -> SettingsScreen(state = state, actions = actions, current = destination, onNavigate = { destination = it })
                        DuetDestination.AddTransaction -> TransactionAddScreen(state = state, actions = actions, current = destination, onNavigate = { destination = it })
                    }
                }
            }
        }
    }
}

@Composable
private fun DuetBottomBar(destination: DuetDestination, onNavigate: (DuetDestination) -> Unit) {
    val colors = duetColors()
    Box(modifier = Modifier.fillMaxWidth()) {
        NavigationBar(
            containerColor = colors.navBackgroundStrong,
            contentColor = colors.ink
        ) {
            bottomDestinations.take(2).forEach { item ->
                BottomItem(item = item, selected = destination == item, onNavigate = onNavigate)
            }
            Spacer(modifier = Modifier.weight(1f))
            bottomDestinations.drop(2).forEach { item ->
                BottomItem(item = item, selected = destination == item, onNavigate = onNavigate)
            }
        }
        FloatingActionButton(
            modifier = Modifier
                .align(androidx.compose.ui.Alignment.TopCenter)
                .size(68.dp),
            onClick = { onNavigate(DuetDestination.AddTransaction) },
            containerColor = colors.gold,
            contentColor = Color(0xFF15120F),
            elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 8.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add transaction", modifier = Modifier.size(34.dp))
        }
    }
}

@Composable
private fun RowScope.BottomItem(item: DuetDestination, selected: Boolean, onNavigate: (DuetDestination) -> Unit) {
    val colors = duetColors()
    Column(
        modifier = Modifier
            .weight(1f)
            .height(64.dp)
            .clickable { onNavigate(item) }
            .padding(top = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            item.icon,
            contentDescription = item.label,
            tint = if (selected) colors.ink else colors.inkSoft
        )
        Text(
            item.label,
            color = if (selected) colors.ink else colors.inkSoft
        )
    }
}
