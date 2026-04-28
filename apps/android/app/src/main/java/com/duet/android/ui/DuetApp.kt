package com.duet.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import com.duet.android.DuetUiState
import com.duet.android.DuetViewModel
import com.duet.android.ui.screens.AuthScreen
import com.duet.android.ui.screens.DashboardScreen
import com.duet.android.ui.screens.ProfileScreen
import com.duet.android.ui.screens.RatesScreen
import com.duet.android.ui.screens.GoodsScreen
import com.duet.android.ui.screens.SettingsScreen
import com.duet.android.ui.screens.SplashScreen
import com.duet.android.ui.theme.duetColors

private enum class DuetDestination(val label: String, val icon: ImageVector) {
    Profile("Home", Icons.Default.Home),
    Dashboard("Dashboard", Icons.Default.Dashboard),
    Goods("Goods", Icons.Default.Inventory2),
    Rates("Rates", Icons.Default.Payments),
    Settings("Settings", Icons.Default.Settings)
}

@Composable
fun DuetApp(state: DuetUiState, actions: DuetViewModel) {
    var destination by rememberSaveable { mutableStateOf(DuetDestination.Profile) }
    val colors = duetColors()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(colors.blush.copy(alpha = 0.24f), colors.sage.copy(alpha = 0.14f), colors.background),
                    radius = 1700f
                )
            )
    ) {
        when {
            state.isBootstrapping -> SplashScreen()
            state.token == null -> AuthScreen(state = state, actions = actions)
            else -> Scaffold(
                containerColor = androidx.compose.ui.graphics.Color.Transparent,
                bottomBar = {
                    NavigationBar(
                        containerColor = colors.surface.copy(alpha = 0.96f),
                        contentColor = colors.ink
                    ) {
                        DuetDestination.entries.forEach { item ->
                            NavigationBarItem(
                                selected = destination == item,
                                onClick = { destination = item },
                                icon = { Icon(item.icon, contentDescription = item.label) },
                                label = { Text(item.label) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = colors.ink,
                                    selectedTextColor = colors.ink,
                                    indicatorColor = colors.gold.copy(alpha = 0.20f),
                                    unselectedIconColor = colors.inkSoft,
                                    unselectedTextColor = colors.inkSoft
                                )
                            )
                        }
                    }
                }
            ) { innerPadding ->
                Box(modifier = Modifier.padding(innerPadding)) {
                    when (destination) {
                        DuetDestination.Profile -> ProfileScreen(state = state, actions = actions)
                        DuetDestination.Dashboard -> DashboardScreen(state = state, actions = actions)
                        DuetDestination.Goods -> GoodsScreen(state = state, actions = actions)
                        DuetDestination.Rates -> RatesScreen(state = state, actions = actions)
                        DuetDestination.Settings -> SettingsScreen(state = state, actions = actions)
                    }
                }
            }
        }
    }
}
