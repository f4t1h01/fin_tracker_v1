@file:OptIn(
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class
)

package com.duet.android.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.duet.android.ui.theme.AccentGold
import com.duet.android.ui.theme.DeepInk
import com.duet.android.ui.theme.MutedInk
import com.duet.android.ui.theme.NegativeTone
import com.duet.android.ui.theme.PositiveTone

@Composable
fun DuetCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f)),
        border = BorderStroke(1.dp, AccentGold.copy(alpha = 0.16f)),
        shape = RoundedCornerShape(18.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), content = content)
    }
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
    val content: @Composable () -> Unit = {
        if (pending) {
            CircularProgressIndicator(modifier = Modifier.height(18.dp).width(18.dp), strokeWidth = 2.dp)
        } else {
            Text(text.uppercase(), fontWeight = FontWeight.SemiBold)
        }
    }

    if (variant == DuetButtonVariant.Primary) {
        Button(
            modifier = modifier.height(52.dp),
            enabled = enabled && !pending,
            colors = ButtonDefaults.buttonColors(containerColor = DeepInk),
            shape = RoundedCornerShape(8.dp),
            onClick = onClick
        ) { content() }
    } else {
        OutlinedButton(
            modifier = modifier.height(52.dp),
            enabled = enabled && !pending,
            border = BorderStroke(1.dp, AccentGold.copy(alpha = 0.28f)),
            shape = RoundedCornerShape(12.dp),
            onClick = onClick
        ) { content() }
    }
}

enum class DuetButtonVariant { Primary, Outline }

@Composable
fun DuetTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    singleLine: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label) },
        singleLine = singleLine,
        keyboardOptions = keyboardOptions,
        shape = RoundedCornerShape(12.dp)
    )
}

@Composable
fun DuetSegmentedControl(
    options: List<Pair<String, String>>,
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    FlowRow(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { (value, label) ->
            FilterChip(
                selected = selected == value,
                onClick = { onSelect(value) },
                label = { Text(label) }
            )
        }
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
    var open by rememberSaveable { mutableStateOf(false) }
    val selectedLabel = options.firstOrNull { it.first == value }?.second ?: "Choose"

    OutlinedButton(
        modifier = modifier.fillMaxWidth().height(52.dp),
        border = BorderStroke(1.dp, AccentGold.copy(alpha = 0.22f)),
        shape = RoundedCornerShape(12.dp),
        onClick = { open = true }
    ) {
        Text("$label: $selectedLabel", modifier = Modifier.weight(1f), color = if (value.isBlank()) MutedInk else DeepInk)
        Icon(Icons.Default.KeyboardArrowDown, contentDescription = null)
    }

    if (open) {
        ModalBottomSheet(
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            onDismissRequest = { open = false }
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(label, style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(4.dp))
                options.forEach { (optionValue, optionLabel) ->
                    OutlinedButton(
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        border = BorderStroke(1.dp, AccentGold.copy(alpha = if (optionValue == value) 0.42f else 0.16f)),
                        shape = RoundedCornerShape(12.dp),
                        onClick = {
                            onSelect(optionValue)
                            open = false
                        }
                    ) {
                        Text(optionLabel, modifier = Modifier.weight(1f))
                        if (optionValue == value) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = AccentGold)
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
fun DuetStatusBanner(message: String?, isError: Boolean, modifier: Modifier = Modifier) {
    if (message == null) return
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = if (isError) NegativeTone.copy(alpha = 0.12f) else PositiveTone.copy(alpha = 0.12f)),
        shape = RoundedCornerShape(14.dp)
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(12.dp),
            color = if (isError) NegativeTone else PositiveTone,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}
