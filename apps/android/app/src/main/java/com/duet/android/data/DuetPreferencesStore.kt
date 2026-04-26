package com.duet.android.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.squareup.moshi.Moshi
import kotlinx.coroutines.flow.first

private val Context.duetDataStore by preferencesDataStore(name = "duet_preferences")

class DuetPreferencesStore(
    private val context: Context,
    private val moshi: Moshi
) {
    suspend fun readIsDark(): Boolean? = context.duetDataStore.data.first()[IS_DARK]

    suspend fun saveIsDark(value: Boolean) {
        context.duetDataStore.edit { it[IS_DARK] = value }
    }

    suspend fun readProfileSnapshot(): ProfileSnapshotResponse? = readJson(PROFILE_SNAPSHOT)
    suspend fun saveProfileSnapshot(value: ProfileSnapshotResponse) = writeJson(PROFILE_SNAPSHOT, value, ProfileSnapshotResponse::class.java)

    suspend fun readDashboard(): DashboardResponse? = readJson(DASHBOARD)
    suspend fun saveDashboard(value: DashboardResponse) = writeJson(DASHBOARD, value, DashboardResponse::class.java)

    suspend fun readRates(): DashboardRatesResponse? = readJson(RATES)
    suspend fun saveRates(value: DashboardRatesResponse) = writeJson(RATES, value, DashboardRatesResponse::class.java)

    suspend fun clearCachedDomainState() {
        context.duetDataStore.edit {
            it.remove(PROFILE_SNAPSHOT)
            it.remove(DASHBOARD)
            it.remove(RATES)
        }
    }

    private suspend inline fun <reified T> readJson(key: androidx.datastore.preferences.core.Preferences.Key<String>): T? {
        val raw = context.duetDataStore.data.first()[key] ?: return null
        return runCatching { moshi.adapter(T::class.java).fromJson(raw) }.getOrNull()
    }

    private suspend fun <T> writeJson(
        key: androidx.datastore.preferences.core.Preferences.Key<String>,
        value: T,
        type: Class<T>
    ) {
        val json = moshi.adapter(type).toJson(value)
        context.duetDataStore.edit { it[key] = json }
    }

    private companion object {
        val IS_DARK = booleanPreferencesKey("is_dark")
        val PROFILE_SNAPSHOT = stringPreferencesKey("profile_snapshot")
        val DASHBOARD = stringPreferencesKey("dashboard")
        val RATES = stringPreferencesKey("rates")
    }
}
