package com.duet.android.data

import java.util.Calendar

class DuetRepository(
    private val api: DuetApi,
    private val tokenStore: SecureTokenStore,
    private val preferencesStore: DuetPreferencesStore
) {
    var accessToken: String? = tokenStore.readToken()
        private set

    suspend fun bootCache(): BootCache {
        return BootCache(
            token = accessToken,
            isDark = preferencesStore.readIsDark(),
            snapshot = preferencesStore.readProfileSnapshot(),
            dashboard = preferencesStore.readDashboard(),
            rates = preferencesStore.readRates()
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
    }

    suspend fun refreshSnapshot(): ProfileSnapshotResponse {
        val now = Calendar.getInstance()
        val snapshot = api.snapshot(now.get(Calendar.MONTH) + 1, now.get(Calendar.YEAR))
        preferencesStore.saveProfileSnapshot(snapshot)
        preferencesStore.saveIsDark(snapshot.auth.isDark)
        return snapshot
    }

    suspend fun loadDashboard(query: DashboardQuery): DashboardResponse {
        val dashboard = api.dashboard(DashboardQueryBuilder.build(query))
        preferencesStore.saveDashboard(dashboard)
        return dashboard
    }

    suspend fun loadRates(): DashboardRatesResponse {
        val rates = api.dashboardRates()
        preferencesStore.saveRates(rates)
        return rates
    }

    suspend fun saveRatesSelection(selectedCurrencies: List<String>): DashboardRatesResponse {
        val rates = api.updateDashboardRates(DashboardRatesUpdateRequest(CurrencyUtils.normalizeSelection(selectedCurrencies)))
        preferencesStore.saveRates(rates)
        return rates
    }

    suspend fun createTransaction(body: CreateTransactionRequest) {
        api.createTransaction(body).close()
    }

    suspend fun updateTransaction(id: String, body: UpdateTransactionRequest) {
        api.updateTransaction(id, body).close()
    }

    suspend fun deleteTransaction(id: String) {
        api.deleteTransaction(id).close()
    }

    suspend fun setThemePreference(isDark: Boolean): AuthMeResponse {
        preferencesStore.saveIsDark(isDark)
        return api.updateThemePreference(ThemePreferenceRequest(isDark))
    }

    suspend fun updateDetails(firstName: String?, lastName: String?, birthday: String?): AuthMeResponse {
        return api.updateDetails(UpdateProfileDetailsRequest(firstName?.ifBlank { null }, lastName?.ifBlank { null }, birthday?.ifBlank { null }))
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
}

data class BootCache(
    val token: String?,
    val isDark: Boolean?,
    val snapshot: ProfileSnapshotResponse?,
    val dashboard: DashboardResponse?,
    val rates: DashboardRatesResponse?
)
