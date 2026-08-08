package com.duet.android.data

import android.content.Context
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Access-token storage backed by the hardware keystore.
 *
 * If EncryptedSharedPreferences cannot be initialised we fail closed and keep the
 * token in memory for the current process only. The previous fallback wrote it to
 * plaintext SharedPreferences, which silently downgraded an access token to an
 * at-rest, backup-eligible secret without telling anyone.
 */
class SecureTokenStore(context: Context) {
    private val preferences = runCatching {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            PREFERENCES_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }.onFailure {
        Log.w(TAG, "Encrypted session store unavailable; keeping the session in memory only", it)
    }.getOrNull()

    /** Used only when encrypted storage is unavailable. Cleared when the process dies. */
    private var inMemoryToken: String? = null

    fun readToken(): String? = preferences?.getString(TOKEN_KEY, null) ?: inMemoryToken

    fun saveToken(token: String) {
        val store = preferences
        if (store == null) {
            inMemoryToken = token
            return
        }

        store.edit().putString(TOKEN_KEY, token).apply()
    }

    fun clear() {
        inMemoryToken = null
        preferences?.edit()?.clear()?.apply()
    }

    private companion object {
        const val TAG = "SecureTokenStore"
        const val PREFERENCES_NAME = "duet_secure_session"
        const val TOKEN_KEY = "access_token"
    }
}
