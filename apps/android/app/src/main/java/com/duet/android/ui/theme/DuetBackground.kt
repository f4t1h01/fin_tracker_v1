package com.duet.android.ui.theme

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import kotlin.math.max
import kotlin.math.sqrt

@Composable
fun DuetBackground(content: @Composable BoxScope.() -> Unit) {
    val colors = duetColors()

    Box(modifier = Modifier.fillMaxSize()) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawRect(colors.background)
            drawThemeRadial(
                center = Offset(size.width * 0.82f, size.height * 0.12f),
                color = colors.gold.copy(alpha = 0.20f),
                transparentStop = 0.38f
            )
            drawThemeRadial(
                center = Offset(size.width * 0.18f, size.height * 0.74f),
                color = colors.backgroundBlush.copy(alpha = 0.24f),
                transparentStop = 0.36f
            )
            drawThemeRadial(
                center = Offset(size.width * 0.66f, size.height * 0.40f),
                color = colors.sage.copy(alpha = 0.14f),
                transparentStop = 0.32f
            )
            drawNoiseOverlay(colors.ink.copy(alpha = 0.018f))
        }
        content()
    }
}

private fun DrawScope.drawThemeRadial(center: Offset, color: Color, transparentStop: Float) {
    val radius = farthestCornerRadius(size, center)
    drawCircle(
        brush = Brush.radialGradient(
            colorStops = arrayOf(
                0f to color,
                transparentStop to Color.Transparent,
                1f to Color.Transparent
            ),
            center = center,
            radius = radius
        ),
        radius = radius,
        center = center
    )
}

private fun DrawScope.drawNoiseOverlay(color: Color) {
    val step = 6f
    var y = 0f
    var row = 0
    while (y < size.height) {
        var x = 0f
        var column = 0
        while (x < size.width) {
            val hash = (row * 1103515245 + column * 12345) and 0x7fffffff
            if (hash % 11 == 0) {
                drawRect(color = color, topLeft = Offset(x, y), size = Size(1f, 1f))
            }
            x += step
            column += 1
        }
        y += step
        row += 1
    }
}

private fun farthestCornerRadius(size: Size, center: Offset): Float {
    return max(
        max(distance(center, Offset.Zero), distance(center, Offset(size.width, 0f))),
        max(distance(center, Offset(0f, size.height)), distance(center, Offset(size.width, size.height)))
    )
}

private fun distance(a: Offset, b: Offset): Float {
    val dx = a.x - b.x
    val dy = a.y - b.y
    return sqrt(dx * dx + dy * dy)
}
