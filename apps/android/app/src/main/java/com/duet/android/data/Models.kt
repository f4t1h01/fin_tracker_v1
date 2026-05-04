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
data class ThemePreferenceResponse(val isDark: Boolean)
data class DashboardRatesUpdateRequest(val selectedCurrencies: List<String>)
data class BindCoupleRequest(val code: String)
data class UpdateProfileDetailsRequest(val firstName: String? = null, val lastName: String? = null, val birthday: String? = null)
data class UpdateProfilePreferencesRequest(val weekStartsOn: String)
data class PasswordSetupRequest(val email: String, val password: String)
data class CategoryPreferencesRequest(
    val showSharedCategories: Boolean,
    val defaultIncomeCategoryId: String? = null,
    val defaultExpenseCategoryId: String? = null
)

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
    val currency: String = "UZS",
    val clientMutationId: String? = null
)

data class UpdateTransactionRequest(
    val amount: Double,
    val kind: String,
    val categoryId: String,
    val categoryName: String? = null,
    val note: String? = null,
    val currency: String = "UZS"
)

data class AiTransactionDraftResponse(
    val draft: AiTransactionDraft,
    val transcript: String? = null,
    val extractedText: String? = null,
    val receiptMode: String? = null,
    val productNames: List<String> = emptyList(),
    val qualityRating: String? = null,
    val qualityIssues: List<String> = emptyList(),
    val documentType: String? = null,
    val extractionSource: String? = null,
    val qrUrl: String? = null,
    val qrProvider: String? = null,
    val qrWarnings: List<String> = emptyList()
)

data class AiTransactionDraft(
    val kind: String? = null,
    val amount: Double? = null,
    val currency: String? = null,
    val categoryId: String? = null,
    val categoryNameCandidate: String? = null,
    val note: String? = null,
    val confidence: Double = 0.0,
    val missingFields: List<String> = emptyList(),
    val warnings: List<String> = emptyList()
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

data class GoodsCatalogPlace(
    val id: String,
    val scope: String,
    val name: String,
    val sortOrder: Int = 0,
    val isVisible: Boolean = true
)

data class GoodsCatalogCategory(
    val id: String,
    val scope: String,
    val name: String,
    val sortOrder: Int = 0,
    val isVisible: Boolean = true,
    val isSeeded: Boolean = false
)

data class GoodsUom(
    val id: String,
    val code: String,
    val label: String,
    val groupKey: String = "OTHER",
    val decimals: Int = 0,
    val isActive: Boolean = true
)

data class GoodsItemRef(
    val id: String,
    val name: String,
    val scope: String,
    val isVisible: Boolean = true
)

data class GoodsItem(
    val id: String,
    val scope: String,
    val name: String,
    val note: String? = null,
    val place: GoodsItemRef? = null,
    val category: GoodsItemRef? = null,
    val uom: GoodsUom? = null,
    val quantityBase: Double = 0.0,
    val effectiveQuantity: Double = 0.0,
    val lowStockThreshold: Double = 0.0,
    val targetQuantity: Double = 0.0,
    val consumptionRateValue: Double? = null,
    val consumptionRateUnit: String = "PERMANENT",
    val consumptionRatePerHour: Double? = null,
    val consumptionStartedAt: String? = null,
    val expirationDate: String? = null,
    val expirationStatus: String = "NO_EXPIRATION",
    val daysUntilExpiry: Int? = null,
    val stockStatus: String = "ENOUGH",
    val estimatedRunOutAt: String? = null,
    val isArchived: Boolean = false,
    val lastStockEventAt: String = "",
    val lastManualEventAt: String? = null,
    val updatedAt: String = ""
)

data class GoodsEvent(
    val id: String,
    val eventType: String,
    val quantityDelta: Double = 0.0,
    val quantityAfter: Double = 0.0,
    val occurredAt: String,
    val source: String,
    val reason: String? = null,
    val item: GoodsEventItem? = null
)

data class GoodsEventItem(val id: String, val name: String)

data class GoodsSnapshotResponse(
    val workspace: GoodsWorkspace,
    val metrics: GoodsMetrics,
    val highlights: GoodsHighlights,
    val breakdown: GoodsBreakdown,
    val catalog: GoodsCatalog
)

data class GoodsWorkspace(val coupleId: String, val name: String, val hasPartnerConnection: Boolean)
data class GoodsMetrics(
    val activeItems: Int = 0,
    val lowStockItems: Int = 0,
    val outOfStockItems: Int = 0,
    val expiringSoonItems: Int = 0,
    val expiredItems: Int = 0,
    val recentlyUpdatedItems: Int = 0
)

data class GoodsHighlights(
    val attentionItems: List<GoodsItem> = emptyList(),
    val runOutSoon: List<GoodsItem> = emptyList(),
    val recentChanges: List<GoodsEvent> = emptyList()
)

data class GoodsBreakdown(
    val byPlace: List<GoodsBreakdownPlace> = emptyList(),
    val byCategory: List<GoodsBreakdownCategory> = emptyList()
)

data class GoodsBreakdownPlace(
    val id: String,
    val scope: String,
    val name: String,
    val sortOrder: Int = 0,
    val isVisible: Boolean = true,
    val itemCount: Int = 0,
    val lowCount: Int = 0,
    val outCount: Int = 0,
    val expiringCount: Int = 0
)

data class GoodsBreakdownCategory(
    val id: String,
    val scope: String,
    val name: String,
    val sortOrder: Int = 0,
    val isVisible: Boolean = true,
    val isSeeded: Boolean = false,
    val itemCount: Int = 0,
    val lowCount: Int = 0,
    val outCount: Int = 0,
    val expiringCount: Int = 0
)

data class GoodsCatalog(
    val places: List<GoodsCatalogPlace> = emptyList(),
    val categories: List<GoodsCatalogCategory> = emptyList(),
    val uoms: List<GoodsUom> = emptyList()
)

data class GoodsListResponse(
    val items: List<GoodsItem> = emptyList(),
    val page: Int = 1,
    val pageSize: Int = 20,
    val totalItems: Int = 0,
    val totalPages: Int = 1
)

data class GoodsListQuery(
    val placeId: String = "",
    val categoryId: String = "",
    val scope: String = "",
    val stockStatus: String = "",
    val expirationStatus: String = "",
    val lowOnly: Boolean = false,
    val recentlyUpdatedOnly: Boolean = false,
    val autoConsumptionOnly: Boolean = false,
    val search: String = "",
    val sort: String = "RECENTLY_UPDATED",
    val page: Int = 1,
    val pageSize: Int = 20
)

data class CreateGoodsItemRequest(
    val scope: String,
    val placeId: String,
    val categoryId: String,
    val uomId: String,
    val name: String,
    val quantity: Double,
    val lowStockThreshold: Double? = null,
    val targetQuantity: Double? = null,
    val note: String? = null,
    val expirationDate: String? = null,
    val consumptionRateValue: Double? = null,
    val consumptionRateUnit: String? = null,
    val clientMutationId: String? = null
)

data class PendingMutationPreview(
    val clientMutationId: String,
    val type: String,
    val title: String,
    val subtitle: String,
    val createdAt: Long,
    val lastError: String? = null
)

data class GoodsManagePlacesResponse(val items: List<GoodsBreakdownPlace> = emptyList())
data class GoodsManageCategoriesResponse(val items: List<GoodsBreakdownCategory> = emptyList())
data class GoodsCreateNameRequest(val scope: String, val name: String)
data class UpdateVisibilityRequest(val isVisible: Boolean)
data class GoodsQuantityMutationRequest(val quantity: Double, val reason: String? = null)
data class GoodsMoveItemRequest(val placeId: String, val categoryId: String, val reason: String? = null)
data class GoodsUpdateItemRequest(
    val name: String? = null,
    val note: String? = null,
    val lowStockThreshold: Double? = null,
    val targetQuantity: Double? = null,
    val expirationDate: String? = null,
    val consumptionRateValue: Double? = null,
    val consumptionRateUnit: String? = null
)
data class GoodsHistoryResponse(val items: List<GoodsEvent> = emptyList())

data class GoodsAdvisorThreadsResponse(val items: List<GoodsAdvisorThreadSummary> = emptyList())
data class GoodsAdvisorCreateThreadRequest(val scope: String)
data class GoodsAdvisorUpdateThreadRequest(
    val title: String? = null,
    val isPinned: Boolean? = null,
    val scope: String? = null
)
data class GoodsAdvisorSendMessageRequest(val message: String)
data class GoodsAdvisorSendMessageResponse(
    val thread: GoodsAdvisorThreadSummary,
    val userMessage: GoodsAdvisorMessage,
    val assistantMessage: GoodsAdvisorMessage
)
data class GoodsAdvisorThreadDetailResponse(
    val thread: GoodsAdvisorThreadSummary,
    val summaryText: String? = null,
    val messages: List<GoodsAdvisorMessage> = emptyList()
)
data class GoodsAdvisorThreadSummary(
    val id: String,
    val title: String,
    val scope: String = "AUTO",
    val isPinned: Boolean = false,
    val lastActivityAt: String = "",
    val expiresAt: String? = null
)
data class GoodsAdvisorMessage(
    val id: String,
    val role: String,
    val text: String,
    val createdAt: String = "",
    val payload: GoodsAdvisorPayload? = null
)
data class GoodsAdvisorPayload(
    val mode: String? = null,
    val warnings: List<String> = emptyList(),
    val pantryMeals: List<GoodsDinnerRecipeSuggestion> = emptyList(),
    val minimalBuyMeal: GoodsDinnerRecipeSuggestion? = null
)
data class GoodsDinnerRecipeSuggestion(
    val title: String,
    val whyItFits: String = "",
    val usesItems: List<String> = emptyList(),
    val missingItems: List<String> = emptyList(),
    val wasteReductionNotes: List<String> = emptyList(),
    val steps: List<String> = emptyList(),
    val recipePreview: GoodsRecipePreview? = null
)
data class GoodsRecipePreview(val label: String, val url: String)
