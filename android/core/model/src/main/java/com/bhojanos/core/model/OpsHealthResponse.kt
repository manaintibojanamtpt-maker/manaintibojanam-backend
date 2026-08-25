package com.bhojanos.core.model

data class FirestoreHealth(
    val projectId: String? = null,
    val backedOff: Boolean = false
)

data class PlatformInfo(
    val build: String? = null,
    val tier: String? = null
)

data class OpsHealthResponse(
    val status: String,
    val firestore: FirestoreHealth? = null,
    val platform: PlatformInfo? = null
)
