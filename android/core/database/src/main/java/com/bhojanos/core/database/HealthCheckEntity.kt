package com.bhojanos.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Persistent health-status record for a single device/database check.
 *
 * Fixes the B7 database-test compile failure: [DatabaseHealthTest] constructs a
 * [HealthCheckEntity] and asserts its canonical identity is `health_status`.
 * This entity aligns the Room schema with that repository contract so the test
 * reflects a real (persisted) model rather than a dangling reference.
 *
 * @param id       Stable single-row key. A health check is a rolling one-row
 *                 record, so the key is constant (`health_status`).
 * @param timestamp Unix epoch millis when the check was recorded.
 * @param isHealthy Whether the underlying health probe reported healthy.
 */
@Entity(tableName = "health_status")
data class HealthCheckEntity(
    @PrimaryKey val id: String = "health_status",
    val timestamp: Long,
    val isHealthy: Boolean
)
