@file:OptIn(
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class
)

package com.duet.android.ui.screens

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
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.duet.android.DuetUiState
import com.duet.android.DuetViewModel
import com.duet.android.ui.DuetDestination
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
import com.duet.android.ui.components.DuetChoiceChip
import com.duet.android.ui.components.DuetDetailBox
import com.duet.android.ui.components.DuetKindToggle
import com.duet.android.ui.components.DuetSelectSheet
import com.duet.android.ui.components.DuetSelectSheetOptions
import com.duet.android.ui.components.DuetSegmentedControl
import com.duet.android.ui.components.DuetSelectOption
import com.duet.android.ui.components.DuetStatusBanner
import com.duet.android.ui.components.DuetTextField
import com.duet.android.ui.components.DuetThemePill
import com.duet.android.ui.theme.duetColors

@Composable
fun SplashScreen() {
    val colors = duetColors()
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("DUET", letterSpacing = 6.sp, style = MaterialTheme.typography.headlineSmall, color = colors.ink)
            CircularProgressIndicator(color = colors.gold)
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
                        DuetTextField(
                            value = firstName,
                            onValueChange = { firstName = it },
                            label = "Name"
                        )
                    }
                    DuetTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = "Email",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next)
                    )
                    DuetTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = "Password",
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done)
                    )
                    if (mode == "REGISTER") {
                        DuetTextField(
                            value = confirmPassword,
                            onValueChange = { confirmPassword = it },
                            label = "Confirm password",
                            visualTransformation = PasswordVisualTransformation()
                        )
                    }
                    DuetButton(
                        text = if (mode == "SIGN_IN") "Sign in" else "Create account",
                        modifier = Modifier.fillMaxWidth(),
                        pending = state.isBusy,
                        enabled = !state.isBusy,
                        onClick = {
                            focus.clearFocus()
                            if (mode == "SIGN_IN") {
                                actions.signIn(email, password)
                            } else if (password == confirmPassword) {
                                actions.register(email, password, firstName)
                            }
                        }
                    )
                    if (mode == "REGISTER" && password != confirmPassword && confirmPassword.isNotBlank()) {
                        Text("Passwords do not match", color = duetColors().negative, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    state: DuetUiState,
    actions: DuetViewModel,
    current: DuetDestination = DuetDestination.Profile,
    onNavigate: (DuetDestination) -> Unit = {}
) {
    val snapshot = state.snapshot
    var showAddSheet by rememberSaveable { mutableStateOf(false) }
    val edit = state.editingTransaction

    ScreenList {
        item {
            TopLine(title = greeting(snapshot), subtitle = snapshot?.profile?.activeCouple?.name ?: "Personal workspace", actions = actions, current = current, onNavigate = onNavigate)
            StatusBanner(state)
        }
        if (snapshot == null) {
            item { LoadingPanel("Loading profile snapshot") }
        } else {
            item { BalanceCard(snapshot) }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    DuetButton("Add", modifier = Modifier.weight(1f), onClick = { showAddSheet = true })
                    DuetButton("Refresh", modifier = Modifier.weight(1f), variant = DuetButtonVariant.Outline, onClick = { actions.refreshAll() })
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
fun GoodsOverviewScreen(
    state: DuetUiState,
    actions: DuetViewModel,
    current: DuetDestination = DuetDestination.Goods,
    onNavigate: (DuetDestination) -> Unit = {}
) {
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
            TopLine("My Goods", snapshot?.workspace?.name ?: "Inventory and groceries", actions, current, onNavigate)
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
                GoodsOverviewHighlights(snapshot)
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
                    CardPanel { Text("No goods match the current filters.", color = duetColors().inkSoft) }
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
fun DashboardScreen(
    state: DuetUiState,
    actions: DuetViewModel,
    current: DuetDestination = DuetDestination.Dashboard,
    onNavigate: (DuetDestination) -> Unit = {}
) {
    val dashboard = state.dashboard
    val query = state.dashboardQuery
    var searchDraft by rememberSaveable(query.search) { mutableStateOf(query.search) }

    ScreenList {
        item {
            TopLine("Dashboard", dashboard?.filter?.label ?: "Transactions at a glance", actions, current, onNavigate)
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
                            DuetTextField(
                                value = monthDraft,
                                onValueChange = { monthDraft = it },
                                label = "Month YYYY-MM"
                            )
                            DuetButton("Apply", modifier = Modifier.fillMaxWidth(), variant = DuetButtonVariant.Outline, onClick = { actions.updateDashboardQuery { q -> q.copy(draftMonthKey = monthDraft, page = 1) } })
                        }
                        if (query.selectedPreset == "CUSTOM") {
                            var fromDraft by rememberSaveable(query.draftFrom) { mutableStateOf(query.draftFrom) }
                            var toDraft by rememberSaveable(query.draftTo) { mutableStateOf(query.draftTo) }
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                DuetTextField(
                                    value = fromDraft,
                                    onValueChange = { fromDraft = it },
                                    modifier = Modifier.weight(1f),
                                    label = "From"
                                )
                                DuetTextField(
                                    value = toDraft,
                                    onValueChange = { toDraft = it },
                                    modifier = Modifier.weight(1f),
                                    label = "To"
                                )
                            }
                            DuetButton(
                                text = "Apply date range",
                                modifier = Modifier.fillMaxWidth(),
                                variant = DuetButtonVariant.Outline,
                                onClick = { actions.updateDashboardQuery { q -> q.copy(draftFrom = fromDraft, draftTo = toDraft, page = 1) } }
                            )
                        }
                        SegmentRow(
                            options = if (dashboard.profile.hasPartnerConnection) listOf("COUPLE" to "Shared", "PERSONAL" to "Mine") else listOf("PERSONAL" to "Mine"),
                            selected = query.viewMode,
                            onSelect = { actions.updateDashboardQuery { q -> q.copy(viewMode = it, page = 1) } }
                        )
                        DuetSegmentedControl(
                            options = listOf("ALL" to "All", "EXPENSE" to "Expense", "INCOME" to "Income"),
                            selected = query.kind,
                            onSelect = { value -> actions.updateDashboardQuery { q -> q.copy(kind = value, page = 1) } }
                        )
                        DuetTextField(
                            value = searchDraft,
                            onValueChange = { searchDraft = it },
                            label = "Search"
                        )
                        DuetButton("Apply search", modifier = Modifier.fillMaxWidth(), variant = DuetButtonVariant.Outline, onClick = { actions.updateDashboardQuery { q -> q.copy(search = searchDraft, page = 1) } })
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
                    DuetButton(
                        text = "Prev",
                        modifier = Modifier.weight(1f),
                        enabled = dashboard.transactions.page > 1,
                        variant = DuetButtonVariant.Outline,
                        onClick = { actions.updateDashboardQuery { it.copy(page = (it.page - 1).coerceAtLeast(1)) } }
                    )
                    DuetButton(
                        text = "Next",
                        modifier = Modifier.weight(1f),
                        enabled = dashboard.transactions.page < dashboard.transactions.totalPages,
                        variant = DuetButtonVariant.Outline,
                        onClick = { actions.updateDashboardQuery { it.copy(page = it.page + 1) } }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RatesScreen(
    state: DuetUiState,
    actions: DuetViewModel,
    current: DuetDestination = DuetDestination.Rates,
    onNavigate: (DuetDestination) -> Unit = {}
) {
    val rates = state.rates
    var amount by rememberSaveable { mutableStateOf("100000") }
    var from by rememberSaveable { mutableStateOf("UZS") }
    var to by rememberSaveable { mutableStateOf("USD") }
    val selected = remember(rates?.selectedCurrencies) {
        mutableStateListOf(*(CurrencyUtils.normalizeSelection(rates?.selectedCurrencies).toTypedArray()))
    }

    ScreenList {
        item {
            TopLine("Rates", rates?.lastUpdatedAt ?: "Exchange rates", actions, current, onNavigate)
            StatusBanner(state)
        }
        if (rates == null) {
            item { LoadingPanel("Loading exchange rates") }
        } else {
            item {
                CardPanel {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Calculator", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
                        DuetTextField(
                            value = amount,
                            onValueChange = { amount = it },
                            label = "Amount",
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            CurrencyDropdownLike("From", from, selected, Modifier.weight(1f)) { from = it }
                            IconButton(onClick = {
                                val old = from
                                from = to
                                to = old
                            }) { Icon(Icons.Default.SwapVert, contentDescription = "Swap currencies", tint = duetColors().inkSoft) }
                            CurrencyDropdownLike("To", to, selected, Modifier.weight(1f)) { to = it }
                        }
                        val sourceInUzs = (amount.toDoubleOrNull() ?: 0.0) * (rates.rates[from] ?: 1.0)
                        val converted = CurrencyUtils.convertFromUzs(sourceInUzs, rates.rates[to] ?: 1.0)
                        Text(CurrencyUtils.formatAmount(converted, to), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold, color = duetColors().ink)
                    }
                }
            }
            item {
                CardPanel {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Displayed currencies", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            supportedCurrencies.forEach { currency ->
                                DuetChoiceChip(
                                    label = currency,
                                    selected = currency in selected,
                                    onClick = {
                                        if (currency in selected && selected.size > 1) selected.remove(currency) else if (currency !in selected) selected.add(currency)
                                    }
                                )
                            }
                        }
                        DuetButton("Save selection", modifier = Modifier.fillMaxWidth(), onClick = { actions.saveRatesSelection(selected.toList()) })
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
fun SettingsScreen(
    state: DuetUiState,
    actions: DuetViewModel,
    current: DuetDestination = DuetDestination.Settings,
    onNavigate: (DuetDestination) -> Unit = {}
) {
    val snapshot = state.snapshot
    var firstName by rememberSaveable(snapshot?.auth?.firstName) { mutableStateOf(snapshot?.auth?.firstName.orEmpty()) }
    var lastName by rememberSaveable(snapshot?.auth?.lastName) { mutableStateOf(snapshot?.auth?.lastName.orEmpty()) }
    var birthday by rememberSaveable(snapshot?.auth?.birthday) { mutableStateOf(snapshot?.auth?.birthday?.take(10).orEmpty()) }
    var bindCode by rememberSaveable { mutableStateOf("") }
    var categoryName by rememberSaveable { mutableStateOf("") }
    var categoryKind by rememberSaveable { mutableStateOf("EXPENSE") }
    var categoryScope by rememberSaveable { mutableStateOf("PERSONAL") }
    var weekStartsOn by rememberSaveable(snapshot?.auth?.weekStartsOn) { mutableStateOf(snapshot?.auth?.weekStartsOn ?: "MONDAY") }
    var setupEmail by rememberSaveable(snapshot?.auth?.email) { mutableStateOf(snapshot?.auth?.email.orEmpty()) }
    var setupPassword by rememberSaveable { mutableStateOf("") }
    var showShared by rememberSaveable(snapshot?.categories?.preferences?.showSharedCategories) { mutableStateOf(snapshot?.categories?.preferences?.showSharedCategories ?: true) }
    var defaultIncomeId by rememberSaveable(snapshot?.categories?.preferences?.defaultIncomeCategoryId) { mutableStateOf(snapshot?.categories?.preferences?.defaultIncomeCategoryId.orEmpty()) }
    var defaultExpenseId by rememberSaveable(snapshot?.categories?.preferences?.defaultExpenseCategoryId) { mutableStateOf(snapshot?.categories?.preferences?.defaultExpenseCategoryId.orEmpty()) }

    ScreenList {
        item {
            TopLine("Settings", snapshot?.auth?.email ?: "Profile and categories", actions, current, onNavigate)
            StatusBanner(state)
        }
        item {
            CardPanel {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("Dark mode", style = MaterialTheme.typography.titleMedium)
                        DuetThemePill(isDark = state.isDark, onChange = actions::setTheme)
                    }
                    DuetTextField(firstName, { firstName = it }, "First name")
                    DuetTextField(lastName, { lastName = it }, "Last name")
                    DuetTextField(birthday, { birthday = it }, "Birthday YYYY-MM-DD")
                    DuetButton("Save profile", modifier = Modifier.fillMaxWidth(), onClick = { actions.updateDetails(firstName, lastName, birthday) })
                }
            }
        }
        if (snapshot?.auth?.hasPassword == false) {
            item {
                CardPanel {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Email login", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
                        DuetTextField(setupEmail, { setupEmail = it }, "Email")
                        DuetTextField(setupPassword, { setupPassword = it }, "Password", visualTransformation = PasswordVisualTransformation())
                        DuetButton("Setup password", modifier = Modifier.fillMaxWidth(), enabled = setupEmail.isNotBlank() && setupPassword.length >= 6, onClick = { actions.setupPassword(setupEmail, setupPassword) })
                    }
                }
            }
        }
        item {
            CardPanel {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Partner connection", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
                    Text("Your code: ${snapshot?.profile?.user?.coupleCode ?: "-"}", color = duetColors().gold)
                    if (snapshot?.profile?.hasPartnerConnection == true) {
                        DuetButton("Unlink partner", modifier = Modifier.fillMaxWidth(), variant = DuetButtonVariant.Outline, onClick = actions::unbindCouple)
                    } else {
                        DuetTextField(bindCode, { bindCode = it }, "Partner code")
                        DuetButton("Connect partner", modifier = Modifier.fillMaxWidth(), onClick = { actions.bindCouple(bindCode) })
                    }
                }
            }
        }
        item {
            CardPanel {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Analytics preferences", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
                    DuetSegmentedControl(listOf("MONDAY" to "Monday", "SUNDAY" to "Sunday"), weekStartsOn, onSelect = { weekStartsOn = it })
                    DuetButton("Save preferences", modifier = Modifier.fillMaxWidth(), onClick = { actions.saveProfilePreferences(weekStartsOn) })
                }
            }
        }
        if (snapshot != null) {
            item {
                CardPanel {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Category preferences", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
                        DuetChoiceChip("Show shared categories", showShared, onClick = { showShared = !showShared })
                        val incomeOptions = snapshot.categoryOptions("INCOME")
                        val expenseOptions = snapshot.categoryOptions("EXPENSE")
                        DuetSelectSheet("Default income", defaultIncomeId, listOf("" to "No default") + incomeOptions.map { it.id to it.label }, onSelect = { defaultIncomeId = it })
                        DuetSelectSheet("Default expense", defaultExpenseId, listOf("" to "No default") + expenseOptions.map { it.id to it.label }, onSelect = { defaultExpenseId = it })
                        DuetButton("Save category preferences", modifier = Modifier.fillMaxWidth(), onClick = { actions.saveCategoryPreferences(showShared, defaultIncomeId, defaultExpenseId) })
                    }
                }
            }
        }
        item {
            CardPanel {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Categories", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
                    SegmentRow(listOf("EXPENSE" to "Expense", "INCOME" to "Income"), categoryKind) { categoryKind = it }
                    SegmentRow(
                        if (snapshot?.profile?.hasPartnerConnection == true) listOf("PERSONAL" to "Personal", "SHARED" to "Shared") else listOf("PERSONAL" to "Personal"),
                        categoryScope
                    ) { categoryScope = it }
                    DuetTextField(categoryName, { categoryName = it }, "New category")
                    DuetButton("Add category", modifier = Modifier.fillMaxWidth(), onClick = {
                        actions.createCategory(categoryKind, categoryScope, categoryName, null)
                        categoryName = ""
                    })
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
            DuetButton("Log out", modifier = Modifier.fillMaxWidth(), variant = DuetButtonVariant.Outline, onClick = actions::logout)
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

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = duetColors().surface,
        contentColor = duetColors().ink
    ) {
        Column(
            modifier = Modifier
                .navigationBarsPadding()
                .imePadding()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
            DuetKindToggle(selected = kind, onSelect = {
                kind = it
                categoryId = snapshot.categoryOptions(kind).firstOrNull()?.id.orEmpty()
            })
            DuetTextField(
                value = amount,
                onValueChange = { amount = it },
                label = "Amount",
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
            )
            CurrencyDropdownLike("Currency", currency, preferredCurrencies, Modifier.fillMaxWidth()) { currency = it }
            CategoryDropdownLike("Category", categoryId, options, Modifier.fillMaxWidth()) { categoryId = it }
            DuetTextField(value = note, onValueChange = { note = it }, label = "Note", singleLine = false)
            DuetButton(
                text = "Save transaction",
                modifier = Modifier.fillMaxWidth(),
                enabled = amount.toDoubleOrNull() != null && categoryId.isNotBlank(),
                onClick = { onSave(amount.toDoubleOrNull() ?: 0.0, kind, currency, categoryId, note) }
            )
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
    val colors = duetColors()
    Column(verticalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.padding(top = 12.dp, bottom = 8.dp)) {
        Text("DUET", fontWeight = FontWeight.Light, letterSpacing = 6.sp, style = MaterialTheme.typography.headlineSmall, color = colors.ink)
        Text(eyebrow.uppercase(), color = colors.gold, style = MaterialTheme.typography.labelSmall, letterSpacing = 2.sp)
        Text(title, style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Light, color = colors.ink)
    }
}

@Composable
internal fun TopLine(
    title: String,
    subtitle: String,
    actions: DuetViewModel,
    current: DuetDestination,
    onNavigate: (DuetDestination) -> Unit
) {
    val colors = duetColors()
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            IconButton(onClick = { onNavigate(DuetDestination.Settings) }) {
                Icon(Icons.Default.Settings, contentDescription = "Settings", tint = colors.inkSoft)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.headlineSmall, color = colors.ink)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = colors.inkSoft)
            }
            IconButton(onClick = { actions.refreshAll() }) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = colors.inkSoft)
            }
        }
        WorkspaceActionStrip(current = current, onNavigate = onNavigate)
    }
}

@Composable
internal fun WorkspaceActionStrip(current: DuetDestination, onNavigate: (DuetDestination) -> Unit) {
    val goodsRoutes = listOf(
        DuetDestination.Goods to "My Goods",
        DuetDestination.GoodsAdvisor to "Advisor",
        DuetDestination.GoodsStock to "Stock",
        DuetDestination.GoodsSetup to "Setup"
    )
    val financeRoutes = listOf(
        DuetDestination.AddTransaction to "Transactions",
        DuetDestination.Dashboard to "Dashboard",
        DuetDestination.Trends to "Trends",
        DuetDestination.Rates to "Rates"
    )
    val routes = if (current in listOf(DuetDestination.Goods, DuetDestination.GoodsAdvisor, DuetDestination.GoodsStock, DuetDestination.GoodsSetup)) goodsRoutes else financeRoutes
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        routes.forEach { (destination, label) ->
            DuetChoiceChip(label = label, selected = current == destination, onClick = { onNavigate(destination) })
        }
    }
}

@Composable
private fun CardPanel(content: @Composable ColumnScope.() -> Unit) {
    com.duet.android.ui.components.DuetCard(content = content)
}

@Composable
private fun StatusBanner(state: DuetUiState) {
    val message = state.error ?: state.message
    if (message != null) {
        DuetStatusBanner(message = message, isError = state.error != null)
    }
}

@Composable
private fun LoadingPanel(text: String) {
    CardPanel {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = duetColors().gold)
            Text(text)
        }
    }
}

@Composable
private fun BalanceCard(snapshot: ProfileSnapshotResponse) {
    val colors = duetColors()
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { contentDescription = "Current balance card" },
        colors = CardDefaults.cardColors(containerColor = colors.phoneSummary),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(snapshot.profile.activeCouple?.name ?: "Personal workspace", color = colors.phoneSummarySoft, style = MaterialTheme.typography.bodySmall)
            Text(CurrencyUtils.formatAmount(snapshot.summary.balance, snapshot.summary.currency), color = colors.phoneSummaryText, style = MaterialTheme.typography.displaySmall)
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
    val colors = duetColors()
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        items.forEach { (label, value) ->
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (dark) colors.phoneSummaryText.copy(alpha = 0.08f) else colors.surface.copy(alpha = 0.8f))
                    .padding(12.dp)
            ) {
                Text(label, color = if (dark) colors.phoneSummarySoft else colors.inkSoft, style = MaterialTheme.typography.labelSmall)
                Text(value, color = if (dark) colors.phoneSummaryText else colors.ink, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
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
        Text(title, style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
        Spacer(Modifier.height(8.dp))
        if (items.isEmpty()) {
            Text("No transactions yet.", color = duetColors().inkSoft)
        } else {
            items.forEachIndexed { index, item ->
                TransactionRow(item, onEdit, onDelete)
                if (index != items.lastIndex) HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = duetColors().gold.copy(alpha = 0.14f))
            }
        }
    }
}

@Composable
private fun TransactionRow(item: TransactionListItem, onEdit: (String) -> Unit, onDelete: (String) -> Unit) {
    val colors = duetColors()
    DuetDetailBox {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.weight(1f)) {
            Text(item.category.name, style = MaterialTheme.typography.titleMedium)
            Text(listOfNotNull(item.note, item.happenedAt.take(10), item.user.firstName ?: item.user.username).joinToString(" / "), color = colors.inkSoft, style = MaterialTheme.typography.bodySmall)
        }
        Text(
            CurrencyUtils.formatAmount(item.amount, item.currency),
            color = if (item.kind == "INCOME") colors.positive else colors.negative,
            fontWeight = FontWeight.SemiBold
        )
        IconButton(onClick = { onEdit(item.id) }) { Icon(Icons.Default.Edit, contentDescription = "Edit transaction", tint = colors.inkSoft) }
        IconButton(onClick = { onDelete(item.id) }) { Icon(Icons.Default.Delete, contentDescription = "Delete transaction", tint = colors.negative) }
        }
    }
}

@Composable
private fun RateRow(currency: String, label: String, rate: Double) {
    val colors = duetColors()
    CardPanel {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(currency, color = colors.gold, fontWeight = FontWeight.SemiBold)
                Text(label, color = colors.inkSoft, style = MaterialTheme.typography.bodySmall)
            }
            Text("1 $currency = ${CurrencyUtils.formatAmount(rate, "UZS")}", fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun CategoryManagementRow(category: CategoryTreeNode, actions: DuetViewModel) {
    val colors = duetColors()
    CardPanel {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(category.name, style = MaterialTheme.typography.titleMedium)
                Text("${category.kind.lowercase()} / ${category.scope.lowercase()}${if (!category.isVisible) " / hidden" else ""}", color = colors.inkSoft, style = MaterialTheme.typography.bodySmall)
            }
            TextButton(
                onClick = { actions.updateCategoryVisibility(category.id, !category.isVisible) },
                colors = ButtonDefaults.textButtonColors(contentColor = colors.gold)
            ) {
                Text(if (category.isVisible) "Hide" else "Show")
            }
            IconButton(onClick = { actions.deleteCategory(category.id) }) {
                Icon(Icons.Default.Delete, contentDescription = "Delete category", tint = colors.negative)
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SegmentRow(options: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit) {
    DuetSegmentedControl(options = options, selected = selected, onSelect = onSelect)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CurrencyDropdownLike(label: String, value: String, options: List<String>, modifier: Modifier = Modifier, onChange: (String) -> Unit) {
    DuetSelectSheet(
        label = label,
        value = value,
        options = options.map { it to it },
        modifier = modifier,
        onSelect = onChange
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CategoryDropdownLike(label: String, value: String, options: List<CategoryOption>, modifier: Modifier = Modifier, onChange: (String) -> Unit) {
    DuetSelectSheetOptions(
        label = label,
        value = value,
        options = options.map { DuetSelectOption(value = it.id, label = it.label, group = if (it.scope == "SHARED") "Shared categories" else "My categories") },
        modifier = modifier,
        onSelect = onChange
    )
}

@Composable
private fun GoodsFilterCard(state: DuetUiState, actions: DuetViewModel, snapshot: GoodsSnapshotResponse) {
    CardPanel {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Filters", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
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
    val colors = duetColors()
    CardPanel {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(item.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(listOfNotNull(item.place?.name, item.category?.name, item.expirationStatus.replace("_", " ")).joinToString(" / "), color = colors.inkSoft, style = MaterialTheme.typography.bodySmall)
                if (!item.note.isNullOrBlank()) {
                    Text(item.note, color = colors.inkSoft, style = MaterialTheme.typography.bodySmall)
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("${item.effectiveQuantity} ${item.uom?.code.orEmpty()}", fontWeight = FontWeight.SemiBold)
                Text(item.stockStatus.replace("_", " "), color = if (item.stockStatus == "LOW" || item.stockStatus == "OUT_OF_STOCK") colors.negative else colors.positive, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun GoodsOverviewHighlights(snapshot: GoodsSnapshotResponse) {
    CardPanel {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Needs attention now", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
            if (snapshot.highlights.attentionItems.isEmpty()) {
                Text("No urgent goods right now.", color = duetColors().inkSoft)
            } else {
                snapshot.highlights.attentionItems.take(4).forEach { item ->
                    DuetDetailBox {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.name, fontWeight = FontWeight.SemiBold)
                                Text(listOfNotNull(item.place?.name, item.category?.name).joinToString(" / "), color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
                            }
                            Text("${item.effectiveQuantity} ${item.uom?.code.orEmpty()}", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
            Text("Run out soon", style = MaterialTheme.typography.titleMedium, color = duetColors().ink)
            if (snapshot.highlights.runOutSoon.isEmpty()) {
                Text("No projected run-outs yet.", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            } else {
                snapshot.highlights.runOutSoon.take(3).forEach { item ->
                    Text("${item.name}: ${item.estimatedRunOutAt?.take(10) ?: "Not estimated"}", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
                }
            }
            Text("By place", style = MaterialTheme.typography.titleMedium, color = duetColors().ink)
            snapshot.breakdown.byPlace.take(4).forEach { item ->
                Text("${item.name}: ${item.itemCount} items / Low ${item.lowCount} / Out ${item.outCount}", color = duetColors().inkSoft, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun PendingMutationsCard(title: String, items: List<PendingMutationPreview>) {
    val colors = duetColors()
    CardPanel {
        Text(title, style = MaterialTheme.typography.titleLarge, color = colors.ink)
        Spacer(Modifier.height(8.dp))
        items.forEachIndexed { index, item ->
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(item.title, fontWeight = FontWeight.SemiBold)
                    Text(item.subtitle, color = colors.inkSoft, style = MaterialTheme.typography.bodySmall)
                    if (!item.lastError.isNullOrBlank()) {
                        Text(item.lastError, color = colors.negative, style = MaterialTheme.typography.bodySmall)
                    }
                }
                Text("Pending", color = colors.gold, style = MaterialTheme.typography.labelSmall)
            }
            if (index != items.lastIndex) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = colors.gold.copy(alpha = 0.14f))
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

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = duetColors().surface,
        contentColor = duetColors().ink
    ) {
        Column(
            modifier = Modifier
                .navigationBarsPadding()
                .imePadding()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Add goods item", style = MaterialTheme.typography.titleLarge, color = duetColors().ink)
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
