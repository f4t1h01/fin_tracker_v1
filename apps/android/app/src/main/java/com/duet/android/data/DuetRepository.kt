package com.duet.android.data

import android.content.Context
import android.net.Uri
import com.duet.android.data.local.CachedJsonEntity
import com.duet.android.data.local.DuetLocalDatabase
import com.duet.android.data.local.OUTBOX_STATUS_FAILED
import com.duet.android.data.local.OUTBOX_STATUS_PENDING
import com.duet.android.data.local.OUTBOX_TYPE_GOODS_ITEM_CREATE
import com.duet.android.data.local.OUTBOX_TYPE_TRANSACTION_CREATE
import com.duet.android.data.local.OutboxMutationEntity
import com.duet.android.voice.voiceUploadMetadata
import com.squareup.moshi.Moshi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withTimeout
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.Calendar
import java.util.UUID

class DuetRepository(
    private val context: Context,
    private val api: DuetApi,
    private val tokenStore: SecureTokenStore,
    private val preferencesStore: DuetPreferencesStore,
    private val database: DuetLocalDatabase,
    private val moshi: Moshi,
    private val networkMonitor: NetworkMonitor
) {
    var accessToken: String? = tokenStore.readToken()
        private set

    suspend fun bootCache(): BootCache {
        return BootCache(
            token = accessToken,
            isDark = preferencesStore.readIsDark(),
            snapshot = readCache(CACHE_PROFILE, ProfileSnapshotResponse::class.java) ?: preferencesStore.readProfileSnapshot(),
            dashboard = readCache(CACHE_DASHBOARD, DashboardResponse::class.java) ?: preferencesStore.readDashboard(),
            rates = readCache(CACHE_RATES, DashboardRatesResponse::class.java) ?: preferencesStore.readRates(),
            goodsSnapshot = readCache(CACHE_GOODS_SNAPSHOT, GoodsSnapshotResponse::class.java),
            goodsList = readCache(CACHE_GOODS_LIST, GoodsListResponse::class.java)
        )
    }

    suspend fun login(email: String, password: String): AuthResponse {
        val response = api.login(PasswordLoginRequest(email.trim(), password))
        saveSession(response.accessToken, response.user.isDark)
        return response
    }

    suspend fun register(email: String, password: String, firstName: String?): AuthResponse {
        val response = api.register(PasswordRegisterRequest(email.trim(), password, firstName?.trim()?.ifBlank { null }))
        saveSession(response.accessToken, response.user.isDark)
        return response
    }

    suspend fun saveSession(token: String, isDark: Boolean) {
        accessToken = token
        tokenStore.saveToken(token)
        preferencesStore.saveIsDark(isDark)
    }

    suspend fun clearSession() {
        accessToken = null
        tokenStore.clear()
        preferencesStore.clearCachedDomainState()
        database.cachedJsonDao().clear()
    }

    suspend fun refreshSnapshot(): ProfileSnapshotResponse {
        val now = Calendar.getInstance()
        val snapshot = api.snapshot(now.get(Calendar.MONTH) + 1, now.get(Calendar.YEAR))
        preferencesStore.saveProfileSnapshot(snapshot)
        writeCache(CACHE_PROFILE, snapshot, ProfileSnapshotResponse::class.java)
        preferencesStore.saveIsDark(snapshot.auth.isDark)
        return snapshot
    }

    suspend fun loadDashboard(query: DashboardQuery): DashboardResponse {
        val dashboard = api.dashboard(DashboardQueryBuilder.build(query))
        preferencesStore.saveDashboard(dashboard)
        writeCache(CACHE_DASHBOARD, dashboard, DashboardResponse::class.java)
        return dashboard
    }

    suspend fun loadRates(): DashboardRatesResponse {
        val rates = api.dashboardRates()
        preferencesStore.saveRates(rates)
        writeCache(CACHE_RATES, rates, DashboardRatesResponse::class.java)
        return rates
    }

    suspend fun saveRatesSelection(selectedCurrencies: List<String>): DashboardRatesResponse {
        val rates = api.updateDashboardRates(DashboardRatesUpdateRequest(CurrencyUtils.normalizeSelection(selectedCurrencies)))
        preferencesStore.saveRates(rates)
        return rates
    }

    suspend fun createTransaction(body: CreateTransactionRequest): Boolean {
        val clientMutationId = body.clientMutationId ?: newClientMutationId()
        val request = body.copy(clientMutationId = clientMutationId)
        if (networkMonitor.isOnline()) {
            try {
                api.createTransaction(request).close()
                return true
            } catch (error: IOException) {
                queueTransactionCreate(request)
                return false
            }
        }

        queueTransactionCreate(request)
        return false
    }

    suspend fun createVoiceDraft(uri: Uri, filename: String? = null, mimeType: String? = null): AiTransactionDraftResponse {
        val metadata = voiceUploadMetadata(filename, mimeType)
        return withTimeout(VOICE_DRAFT_TIMEOUT_MS) {
            api.createVoiceDraft(uriPart(uri, "audio", metadata.filename, metadata.mimeType))
        }
    }

    suspend fun createImageDraft(uri: Uri): AiTransactionDraftResponse {
        return api.createImageDraft(uriPart(uri, "image", "android-receipt.jpg", "image/jpeg"))
    }

    suspend fun updateTransaction(id: String, body: UpdateTransactionRequest) {
        api.updateTransaction(id, body).close()
    }

    suspend fun deleteTransaction(id: String) {
        api.deleteTransaction(id).close()
    }

    suspend fun setThemePreference(isDark: Boolean): ThemePreferenceResponse {
        preferencesStore.saveIsDark(isDark)
        val response = api.updateThemePreference(ThemePreferenceRequest(isDark))
        preferencesStore.saveIsDark(response.isDark)
        return response
    }

    suspend fun updateDetails(firstName: String?, lastName: String?, birthday: String?): AuthMeResponse {
        return api.updateDetails(UpdateProfileDetailsRequest(firstName?.ifBlank { null }, lastName?.ifBlank { null }, birthday?.ifBlank { null }))
    }

    suspend fun updateProfilePreferences(weekStartsOn: String): AuthMeResponse {
        return api.updateProfilePreferences(UpdateProfilePreferencesRequest(weekStartsOn))
    }

    suspend fun setupPassword(email: String, password: String): AuthMeResponse {
        return api.setupPassword(PasswordSetupRequest(email.trim(), password))
    }

    suspend fun updateCategoryPreferences(showShared: Boolean, defaultIncomeId: String?, defaultExpenseId: String?): CategoryCatalogResponse {
        return api.updateCategoryPreferences(
            CategoryPreferencesRequest(
                showSharedCategories = showShared,
                defaultIncomeCategoryId = defaultIncomeId?.ifBlank { null },
                defaultExpenseCategoryId = defaultExpenseId?.ifBlank { null }
            )
        )
    }

    suspend fun bindCouple(code: String) {
        api.bindCouple(BindCoupleRequest(code.trim())).close()
    }

    suspend fun unbindCouple() {
        api.unbindCouple().close()
    }

    suspend fun createCategory(kind: String, scope: String, name: String, parentCategoryId: String?) {
        api.createCategory(CreateCategoryRequest(kind, scope, name.trim(), parentCategoryId?.ifBlank { null })).close()
    }

    suspend fun updateCategoryVisibility(id: String, isVisible: Boolean) {
        api.updateCategoryVisibility(id, UpdateCategoryVisibilityRequest(isVisible)).close()
    }

    suspend fun deleteCategory(id: String) {
        api.deleteCategory(id).close()
    }

    suspend fun loadGoodsSnapshot(): GoodsSnapshotResponse {
        val snapshot = api.goodsSnapshot()
        writeCache(CACHE_GOODS_SNAPSHOT, snapshot, GoodsSnapshotResponse::class.java)
        return snapshot
    }

    suspend fun loadGoodsList(query: GoodsListQuery): GoodsListResponse {
        val list = api.goodsItems(GoodsQueryBuilder.build(query))
        writeCache(CACHE_GOODS_LIST, list, GoodsListResponse::class.java)
        return list
    }

    suspend fun createGoodsItem(body: CreateGoodsItemRequest): Boolean {
        val clientMutationId = body.clientMutationId ?: newClientMutationId()
        val request = body.copy(clientMutationId = clientMutationId)
        if (networkMonitor.isOnline()) {
            try {
                api.createGoodsItem(request).close()
                return true
            } catch (error: IOException) {
                queueGoodsItemCreate(request)
                return false
            }
        }

        queueGoodsItemCreate(request)
        return false
    }

    suspend fun loadGoodsPlaces(): GoodsManagePlacesResponse = api.goodsPlaces()

    suspend fun loadGoodsCategories(): GoodsManageCategoriesResponse = api.goodsCategories()

    suspend fun createGoodsPlace(scope: String, name: String) {
        api.createGoodsPlace(GoodsCreateNameRequest(scope, name.trim())).close()
    }

    suspend fun createGoodsCategory(scope: String, name: String) {
        api.createGoodsCategory(GoodsCreateNameRequest(scope, name.trim())).close()
    }

    suspend fun updateGoodsPlaceVisibility(id: String, isVisible: Boolean) {
        api.updateGoodsPlaceVisibility(id, UpdateVisibilityRequest(isVisible)).close()
    }

    suspend fun updateGoodsCategoryVisibility(id: String, isVisible: Boolean) {
        api.updateGoodsCategoryVisibility(id, UpdateVisibilityRequest(isVisible)).close()
    }

    suspend fun deleteGoodsPlace(id: String) {
        api.deleteGoodsPlace(id).close()
    }

    suspend fun deleteGoodsCategory(id: String) {
        api.deleteGoodsCategory(id).close()
    }

    suspend fun loadGoodsHistory(id: String): GoodsHistoryResponse = api.goodsItemEvents(id)

    suspend fun mutateGoodsQuantity(id: String, action: String, quantity: Double, reason: String?) {
        val body = GoodsQuantityMutationRequest(quantity, reason?.trim()?.ifBlank { null })
        when (action) {
            "RESTOCK" -> api.restockGoodsItem(id, body).close()
            "CONSUME" -> api.consumeGoodsItem(id, body).close()
            "RECONCILE" -> api.reconcileGoodsItem(id, body).close()
        }
    }

    suspend fun moveGoodsItem(id: String, placeId: String, categoryId: String, reason: String?) {
        api.moveGoodsItem(id, GoodsMoveItemRequest(placeId, categoryId, reason?.trim()?.ifBlank { null })).close()
    }

    suspend fun updateGoodsItem(id: String, request: GoodsUpdateItemRequest) {
        api.updateGoodsItem(id, request).close()
    }

    suspend fun archiveGoodsItem(id: String) {
        api.archiveGoodsItem(id).close()
    }

    suspend fun loadAdvisorThreads(): GoodsAdvisorThreadsResponse = api.advisorThreads()

    suspend fun createAdvisorThread(scope: String): GoodsAdvisorThreadSummary = api.createAdvisorThread(GoodsAdvisorCreateThreadRequest(scope))

    suspend fun loadAdvisorThread(id: String): GoodsAdvisorThreadDetailResponse = api.advisorThread(id)

    suspend fun updateAdvisorThread(id: String, request: GoodsAdvisorUpdateThreadRequest): GoodsAdvisorThreadSummary = api.updateAdvisorThread(id, request)

    suspend fun deleteAdvisorThread(id: String) {
        api.deleteAdvisorThread(id).close()
    }

    suspend fun sendAdvisorMessage(threadId: String, message: String): GoodsAdvisorSendMessageResponse {
        return api.sendAdvisorMessage(threadId, GoodsAdvisorSendMessageRequest(message.trim()))
    }

    fun observePendingMutations(): Flow<List<PendingMutationPreview>> {
        return database.outboxDao()
            .observeByStatuses(listOf(OUTBOX_STATUS_PENDING, OUTBOX_STATUS_FAILED))
            .map { entities ->
                entities.map {
                    PendingMutationPreview(
                        clientMutationId = it.clientMutationId,
                        type = it.type,
                        title = it.title,
                        subtitle = it.subtitle,
                        createdAt = it.createdAt,
                        lastError = it.lastError
                    )
                }
            }
    }

    private suspend fun queueTransactionCreate(request: CreateTransactionRequest) {
        val title = if (request.kind == "INCOME") "Pending income" else "Pending expense"
        database.outboxDao().upsert(
            OutboxMutationEntity(
                clientMutationId = requireNotNull(request.clientMutationId),
                type = OUTBOX_TYPE_TRANSACTION_CREATE,
                payloadJson = moshi.adapter(CreateTransactionRequest::class.java).toJson(request),
                title = title,
                subtitle = "${CurrencyUtils.formatAmount(request.amount, request.currency)} / ${request.note?.takeIf { it.isNotBlank() } ?: "Waiting for internet"}"
            )
        )
        OutboxSyncWorker.enqueue(context)
    }

    private suspend fun queueGoodsItemCreate(request: CreateGoodsItemRequest) {
        database.outboxDao().upsert(
            OutboxMutationEntity(
                clientMutationId = requireNotNull(request.clientMutationId),
                type = OUTBOX_TYPE_GOODS_ITEM_CREATE,
                payloadJson = moshi.adapter(CreateGoodsItemRequest::class.java).toJson(request),
                title = "Pending grocery item",
                subtitle = "${request.name} / ${request.quantity}"
            )
        )
        OutboxSyncWorker.enqueue(context)
    }

    private fun newClientMutationId() = "android-${UUID.randomUUID()}"

    private suspend fun <T> writeCache(key: String, value: T, type: Class<T>) {
        database.cachedJsonDao().upsert(
            CachedJsonEntity(
                key = key,
                json = moshi.adapter(type).toJson(value)
            )
        )
    }

    private suspend fun <T> readCache(key: String, type: Class<T>): T? {
        val raw = database.cachedJsonDao().get(key)?.json ?: return null
        return runCatching { moshi.adapter(type).fromJson(raw) }.getOrNull()
    }

    private fun uriPart(uri: Uri, fieldName: String, fallbackName: String, fallbackMime: String): MultipartBody.Part {
        val resolver = context.contentResolver
        val mime = resolver.getType(uri) ?: fallbackMime
        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: ByteArray(0)
        val body = bytes.toRequestBody(mime.toMediaTypeOrNull())
        return MultipartBody.Part.createFormData(fieldName, fallbackName, body)
    }

    private companion object {
        const val VOICE_DRAFT_TIMEOUT_MS = 90_000L
        const val CACHE_PROFILE = "profile"
        const val CACHE_DASHBOARD = "dashboard"
        const val CACHE_RATES = "rates"
        const val CACHE_GOODS_SNAPSHOT = "goods_snapshot"
        const val CACHE_GOODS_LIST = "goods_list"
    }
}

data class BootCache(
    val token: String?,
    val isDark: Boolean?,
    val snapshot: ProfileSnapshotResponse?,
    val dashboard: DashboardResponse?,
    val rates: DashboardRatesResponse?,
    val goodsSnapshot: GoodsSnapshotResponse?,
    val goodsList: GoodsListResponse?
)
