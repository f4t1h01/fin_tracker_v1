package com.duet.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.viewModels
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.duet.android.ui.DuetApp
import com.duet.android.ui.theme.DuetTheme

class MainActivity : ComponentActivity() {
    private val viewModel: DuetViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContent {
            val state by viewModel.uiState.collectAsStateWithLifecycle()
            DuetTheme(darkTheme = state.isDark) {
                DuetApp(state = state, actions = viewModel)
            }
        }
    }
}
