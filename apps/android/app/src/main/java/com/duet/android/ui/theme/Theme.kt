package com.duet.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = DeepInk,
    onPrimary = BackgroundCream,
    primaryContainer = DeepInk,
    onPrimaryContainer = BackgroundCream,
    secondary = AccentGold,
    onSecondary = DeepInk,
    secondaryContainer = AccentGold.copy(alpha = 0.16f),
    onSecondaryContainer = DeepInk,
    background = BackgroundCream,
    onBackground = DeepInk,
    surface = CardSurface,
    onSurface = DeepInk,
    surfaceVariant = CardSurface,
    onSurfaceVariant = MutedInk,
    outline = AccentGold.copy(alpha = 0.18f),
    outlineVariant = AccentGold.copy(alpha = 0.14f),
    error = NegativeTone,
    onError = BackgroundCream
)

private val DarkColors = darkColorScheme(
    primary = DarkAccentGold,
    onPrimary = DeepInk,
    primaryContainer = Color(0xFF3A2E14),
    onPrimaryContainer = DarkInk,
    secondary = DarkAccentBlush,
    onSecondary = DeepInk,
    secondaryContainer = Color(0xFF2A1F18),
    onSecondaryContainer = DarkInk,
    background = DarkBackground,
    onBackground = DarkInk,
    surface = DarkCard,
    onSurface = DarkInk,
    surfaceVariant = DarkSurface,
    onSurfaceVariant = DarkMutedInk,
    outline = DarkAccentGold.copy(alpha = 0.22f),
    outlineVariant = DarkAccentGold.copy(alpha = 0.14f),
    error = DarkAccentBlush,
    onError = DeepInk
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
