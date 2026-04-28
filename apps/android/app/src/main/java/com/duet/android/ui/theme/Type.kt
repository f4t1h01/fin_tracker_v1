package com.duet.android.ui.theme

import androidx.compose.ui.text.font.Font
import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.duet.android.R

val DuetHeadingFont = FontFamily(
    Font(R.font.cormorant_garamond_light, FontWeight.Light),
    Font(R.font.cormorant_garamond_regular, FontWeight.Normal),
    Font(R.font.cormorant_garamond_semibold, FontWeight.SemiBold)
)

val DuetBodyFont = FontFamily(
    Font(R.font.dm_sans_light, FontWeight.Light),
    Font(R.font.dm_sans_regular, FontWeight.Normal),
    Font(R.font.dm_sans_medium, FontWeight.Medium),
    Font(R.font.dm_sans_medium, FontWeight.SemiBold)
)

val DuetTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = DuetHeadingFont,
        fontWeight = FontWeight.Light,
        fontSize = 38.sp,
        lineHeight = 42.sp
    ),
    headlineSmall = TextStyle(
        fontFamily = DuetHeadingFont,
        fontWeight = FontWeight.Light,
        fontSize = 28.sp,
        lineHeight = 32.sp
    ),
    titleLarge = TextStyle(
        fontFamily = DuetHeadingFont,
        fontWeight = FontWeight.Normal,
        fontSize = 24.sp,
        lineHeight = 28.sp
    ),
    titleMedium = TextStyle(
        fontFamily = DuetBodyFont,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = DuetBodyFont,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = DuetBodyFont,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 21.sp
    ),
    bodySmall = TextStyle(
        fontFamily = DuetBodyFont,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 18.sp
    ),
    labelLarge = TextStyle(
        fontFamily = DuetBodyFont,
        fontWeight = FontWeight.Medium,
        fontSize = 13.sp,
        lineHeight = 16.sp
    ),
    labelSmall = TextStyle(
        fontFamily = DuetBodyFont,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 14.sp
    )
)
