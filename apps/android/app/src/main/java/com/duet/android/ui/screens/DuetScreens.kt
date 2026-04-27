@file:OptIn(
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class
)

package com.duet.android.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
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
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.duet.android.DuetUiState
import com.duet.android.DuetViewModel
import com.duet.android.categoryOptions
import com.duet.android.data.CategoryOption
import com.duet.android.data.CategoryTreeNode
import com.duet.android.data.CreateGoodsItemRequest
import com.duet.android.data.CurrencyUtils
import com.duet.android.data.EditableTransaction
import com.duet.android.data.GoodsItem
import com.duet.android.data.GoodsSnapshotResponse
import com.duet.android.data.PendingMutationPreview
import com.duet.android.data.ProfileSnapshotResponse
import com.duet.android.data.TransactionListItem
import com.duet.android.data.currencyLabels
import com.duet.android.data.local.OUTBOX_TYPE_GOODS_ITEM_CREATE
import com.duet.android.data.local.OUTBOX_TYPE_TRANSACTION_CREATE
import com.duet.android.data.supportedCurrencies
import com.duet.android.displaySummary
import com.duet.android.ui.components.DuetButton
import com.duet.android.ui.components.DuetButtonVariant
import com.duet.android.ui.components.DuetSelectSheet
import com.duet.android.ui.components.DuetSegmentedControl
import com.duet.android.ui.components.DuetTextField
import com.duet.android.ui.theme.AccentGold
import com.duet.android.ui.theme.AccentSage
import com.duet.android.ui.theme.CardSurface
import com.duet.android.ui.theme.DeepInk
import com.duet.android.ui.theme.MutedInk
import com.duet.android.ui.theme.NegativeTone
import com.duet.android.ui.theme.PositiveTone

@Composable
fun SplashScreen() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("DUET", fontFamily = FontFamily.Serif, letterSpacing = 6.sp, style = MaterialTheme.typography.headlineSmall)
            CircularProgressIndicator(color = AccentGold)
        }
    }
}

@Composable
fun AuthScreen(state: DuetUiState, actions: DuetViewModel) {
    var mode by rememberSaveable { mutableStateOf("SIGN_IN") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var firstName by rememberSaveable { mutableStateOf("") }
    val focus = LocalFocusManager.current

    ScreenList {
        item {
            BrandBlock("Profile access", if (mode == "SIGN_IN") "Sign in to your finance workspace." else "Create your Duet account.")
            StatusBanner(state)
            CardPanel {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SegmentRow(
                        options = listOf("SIGN_IN" to "Sign in", "REGISTER" to "Create"),
                        selected = mode,
                        onSelect = { mode = it }
                    )
                    if (mode == "REGISTER") {
                        OutlinedTextField(
                            value = firstName,
                            onValueChange = { firstName = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Name") },
                            singleLine = true
                        )
                    }
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Email") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next)
                    )
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Password") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done)
                    )
                    if (mode == "REGISTER") {
                        OutlinedTextField(
                            value = confirmPassword,
                            onValueChange = { confirmPassword = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Confirm password") },
                            singleLine = true,
                            visualTransformation = PasswordVisualTransformation()
                        )
                    }
                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        enabled = !state.isBusy,
                        onClick = {
                            focus.clearFocus()
                            if (mode == "SIGN_IN") {
                                actions.signIn(email, password)
                            } else if (password == confirmPassword) {
                                actions.register(email, password, firstName)
                            }
                        }
                    ) {
                        if (state.isBusy) CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp) else Text(if (mode == "SIGN_IN") "Sign in" else "Create account")
                    }
                    if (mode == "REGISTER" && password != confirmPassword && confirmPassword.isNotBlank()) {
                        Text("Passwords do not match", color = NegativeTone, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(state: DuetUiState, actions: DuetViewModel) {
    val snapshot = state.snapshot
    var showAddSheet by rememberSaveable { mutableStateOf(false) }
    val edit = state.editingTransaction

    ScreenList {
        item {
            TopLine(title = greeting(snapshot), subtitle = snapshot?.profile?.activeCouple?.name ?: "Personal workspace", actions = actions)
            StatusBanner(state)
        }
        if (snapshot == null) {
            item { LoadingPanel("Loading profile snapshot") }
        } else {
            item { BalanceCard(snapshot) }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Button(modifier = Modifier.weight(1f), onClick = { showAddSheet = true }) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Add")
                    }
                    OutlinedButton(modifier = Modifier.weight(1f), onClick = { actions.refreshAll() }) {
                        Icon(Icons.Default.Refresh, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Refresh")
                    }
                }
            }
            item { RecentTransactionsCard(snapshot.recent, onEdit = actions::startEditing, onDelete = actions::deleteTransaction) }
            val pendingTransactions = state.pendingMutations.filter { it.type == OUTBOX_TYPE_TRANSACTION_CREATE }
            if (pendingTransactions.isNotEmpty()) {
                item { PendingMutationsCard("Pending finance sync", pendingTransactions) }
            }
        }
    }

    if (showAddSheet && snapshot != null) {
        TransactionSheet(
            title = "Add transaction",
            snapshot = snapshot,
            initial = null,
            onDismiss = { showAddSheet = false },
            onSave = { amount, kind, currency, categoryId, note ->
                showAddSheet = false
                actions.createTransaction(amount, kind, currency, categoryId, note)
            }
        )
    }

    if (edit != null && snapshot != null) {
        EditTransactionSheet(
            snapshot = snapshot,
            edit = edit,
            onDismiss = actions::stopEditing,
            onSave = actions::updateTransaction
        )
    }
}

@Composable
fun GoodsScreen(state: DuetUiState, actions: DuetViewModel) {
    val snapshot = state.goodsSnapshot
    val list = state.goodsList
    var showAddSheet by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (snapshot == null || list == null) {
            actions.loadGoods()
        }
    }

    ScreenList {
        item {
            TopLine("My Goods", snapshot?.workspace?.name ?: "Inventory and groceries", actions)
            StatusBanner(state)
        }
        if (snapshot == null) {
            item { LoadingPanel("Loading My Goods") }
        } else {
            item {
                MetricStrip(
                    listOf(
                        "Items" to snapshot.metrics.activeItems.toString(),
                        "Low" to snapshot.metrics.lowStockItems.toString(),
                        "Expiring" to snapshot.metrics.expiringSoonItems.toString()
                    )
                )
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    DuetButton("Add grocery", modifier = Modifier.weight(1f), onClick = { showAddSheet = true })
                    DuetButton("Refresh", modifier = Modifier.weight(1f), variant = DuetButtonVariant.Outline, onClick = actions::loadGoods)
                }
            }
            item {
                GoodsFilterCard(state = state, actions = actions, snapshot = snapshot)
            }
            val pendingGoods = state.pendingMutations.filter { it.type == OUTBOX_TYPE_GOODS_ITEM_CREATE }
            if (pendingGoods.isNotEmpty()) {
                item { PendingMutationsCard("Pending goods sync", pendingGoods) }
            }
            if (list?.items.isNullOrEmpty()) {
                item {
                    CardPanel { Text("No goods match the current filters.", color = MutedInk) }
                }
            } else {
                items(list?.items.orEmpty(), key = { it.id }) { item ->
                    GoodsItemRow(item)
                }
            }
        }
    }

    if (showAddSheet && snapshot != null) {
        AddGoodsItemSheet(
            snapshot = snapshot,
            onDismiss = { showAddSheet = false },
            onSave = {
                showAddSheet = false
                actions.createGoodsItem(it)
            }
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DashboardScreen(state: DuetUiState, actions: DuetViewModel) {
    val dashboard = state.dashboard
    val query = state.dashboardQuery
    var searchDraft by rememberSaveable(query.search) { mutableStateOf(query.search) }

    ScreenList {
        item {
            TopLine("Dashboard", dashboard?.filter?.label ?: "Transactions at a glance", actions)
            StatusBanner(state)
        }
        if (dashboard == null) {
            item { LoadingPanel("Loading dashboard") }
        } else {
            item {
                val preferred = CurrencyUtils.normalizeSelection(dashboard.profile.dashboardRateCurrencies)
                val currency = preferred.firstOrNull() ?: "UZS"
                val (income, expense, balance) = dashboard.displaySummary(currency, query.viewMode)
                MetricStrip(
                    listOf(
                        "Income" to CurrencyUtils.formatAmount(income, currency),
                        "Expense" to CurrencyUtils.formatAmount(expense, currency),
                        "Balance" to CurrencyUtils.formatAmount(balance, currency)
                    )
                )
            }
            item {
                CardPanel {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        SegmentRow(
                            options = listOf("THIS_WEEK" to "Week", "THIS_MONTH" to "Month", "SPECIFIC_MONTH" to "Pick month", "CUSTOM" to "Custom"),
                            selected = query.selectedPreset,
                            onSelect = { actions.updateDashboardQuery { q -> q.copy(selectedPreset = it, page = 1) } }
                        )
                        if (query.selectedPreset == "SPECIFIC_MONTH") {
                            var monthDraft by rememberSaveable(query.draftMonthKey) { mutableStateOf(query.draftMonthKey) }
                            OutlinedTextField(
                                value = monthDraft,
                                onValueChange = { monthDraft = it },
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("Month YYYY-MM") },
                                singleLine = true,
                                trailingIcon = {
                                    TextButton(onClick = { actions.updateDashboardQuery { q -> q.copy(draftMonthKey = monthDraft, page = 1) } }) {
                                        Text("Apply")
                                    }
                                }
                            )
                        }
                        if (query.selectedPreset == "CUSTOM") {
                            var fromDraft by rememberSaveable(query.draftFrom) { mutableStateOf(query.draftFrom) }
                            var toDraft by rememberSaveable(query.draftTo) { mutableStateOf(query.draftTo) }
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = fromDraft,
                                    onValueChange = { fromDraft = it },
                                    modifier = Modifier.weight(1f),
                                    label = { Text("From") },
                                    singleLine = true
                                )
                                OutlinedTextField(
                                    value = toDraft,
                                    onValueChange = { toDraft = it },
                                    modifier = Modifier.weight(1f),
                                    label = { Text("To") },
                                    singleLine = true
                                )
                            }
                            Button(
                                modifier = Modifier.fillMaxWidth(),
                                onClick = { actions.updateDashboardQuery { q -> q.copy(draftFrom = fromDraft, draftTo = toDraft, page = 1) } }
                            ) {
                                Text("Apply date range")
                            }
                        }
                        SegmentRow(
                            options = if (dashboard.profile.hasPartnerConnection) listOf("COUPLE" to "Shared", "PERSONAL" to "Mine") else listOf("PERSONAL" to "Mine"),
                            selected = query.viewMode,
                            onSelect = { actions.updateDashboardQuery { q -> q.copy(viewMode = it, page = 1) } }
                        )
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("ALL" to "All", "EXPENSE" to "Expense", "INCOME" to "Income").forEach { (value, label) ->
                                FilterChip(
                                    selected = query.kind == value,
                                    onClick = { actions.updateDashboardQuery { q -> q.copy(kind = value, page = 1) } },
                                    label = { Text(label) }
                                )
                            }
                        }
                        OutlinedTextField(
                            value = searchDraft,
                            onValueChange = { searchDraft = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Search") },
                            singleLine = true,
                            trailingIcon = {
                                TextButton(onClick = { actions.updateDashboardQuery { q -> q.copy(search = searchDraft, page = 1) } }) {
                                    Text("Apply")
                                }
                            }
                        )
                    }
                }
            }
            item {
                RecentTransactionsCard(
                    items = dashboard.transactions.items,
                    title = "${dashboard.transactions.totalItems} transactions",
                    onEdit = actions::startEditing,
                    onDelete = actions::deleteTransaction
                )
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(
                        modifier = Modifier.weight(1f),
                        enabled = dashboard.transactions.page > 1,
                        onClick = { actions.updateDashboardQuery { it.copy(page = (it.page - 1).coerceAtLeast(1)) } }
                    ) { Text("Prev") }
                    OutlinedButton(
                        modifier = Modifier.weight(1f),
                        enabled = dashboard.transactions.page < dashboard.transactions.totalPages,
                        onClick = { actions.updateDashboardQuery { it.copy(page = it.page + 1) } }
                    ) { Text("Next") }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RatesScreen(state: DuetUiState, actions: DuetViewModel) {
    val rates = state.rates
    var amount by rememberSaveable { mutableStateOf("100000") }
    var from by rememberSaveable { mutableStateOf("UZS") }
    var to by rememberSaveable { mutableStateOf("USD") }
    val selected = remember(rates?.selectedCurrencies) {
        mutableStateListOf(*(CurrencyUtils.normalizeSelection(rates?.selectedCurrencies).toTypedArray()))
    }

    ScreenList {
        item {
            TopLine("Rates", rates?.lastUpdatedAt ?: "Exchange rates", actions)
            StatusBanner(state)
        }
        if (rates == null) {
            item { LoadingPanel("Loading exchange rates") }
        } else {
            item {
                CardPanel {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Calculator", style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
                        OutlinedTextField(
                            value = amount,
                            onValueChange = { amount = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Amount") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            CurrencyDropdownLike("From", from, selected, Modifier.weight(1f)) { from = it }
                            IconButton(onClick = {
                                val old = from
                                from = to
                                to = old
                            }) { Icon(Icons.Default.SwapVert, contentDescription = "Swap currencies") }
                            CurrencyDropdownLike("To", to, selected, Modifier.weight(1f)) { to = it }
                        }
                        val sourceInUzs = (amount.toDoubleOrNull() ?: 0.0) * (rates.rates[from] ?: 1.0)
                        val converted = CurrencyUtils.convertFromUzs(sourceInUzs, rates.rates[to] ?: 1.0)
                        Text(CurrencyUtils.formatAmount(converted, to), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
            item {
                CardPanel {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Displayed currencies", style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            supportedCurrencies.forEach { currency ->
                                FilterChip(
                                    selected = currency in selected,
                                    onClick = {
                                        if (currency in selected && selected.size > 1) selected.remove(currency) else if (currency !in selected) selected.add(currency)
                                    },
                                    label = { Text(currency) }
                                )
                            }
                        }
                        Button(modifier = Modifier.fillMaxWidth(), onClick = { actions.saveRatesSelection(selected.toList()) }) {
                            Text("Save selection")
                        }
                    }
                }
            }
            items(selected) { currency ->
                RateRow(currency, currencyLabels[currency] ?: currency, rates.rates[currency] ?: 0.0)
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(state: DuetUiState, actions: DuetViewModel) {
    val snapshot = state.snapshot
    var firstName by rememberSaveable(snapshot?.auth?.firstName) { mutableStateOf(snapshot?.auth?.firstName.orEmpty()) }
    var lastName by rememberSaveable(snapshot?.auth?.lastName) { mutableStateOf(snapshot?.auth?.lastName.orEmpty()) }
    var birthday by rememberSaveable(snapshot?.auth?.birthday) { mutableStateOf(snapshot?.auth?.birthday?.take(10).orEmpty()) }
    var bindCode by rememberSaveable { mutableStateOf("") }
    var categoryName by rememberSaveable { mutableStateOf("") }
    var categoryKind by rememberSaveable { mutableStateOf("EXPENSE") }
    var categoryScope by rememberSaveable { mutableStateOf("PERSONAL") }

    ScreenList {
        item {
            TopLine("Settings", snapshot?.auth?.email ?: "Profile and categories", actions)
            StatusBanner(state)
        }
        item {
            CardPanel {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("Dark mode", style = MaterialTheme.typography.titleMedium)
                        Switch(checked = state.isDark, onCheckedChange = actions::setTheme)
                    }
                    OutlinedTextField(firstName, { firstName = it }, Modifier.fillMaxWidth(), label = { Text("First name") }, singleLine = true)
                    OutlinedTextField(lastName, { lastName = it }, Modifier.fillMaxWidth(), label = { Text("Last name") }, singleLine = true)
                    OutlinedTextField(birthday, { birthday = it }, Modifier.fillMaxWidth(), label = { Text("Birthday YYYY-MM-DD") }, singleLine = true)
                    Button(modifier = Modifier.fillMaxWidth(), onClick = { actions.updateDetails(firstName, lastName, birthday) }) { Text("Save profile") }
                }
            }
        }
        item {
            CardPanel {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Partner connection", style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
                    Text("Your code: ${snapshot?.profile?.user?.coupleCode ?: "-"}", color = AccentGold)
                    if (snapshot?.profile?.hasPartnerConnection == true) {
                        OutlinedButton(modifier = Modifier.fillMaxWidth(), onClick = actions::unbindCouple) { Text("Unlink partner") }
                    } else {
                        OutlinedTextField(bindCode, { bindCode = it }, Modifier.fillMaxWidth(), label = { Text("Partner code") }, singleLine = true)
                        Button(modifier = Modifier.fillMaxWidth(), onClick = { actions.bindCouple(bindCode) }) { Text("Connect partner") }
                    }
                }
            }
        }
        item {
            CardPanel {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Categories", style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
                    SegmentRow(listOf("EXPENSE" to "Expense", "INCOME" to "Income"), categoryKind) { categoryKind = it }
                    SegmentRow(
                        if (snapshot?.profile?.hasPartnerConnection == true) listOf("PERSONAL" to "Personal", "SHARED" to "Shared") else listOf("PERSONAL" to "Personal"),
                        categoryScope
                    ) { categoryScope = it }
                    OutlinedTextField(categoryName, { categoryName = it }, Modifier.fillMaxWidth(), label = { Text("New category") }, singleLine = true)
                    Button(modifier = Modifier.fillMaxWidth(), onClick = {
                        actions.createCategory(categoryKind, categoryScope, categoryName, null)
                        categoryName = ""
                    }) { Text("Add category") }
                }
            }
        }
        if (snapshot != null) {
            val nodes = snapshot.categories.byKind.values.flatMap { it.personal + it.shared }
            items(nodes, key = { it.id }) { category ->
                CategoryManagementRow(category, actions)
            }
        }
        item {
            OutlinedButton(modifier = Modifier.fillMaxWidth(), onClick = actions::logout) {
                Text("Log out")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TransactionSheet(
    title: String,
    snapshot: ProfileSnapshotResponse,
    initial: EditableTransaction?,
    onDismiss: () -> Unit,
    onSave: (Double, String, String, String, String?) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var kind by rememberSaveable { mutableStateOf(initial?.kind ?: "EXPENSE") }
    var amount by rememberSaveable { mutableStateOf(initial?.amount ?: "") }
    val preferredCurrencies = CurrencyUtils.normalizeSelection(snapshot.profile.dashboardRateCurrencies)
    var currency by rememberSaveable { mutableStateOf(CurrencyUtils.clampCurrency(initial?.currency, preferredCurrencies)) }
    val options = snapshot.categoryOptions(kind)
    var categoryId by rememberSaveable(kind) { mutableStateOf(initial?.categoryId?.takeIf { id -> options.any { it.id == id } } ?: options.firstOrNull()?.id.orEmpty()) }
    var note by rememberSaveable { mutableStateOf(initial?.note ?: "") }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .navigationBarsPadding()
                .imePadding()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
            SegmentRow(listOf("EXPENSE" to "Expense", "INCOME" to "Income"), kind) {
                kind = it
                categoryId = snapshot.categoryOptions(kind).firstOrNull()?.id.orEmpty()
            }
            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Amount") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
            )
            CurrencyDropdownLike("Currency", currency, preferredCurrencies, Modifier.fillMaxWidth()) { currency = it }
            CategoryDropdownLike("Category", categoryId, options, Modifier.fillMaxWidth()) { categoryId = it }
            OutlinedTextField(value = note, onValueChange = { note = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Note") })
            Button(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = amount.toDoubleOrNull() != null && categoryId.isNotBlank(),
                onClick = { onSave(amount.toDoubleOrNull() ?: 0.0, kind, currency, categoryId, note) }
            ) { Text("Save transaction") }
        }
    }
}

@Composable
private fun EditTransactionSheet(
    snapshot: ProfileSnapshotResponse,
    edit: EditableTransaction,
    onDismiss: () -> Unit,
    onSave: (EditableTransaction) -> Unit
) {
    var draft by remember(edit.id) { mutableStateOf(edit) }
    TransactionSheet(
        title = "Edit transaction",
        snapshot = snapshot,
        initial = draft,
        onDismiss = onDismiss,
        onSave = { amount, kind, currency, categoryId, note ->
            onSave(draft.copy(amount = amount.toString(), kind = kind, currency = currency, categoryId = categoryId, note = note.orEmpty()))
        }
    )
}

@Composable
private fun ScreenList(content: androidx.compose.foundation.lazy.LazyListScope.() -> Unit) {
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

@Composable
private fun BrandBlock(eyebrow: String, title: String) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.padding(top = 12.dp, bottom = 8.dp)) {
        Text("DUET", fontFamily = FontFamily.Serif, fontWeight = FontWeight.Light, letterSpacing = 6.sp, style = MaterialTheme.typography.headlineSmall)
        Text(eyebrow.uppercase(), color = AccentGold, style = MaterialTheme.typography.labelSmall, letterSpacing = 2.sp)
        Text(title, style = MaterialTheme.typography.displaySmall, fontFamily = FontFamily.Serif, fontWeight = FontWeight.Light)
    }
}

@Composable
private fun TopLine(title: String, subtitle: String, actions: DuetViewModel) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.headlineSmall, fontFamily = FontFamily.Serif)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MutedInk)
        }
        IconButton(onClick = { actions.refreshAll() }) {
            Icon(Icons.Default.Refresh, contentDescription = "Refresh")
        }
    }
}

@Composable
private fun CardPanel(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f)),
        border = BorderStroke(1.dp, AccentGold.copy(alpha = 0.16f)),
        shape = RoundedCornerShape(18.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), content = content)
    }
}

@Composable
private fun StatusBanner(state: DuetUiState) {
    val message = state.error ?: state.message
    if (message != null) {
        Card(
            colors = CardDefaults.cardColors(containerColor = if (state.error != null) NegativeTone.copy(alpha = 0.12f) else AccentSage.copy(alpha = 0.12f)),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = message,
                modifier = Modifier.padding(12.dp),
                color = if (state.error != null) NegativeTone else PositiveTone,
                style = MaterialTheme.typography.bodyMedium
            )
        }
        LaunchedEffect(message) {
            kotlinx.coroutines.delay(3500)
            state.message?.let { }
        }
    }
}

@Composable
private fun LoadingPanel(text: String) {
    CardPanel {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
            Text(text)
        }
    }
}

@Composable
private fun BalanceCard(snapshot: ProfileSnapshotResponse) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { contentDescription = "Current balance card" },
        colors = CardDefaults.cardColors(containerColor = DeepInk),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(snapshot.profile.activeCouple?.name ?: "Personal workspace", color = Color.White.copy(alpha = 0.72f), style = MaterialTheme.typography.bodySmall)
            Text(CurrencyUtils.formatAmount(snapshot.summary.balance, snapshot.summary.currency), color = Color.White, style = MaterialTheme.typography.displaySmall, fontFamily = FontFamily.Serif)
            MetricStrip(
                listOf(
                    "Income" to CurrencyUtils.formatAmount(snapshot.summary.totalIncome, snapshot.summary.currency),
                    "Expense" to CurrencyUtils.formatAmount(snapshot.summary.totalExpense, snapshot.summary.currency)
                ),
                dark = true
            )
        }
    }
}

@Composable
private fun MetricStrip(items: List<Pair<String, String>>, dark: Boolean = false) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        items.forEach { (label, value) ->
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (dark) Color.White.copy(alpha = 0.08f) else CardSurface.copy(alpha = 0.8f))
                    .padding(12.dp)
            ) {
                Text(label, color = if (dark) Color.White.copy(alpha = 0.7f) else MutedInk, style = MaterialTheme.typography.labelSmall)
                Text(value, color = if (dark) Color.White else DeepInk, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun RecentTransactionsCard(
    items: List<TransactionListItem>,
    title: String = "Recent activity",
    onEdit: (String) -> Unit,
    onDelete: (String) -> Unit
) {
    CardPanel {
        Text(title, style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
        Spacer(Modifier.height(8.dp))
        if (items.isEmpty()) {
            Text("No transactions yet.", color = MutedInk)
        } else {
            items.forEachIndexed { index, item ->
                TransactionRow(item, onEdit, onDelete)
                if (index != items.lastIndex) Divider(modifier = Modifier.padding(vertical = 8.dp), color = AccentGold.copy(alpha = 0.14f))
            }
        }
    }
}

@Composable
private fun TransactionRow(item: TransactionListItem, onEdit: (String) -> Unit, onDelete: (String) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.weight(1f)) {
            Text(item.category.name, style = MaterialTheme.typography.titleMedium)
            Text(listOfNotNull(item.note, item.happenedAt.take(10), item.user.firstName ?: item.user.username).joinToString(" / "), color = MutedInk, style = MaterialTheme.typography.bodySmall)
        }
        Text(
            CurrencyUtils.formatAmount(item.amount, item.currency),
            color = if (item.kind == "INCOME") PositiveTone else NegativeTone,
            fontWeight = FontWeight.SemiBold
        )
        IconButton(onClick = { onEdit(item.id) }) { Icon(Icons.Default.Edit, contentDescription = "Edit transaction") }
        IconButton(onClick = { onDelete(item.id) }) { Icon(Icons.Default.Delete, contentDescription = "Delete transaction") }
    }
}

@Composable
private fun RateRow(currency: String, label: String, rate: Double) {
    CardPanel {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(currency, color = AccentGold, fontWeight = FontWeight.SemiBold)
                Text(label, color = MutedInk, style = MaterialTheme.typography.bodySmall)
            }
            Text("1 $currency = ${CurrencyUtils.formatAmount(rate, "UZS")}", fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun CategoryManagementRow(category: CategoryTreeNode, actions: DuetViewModel) {
    CardPanel {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(category.name, style = MaterialTheme.typography.titleMedium)
                Text("${category.kind.lowercase()} / ${category.scope.lowercase()}${if (!category.isVisible) " / hidden" else ""}", color = MutedInk, style = MaterialTheme.typography.bodySmall)
            }
            TextButton(onClick = { actions.updateCategoryVisibility(category.id, !category.isVisible) }) {
                Text(if (category.isVisible) "Hide" else "Show")
            }
            IconButton(onClick = { actions.deleteCategory(category.id) }) {
                Icon(Icons.Default.Delete, contentDescription = "Delete category")
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SegmentRow(options: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { (value, label) ->
            FilterChip(selected = selected == value, onClick = { onSelect(value) }, label = { Text(label) })
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CurrencyDropdownLike(label: String, value: String, options: List<String>, modifier: Modifier = Modifier, onChange: (String) -> Unit) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    Column(modifier = modifier) {
        AssistChip(onClick = { expanded = !expanded }, label = { Text("$label: $value") })
        if (expanded) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                options.forEach {
                    FilterChip(selected = value == it, onClick = {
                        onChange(it)
                        expanded = false
                    }, label = { Text(it) })
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CategoryDropdownLike(label: String, value: String, options: List<CategoryOption>, modifier: Modifier = Modifier, onChange: (String) -> Unit) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    val selected = options.firstOrNull { it.id == value }?.label ?: "Choose"
    Column(modifier = modifier) {
        AssistChip(onClick = { expanded = !expanded }, label = { Text("$label: $selected") })
        if (expanded) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                options.forEach {
                    FilterChip(selected = value == it.id, onClick = {
                        onChange(it.id)
                        expanded = false
                    }, label = { Text(it.label) })
                }
            }
        }
    }
}

@Composable
private fun GoodsFilterCard(state: DuetUiState, actions: DuetViewModel, snapshot: GoodsSnapshotResponse) {
    CardPanel {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Filters", style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
            DuetTextField(
                value = state.goodsQuery.search,
                onValueChange = { value -> actions.updateGoodsQuery { it.copy(search = value, page = 1) } },
                label = "Search goods, place, category"
            )
            DuetSelectSheet(
                label = "Place",
                value = state.goodsQuery.placeId,
                options = listOf("" to "All places") + snapshot.catalog.places.map { it.id to it.name },
                onSelect = { value -> actions.updateGoodsQuery { it.copy(placeId = value, page = 1) } }
            )
            DuetSelectSheet(
                label = "Category",
                value = state.goodsQuery.categoryId,
                options = listOf("" to "All categories") + snapshot.catalog.categories.map { it.id to it.name },
                onSelect = { value -> actions.updateGoodsQuery { it.copy(categoryId = value, page = 1) } }
            )
            DuetSegmentedControl(
                options = listOf("" to "All", "LOW" to "Low", "OUT_OF_STOCK" to "Out", "FULL" to "Full"),
                selected = state.goodsQuery.stockStatus,
                onSelect = { value -> actions.updateGoodsQuery { it.copy(stockStatus = value, page = 1) } }
            )
        }
    }
}

@Composable
private fun GoodsItemRow(item: GoodsItem) {
    CardPanel {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(item.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(listOfNotNull(item.place?.name, item.category?.name, item.expirationStatus.replace("_", " ")).joinToString(" / "), color = MutedInk, style = MaterialTheme.typography.bodySmall)
                if (!item.note.isNullOrBlank()) {
                    Text(item.note, color = MutedInk, style = MaterialTheme.typography.bodySmall)
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("${item.effectiveQuantity} ${item.uom?.code.orEmpty()}", fontWeight = FontWeight.SemiBold)
                Text(item.stockStatus.replace("_", " "), color = if (item.stockStatus == "LOW" || item.stockStatus == "OUT_OF_STOCK") NegativeTone else PositiveTone, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun PendingMutationsCard(title: String, items: List<PendingMutationPreview>) {
    CardPanel {
        Text(title, style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
        Spacer(Modifier.height(8.dp))
        items.forEachIndexed { index, item ->
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(item.title, fontWeight = FontWeight.SemiBold)
                    Text(item.subtitle, color = MutedInk, style = MaterialTheme.typography.bodySmall)
                    if (!item.lastError.isNullOrBlank()) {
                        Text(item.lastError, color = NegativeTone, style = MaterialTheme.typography.bodySmall)
                    }
                }
                Text("Pending", color = AccentGold, style = MaterialTheme.typography.labelSmall)
            }
            if (index != items.lastIndex) {
                Divider(modifier = Modifier.padding(vertical = 8.dp), color = AccentGold.copy(alpha = 0.14f))
            }
        }
    }
}

@Composable
private fun AddGoodsItemSheet(
    snapshot: GoodsSnapshotResponse,
    onDismiss: () -> Unit,
    onSave: (CreateGoodsItemRequest) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var scope by rememberSaveable { mutableStateOf("PERSONAL") }
    var placeId by rememberSaveable { mutableStateOf(snapshot.catalog.places.firstOrNull { it.scope == "PERSONAL" && it.isVisible }?.id ?: snapshot.catalog.places.firstOrNull()?.id.orEmpty()) }
    var categoryId by rememberSaveable { mutableStateOf(snapshot.catalog.categories.firstOrNull { it.scope == "PERSONAL" && it.isVisible }?.id ?: snapshot.catalog.categories.firstOrNull()?.id.orEmpty()) }
    var uomId by rememberSaveable { mutableStateOf(snapshot.catalog.uoms.firstOrNull()?.id.orEmpty()) }
    var name by rememberSaveable { mutableStateOf("") }
    var quantity by rememberSaveable { mutableStateOf("") }
    var lowStock by rememberSaveable { mutableStateOf("") }
    var targetQuantity by rememberSaveable { mutableStateOf("") }
    var expirationDate by rememberSaveable { mutableStateOf("") }
    var note by rememberSaveable { mutableStateOf("") }

    val places = snapshot.catalog.places.filter { it.isVisible && it.scope == scope }
    val categories = snapshot.catalog.categories.filter { it.isVisible && it.scope == scope }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .navigationBarsPadding()
                .imePadding()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Add goods item", style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
            DuetSegmentedControl(
                options = if (snapshot.workspace.hasPartnerConnection) listOf("PERSONAL" to "Personal", "SHARED" to "Shared") else listOf("PERSONAL" to "Personal"),
                selected = scope,
                onSelect = {
                    scope = it
                    placeId = snapshot.catalog.places.firstOrNull { place -> place.scope == scope && place.isVisible }?.id.orEmpty()
                    categoryId = snapshot.catalog.categories.firstOrNull { category -> category.scope == scope && category.isVisible }?.id.orEmpty()
                }
            )
            DuetSelectSheet("Place", placeId, places.map { it.id to it.name }, onSelect = { placeId = it })
            DuetSelectSheet("Category", categoryId, categories.map { it.id to it.name }, onSelect = { categoryId = it })
            DuetTextField(name, { name = it }, "Good name")
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                DuetTextField(quantity, { quantity = it }, "Quantity", modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                DuetSelectSheet("Unit", uomId, snapshot.catalog.uoms.map { it.id to it.code }, modifier = Modifier.weight(1f), onSelect = { uomId = it })
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                DuetTextField(lowStock, { lowStock = it }, "Low stock", modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                DuetTextField(targetQuantity, { targetQuantity = it }, "Target", modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            }
            DuetTextField(expirationDate, { expirationDate = it }, "Expiration YYYY-MM-DD")
            DuetTextField(note, { note = it }, "Note", singleLine = false)
            DuetButton(
                text = "Add goods item",
                modifier = Modifier.fillMaxWidth(),
                enabled = name.isNotBlank() && quantity.toDoubleOrNull() != null && placeId.isNotBlank() && categoryId.isNotBlank() && uomId.isNotBlank(),
                onClick = {
                    onSave(
                        CreateGoodsItemRequest(
                            scope = scope,
                            placeId = placeId,
                            categoryId = categoryId,
                            uomId = uomId,
                            name = name,
                            quantity = quantity.toDoubleOrNull() ?: 0.0,
                            lowStockThreshold = lowStock.toDoubleOrNull(),
                            targetQuantity = targetQuantity.toDoubleOrNull(),
                            expirationDate = expirationDate.ifBlank { null },
                            note = note.ifBlank { null },
                            consumptionRateUnit = "PERMANENT"
                        )
                    )
                }
            )
            Spacer(Modifier.height(8.dp))
        }
    }
}

private fun greeting(snapshot: ProfileSnapshotResponse?): String {
    val name = snapshot?.auth?.firstName ?: snapshot?.profile?.user?.firstName
    return if (name.isNullOrBlank()) "Your finance home" else "Hello, $name"
}
