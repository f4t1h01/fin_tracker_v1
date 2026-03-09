package com.duet.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = DeepInk,
    onPrimary = BackgroundCream,
    secondary = AccentGold,
    background = BackgroundCream,
    onBackground = DeepInk,
    surface = CardSurface,
    onSurface = DeepInk,
    outline = OutlineSoft
)

private val DarkColors = darkColorScheme(
    primary = AccentGold,
    onPrimary = DeepInk,
    secondary = AccentBlush,
    background = DarkBackground,
    onBackground = DarkInk,
    surface = DarkCard,
    onSurface = DarkInk,
    outline = OutlineSoft
)

@Composable
fun DuetTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = DuetTypography,
        content = content
    )
}
