package com.bhojanos.core.common

import android.os.SystemClock

object StartupMetrics {
    private var processStartTimeMs: Long = System.currentTimeMillis()
    private var appInitDurationMs: Long = -1L
    private var firstFrameDurationMs: Long = -1L

    fun recordProcessStart() {
        processStartTimeMs = System.currentTimeMillis()
    }

    fun recordAppInitComplete() {
        appInitDurationMs = System.currentTimeMillis() - processStartTimeMs
    }

    fun recordFirstComposeFrame() {
        if (firstFrameDurationMs < 0) {
            firstFrameDurationMs = System.currentTimeMillis() - processStartTimeMs
        }
    }

    fun getAppInitDurationMs(): Long = appInitDurationMs
    fun getFirstFrameDurationMs(): Long = firstFrameDurationMs
    fun getProcessStartTimeMs(): Long = processStartTimeMs
}
