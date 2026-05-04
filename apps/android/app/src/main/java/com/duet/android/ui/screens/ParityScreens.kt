@file:OptIn(
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class
)

package com.duet.android.ui.screens

import android.Manifest
import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.duet.android.DuetUiState
import com.duet.android.DuetViewModel
import com.duet.android.categoryOptions
import com.duet.android.data.AiTransactionDraftResponse
import com.duet.android.data.BreakdownPoint
import com.duet.android.data.CreateGoodsItemRequest
import com.duet.android.data.CurrencyUtils
import com.duet.android.data.GoodsAdvisorMessage
import com.duet.android.data.GoodsDinnerRecipeSuggestion
import com.duet.android.data.GoodsItem
import com.duet.android.data.GoodsSnapshotResponse
import com.duet.android.data.GoodsUpdateItemRequest
import com.duet.android.data.ProfileSnapshotResponse
import com.duet.android.data.TrendPoint
import com.duet.android.data.currencyLabels
import com.duet.android.data.supportedCurrencies
import com.duet.android.displaySummary
import com.duet.android.ui.DuetDestination
import com.duet.android.ui.components.DuetButton
import com.duet.android.ui.components.DuetButtonVariant
import com.duet.android.ui.components.DuetCard
import com.duet.android.ui.components.DuetChoiceChip
import com.duet.android.ui.components.DuetDetailBox
import com.duet.android.ui.components.DuetKindToggle
import com.duet.android.ui.components.DuetSelectSheet
import com.duet.android.ui.components.DuetSegmentedControl
import com.duet.android.ui.components.DuetStatusBanner
import com.duet.android.ui.components.DuetTextField
import com.duet.android.ui.theme.duetColors
import java.io.File

@Composable
fun TransactionAddScreen(
    state: DuetUiState,
    actions: DuetViewModel,
    current: DuetDestination,
    onNavigate: (DuetDestination) -> Unit
) {
    val snapshot = state.snapshot
    var showAi by rememberSaveable { mutableStateOf(false) }

    if (snapshot == null) {
        ParityScreenList {
            item {
                TopLine("Add transaction", "Loading your finance workspace", actions, current, onNavigate)
                DuetCard { Text("Loading profile snapshot", color = duetColors().inkSoft) }
            }
        }
        return
    }

    var kind by rememberSaveable { mutableStateOf("EXPENSE") }
    var amount by rememberSaveable { mutableStateOf("") }
    val preferred = CurrencyUtils.normalizeSelection(snapshot.profile.dashboardRateCurrencies)
    var currency by rememberSaveable { mutableStateOf(preferred.firstOrNull() ?: "UZS") }
    val options = snapshot.categoryOptions(kind)
    var categoryId by rememberSaveable(kind) { mutableStateOf(options.firstOrNull()?.id.orEmpty()) }
    var note by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(state.aiDraft) {
        state.aiDraft?.draft?.let { draft ->
            draft.kind?.let { kind = it }
            draft.amount?.let { amount = it.toString() }
            draft.currency?.let { currency = CurrencyUtils.clampCurrency(it, preferred) }
            draft.categoryId?.let { categoryId = it }
            draft.note?.let { note = it }
        }
    }

    ParityScreenList {
        item {
            TopLine("Add transaction", snapshot.profile.activeCouple?.name ?: "Personal workspace", actions, current, onNavigate)
            StatusBlock(state, actions)
        }
        item {
            DuetCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Add transaction", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
                    DuetKindToggle(selected = kind, onSelect = {
                        kind = it
                        categoryId = snapshot.categoryOptions(kind).firstOrNull()?.id.orEmpty()
                    })
                    DuetTextField(amount, { amount = it }, "Amount", keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        DuetSelectSheet("Currency", currency, preferred.map { it to it }, Modifier.weight(1f)) { currency = it }
                        DuetSelectSheet("Category", categoryId, options.map { it.id to it.label }, Modifier.weight(1f)) { categoryId = it }
                    }
                    DuetTextField(note, { note = it }, "Note", singleLine = false)
                    DuetButton("AI Features", modifier = Modifier.fillMaxWidth(), variant = DuetButtonVariant.Outline, onClick = { showAi = true })
                    DuetButton(
                        "Save transaction",
                        modifier = Modifier.fillMaxWidth(),
                        pending = state.isBusy,
                        enabled = amount.toDoubleOrNull() != null && categoryId.isNotBlank(),
                        onClick = {
                            actions.createTransaction(amount.toDoubleOrNull() ?: 0.0, kind, currency, categoryId, note)
                            onNavigate(DuetDestination.Profile)
                        }
                    )
                }
            }
        }
    }

    if (showAi) {
        AiFeaturesSheet(
            state = state,
            actions = actions,
            snapshot = snapshot,
            onDismiss = { showAi = false }
        )
    }
}

@Composable
private fun AiFeaturesSheet(
    state: DuetUiState,
    actions: DuetViewModel,
    snapshot: ProfileSnapshotResponse,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var mode by rememberSaveable { mutableStateOf("MENU") }
    var imagePreviewUri by rememberSaveable { mutableStateOf<String?>(null) }
    var imagePreviewName by rememberSaveable { mutableStateOf<String?>(null) }
    var pendingCaptureUri by rememberSaveable { mutableStateOf<String?>(null) }
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            imagePreviewUri = it.toString()
            imagePreviewName = resolveDisplayName(context, it, "Selected receipt")
            actions.createImageDraft(it)
        }
    }
    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { captured ->
        val uri = pendingCaptureUri?.let(Uri::parse)
        pendingCaptureUri = null
        if (captured && uri != null) {
            imagePreviewUri = uri.toString()
            imagePreviewName = "Captured receipt"
            actions.createImageDraft(uri)
        }
    }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) actions.startVoiceRecording()
    }
    val locked = state.aiStage != "READY" && state.aiStage != "RECORDING"
    val resetAiDraft = {
        actions.clearAiDraft()
        imagePreviewUri = null
        imagePreviewName = null
        pendingCaptureUri = null
    }

    ModalBottomSheet(
        onDismissRequest = { if (!locked) onDismiss() },
        sheetState = sheetState,
        containerColor = duetColors().surface,
        contentColor = duetColors().ink
    ) {
        AnimatedVisibility(
            visible = true,
            enter = fadeIn(tween(220)) + slideInVertically(tween(260)) { it / 6 } + scaleIn(tween(260), initialScale = 0.96f),
            exit = fadeOut(tween(180)) + slideOutVertically(tween(180)) { it / 6 } + scaleOut(tween(180), targetScale = 0.98f)
        ) {
            Column(
                modifier = Modifier
                    .navigationBarsPadding()
                    .imePadding()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("AI TOOLS", color = duetColors().gold, style = MaterialTheme.typography.labelSmall, letterSpacing = 2.sp)
                        Text(if (mode == "VOICE") "Voice note" else if (mode == "IMAGE") "Receipt image" else "Choose a tool", style = MaterialTheme.typography.headlineSmall, color = duetColors().ink)
                        Text("Voice and receipt drafting fill this transaction form after review.", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
                    }
                    IconButton(enabled = !locked, onClick = onDismiss) { Icon(Icons.Default.Close, contentDescription = "Close AI tools", tint = duetColors().ink) }
                }
                if (state.aiError != null) {
                    DuetStatusBanner(
                        message = state.aiError,
                        isError = true,
                        eventKey = state.aiErrorEventId,
                        onAutoDismiss = actions::clearAiError
                    )
                }
                if (mode == "MENU") {
                    AiToolCard("Voice note", "Record one transaction and fill the form from voice.", Icons.Default.Mic) { mode = "VOICE" }
                    AiToolCard("Image draft", "Upload one receipt and fill the form from image.", Icons.Default.Image) { mode = "IMAGE" }
                } else if (mode == "VOICE") {
                    DuetButton("Back", variant = DuetButtonVariant.Ghost, onClick = { mode = "MENU" })
                    VoiceRecorderButton(
                        isRecording = state.aiStage == "RECORDING",
                        isBusy = locked,
                        recordingSeconds = state.voiceRecordingSeconds,
                        stageLabel = state.aiStage,
                        visualizerLevels = state.voiceVisualizerLevels,
                        onStartRecording = { permissionLauncher.launch(Manifest.permission.RECORD_AUDIO) },
                        onStopRecording = actions::stopVoiceRecordingAndDraft
                    )
                    if (state.aiStage == "RECORDING") {
                        DuetButton(
                            "Cancel recording",
                            modifier = Modifier.fillMaxWidth(),
                            variant = DuetButtonVariant.Outline,
                            onClick = actions::cancelVoiceRecording
                        )
                    }
                } else {
                    DuetButton("Back", variant = DuetButtonVariant.Ghost, onClick = { mode = "MENU" })
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        DuetButton(
                            "Capture image",
                            modifier = Modifier.weight(1f),
                            variant = DuetButtonVariant.Outline,
                            enabled = !locked,
                            onClick = {
                                val uri = createReceiptCaptureUri(context)
                                pendingCaptureUri = uri.toString()
                                cameraLauncher.launch(uri)
                            }
                        )
                        DuetButton(
                            "Upload image",
                            modifier = Modifier.weight(1f),
                            enabled = !locked,
                            onClick = { imagePicker.launch("image/*") }
                        )
                    }
                    ImageSelectionPreview(imagePreviewUri, imagePreviewName)
                }
                state.aiDraft?.let { draft ->
                    AiDraftPreview(draft, snapshot)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        DuetButton("Reset draft", modifier = Modifier.weight(1f), variant = DuetButtonVariant.Ghost, onClick = resetAiDraft)
                        DuetButton("Continue", modifier = Modifier.weight(1f), variant = DuetButtonVariant.Outline, onClick = onDismiss)
                    }
                }
            }
        }
    }
}

@Composable
private fun ImageSelectionPreview(previewUri: String?, previewName: String?) {
    if (previewUri == null && previewName == null) return

    val context = LocalContext.current
    val bitmap = remember(previewUri) {
        previewUri?.let { loadPreviewBitmap(context, Uri.parse(it)) }
    }

    if (bitmap != null) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(duetColors().surface.copy(alpha = 0.82f))
                .border(1.dp, duetColors().gold.copy(alpha = 0.18f), RoundedCornerShape(24.dp)),
            contentAlignment = Alignment.Center
        ) {
            Image(
                bitmap = bitmap.asImageBitmap(),
                contentDescription = "Receipt preview",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
            )
        }
    } else if (previewName != null) {
        DuetDetailBox {
            Text("Selected image", color = duetColors().inkSoft, style = MaterialTheme.typography.labelSmall, letterSpacing = 1.6.sp)
            Text(previewName, color = duetColors().ink, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            Text("Preview is unavailable for this format, but the file will still be processed.", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun VoiceRecorderButton(
    isRecording: Boolean,
    isBusy: Boolean,
    recordingSeconds: Int,
    stageLabel: String,
    visualizerLevels: List<Float>,
    onStartRecording: () -> Unit,
    onStopRecording: () -> Unit
) {
    val colors = duetColors()
    val tone = if (isRecording) colors.blush else colors.gold
    val barLevels = resampleVisualizerLevels(visualizerLevels, VOICE_RECORDER_BAR_COUNT)
    androidx.compose.material3.OutlinedButton(
        modifier = Modifier
            .fillMaxWidth()
            .height(92.dp),
        enabled = !isBusy || isRecording,
        onClick = if (isRecording) onStopRecording else onStartRecording,
        shape = RoundedCornerShape(28.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, tone.copy(alpha = if (isRecording) 0.50f else 0.24f)),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = if (isRecording) tone.copy(alpha = 0.15f) else colors.surface.copy(alpha = 0.84f),
            contentColor = if (isRecording) tone else colors.ink,
            disabledContainerColor = colors.surface.copy(alpha = 0.74f),
            disabledContentColor = colors.inkSoft
        )
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier.weight(1.1f),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(tone.copy(alpha = 0.10f))
                        .border(1.dp, tone.copy(alpha = 0.20f), RoundedCornerShape(999.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(if (isRecording) Icons.Default.Stop else Icons.Default.Mic, contentDescription = null, tint = tone, modifier = Modifier.size(18.dp))
                }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        if (isRecording) "STOP" else if (isBusy) "WORKING" else "RECORD",
                        color = if (isRecording) tone else colors.ink,
                        fontWeight = FontWeight.SemiBold,
                        style = MaterialTheme.typography.labelMedium,
                        letterSpacing = 1.5.sp
                    )
                    Text(
                        if (isRecording) formatRecordingTime(recordingSeconds) else if (isBusy) stageLabel else "3s min",
                        color = if (isRecording) tone.copy(alpha = 0.88f) else colors.inkSoft,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 0.8.sp
                    )
                }
            }
            Row(
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.End),
                verticalAlignment = Alignment.Bottom
            ) {
                barLevels.forEachIndexed { index, level ->
                    val animated by animateFloatAsState(targetValue = level.coerceIn(0f, 1f), animationSpec = tween(220), label = "voice-bar-$index")
                    Box(
                        modifier = Modifier
                            .width(7.dp)
                            .height(48.dp),
                        contentAlignment = Alignment.BottomCenter
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .graphicsLayer {
                                    scaleY = animated
                                    transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 1f)
                                    alpha = if (isRecording) 1f else 0.64f
                                }
                                .clip(RoundedCornerShape(999.dp))
                                .background(tone.copy(alpha = if (isRecording) 0.90f else 0.42f))
                        )
                    }
                }
            }
        }
    }
}

private const val VOICE_RECORDER_BAR_COUNT = 15

private fun formatRecordingTime(seconds: Int): String {
    return "${(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}"
}

private fun resampleVisualizerLevels(levels: List<Float>, targetCount: Int): List<Float> {
    if (targetCount <= 0) return emptyList()
    if (levels.isEmpty()) return List(targetCount) { 0f }
    if (targetCount == 1) return listOf(levels.first())
    if (levels.size == 1) return List(targetCount) { levels.first() }

    return List(targetCount) { index ->
        val position = (index.toFloat() / (targetCount - 1)) * (levels.size - 1)
        val leftIndex = position.toInt()
        val rightIndex = (leftIndex + 1).coerceAtMost(levels.lastIndex)
        val blend = position - leftIndex
        val left = levels[leftIndex]
        val right = levels[rightIndex]
        left + (right - left) * blend
    }
}

@Composable
private fun AiToolCard(title: String, body: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    DuetDetailBox(
        modifier = Modifier
            .clickable(onClick = onClick)
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(duetColors().gold.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = duetColors().gold)
            }
            Column {
                Text(title.uppercase(), fontWeight = FontWeight.SemiBold, color = duetColors().ink, letterSpacing = 1.2.sp)
                Text(body, color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun AiDraftPreview(response: AiTransactionDraftResponse, snapshot: ProfileSnapshotResponse) {
    val draft = response.draft
    val transcript = response.transcript?.trim().orEmpty()
    val extractedText = response.extractedText?.trim().orEmpty()
    val isReceiptDraft = response.receiptMode != null ||
        response.qualityRating != null ||
        response.documentType != null ||
        response.extractionSource != null ||
        response.qrUrl != null ||
        response.qrSummary != null ||
        response.qrCodes.isNotEmpty() ||
        response.productNames.isNotEmpty() ||
        response.qualityIssues.isNotEmpty() ||
        extractedText.isNotBlank()
    val categoryLabel = draft.categoryId?.let { id ->
        snapshot.categoryOptions(draft.kind ?: "EXPENSE").firstOrNull { it.id == id }?.label
    }
    val categoryStatus = categoryLabel?.let { "Matched: $it" }
        ?: draft.categoryNameCandidate?.let { "Suggested: $it" }
        ?: "Not resolved"
    val fieldSummary = listOfNotNull(
        draft.kind,
        draft.amount?.toString(),
        draft.currency,
        categoryLabel ?: draft.categoryNameCandidate?.let { "Suggested: $it" },
        draft.note
    ).joinToString(" / ")

    DuetDetailBox {
        Text("Draft ready", style = MaterialTheme.typography.titleMedium, color = duetColors().ink)
        if (isReceiptDraft) {
            Spacer(modifier = Modifier.height(10.dp))
            Text("RECEIPT STATUS", color = duetColors().inkSoft, style = MaterialTheme.typography.labelSmall, letterSpacing = 1.6.sp)
            Text("Source: ${formatReceiptValue(response.extractionSource ?: "IMAGE_AI")}", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            Text("Mode: ${formatReceiptValue(response.receiptMode ?: "UNKNOWN")}", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            Text("Quality: ${response.qualityRating ?: "Not detected"}", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            Text("Document: ${formatReceiptValue(response.documentType ?: "UNKNOWN")}", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            Text("Category: $categoryStatus", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            Text("Note: ${draft.note?.takeIf { it.isNotBlank() } ?: "Not detected"}", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            response.qrUrl?.takeIf { it.isNotBlank() }?.let {
                Text("QR: ${response.qrProvider ?: it}", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            }
            if (!response.qrSummary.isNullOrBlank() || response.qrCodes.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text("QR CHECK", color = duetColors().inkSoft, style = MaterialTheme.typography.labelSmall, letterSpacing = 1.6.sp)
                response.qrSummary?.takeIf { it.isNotBlank() }?.let {
                    Text(it, color = duetColors().ink, style = MaterialTheme.typography.bodySmall)
                }
                response.qrCodes.forEachIndexed { index, qr ->
                    val status = if (qr.status == "FETCHED") "data fetched from QR" else "QR found but no data fetched"
                    val parts = listOfNotNull(
                        "QR ${index + 1}: $status",
                        if (qr.usedForDraft) "used for draft" else null,
                        qr.provider,
                        qr.warning?.takeIf { it.isNotBlank() }
                    )
                    Text(parts.joinToString(" / "), color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
                }
            }

            if (response.productNames.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text("ITEMS", color = duetColors().inkSoft, style = MaterialTheme.typography.labelSmall, letterSpacing = 1.6.sp)
                Text(response.productNames.joinToString(", "), color = duetColors().ink, style = MaterialTheme.typography.bodySmall)
            }

            if (response.qualityIssues.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text("QUALITY ISSUES", color = duetColors().inkSoft, style = MaterialTheme.typography.labelSmall, letterSpacing = 1.6.sp)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    response.qualityIssues.forEach { issue ->
                        Text(
                            formatReceiptValue(issue),
                            modifier = Modifier
                                .clip(RoundedCornerShape(999.dp))
                                .background(duetColors().gold.copy(alpha = 0.10f))
                                .border(1.dp, duetColors().gold.copy(alpha = 0.16f), RoundedCornerShape(999.dp))
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            color = duetColors().inkSoft,
                            style = MaterialTheme.typography.labelSmall,
                            letterSpacing = 0.8.sp
                        )
                    }
                }
            }

            if (extractedText.isNotBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text("EXTRACTED TEXT", color = duetColors().inkSoft, style = MaterialTheme.typography.labelSmall, letterSpacing = 1.6.sp)
                Text(extractedText, color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            }
        } else if (transcript.isNotBlank()) {
            Spacer(modifier = Modifier.height(10.dp))
            Text("TRANSCRIPT", color = duetColors().inkSoft, style = MaterialTheme.typography.labelSmall, letterSpacing = 1.6.sp)
            Text(transcript, color = duetColors().ink, style = MaterialTheme.typography.bodySmall)
        }
        Spacer(modifier = Modifier.height(10.dp))
        Text("FIELDS", color = duetColors().inkSoft, style = MaterialTheme.typography.labelSmall, letterSpacing = 1.6.sp)
        Text(
            fieldSummary.ifBlank { "Not detected" },
            color = duetColors().inkSoft,
            style = MaterialTheme.typography.bodySmall
        )
        val warnings = (draft.warnings + response.qrWarnings).distinct()
        if (warnings.isNotEmpty()) Text("Warnings: ${warnings.joinToString(", ")}", color = duetColors().negative, style = MaterialTheme.typography.bodySmall)
        if (draft.missingFields.isNotEmpty()) Text("Missing: ${draft.missingFields.joinToString(", ")}", color = duetColors().gold, style = MaterialTheme.typography.bodySmall)
    }
}

private fun formatReceiptValue(value: String): String {
    return value.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() }
}

private fun createReceiptCaptureUri(context: Context): Uri {
    val file = File.createTempFile("duet-receipt-", ".jpg", context.cacheDir)
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
}

private fun resolveDisplayName(context: Context, uri: Uri, fallback: String): String {
    return runCatching {
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index >= 0 && cursor.moveToFirst()) {
                cursor.getString(index)?.takeIf { it.isNotBlank() }
            } else {
                null
            }
        }
    }.getOrNull() ?: uri.lastPathSegment?.takeIf { it.isNotBlank() } ?: fallback
}

private fun loadPreviewBitmap(context: Context, uri: Uri) = runCatching {
    context.contentResolver.openInputStream(uri)?.use { stream ->
        BitmapFactory.decodeStream(stream)
    }
}.getOrNull()

@Composable
fun DashboardTrendsScreen(state: DuetUiState, actions: DuetViewModel, current: DuetDestination, onNavigate: (DuetDestination) -> Unit) {
    val dashboard = state.dashboard
    ParityScreenList {
        item {
            TopLine("Trends", dashboard?.filter?.label ?: "Transactions breakdown", actions, current, onNavigate)
            StatusBlock(state, actions)
        }
        if (dashboard == null) {
            item { DuetCard { Text("Loading dashboard trends", color = duetColors().inkSoft) } }
        } else {
            item {
                val preferred = CurrencyUtils.normalizeSelection(dashboard.profile.dashboardRateCurrencies)
                val currency = preferred.firstOrNull() ?: "UZS"
                val (income, expense, balance) = dashboard.displaySummary(currency, state.dashboardQuery.viewMode)
                MetricCards(listOf("Income" to CurrencyUtils.formatAmount(income, currency), "Expense" to CurrencyUtils.formatAmount(expense, currency), "Balance" to CurrencyUtils.formatAmount(balance, currency)))
            }
            item { TrendCard(dashboard.charts?.trend?.items.orEmpty()) }
            item { BreakdownCard(dashboard.charts?.breakdown?.items.orEmpty()) }
        }
    }
}

@Composable
private fun TrendCard(items: List<TrendPoint>) {
    DuetCard {
        Text("Trend", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
        if (items.isEmpty()) Text("No trend data for this filter.", color = duetColors().inkSoft)
        items.take(12).forEach { item ->
            DuetDetailBox {
                Text(item.label, fontWeight = FontWeight.SemiBold)
                Text("Income ${CurrencyUtils.formatAmount(item.income, "UZS")} / Expense ${CurrencyUtils.formatAmount(item.expense, "UZS")} / Net ${CurrencyUtils.formatAmount(item.net, "UZS")}", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun BreakdownCard(items: List<BreakdownPoint>) {
    DuetCard {
        Text("Breakdown", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
        if (items.isEmpty()) Text("No category breakdown yet.", color = duetColors().inkSoft)
        items.take(12).forEach { item ->
            DuetDetailBox {
                Text(item.categoryName, fontWeight = FontWeight.SemiBold)
                Text("${(item.share * 100).toInt()}% / ${CurrencyUtils.formatAmount(item.totalAmountInUzs ?: item.totalExpense ?: 0.0, "UZS")}", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
fun GoodsStockScreen(state: DuetUiState, actions: DuetViewModel, current: DuetDestination, onNavigate: (DuetDestination) -> Unit) {
    val snapshot = state.goodsSnapshot
    LaunchedEffect(Unit) { if (snapshot == null || state.goodsList == null) actions.loadGoods() }
    ParityScreenList {
        item {
            TopLine("Stock", snapshot?.workspace?.name ?: "Goods inventory", actions, current, onNavigate)
            StatusBlock(state, actions)
        }
        if (snapshot == null) {
            item { DuetCard { Text("Loading goods stock", color = duetColors().inkSoft) } }
        } else {
            item { MetricCards(goodsMetricPairs(snapshot)) }
            item { GoodsFullFilters(state, actions, snapshot) }
            items(state.goodsList?.items.orEmpty(), key = { it.id }) { item ->
                GoodsActionCard(item, snapshot, state, actions)
            }
        }
    }
}

@Composable
private fun GoodsFullFilters(state: DuetUiState, actions: DuetViewModel, snapshot: GoodsSnapshotResponse) {
    DuetCard {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Filters", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
            DuetTextField(state.goodsQuery.search, { value -> actions.updateGoodsQuery { it.copy(search = value, page = 1) } }, "Search goods, place, category")
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                DuetSelectSheet("Place", state.goodsQuery.placeId, listOf("" to "All places") + snapshot.catalog.places.map { it.id to "${it.name}${if (it.isVisible) "" else " (Hidden)"}" }, Modifier.weight(1f)) { value -> actions.updateGoodsQuery { it.copy(placeId = value, page = 1) } }
                DuetSelectSheet("Category", state.goodsQuery.categoryId, listOf("" to "All categories") + snapshot.catalog.categories.map { it.id to "${it.name}${if (it.isVisible) "" else " (Hidden)"}" }, Modifier.weight(1f)) { value -> actions.updateGoodsQuery { it.copy(categoryId = value, page = 1) } }
            }
            DuetSegmentedControl(listOf("" to "All", "FULL" to "Full", "ENOUGH" to "Enough", "LOW" to "Low", "OUT_OF_STOCK" to "Out"), state.goodsQuery.stockStatus, onSelect = { value -> actions.updateGoodsQuery { it.copy(stockStatus = value, page = 1) } })
            DuetSelectSheet("Freshness", state.goodsQuery.expirationStatus, listOf("" to "All freshness", "FRESH" to "Fresh", "EXPIRING_SOON" to "Expiring soon", "EXPIRED" to "Expired", "NO_EXPIRATION" to "No expiration")) { value -> actions.updateGoodsQuery { it.copy(expirationStatus = value, page = 1) } }
            DuetSelectSheet("Sort", state.goodsQuery.sort, listOf("RECENTLY_UPDATED" to "Recently updated", "EXPIRATION_ASC" to "Expiration date", "RUN_OUT_ASC" to "Run out soon", "LOW_QUANTITY" to "Lowest stock gap", "NAME" to "Name", "PLACE" to "Place", "CATEGORY" to "Category")) { value -> actions.updateGoodsQuery { it.copy(sort = value, page = 1) } }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DuetChoiceChip("Low only", state.goodsQuery.lowOnly, onClick = { actions.updateGoodsQuery { it.copy(lowOnly = !it.lowOnly, page = 1) } })
                DuetChoiceChip("Updated 7d", state.goodsQuery.recentlyUpdatedOnly, onClick = { actions.updateGoodsQuery { it.copy(recentlyUpdatedOnly = !it.recentlyUpdatedOnly, page = 1) } })
                DuetChoiceChip("Auto-use", state.goodsQuery.autoConsumptionOnly, onClick = { actions.updateGoodsQuery { it.copy(autoConsumptionOnly = !it.autoConsumptionOnly, page = 1) } })
            }
        }
    }
}

@Composable
private fun GoodsActionCard(item: GoodsItem, snapshot: GoodsSnapshotResponse, state: DuetUiState, actions: DuetViewModel) {
    var amount by rememberSaveable(item.id) { mutableStateOf("") }
    var reason by rememberSaveable(item.id) { mutableStateOf("") }
    var showEdit by rememberSaveable(item.id) { mutableStateOf(false) }
    DuetCard {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item.name, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                Text(listOfNotNull(item.place?.name, item.category?.name, item.stockStatus.replace("_", " "), item.expirationStatus.replace("_", " ")).joinToString(" / "), color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            }
            Text("${item.effectiveQuantity} ${item.uom?.code.orEmpty()}", fontWeight = FontWeight.SemiBold)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            DuetTextField(amount, { amount = it }, "Qty", Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            DuetTextField(reason, { reason = it }, "Reason", Modifier.weight(1f))
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("RESTOCK" to "Restock", "CONSUME" to "Consume", "RECONCILE" to "Reconcile").forEach { (action, label) ->
                DuetButton(label, enabled = amount.toDoubleOrNull() != null, variant = DuetButtonVariant.Outline) { actions.mutateGoodsQuantity(item.id, action, amount.toDoubleOrNull() ?: 0.0, reason) }
            }
            DuetButton("History", variant = DuetButtonVariant.Ghost) { actions.loadGoodsHistory(item.id) }
            DuetButton("Edit", variant = DuetButtonVariant.Ghost) { showEdit = true }
            DuetButton("Archive", variant = DuetButtonVariant.Ghost) { actions.archiveGoodsItem(item.id) }
        }
        state.goodsHistoryByItemId[item.id]?.items?.take(4)?.forEach { event ->
            Text("${event.eventType}: ${event.quantityAfter} at ${event.occurredAt.take(10)}", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
        }
    }
    if (showEdit) GoodsEditSheet(item, snapshot, actions, onDismiss = { showEdit = false })
}

@Composable
private fun GoodsEditSheet(item: GoodsItem, snapshot: GoodsSnapshotResponse, actions: DuetViewModel, onDismiss: () -> Unit) {
    var name by rememberSaveable(item.id) { mutableStateOf(item.name) }
    var note by rememberSaveable(item.id) { mutableStateOf(item.note.orEmpty()) }
    var placeId by rememberSaveable(item.id) { mutableStateOf(item.place?.id.orEmpty()) }
    var categoryId by rememberSaveable(item.id) { mutableStateOf(item.category?.id.orEmpty()) }
    var low by rememberSaveable(item.id) { mutableStateOf(item.lowStockThreshold.toString()) }
    var target by rememberSaveable(item.id) { mutableStateOf(item.targetQuantity.toString()) }
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = duetColors().surface, contentColor = duetColors().ink) {
        Column(modifier = Modifier.navigationBarsPadding().imePadding().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Edit goods item", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
            DuetTextField(name, { name = it }, "Name")
            DuetTextField(note, { note = it }, "Note", singleLine = false)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                DuetSelectSheet("Place", placeId, snapshot.catalog.places.map { it.id to it.name }, Modifier.weight(1f)) { placeId = it }
                DuetSelectSheet("Category", categoryId, snapshot.catalog.categories.map { it.id to it.name }, Modifier.weight(1f)) { categoryId = it }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                DuetTextField(low, { low = it }, "Low stock", Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                DuetTextField(target, { target = it }, "Target", Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            }
            DuetButton("Save item", modifier = Modifier.fillMaxWidth(), onClick = {
                actions.moveGoodsItem(item.id, placeId, categoryId, null)
                actions.updateGoodsItem(item.id, GoodsUpdateItemRequest(name = name, note = note.ifBlank { null }, lowStockThreshold = low.toDoubleOrNull(), targetQuantity = target.toDoubleOrNull()))
                onDismiss()
            })
        }
    }
}

@Composable
fun GoodsSetupScreen(state: DuetUiState, actions: DuetViewModel, current: DuetDestination, onNavigate: (DuetDestination) -> Unit) {
    val snapshot = state.goodsSnapshot
    var placeName by rememberSaveable { mutableStateOf("") }
    var placeScope by rememberSaveable { mutableStateOf("PERSONAL") }
    var categoryName by rememberSaveable { mutableStateOf("") }
    var categoryScope by rememberSaveable { mutableStateOf("PERSONAL") }
    LaunchedEffect(Unit) { if (snapshot == null || state.goodsPlaces == null || state.goodsCategories == null) actions.loadGoods() }
    ParityScreenList {
        item {
            TopLine("Setup", snapshot?.workspace?.name ?: "Goods structure", actions, current, onNavigate)
            StatusBlock(state, actions)
        }
        if (snapshot == null) {
            item { DuetCard { Text("Loading setup", color = duetColors().inkSoft) } }
        } else {
            item {
                SetupCreateCard("Places", placeScope, { placeScope = it }, placeName, { placeName = it }, snapshot.workspace.hasPartnerConnection) {
                    actions.createGoodsPlace(placeScope, placeName)
                    placeName = ""
                }
            }
            items(state.goodsPlaces?.items.orEmpty(), key = { "place-${it.id}" }) { place ->
                SetupRow(place.name, "${place.scope} / ${place.itemCount} active${if (!place.isVisible) " / hidden" else ""}", place.isVisible, place.itemCount == 0, { actions.updateGoodsPlaceVisibility(place.id, !place.isVisible) }, { actions.deleteGoodsPlace(place.id) })
            }
            item {
                SetupCreateCard("Categories", categoryScope, { categoryScope = it }, categoryName, { categoryName = it }, snapshot.workspace.hasPartnerConnection) {
                    actions.createGoodsCategory(categoryScope, categoryName)
                    categoryName = ""
                }
            }
            items(state.goodsCategories?.items.orEmpty(), key = { "category-${it.id}" }) { category ->
                SetupRow(category.name, "${category.scope}${if (category.isSeeded) " / Default" else ""} / ${category.itemCount} active${if (!category.isVisible) " / hidden" else ""}", category.isVisible, category.itemCount == 0, { actions.updateGoodsCategoryVisibility(category.id, !category.isVisible) }, { actions.deleteGoodsCategory(category.id) })
            }
            item {
                DuetCard {
                    Text("Units of measure", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        snapshot.catalog.uoms.forEach { uom -> DuetChoiceChip("${uom.code} / ${uom.label}", true, onClick = {}) }
                    }
                }
            }
        }
    }
}

@Composable
private fun SetupCreateCard(title: String, scope: String, setScope: (String) -> Unit, name: String, setName: (String) -> Unit, hasPartner: Boolean, onCreate: () -> Unit) {
    DuetCard {
        Text(title, style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
        DuetSegmentedControl(if (hasPartner) listOf("PERSONAL" to "Personal", "SHARED" to "Shared") else listOf("PERSONAL" to "Personal"), scope, setScope)
        DuetTextField(name, setName, "Name")
        DuetButton("Add ${title.dropLast(1)}", enabled = name.isNotBlank(), modifier = Modifier.fillMaxWidth(), onClick = onCreate)
    }
}

@Composable
private fun SetupRow(title: String, subtitle: String, visible: Boolean, canDelete: Boolean, onToggle: () -> Unit, onDelete: () -> Unit) {
    DuetCard {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.SemiBold)
                Text(subtitle, color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            }
            TextButton(onClick = onToggle, colors = ButtonDefaults.textButtonColors(contentColor = duetColors().gold)) { Text(if (visible) "Hide" else "Show") }
            IconButton(enabled = canDelete, onClick = onDelete) { Icon(Icons.Default.Delete, contentDescription = "Delete", tint = if (canDelete) duetColors().negative else duetColors().inkSoft.copy(alpha = 0.35f)) }
        }
    }
}

@Composable
fun GoodsAdvisorScreen(state: DuetUiState, actions: DuetViewModel, current: DuetDestination, onNavigate: (DuetDestination) -> Unit) {
    LaunchedEffect(Unit) { if (state.advisorThreads.isEmpty()) actions.loadAdvisor() }
    val active = state.advisorActiveThread
    val messages = active?.messages.orEmpty() + listOfNotNull(state.pendingAdvisorText?.let { GoodsAdvisorMessage("pending", "USER", it) })
    ParityScreenList {
        item {
            TopLine("Advisor", state.goodsSnapshot?.workspace?.name ?: "Pantry assistant", actions, current, onNavigate)
            StatusBlock(state, actions)
        }
        item {
            DuetCard {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(active?.thread?.title ?: "New conversation", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
                    IconButton(onClick = actions::startNewAdvisorChat) { Icon(Icons.Default.Edit, contentDescription = "New chat", tint = duetColors().inkSoft) }
                }
                DuetSegmentedControl(if (state.goodsSnapshot?.workspace?.hasPartnerConnection == true) listOf("AUTO" to "Auto", "PERSONAL" to "Mine", "SHARED" to "Shared") else listOf("AUTO" to "Auto"), state.advisorScope, actions::setAdvisorScope)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    state.advisorThreads.take(8).forEach { thread ->
                        DuetChoiceChip(thread.title, active?.thread?.id == thread.id, onClick = { actions.openAdvisorThread(thread.id) })
                    }
                }
            }
        }
        items(messages, key = { it.id }) { message ->
            AdvisorBubble(message)
        }
        item {
            DuetCard {
                DuetTextField(state.advisorDraft, actions::setAdvisorDraft, "Ask about dinner or expiring goods", singleLine = false)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    listOf("What can I cook for dinner?", "Use items that expire soon", "Quick dinner for 2").forEach { prompt ->
                        DuetButton(prompt.take(12), modifier = Modifier.weight(1f), variant = DuetButtonVariant.Outline) { actions.sendAdvisorMessage(prompt) }
                    }
                }
                DuetButton("Send", modifier = Modifier.fillMaxWidth(), pending = state.isBusy, enabled = state.advisorDraft.isNotBlank(), onClick = { actions.sendAdvisorMessage() })
            }
        }
    }
}

@Composable
private fun AdvisorBubble(message: GoodsAdvisorMessage) {
    val isUser = message.role.uppercase() == "USER"
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start) {
        Card(
            modifier = Modifier.fillMaxWidth(if (isUser) 0.84f else 0.94f),
            shape = RoundedCornerShape(if (isUser) 22.dp else 26.dp),
            colors = CardDefaults.cardColors(containerColor = if (isUser) duetColors().gold.copy(alpha = 0.14f) else duetColors().surface.copy(alpha = 0.86f)),
            border = androidx.compose.foundation.BorderStroke(1.dp, duetColors().gold.copy(alpha = 0.16f))
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(message.text, color = duetColors().ink, style = MaterialTheme.typography.bodyMedium)
                message.payload?.warnings?.forEach { Text(it, color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall) }
                val recipes = message.payload?.pantryMeals.orEmpty() + listOfNotNull(message.payload?.minimalBuyMeal)
                recipes.forEach { RecipeCard(it) }
            }
        }
    }
}

@Composable
private fun RecipeCard(recipe: GoodsDinnerRecipeSuggestion) {
    DuetDetailBox {
        Text(recipe.title, fontWeight = FontWeight.SemiBold)
        Text(recipe.whyItFits, color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
        if (recipe.usesItems.isNotEmpty()) Text("Uses: ${recipe.usesItems.joinToString(", ")}", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
        recipe.steps.take(5).forEachIndexed { index, step -> Text("${index + 1}. $step", style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
private fun MetricCards(items: List<Pair<String, String>>) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        items.forEach { (label, value) ->
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(duetColors().surface.copy(alpha = 0.82f))
                    .border(1.dp, duetColors().gold.copy(alpha = 0.14f), RoundedCornerShape(14.dp))
                    .padding(12.dp)
            ) {
                Text(label, color = duetColors().inkSoft, style = MaterialTheme.typography.labelSmall)
                Text(value, color = duetColors().ink, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

private fun goodsMetricPairs(snapshot: GoodsSnapshotResponse): List<Pair<String, String>> {
    return listOf(
        "Active" to snapshot.metrics.activeItems.toString(),
        "Low" to snapshot.metrics.lowStockItems.toString(),
        "Out" to snapshot.metrics.outOfStockItems.toString(),
        "Expiring" to snapshot.metrics.expiringSoonItems.toString()
    )
}

@Composable
private fun StatusBlock(state: DuetUiState, actions: DuetViewModel) {
    val message = state.error ?: state.message
    if (message != null) {
        DuetStatusBanner(
            message = message,
            isError = state.error != null,
            eventKey = state.statusEventId,
            onAutoDismiss = actions::clearMessage
        )
    }
}

@Composable
private fun ParityScreenList(content: androidx.compose.foundation.lazy.LazyListScope.() -> Unit) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .padding(horizontal = 16.dp),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        content = content
    )
}
