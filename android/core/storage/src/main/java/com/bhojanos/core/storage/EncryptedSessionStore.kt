package com.bhojanos.core.storage

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Encrypted, fail-safe session credential store.
 *
 * SECURITY POLICY (B8):
 * Sensitive session credentials (auth token / user id) are NEVER persisted in
 * plaintext. If encrypted storage cannot be initialised we fail safely by
 * throwing at construction time instead of silently falling back to an
 * unencrypted [SharedPreferences] file (the previous behaviour).
 *
 * A caller that cannot establish the encrypted store must degrade to an
 * unauthenticated state; it must never write secrets in the clear.
 */
class EncryptedSessionStore(context: Context) {

    private val sharedPreferences: SharedPreferences = createEncryptedPrefs(context)

    fun saveAuthToken(token: String) {
        sharedPreferences.edit().putString(KEY_AUTH_TOKEN, token).apply()
    }

    fun getAuthToken(): String? {
        return sharedPreferences.getString(KEY_AUTH_TOKEN, null)
    }

    fun saveUserId(userId: String) {
        sharedPreferences.edit().putString(KEY_USER_ID, userId).apply()
    }

    fun getUserId(): String? {
        return sharedPreferences.getString(KEY_USER_ID, null)
    }

    fun clearSession() {
        sharedPreferences.edit().clear().apply()
    }

    companion object {
        private const val KEY_AUTH_TOKEN = "sec_auth_token"
        private const val KEY_USER_ID = "sec_user_id"
        private const val PREFS_NAME = "bhojanos_secure_session_prefs"

        /**
         * Plaintext fallback is never permitted for session credentials.
         * Exposed publicly (not private) so the JVM security test can assert the
         * policy contract without needing the Android runtime.
         */
        const val ALLOW_PLAINTEXT_FALLBACK: Boolean = false

        private fun createEncryptedPrefs(context: Context): SharedPreferences {
            if (!ALLOW_PLAINTEXT_FALLBACK) {
                // Fails safely: never persist credentials in the clear.
                // If encryption is unavailable, throw so the caller enters an
                // unauthenticated state rather than writing secrets unencrypted.
                val masterKey = MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build()

                return EncryptedSharedPreferences.create(
                    context,
                    PREFS_NAME,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                )
            }
            // Defensive branch retained for clarity; unreachable while the policy
            // above is enforced, but deliberately NOT a plaintext Storage wrapper.
            throw IllegalStateException("Plaintext session storage is forbidden")
        }
    }
}

