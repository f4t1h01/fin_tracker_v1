@file:OptIn(
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class
)

package com.duet.android.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.duet.android.ui.theme.duetColors

data class DuetSelectOption(
    val value: String,
    val label: String,
    val group: String? = null,
    val disabled: Boolean = false
)

enum class DuetButtonVariant { Primary, Outline, Ghost, Link }

@Composable
fun DuetCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    val colors = duetColors()
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = colors.card),
        border = BorderStroke(1.dp, colors.gold.copy(alpha = 0.16f)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), content = content)
    }
}

@Composable
fun DuetDetailBox(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    val colors = duetColors()
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(colors.surface.copy(alpha = 0.72f))
            .border(1.dp, colors.gold.copy(alpha = 0.14f), RoundedCornerShape(12.dp))
            .padding(12.dp),
        content = content
    )
}

@Composable
fun DuetButton(
    text: String,
    modifier: Modifier = Modifier,
    pending: Boolean = false,
    enabled: Boolean = true,
    variant: DuetButtonVariant = DuetButtonVariant.Primary,
    onClick: () -> Unit
) {
    val colors = duetColors()
    val uppercase = text.uppercase()
    val content: @Composable () -> Unit = {
        if (pending) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                strokeWidth = 2.dp,
                color = if (variant == DuetButtonVariant.Primary) colors.buttonPrimaryFg else colors.gold
            )
        } else {
            Text(
                uppercase,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 1.4.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }

    when (variant) {
        DuetButtonVariant.Primary -> Button(
            modifier = modifier.height(52.dp),
            enabled = enabled && !pending,
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.buttonPrimaryBg,
                contentColor = colors.buttonPrimaryFg,
                disabledContainerColor = colors.inkSoft.copy(alpha = 0.22f),
                disabledContentColor = colors.inkSoft
            ),
            border = BorderStroke(1.dp, colors.buttonPrimaryBorder),
            shape = RoundedCornerShape(10.dp),
            onClick = onClick
        ) { content() }

        DuetButtonVariant.Outline -> OutlinedButton(
            modifier = modifier.height(52.dp),
            enabled = enabled && !pending,
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = colors.ink,
                disabledContentColor = colors.inkSoft
            ),
            border = BorderStroke(1.dp, colors.gold.copy(alpha = 0.28f)),
            shape = RoundedCornerShape(12.dp),
            onClick = onClick
        ) { content() }

        DuetButtonVariant.Ghost -> TextButton(
            modifier = modifier.height(48.dp),
            enabled = enabled && !pending,
            colors = ButtonDefaults.textButtonColors(contentColor = colors.inkSoft),
            shape = RoundedCornerShape(8.dp),
            onClick = onClick
        ) { content() }

        DuetButtonVariant.Link -> TextButton(
            modifier = modifier.height(44.dp),
            enabled = enabled && !pending,
            colors = ButtonDefaults.textButtonColors(contentColor = colors.inkSoft),
            onClick = onClick
        ) { content() }
    }
}

@Composable
fun DuetTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    singleLine: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None
) {
    val colors = duetColors()
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label, color = colors.inkSoft) },
        singleLine = singleLine,
        keyboardOptions = keyboardOptions,
        visualTransformation = visualTransformation,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = colors.ink,
            unfocusedTextColor = colors.ink,
            focusedContainerColor = colors.surface.copy(alpha = 0.86f),
            unfocusedContainerColor = colors.surface.copy(alpha = 0.72f),
            cursorColor = colors.gold,
            focusedBorderColor = colors.gold,
            unfocusedBorderColor = colors.gold.copy(alpha = 0.18f),
            focusedLabelColor = colors.gold,
            unfocusedLabelColor = colors.inkSoft
        )
    )
}

@Composable
fun DuetSegmentedControl(
    options: List<Pair<String, String>>,
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = duetColors()
    FlowRow(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(999.dp))
            .background(colors.surface.copy(alpha = 0.84f))
            .border(1.dp, colors.gold.copy(alpha = 0.18f), RoundedCornerShape(999.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        options.forEach { (value, label) ->
            val active = selected == value
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(38.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(if (active) colors.gold else Color.Transparent)
                    .clickable { onSelect(value) }
                    .padding(horizontal = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    label.uppercase(),
                    color = if (active) Color(0xFF15120F) else colors.inkSoft,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.2.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun DuetKindToggle(
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = duetColors()
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        listOf("EXPENSE" to "Expense", "INCOME" to "Income").forEach { (value, label) ->
            val active = selected == value
            val tone = if (value == "EXPENSE") colors.blush else colors.sage
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(50.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (active) tone.copy(alpha = 0.22f) else colors.surface.copy(alpha = 0.88f))
                    .border(
                        1.dp,
                        if (active) tone.copy(alpha = 0.58f) else colors.gold.copy(alpha = 0.16f),
                        RoundedCornerShape(14.dp)
                    )
                    .clickable { onSelect(value) }
                    .padding(horizontal = 14.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    label.uppercase(),
                    color = if (active) tone else colors.inkSoft,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.1.sp
                )
            }
        }
    }
}

@Composable
fun DuetChoiceChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = duetColors()
    Box(
        modifier = modifier
            .height(38.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(if (selected) colors.gold.copy(alpha = 0.18f) else colors.surface.copy(alpha = 0.78f))
            .border(1.dp, if (selected) colors.gold.copy(alpha = 0.46f) else colors.gold.copy(alpha = 0.16f), RoundedCornerShape(999.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            label,
            color = if (selected) colors.ink else colors.inkSoft,
            style = MaterialTheme.typography.labelLarge,
            maxLines = 1
        )
    }
}

@Composable
fun DuetSelectSheet(
    label: String,
    value: String,
    options: List<Pair<String, String>>,
    modifier: Modifier = Modifier,
    onSelect: (String) -> Unit
) {
    DuetSelectSheetOptions(
        label = label,
        value = value,
        options = options.map { DuetSelectOption(it.first, it.second) },
        modifier = modifier,
        onSelect = onSelect
    )
}

@Composable
fun DuetSelectSheetOptions(
    label: String,
    value: String,
    options: List<DuetSelectOption>,
    modifier: Modifier = Modifier,
    onSelect: (String) -> Unit
) {
    var open by rememberSaveable { mutableStateOf(false) }
    val colors = duetColors()
    val selectedLabel = options.firstOrNull { it.value == value }?.label ?: "Choose"

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(colors.surface.copy(alpha = 0.84f))
            .border(1.dp, colors.gold.copy(alpha = 0.22f), RoundedCornerShape(12.dp))
            .clickable { open = true }
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(label, color = colors.inkSoft, style = MaterialTheme.typography.labelSmall, maxLines = 1)
            Text(
                selectedLabel,
                color = if (value.isBlank()) colors.inkSoft else colors.ink,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = colors.inkSoft)
    }

    if (open) {
        ModalBottomSheet(
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = colors.surface,
            contentColor = colors.ink,
            onDismissRequest = { open = false }
        ) {
            Column(
                modifier = Modifier
                    .navigationBarsPadding()
                    .padding(start = 20.dp, end = 20.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(label, style = MaterialTheme.typography.titleLarge, color = colors.ink)
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    val grouped = options.groupBy { it.group.orEmpty() }
                    grouped.forEach { (group, groupOptions) ->
                        if (group.isNotBlank()) {
                            item(group) {
                                Text(
                                    group.uppercase(),
                                    color = colors.gold,
                                    style = MaterialTheme.typography.labelSmall,
                                    letterSpacing = 1.4.sp,
                                    modifier = Modifier.padding(top = 6.dp, bottom = 2.dp)
                                )
                            }
                        }
                        items(groupOptions, key = { "${it.group}:${it.value}:${it.label}" }) { option ->
                            val selected = option.value == value
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (selected) colors.gold.copy(alpha = 0.12f) else Color.Transparent)
                                    .clickable(enabled = !option.disabled) {
                                        onSelect(option.value)
                                        open = false
                                    }
                                    .padding(horizontal = 12.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    option.label,
                                    modifier = Modifier.weight(1f),
                                    color = if (option.disabled) colors.inkSoft.copy(alpha = 0.45f) else if (selected) colors.ink else colors.inkSoft,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                if (selected) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = colors.gold, modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DuetStatusBanner(message: String?, isError: Boolean, modifier: Modifier = Modifier) {
    if (message == null) return
    val colors = duetColors()
    val tone = if (isError) colors.negative else colors.positive
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = tone.copy(alpha = 0.12f)),
        border = BorderStroke(1.dp, tone.copy(alpha = 0.22f)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(12.dp),
            color = tone,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
fun DuetThemePill(
    isDark: Boolean,
    onChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = duetColors()
    val knobOffset by animateDpAsState(if (isDark) 22.dp else 0.dp, label = "theme-knob")
    val background by animateColorAsState(colors.gold.copy(alpha = 0.10f), label = "theme-bg")
    Box(
        modifier = modifier
            .width(52.dp)
            .height(28.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(background)
            .border(1.dp, colors.gold.copy(alpha = 0.26f), RoundedCornerShape(999.dp))
            .clickable { onChange(!isDark) }
            .padding(3.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Box(
            modifier = Modifier
                .offset(x = knobOffset)
                .size(22.dp)
                .clip(CircleShape)
                .background(if (isDark) colors.gold else colors.ink)
        )
        Icon(
            if (isDark) Icons.Default.DarkMode else Icons.Default.LightMode,
            contentDescription = "Toggle color theme",
            tint = if (isDark) Color(0xFF15120F) else colors.surface,
            modifier = Modifier
                .offset(x = knobOffset)
                .size(22.dp)
                .padding(4.dp)
        )
    }
}
