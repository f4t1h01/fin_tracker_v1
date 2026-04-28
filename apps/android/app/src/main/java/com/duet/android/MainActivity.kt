package com.duet.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.viewModels
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.duet.android.ui.DuetApp
import com.duet.android.ui.theme.DuetTheme
import com.duet.android.ui.theme.duetColors

class MainActivity : ComponentActivity() {
    private val viewModel: DuetViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContent {
            val state by viewModel.uiState.collectAsStateWithLifecycle()
            DuetTheme(darkTheme = state.isDark) {
                val colors = duetColors()
                SideEffect {
                    window.statusBarColor = android.graphics.Color.TRANSPARENT
                    window.navigationBarColor = colors.navBackgroundStrong.toArgb()
                    WindowInsetsControllerCompat(window, window.decorView).apply {
                        isAppearanceLightStatusBars = !state.isDark
                        isAppearanceLightNavigationBars = !state.isDark
                    }
                }
                DuetApp(state = state, actions = viewModel)
            }
        }
    }
}
