package com.duet.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.tooling.preview.Preview
import com.duet.android.ui.screens.DashboardScreen
import com.duet.android.ui.screens.HomeScreen
import com.duet.android.ui.screens.ProfileGatewayScreen
import com.duet.android.ui.screens.ProfileScreen
import com.duet.android.ui.theme.BackgroundBlush
import com.duet.android.ui.theme.BackgroundCream
import com.duet.android.ui.theme.BackgroundSage
import com.duet.android.ui.theme.DuetTheme

private enum class DuetDestination(val label: String) {
    Home("Welcome"),
    Access("Access"),
    Profile("Profile"),
    Dashboard("Dashboard")
}

@Composable
fun DuetApp() {
    var destination by rememberSaveable { mutableStateOf(DuetDestination.Home) }

    Scaffold(
        containerColor = androidx.compose.ui.graphics.Color.Transparent,
        bottomBar = {
            NavigationBar {
                DuetDestination.entries.forEach { item ->
                    NavigationBarItem(
                        selected = destination == item,
                        onClick = { destination = item },
                        icon = {},
                        label = { Text(item.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(BackgroundBlush, BackgroundSage, BackgroundCream),
                        radius = 1800f
                    )
                )
                .padding(innerPadding)
        ) {
            when (destination) {
                DuetDestination.Home -> HomeScreen(onPrimaryAction = { destination = DuetDestination.Access })
                DuetDestination.Access -> ProfileGatewayScreen(onContinue = { destination = DuetDestination.Profile })
                DuetDestination.Profile -> ProfileScreen(onOpenDashboard = { destination = DuetDestination.Dashboard })
                DuetDestination.Dashboard -> DashboardScreen(onBackProfile = { destination = DuetDestination.Profile })
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun DuetAppPreview() {
    DuetTheme {
        DuetApp()
    }
}
