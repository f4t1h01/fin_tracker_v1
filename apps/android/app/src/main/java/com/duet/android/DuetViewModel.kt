package com.duet.android

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.duet.android.data.CategoryOption
import com.duet.android.data.CurrencyUtils
import com.duet.android.data.DashboardQuery
import com.duet.android.data.DashboardRatesResponse
import com.duet.android.data.DashboardResponse
import com.duet.android.data.DuetPreferencesStore
import com.duet.android.data.DuetRepository
import com.duet.android.data.EditableTransaction
import com.duet.android.data.NetworkModule
import com.duet.android.data.ProfileSnapshotResponse
import com.duet.android.data.SecureTokenStore
import com.duet.android.data.TOKEN_INVALID_MESSAGE
import com.duet.android.data.TOKEN_MISSING_MESSAGE
import com.duet.android.data.CreateTransactionRequest
import com.duet.android.data.CreateGoodsItemRequest
import com.duet.android.data.UpdateTransactionRequest
import com.duet.android.data.GoodsItem
import com.duet.android.data.GoodsListQuery
import com.duet.android.data.GoodsListResponse
import com.duet.android.data.GoodsSnapshotResponse
import com.duet.android.data.NetworkMonitor
import com.duet.android.data.PendingMutationPreview
import com.duet.android.data.local.DuetLocalDatabase
import com.duet.android.data.toUserMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DuetUiState(
    val isBootstrapping: Boolean = true,
    val token: String? = null,
    val isDark: Boolean = false,
    val isBusy: Boolean = false,
    val message: String? = null,
    val error: String? = null,
    val snapshot: ProfileSnapshotResponse? = null,
    val dashboard: DashboardResponse? = null,
    val rates: DashboardRatesResponse? = null,
    val goodsSnapshot: GoodsSnapshotResponse? = null,
    val goodsList: GoodsListResponse? = null,
    val goodsQuery: GoodsListQuery = GoodsListQuery(),
    val pendingMutations: List<PendingMutationPreview> = emptyList(),
    val dashboardQuery: DashboardQuery = DashboardQuery(),
    val editingTransaction: EditableTransaction? = null
)

class DuetViewModel(application: Application) : AndroidViewModel(application) {
    private val tokenStore = SecureTokenStore(application.applicationContext)
    private val moshi = NetworkModule.createMoshi()
    private lateinit var repository: DuetRepository

    private val _uiState = MutableStateFlow(DuetUiState())
    val uiState: StateFlow<DuetUiState> = _uiState.asStateFlow()

    init {
        val api = NetworkModule.createApi { repositoryToken() }
        repository = DuetRepository(
            api = api,
            tokenStore = tokenStore,
            preferencesStore = DuetPreferencesStore(application.applicationContext, moshi),
            context = application.applicationContext,
            database = DuetLocalDatabase.get(application.applicationContext),
            moshi = moshi,
            networkMonitor = NetworkMonitor(application.applicationContext)
        )
        viewModelScope.launch {
            repository.observePendingMutations().collect { pending ->
                _uiState.update { it.copy(pendingMutations = pending) }
            }
        }
        boot()
    }

    private fun repositoryToken(): String? = repositoryOrNull?.accessToken ?: tokenStore.readToken()

    private val repositoryOrNull: DuetRepository?
        get() = if (::repository.isInitialized) repository else null

    private fun boot() {
        viewModelScope.launch {
            val cache = repository.bootCache()
            _uiState.update {
                it.copy(
                    isBootstrapping = false,
                    token = cache.token,
                    isDark = cache.isDark ?: cache.snapshot?.auth?.isDark ?: false,
                    snapshot = cache.snapshot,
                    dashboard = cache.dashboard,
                    rates = cache.rates,
                    goodsSnapshot = cache.goodsSnapshot,
                    goodsList = cache.goodsList
                )
            }
            if (cache.token != null) {
                refreshAll(silent = true)
            }
        }
    }

    fun signIn(email: String, password: String) {
        launchBusy {
            val response = repository.login(email, password)
            _uiState.update { it.copy(token = response.accessToken, isDark = response.user.isDark, message = "Signed in") }
            refreshAll(silent = true)
        }
    }

    fun register(email: String, password: String, firstName: String?) {
        launchBusy {
            val response = repository.register(email, password, firstName)
            _uiState.update { it.copy(token = response.accessToken, isDark = response.user.isDark, message = "Account created") }
            refreshAll(silent = true)
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.clearSession()
            _uiState.value = DuetUiState(isBootstrapping = false, message = "Signed out")
        }
    }

    fun refreshAll(silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) _uiState.update { it.copy(isBusy = true, error = null, message = null) }
            try {
                val snapshot = repository.refreshSnapshot()
                val currentQuery = _uiState.value.dashboardQuery.copy(
                    viewMode = if (snapshot.profile.hasPartnerConnection) _uiState.value.dashboardQuery.viewMode else "PERSONAL"
                )
                val query = currentQuery.takeUnless {
                    (it.selectedPreset == "CUSTOM" && (it.draftFrom.isBlank() || it.draftTo.isBlank())) ||
                        (it.selectedPreset == "SPECIFIC_MONTH" && it.draftMonthKey.isBlank())
                } ?: currentQuery.copy(selectedPreset = "THIS_WEEK", draftFrom = "", draftTo = "", draftMonthKey = "", page = 1)
                val dashboard = repository.loadDashboard(query)
                val rates = repository.loadRates()
                val goodsSnapshot = runCatching { repository.loadGoodsSnapshot() }.getOrElse { _uiState.value.goodsSnapshot }
                val goodsList = runCatching { repository.loadGoodsList(_uiState.value.goodsQuery) }.getOrElse { _uiState.value.goodsList }
                _uiState.update {
                    it.copy(
                        isBusy = false,
                        token = repository.accessToken,
                        isDark = snapshot.auth.isDark,
                        snapshot = snapshot,
                        dashboard = dashboard,
                        rates = rates,
                        goodsSnapshot = goodsSnapshot,
                        goodsList = goodsList,
                        dashboardQuery = query,
                        error = null
                    )
                }
            } catch (error: Throwable) {
                handleError(error)
            }
        }
    }

    fun updateDashboardQuery(transform: (DashboardQuery) -> DashboardQuery) {
        val next = transform(_uiState.value.dashboardQuery)
        _uiState.update { it.copy(dashboardQuery = next) }
        loadDashboard()
    }

    fun loadDashboard() {
        val query = _uiState.value.dashboardQuery
        if (query.selectedPreset == "CUSTOM" && (query.draftFrom.isBlank() || query.draftTo.isBlank())) {
            return
        }
        if (query.selectedPreset == "SPECIFIC_MONTH" && query.draftMonthKey.isBlank()) {
            return
        }
        launchBusy {
            val dashboard = repository.loadDashboard(_uiState.value.dashboardQuery)
            _uiState.update { it.copy(dashboard = dashboard) }
        }
    }

    fun saveRatesSelection(selectedCurrencies: List<String>) {
        launchBusy {
            val rates = repository.saveRatesSelection(selectedCurrencies)
            _uiState.update { it.copy(rates = rates, message = "Rate selection saved") }
            refreshAll(silent = true)
        }
    }

    fun createTransaction(amount: Double, kind: String, currency: String, categoryId: String, note: String?) {
        launchBusy {
            val synced = repository.createTransaction(
                CreateTransactionRequest(
                    amount = amount,
                    kind = kind,
                    categoryId = categoryId,
                    note = note?.trim()?.ifBlank { null },
                    currency = currency
                )
            )
            _uiState.update { it.copy(message = if (synced) "Transaction saved" else "Saved offline. It will sync when internet returns.") }
            if (synced) {
                refreshAll(silent = true)
            }
        }
    }

    fun startEditing(itemId: String) {
        val item = _uiState.value.dashboard?.transactions?.items?.firstOrNull { it.id == itemId }
            ?: _uiState.value.snapshot?.recent?.firstOrNull { it.id == itemId }
            ?: return
        _uiState.update {
            it.copy(
                editingTransaction = EditableTransaction(
                    id = item.id,
                    amount = item.amount.toString(),
                    kind = item.kind,
                    currency = item.currency,
                    categoryId = item.category.id,
                    categoryName = item.category.name,
                    note = item.note.orEmpty()
                )
            )
        }
    }

    fun stopEditing() {
        _uiState.update { it.copy(editingTransaction = null) }
    }

    fun updateTransaction(edit: EditableTransaction) {
        val amount = edit.amount.toDoubleOrNull() ?: run {
            _uiState.update { it.copy(error = "Enter a valid amount") }
            return
        }
        launchBusy {
            repository.updateTransaction(
                edit.id,
                UpdateTransactionRequest(
                    amount = amount,
                    kind = edit.kind,
                    categoryId = edit.categoryId,
                    categoryName = edit.categoryName,
                    note = edit.note.trim().ifBlank { null },
                    currency = edit.currency
                )
            )
            _uiState.update { it.copy(editingTransaction = null, message = "Transaction updated") }
            refreshAll(silent = true)
        }
    }

    fun deleteTransaction(id: String) {
        launchBusy {
            repository.deleteTransaction(id)
            _uiState.update { it.copy(message = "Transaction deleted") }
            refreshAll(silent = true)
        }
    }

    fun setTheme(isDark: Boolean) {
        _uiState.update { it.copy(isDark = isDark) }
        viewModelScope.launch {
            runCatching { repository.setThemePreference(isDark) }
                .onFailure { _uiState.update { state -> state.copy(error = it.toUserMessage(moshi)) } }
        }
    }

    fun updateDetails(firstName: String, lastName: String, birthday: String) {
        launchBusy {
            repository.updateDetails(firstName, lastName, birthday)
            _uiState.update { it.copy(message = "Profile details saved") }
            refreshAll(silent = true)
        }
    }

    fun bindCouple(code: String) {
        launchBusy {
            repository.bindCouple(code)
            _uiState.update { it.copy(message = "Partner code connected") }
            refreshAll(silent = true)
        }
    }

    fun unbindCouple() {
        launchBusy {
            repository.unbindCouple()
            _uiState.update { it.copy(message = "Partner connection removed") }
            refreshAll(silent = true)
        }
    }

    fun createCategory(kind: String, scope: String, name: String, parentCategoryId: String?) {
        launchBusy {
            repository.createCategory(kind, scope, name, parentCategoryId)
            _uiState.update { it.copy(message = "Category created") }
            refreshAll(silent = true)
        }
    }

    fun updateCategoryVisibility(id: String, isVisible: Boolean) {
        launchBusy {
            repository.updateCategoryVisibility(id, isVisible)
            _uiState.update { it.copy(message = if (isVisible) "Category shown" else "Category hidden") }
            refreshAll(silent = true)
        }
    }

    fun deleteCategory(id: String) {
        launchBusy {
            repository.deleteCategory(id)
            _uiState.update { it.copy(message = "Category deleted") }
            refreshAll(silent = true)
        }
    }

    fun loadGoods() {
        launchBusy {
            val snapshot = repository.loadGoodsSnapshot()
            val list = repository.loadGoodsList(_uiState.value.goodsQuery)
            _uiState.update { it.copy(goodsSnapshot = snapshot, goodsList = list) }
        }
    }

    fun updateGoodsQuery(transform: (GoodsListQuery) -> GoodsListQuery) {
        val next = transform(_uiState.value.goodsQuery)
        _uiState.update { it.copy(goodsQuery = next) }
        loadGoodsList()
    }

    fun loadGoodsList() {
        launchBusy {
            val list = repository.loadGoodsList(_uiState.value.goodsQuery)
            _uiState.update { it.copy(goodsList = list) }
        }
    }

    fun createGoodsItem(request: CreateGoodsItemRequest) {
        launchBusy {
            val synced = repository.createGoodsItem(request)
            _uiState.update { it.copy(message = if (synced) "Goods item saved" else "Goods item saved offline. It will sync when internet returns.") }
            if (synced) {
                val snapshot = repository.loadGoodsSnapshot()
                val list = repository.loadGoodsList(_uiState.value.goodsQuery)
                _uiState.update { it.copy(goodsSnapshot = snapshot, goodsList = list) }
            }
        }
    }

    fun clearMessage() {
        _uiState.update { it.copy(message = null, error = null) }
    }

    private fun launchBusy(block: suspend () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, error = null, message = null) }
            try {
                block()
                _uiState.update { it.copy(isBusy = false) }
            } catch (error: Throwable) {
                handleError(error)
            }
        }
    }

    private suspend fun handleError(error: Throwable) {
        val message = error.toUserMessage(moshi)
        if (message == TOKEN_INVALID_MESSAGE || message == TOKEN_MISSING_MESSAGE) {
            repository.clearSession()
            _uiState.value = DuetUiState(isBootstrapping = false, error = message)
            return
        }
        _uiState.update { it.copy(isBusy = false, error = message) }
    }
}

fun ProfileSnapshotResponse.categoryOptions(kind: String): List<CategoryOption> {
    val group = categories.byKind[kind] ?: return emptyList()
    return (group.personal + group.shared).flatMap { parent ->
        buildList {
            add(CategoryOption(parent.id, parent.name, parent.kind, parent.scope, parent.isVisible))
            parent.children.forEach { child ->
                add(CategoryOption(child.id, "${parent.name} / ${child.name}", child.kind, child.scope, child.isVisible))
            }
        }
    }.filter { it.isVisible }
}

fun DashboardResponse.displaySummary(currency: String, viewMode: String): Triple<Double, Double, Double> {
    val rate = rates[currency] ?: 1.0
    val income = if (viewMode == "PERSONAL") summary.personalIncome else summary.totalIncome
    val expense = if (viewMode == "PERSONAL") summary.personalExpense else summary.totalExpense
    val balance = if (viewMode == "PERSONAL") summary.personalBalance else summary.balance
    return Triple(
        CurrencyUtils.convertFromUzs(income, rate),
        CurrencyUtils.convertFromUzs(expense, rate),
        CurrencyUtils.convertFromUzs(balance, rate)
    )
}
