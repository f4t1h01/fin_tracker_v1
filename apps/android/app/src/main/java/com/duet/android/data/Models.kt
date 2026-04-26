package com.duet.android.data

const val TOKEN_MISSING_MESSAGE = "Missing bearer token"
const val TOKEN_INVALID_MESSAGE = "Invalid token"

val supportedCurrencies = listOf("UZS", "USD", "EUR", "RUB", "GBP", "JPY", "CNY", "KZT", "TRY", "AED")

val currencyLabels = mapOf(
    "UZS" to "Uzbek so'm",
    "USD" to "US Dollar",
    "EUR" to "Euro",
    "RUB" to "Russian Ruble",
    "GBP" to "British Pound",
    "JPY" to "Japanese Yen",
    "CNY" to "Chinese Yuan",
    "KZT" to "Kazakhstani Tenge",
    "TRY" to "Turkish Lira",
    "AED" to "UAE Dirham"
)

data class ApiErrorPayload(val message: Any? = null)

data class PasswordLoginRequest(val email: String, val password: String)
data class PasswordRegisterRequest(val email: String, val password: String, val firstName: String? = null)
data class ThemePreferenceRequest(val isDark: Boolean)
data class DashboardRatesUpdateRequest(val selectedCurrencies: List<String>)
data class BindCoupleRequest(val code: String)
data class UpdateProfileDetailsRequest(val firstName: String? = null, val lastName: String? = null, val birthday: String? = null)

data class AuthResponse(
    val accessToken: String,
    val user: AuthUser
)

data class AuthUser(
    val id: String,
    val telegramId: String,
    val username: String? = null,
    val firstName: String? = null,
    val lastName: String? = null,
    val isAdmin: Boolean = false,
    val isDark: Boolean = false,
    val coupleCode: String? = null,
    val email: String? = null,
    val hasPassword: Boolean = false
)

data class AuthMeResponse(
    val id: String,
    val telegramId: String,
    val lastTelegramChatId: String? = null,
    val email: String? = null,
    val passwordSetAt: String? = null,
    val hasPassword: Boolean = false,
    val coupleCode: String? = null,
    val username: String? = null,
    val firstName: String? = null,
    val lastName: String? = null,
    val birthday: String? = null,
    val photoUrl: String? = null,
    val telegramPhone: String? = null,
    val isAdmin: Boolean = false,
    val isDark: Boolean = false,
    val showSharedCategories: Boolean = true,
    val weekStartsOn: String = "MONDAY"
)

data class ProfileResponse(
    val user: ProfileUser,
    val activeCouple: ActiveCouple? = null,
    val dashboardRateCurrencies: List<String> = listOf("UZS", "USD"),
    val bind: CoupleBind? = null,
    val hasPartnerConnection: Boolean = false
)

data class ProfileUser(
    val id: String,
    val telegramId: String,
    val username: String? = null,
    val firstName: String? = null,
    val lastName: String? = null,
    val birthday: String? = null,
    val coupleCode: String
)

data class ActiveCouple(val id: String, val name: String, val role: String)
data class CoupleBind(val insertedCode: String, val userCoupleCode: String, val coupleId: String, val updatedAt: String)

data class MonthlySummary(
    val month: Int,
    val year: Int,
    val currency: String = "UZS",
    val totalIncome: Double = 0.0,
    val totalExpense: Double = 0.0,
    val balance: Double = 0.0,
    val personalIncome: Double = 0.0,
    val personalExpense: Double = 0.0,
    val personalBalance: Double = 0.0
)

data class TransactionListItem(
    val id: String,
    val kind: String,
    val amount: Double,
    val amountInUzs: Double,
    val currency: String = "UZS",
    val note: String? = null,
    val happenedAt: String,
    val category: TransactionCategory,
    val user: TransactionUser
)

data class TransactionCategory(val id: String, val name: String, val kind: String? = null)
data class TransactionUser(val firstName: String? = null, val username: String? = null)

data class ProfileSnapshotResponse(
    val profile: ProfileResponse,
    val summary: MonthlySummary,
    val recent: List<TransactionListItem> = emptyList(),
    val auth: AuthMeResponse,
    val categories: CategoryCatalogResponse
)

data class CategoryCatalogResponse(
    val preferences: CategoryPreferences = CategoryPreferences(),
    val byKind: Map<String, CategoryKindGroup> = emptyMap()
)

data class CategoryPreferences(
    val showSharedCategories: Boolean = true,
    val defaultIncomeCategoryId: String? = null,
    val defaultExpenseCategoryId: String? = null
)

data class CategoryKindGroup(
    val personal: List<CategoryTreeNode> = emptyList(),
    val shared: List<CategoryTreeNode> = emptyList()
)

data class CategoryTreeNode(
    val id: String,
    val name: String,
    val kind: String,
    val scope: String,
    val ownerUserId: String? = null,
    val isVisible: Boolean = true,
    val children: List<CategoryChildNode> = emptyList()
)

data class CategoryChildNode(
    val id: String,
    val name: String,
    val kind: String,
    val scope: String,
    val ownerUserId: String? = null,
    val isVisible: Boolean = true
)

data class CategoryOption(
    val id: String,
    val label: String,
    val kind: String,
    val scope: String,
    val isVisible: Boolean
)

data class CreateCategoryRequest(
    val kind: String,
    val scope: String,
    val name: String,
    val parentCategoryId: String? = null
)

data class UpdateCategoryVisibilityRequest(val isVisible: Boolean)

data class CreateTransactionRequest(
    val amount: Double,
    val kind: String,
    val categoryId: String? = null,
    val categoryName: String? = null,
    val note: String? = null,
    val currency: String = "UZS"
)

data class UpdateTransactionRequest(
    val amount: Double,
    val kind: String,
    val categoryId: String,
    val categoryName: String? = null,
    val note: String? = null,
    val currency: String = "UZS"
)

data class DashboardResponse(
    val profile: ProfileResponse,
    val summary: MonthlySummary,
    val recent: List<TransactionListItem> = emptyList(),
    val transactions: DashboardTransactionsPage,
    val rates: Map<String, Double> = emptyMap(),
    val supportedCurrencies: List<String> = com.duet.android.data.supportedCurrencies,
    val filter: DashboardFilterResponse,
    val preferences: DashboardPreferences,
    val availableViews: List<String> = listOf("PERSONAL"),
    val filters: DashboardFilters,
    val charts: DashboardCharts? = null
)

data class DashboardTransactionsPage(
    val items: List<TransactionListItem> = emptyList(),
    val page: Int = 1,
    val pageSize: Int = 20,
    val totalItems: Int = 0,
    val totalPages: Int = 1
)

data class DashboardFilterResponse(
    val preset: String = "THIS_WEEK",
    val viewMode: String = "PERSONAL",
    val kind: String = "ALL",
    val categoryId: String? = null,
    val actor: String = "EVERYONE",
    val search: String = "",
    val timeFrom: String? = null,
    val timeTo: String? = null,
    val monthKey: String? = null,
    val from: String? = null,
    val to: String? = null,
    val appliedFrom: String,
    val appliedTo: String,
    val label: String,
    val page: Int = 1,
    val pageSize: Int = 20
)

data class DashboardPreferences(val weekStartsOn: String = "MONDAY")
data class DashboardFilters(val categories: CategoryCatalogResponse, val weekStartsOn: String = "MONDAY")
data class DashboardCharts(val trend: TrendChart? = null, val breakdown: BreakdownChart? = null)
data class TrendChart(val granularity: String, val items: List<TrendPoint> = emptyList())
data class TrendPoint(val label: String, val start: String, val end: String, val income: Double, val expense: Double, val net: Double)
data class BreakdownChart(val items: List<BreakdownPoint> = emptyList())
data class BreakdownPoint(
    val categoryId: String,
    val categoryName: String,
    val kind: String? = null,
    val totalAmountInUzs: Double? = null,
    val totalExpense: Double? = null,
    val share: Double = 0.0
)

data class DashboardRatesResponse(
    val selectedCurrencies: List<String> = listOf("UZS", "USD"),
    val rates: Map<String, Double> = emptyMap(),
    val supportedCurrencies: List<String> = com.duet.android.data.supportedCurrencies,
    val sourceUrl: String = "",
    val lastUpdatedAt: String = ""
)

data class DashboardQuery(
    val viewMode: String = "PERSONAL",
    val page: Int = 1,
    val pageSize: Int = 20,
    val selectedPreset: String = "THIS_WEEK",
    val draftFrom: String = "",
    val draftTo: String = "",
    val draftMonthKey: String = "",
    val kind: String = "ALL",
    val categoryId: String = "",
    val actor: String = "EVERYONE",
    val search: String = ""
)

data class EditableTransaction(
    val id: String,
    val amount: String,
    val kind: String,
    val currency: String,
    val categoryId: String,
    val categoryName: String,
    val note: String
)
