package com.bhojanos.core.design.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider

private val DarkColorScheme = darkColorScheme(
    primary = BhojanPrimarySaffron,
    onPrimary = BhojanBackgroundDark,
    secondary = BhojanAccentGold,
    onSecondary = BhojanBackgroundDark,
    background = BhojanBackgroundDark,
    surface = BhojanSurfaceDark,
    onBackground = BhojanTextPrimaryDark,
    onSurface = BhojanTextPrimaryDark,
    error = BhojanStatusError
)

private val LightColorScheme = lightColorScheme(
    primary = BhojanPrimarySaffron,
    onPrimary = BhojanSurfaceLight,
    secondary = BhojanAccentGold,
    onSecondary = BhojanTextPrimaryLight,
    background = BhojanBackgroundLight,
    surface = BhojanSurfaceLight,
    onBackground = BhojanTextPrimaryLight,
    onSurface = BhojanTextPrimaryLight,
    error = BhojanStatusError
)

@Composable
fun BhojanTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    CompositionLocalProvider(
        LocalBhojanSpacing provides BhojanSpacing()
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = BhojanTypography,
            content = content
        )
    }
}
