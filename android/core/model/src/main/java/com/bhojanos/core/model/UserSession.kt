package com.bhojanos.core.model

data class UserSession(
    val uid: String,
    val email: String?,
    val displayName: String?,
    val phoneNumber: String?,
    val photoUrl: String?,
    val isOwner: Boolean = false,
    val isSuperAdmin: Boolean = false,
    val tenantId: String? = null
)

sealed interface AuthState {
    data object Unauthenticated : AuthState
    data object Loading : AuthState
    data class Authenticated(val session: UserSession) : AuthState
    data class Error(val message: String) : AuthState
}
