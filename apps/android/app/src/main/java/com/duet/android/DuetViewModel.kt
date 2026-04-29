package com.duet.android

import android.app.Application
import android.media.MediaRecorder
import android.net.Uri
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.duet.android.data.AiTransactionDraft
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
import com.duet.android.data.GoodsAdvisorMessage
import com.duet.android.data.GoodsAdvisorThreadDetailResponse
import com.duet.android.data.GoodsAdvisorThreadSummary
import com.duet.android.data.GoodsManageCategoriesResponse
import com.duet.android.data.GoodsManagePlacesResponse
import com.duet.android.data.GoodsHistoryResponse
import com.duet.android.data.GoodsUpdateItemRequest
import com.duet.android.data.GoodsAdvisorUpdateThreadRequest
import com.duet.android.data.GoodsSnapshotResponse
import com.duet.android.data.NetworkMonitor
import com.duet.android.data.PendingMutationPreview
import com.duet.android.data.local.DuetLocalDatabase
import com.duet.android.data.toUserMessage
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

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
    val goodsPlaces: GoodsManagePlacesResponse? = null,
    val goodsCategories: GoodsManageCategoriesResponse? = null,
    val goodsHistoryByItemId: Map<String, GoodsHistoryResponse> = emptyMap(),
    val advisorThreads: List<GoodsAdvisorThreadSummary> = emptyList(),
    val advisorActiveThread: GoodsAdvisorThreadDetailResponse? = null,
    val advisorDraft: String = "",
    val advisorScope: String = "AUTO",
    val pendingAdvisorText: String? = null,
    val goodsQuery: GoodsListQuery = GoodsListQuery(),
    val pendingMutations: List<PendingMutationPreview> = emptyList(),
    val dashboardQuery: DashboardQuery = DashboardQuery(),
    val editingTransaction: EditableTransaction? = null,
    val aiDraft: AiTransactionDraft? = null,
    val aiStage: String = "READY",
    val aiError: String? = null,
    val voiceRecordingSeconds: Int = 0,
    val voiceVisualizerLevels: List<Float> = DEFAULT_VISUALIZER_LEVELS
)

class DuetViewModel(application: Application) : AndroidViewModel(application) {
    private val tokenStore = SecureTokenStore(application.applicationContext)
    private val moshi = NetworkModule.createMoshi()
    private lateinit var repository: DuetRepository
    private var mediaRecorder: MediaRecorder? = null
    private var recordingFile: File? = null
    private var voiceVisualizerJob: Job? = null

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
                val goodsPlaces = runCatching { repository.loadGoodsPlaces() }.getOrElse { _uiState.value.goodsPlaces }
                val goodsCategories = runCatching { repository.loadGoodsCategories() }.getOrElse { _uiState.value.goodsCategories }
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
                        goodsPlaces = goodsPlaces,
                        goodsCategories = goodsCategories,
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

    fun clearAiDraft() {
        _uiState.update { it.copy(aiDraft = null, aiError = null, aiStage = "READY") }
    }

    fun createImageDraft(uri: Uri) {
        launchAi("Reading receipt image") {
            val response = repository.createImageDraft(uri)
            _uiState.update { it.copy(aiDraft = response.draft, aiStage = "READY", aiError = null, message = "Image draft ready") }
        }
    }

    fun startVoiceRecording(): Boolean {
        return runCatching {
            val file = File.createTempFile("duet-voice-", ".m4a", getApplication<Application>().cacheDir)
            val recorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(96000)
                setAudioSamplingRate(44100)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            }
            recordingFile = file
            mediaRecorder = recorder
            _uiState.update {
                it.copy(
                    aiStage = "RECORDING",
                    aiError = null,
                    aiDraft = null,
                    voiceRecordingSeconds = 0,
                    voiceVisualizerLevels = DEFAULT_VISUALIZER_LEVELS
                )
            }
            startVoiceVisualizer()
            true
        }.getOrElse {
            stopVoiceVisualizer()
            _uiState.update { state -> state.copy(aiStage = "READY", aiError = it.toUserMessage(moshi)) }
            false
        }
    }

    fun stopVoiceRecordingAndDraft() {
        val file = recordingFile ?: return
        stopVoiceVisualizer()
        runCatching {
            mediaRecorder?.stop()
        }
        mediaRecorder?.release()
        mediaRecorder = null
        recordingFile = null
        launchAi("Transcribing voice note") {
            val response = repository.createVoiceDraft(Uri.fromFile(file))
            _uiState.update { it.copy(aiDraft = response.draft, aiStage = "READY", aiError = null, message = "Voice draft ready") }
        }
    }

    fun cancelVoiceRecording() {
        stopVoiceVisualizer()
        runCatching { mediaRecorder?.stop() }
        mediaRecorder?.release()
        mediaRecorder = null
        recordingFile?.delete()
        recordingFile = null
        _uiState.update { it.copy(aiStage = "READY", voiceRecordingSeconds = 0, voiceVisualizerLevels = DEFAULT_VISUALIZER_LEVELS) }
    }

    private fun launchAi(stage: String, block: suspend () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(aiStage = stage, aiError = null) }
            try {
                block()
            } catch (error: Throwable) {
                Log.e(LOG_TAG, "AI request failed during $stage", error)
                _uiState.update { it.copy(aiStage = "READY", aiError = error.toUserMessage(moshi)) }
            }
        }
    }

    private fun startVoiceVisualizer() {
        voiceVisualizerJob?.cancel()
        voiceVisualizerJob = viewModelScope.launch {
            val startedAt = System.currentTimeMillis()
            var levels = DEFAULT_VISUALIZER_LEVELS
            while (isActive && _uiState.value.aiStage == "RECORDING") {
                val amplitude = runCatching { mediaRecorder?.maxAmplitude ?: 0 }.getOrDefault(0)
                levels = smoothVoiceLevels(levels, buildVoiceLevels(amplitude))
                val seconds = ((System.currentTimeMillis() - startedAt) / 1000).toInt()
                _uiState.update { it.copy(voiceRecordingSeconds = seconds, voiceVisualizerLevels = levels) }
                delay(VOICE_VISUALIZER_UPDATE_MS)
            }
        }
    }

    private fun stopVoiceVisualizer() {
        voiceVisualizerJob?.cancel()
        voiceVisualizerJob = null
        _uiState.update { it.copy(voiceRecordingSeconds = 0, voiceVisualizerLevels = DEFAULT_VISUALIZER_LEVELS) }
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

    fun saveProfilePreferences(weekStartsOn: String) {
        launchBusy {
            repository.updateProfilePreferences(weekStartsOn)
            _uiState.update { it.copy(message = "Preferences saved") }
            refreshAll(silent = true)
        }
    }

    fun setupPassword(email: String, password: String) {
        launchBusy {
            repository.setupPassword(email, password)
            _uiState.update { it.copy(message = "Email login is ready") }
            refreshAll(silent = true)
        }
    }

    fun saveCategoryPreferences(showShared: Boolean, defaultIncomeId: String?, defaultExpenseId: String?) {
        launchBusy {
            repository.updateCategoryPreferences(showShared, defaultIncomeId, defaultExpenseId)
            _uiState.update { it.copy(message = "Category preferences saved") }
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
            val places = runCatching { repository.loadGoodsPlaces() }.getOrNull()
            val categories = runCatching { repository.loadGoodsCategories() }.getOrNull()
            _uiState.update { it.copy(goodsSnapshot = snapshot, goodsList = list, goodsPlaces = places, goodsCategories = categories) }
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

    fun createGoodsPlace(scope: String, name: String) {
        launchGoodsMutation("Place created") { repository.createGoodsPlace(scope, name) }
    }

    fun createGoodsCategory(scope: String, name: String) {
        launchGoodsMutation("Category created") { repository.createGoodsCategory(scope, name) }
    }

    fun updateGoodsPlaceVisibility(id: String, isVisible: Boolean) {
        launchGoodsMutation(if (isVisible) "Place shown" else "Place hidden") { repository.updateGoodsPlaceVisibility(id, isVisible) }
    }

    fun updateGoodsCategoryVisibility(id: String, isVisible: Boolean) {
        launchGoodsMutation(if (isVisible) "Category shown" else "Category hidden") { repository.updateGoodsCategoryVisibility(id, isVisible) }
    }

    fun deleteGoodsPlace(id: String) {
        launchGoodsMutation("Place deleted") { repository.deleteGoodsPlace(id) }
    }

    fun deleteGoodsCategory(id: String) {
        launchGoodsMutation("Category deleted") { repository.deleteGoodsCategory(id) }
    }

    fun loadGoodsHistory(id: String) {
        viewModelScope.launch {
            val history = repository.loadGoodsHistory(id)
            _uiState.update { it.copy(goodsHistoryByItemId = it.goodsHistoryByItemId + (id to history)) }
        }
    }

    fun mutateGoodsQuantity(id: String, action: String, quantity: Double, reason: String?) {
        launchGoodsMutation("Item updated") { repository.mutateGoodsQuantity(id, action, quantity, reason) }
    }

    fun moveGoodsItem(id: String, placeId: String, categoryId: String, reason: String?) {
        launchGoodsMutation("Item moved") { repository.moveGoodsItem(id, placeId, categoryId, reason) }
    }

    fun updateGoodsItem(id: String, request: GoodsUpdateItemRequest) {
        launchGoodsMutation("Item settings saved") { repository.updateGoodsItem(id, request) }
    }

    fun archiveGoodsItem(id: String) {
        launchGoodsMutation("Item archived") { repository.archiveGoodsItem(id) }
    }

    private fun launchGoodsMutation(message: String, block: suspend () -> Unit) {
        launchBusy {
            block()
            val snapshot = repository.loadGoodsSnapshot()
            val list = repository.loadGoodsList(_uiState.value.goodsQuery)
            val places = repository.loadGoodsPlaces()
            val categories = repository.loadGoodsCategories()
            _uiState.update {
                it.copy(
                    message = message,
                    goodsSnapshot = snapshot,
                    goodsList = list,
                    goodsPlaces = places,
                    goodsCategories = categories
                )
            }
        }
    }

    fun loadAdvisor() {
        launchBusy {
            val threads = repository.loadAdvisorThreads().items.sortedWith(compareByDescending<GoodsAdvisorThreadSummary> { it.isPinned }.thenByDescending { it.lastActivityAt })
            val active = threads.firstOrNull()?.let { repository.loadAdvisorThread(it.id) }
            _uiState.update { it.copy(advisorThreads = threads, advisorActiveThread = active) }
        }
    }

    fun setAdvisorDraft(value: String) {
        _uiState.update { it.copy(advisorDraft = value) }
    }

    fun setAdvisorScope(value: String) {
        _uiState.update { it.copy(advisorScope = value) }
    }

    fun openAdvisorThread(id: String) {
        launchBusy {
            _uiState.update { it.copy(advisorActiveThread = repository.loadAdvisorThread(id)) }
        }
    }

    fun startNewAdvisorChat() {
        _uiState.update { it.copy(advisorActiveThread = null, advisorDraft = "", pendingAdvisorText = null) }
    }

    fun sendAdvisorMessage(override: String? = null) {
        val prompt = (override ?: _uiState.value.advisorDraft).trim()
        if (prompt.isBlank()) {
            _uiState.update { it.copy(error = "Enter a message first") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, error = null, pendingAdvisorText = prompt) }
            try {
                val threadId = _uiState.value.advisorActiveThread?.thread?.id
                    ?: repository.createAdvisorThread(_uiState.value.advisorScope).id
                val response = repository.sendAdvisorMessage(threadId, prompt)
                val detail = repository.loadAdvisorThread(response.thread.id)
                val threads = repository.loadAdvisorThreads().items.sortedWith(compareByDescending<GoodsAdvisorThreadSummary> { it.isPinned }.thenByDescending { it.lastActivityAt })
                _uiState.update {
                    it.copy(
                        isBusy = false,
                        advisorDraft = "",
                        pendingAdvisorText = null,
                        advisorThreads = threads,
                        advisorActiveThread = detail
                    )
                }
            } catch (error: Throwable) {
                handleError(error)
                _uiState.update { it.copy(pendingAdvisorText = null) }
            }
        }
    }

    fun updateAdvisorThread(id: String, title: String? = null, isPinned: Boolean? = null) {
        launchBusy {
            repository.updateAdvisorThread(id, GoodsAdvisorUpdateThreadRequest(title = title, isPinned = isPinned))
            val threads = repository.loadAdvisorThreads().items.sortedWith(compareByDescending<GoodsAdvisorThreadSummary> { it.isPinned }.thenByDescending { it.lastActivityAt })
            val active = _uiState.value.advisorActiveThread?.thread?.id?.let { repository.loadAdvisorThread(it) }
            _uiState.update { it.copy(advisorThreads = threads, advisorActiveThread = active) }
        }
    }

    fun deleteAdvisorThread(id: String) {
        launchBusy {
            repository.deleteAdvisorThread(id)
            val threads = repository.loadAdvisorThreads().items.sortedWith(compareByDescending<GoodsAdvisorThreadSummary> { it.isPinned }.thenByDescending { it.lastActivityAt })
            val active = threads.firstOrNull()?.let { repository.loadAdvisorThread(it.id) }
            _uiState.update { it.copy(advisorThreads = threads, advisorActiveThread = active) }
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

private const val LOG_TAG = "DuetAndroid"
private const val VOICE_VISUALIZER_LEVEL_COUNT = 24
private const val VOICE_VISUALIZER_UPDATE_MS = 48L
private const val VOICE_VISUALIZER_SMOOTHING = 0.32f
private const val VOICE_VISUALIZER_NOISE_FLOOR = 0.018f
private val DEFAULT_VISUALIZER_LEVELS = List(VOICE_VISUALIZER_LEVEL_COUNT) { 0f }
private val VOICE_LEVEL_SHAPE = listOf(0.38f, 0.52f, 0.78f, 0.62f, 0.94f, 0.58f, 0.86f, 0.48f)

private fun smoothVoiceLevels(previous: List<Float>, next: List<Float>): List<Float> {
    return next.mapIndexed { index, level ->
        val before = previous.getOrNull(index) ?: level
        before + (level - before) * VOICE_VISUALIZER_SMOOTHING
    }
}

private fun buildVoiceLevels(amplitude: Int): List<Float> {
    val normalized = min(1f, max(0f, amplitude / 32767f))
    val gated = max(0f, (normalized - VOICE_VISUALIZER_NOISE_FLOOR) / (1f - VOICE_VISUALIZER_NOISE_FLOOR))
    val boosted = min(1f, gated.toDouble().pow(0.58).toFloat() * 1.35f)
    if (boosted <= 0f) return DEFAULT_VISUALIZER_LEVELS

    return List(VOICE_VISUALIZER_LEVEL_COUNT) { index ->
        val shape = VOICE_LEVEL_SHAPE[index % VOICE_LEVEL_SHAPE.size]
        min(1f, boosted * shape + boosted * 0.18f)
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
