package com.duet.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val BackgroundCream = Color(0xFFF5F0E8)
val BackgroundBlush = Color(0xFFE8C4B0)
val BackgroundSage = Color(0xFFDAE5D8)
val CardSurface = Color(0xFFFAF7F2)
val DeepInk = Color(0xFF1A1410)
val MutedInk = Color(0xFF5A504A)
val AccentGold = Color(0xFFC9A84C)
val AccentBlush = Color(0xFFC9896A)
val AccentSage = Color(0xFF7A9E7E)
val PhoneSurface = Color(0xFF17120F)
val PositiveTone = Color(0xFF2E7D4F)
val NegativeTone = Color(0xFFAF4B4B)
val OutlineSoft = Color(0x2AC9A84C)

val DarkBackground = Color(0xFF12100E)
val DarkSurface = Color(0xFF1A1714)
val DarkCard = Color(0xFF211C18)
val DarkInk = Color(0xFFF0EBE1)
val DarkMutedInk = Color(0xFFB0A898)
val DarkAccentGold = Color(0xFFD4B05A)
val DarkAccentBlush = Color(0xFFE09A74)
val DarkAccentSage = Color(0xFF8AB98E)

data class DuetColors(
    val background: Color,
    val surface: Color,
    val card: Color,
    val ink: Color,
    val inkSoft: Color,
    val gold: Color,
    val goldLight: Color,
    val sage: Color,
    val blush: Color,
    val positive: Color,
    val negative: Color,
    val ring: Color,
    val modalScrim: Color,
    val phoneSummary: Color,
    val phoneSummaryText: Color,
    val phoneSummarySoft: Color
)

val LightDuetColors = DuetColors(
    background = BackgroundCream,
    surface = CardSurface,
    card = CardSurface.copy(alpha = 0.92f),
    ink = DeepInk,
    inkSoft = MutedInk,
    gold = AccentGold,
    goldLight = Color(0xFFE8D5A3),
    sage = AccentSage,
    blush = AccentBlush,
    positive = PositiveTone,
    negative = NegativeTone,
    ring = AccentGold.copy(alpha = 0.35f),
    modalScrim = DeepInk.copy(alpha = 0.42f),
    phoneSummary = DeepInk,
    phoneSummaryText = BackgroundCream,
    phoneSummarySoft = BackgroundCream.copy(alpha = 0.55f)
)

val DarkDuetColors = DuetColors(
    background = DarkBackground,
    surface = DarkSurface,
    card = DarkCard.copy(alpha = 0.92f),
    ink = DarkInk,
    inkSoft = DarkMutedInk,
    gold = DarkAccentGold,
    goldLight = Color(0xFF3A2E14),
    sage = DarkAccentSage,
    blush = DarkAccentBlush,
    positive = DarkAccentSage,
    negative = DarkAccentBlush,
    ring = DarkAccentGold.copy(alpha = 0.35f),
    modalScrim = Color(0xFF080706).copy(alpha = 0.66f),
    phoneSummary = Color(0xFF14110E),
    phoneSummaryText = DarkInk,
    phoneSummarySoft = DarkInk.copy(alpha = 0.62f)
)

@Composable
fun duetColors(): DuetColors {
    return if (MaterialTheme.colorScheme.background == DarkBackground) DarkDuetColors else LightDuetColors
}
