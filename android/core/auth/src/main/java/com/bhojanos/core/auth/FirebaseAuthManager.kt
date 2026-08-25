package com.bhojanos.core.auth

import com.bhojanos.core.model.AuthState
import com.bhojanos.core.model.UserSession
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class FirebaseAuthManager(
    private val firebaseAuth: FirebaseAuth = FirebaseAuth.getInstance()
) {

    val authStateFlow: Flow<AuthState> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { auth ->
            val firebaseUser = auth.currentUser
            if (firebaseUser != null) {
                val session = UserSession(
                    uid = firebaseUser.uid,
                    email = firebaseUser.email,
                    displayName = firebaseUser.displayName,
                    phoneNumber = firebaseUser.phoneNumber,
                    photoUrl = firebaseUser.photoUrl?.toString()
                )
                trySend(AuthState.Authenticated(session))
            } else {
                trySend(AuthState.Unauthenticated)
            }
        }

        firebaseAuth.addAuthStateListener(listener)
        awaitClose { firebaseAuth.removeAuthStateListener(listener) }
    }

    suspend fun getIdToken(forceRefresh: Boolean = false): String? {
        val currentUser = firebaseAuth.currentUser ?: return null
        return try {
            val result = currentUser.getIdToken(forceRefresh).await()
            result.token
        } catch (e: Exception) {
            null
        }
    }

    fun signOut() {
        firebaseAuth.signOut()
    }

    fun getCurrentUserSession(): UserSession? {
        val firebaseUser = firebaseAuth.currentUser ?: return null
        return UserSession(
            uid = firebaseUser.uid,
            email = firebaseUser.email,
            displayName = firebaseUser.displayName,
            phoneNumber = firebaseUser.phoneNumber,
            photoUrl = firebaseUser.photoUrl?.toString()
        )
    }
}
