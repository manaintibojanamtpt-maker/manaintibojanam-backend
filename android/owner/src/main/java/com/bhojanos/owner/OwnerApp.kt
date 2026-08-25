package com.bhojanos.owner

import android.app.Application
import com.bhojanos.core.common.StartupMetrics
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class OwnerApp : Application() {
    override fun onCreate() {
        super.onCreate()
        StartupMetrics.recordProcessStart()
        StartupMetrics.recordAppInitComplete()
    }
}
