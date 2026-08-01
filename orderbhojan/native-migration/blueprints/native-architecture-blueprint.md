# Native Architecture Blueprint: Phase 1 (Order Tracking)

## 1. Executive Summary
This document outlines the architectural standards for rebuilding OrderBhojan as true native applications (Android/iOS) using a phased, route-by-route strangler pattern. The existing React/Capacitor application remains the host shell, deferring specific routes to native implementations when feature flags are active.

## 2. Core Tenets
* **Strangler Fig Pattern:** Incrementally replace React web routes with native screens.
* **Feature Flagged:** Every native route is protected by a remote/env feature flag (e.g., `VITE_FF_NATIVE_TRACK`).
* **Auth Handoff:** The web shell authenticates the user and passes session tokens securely to the native module upon navigation.
* **No "Big Bang" Rewrites:** Migration happens one vertical slice at a time.
* **UI Frameworks:** 
  * Android: Kotlin + Jetpack Compose
  * iOS: Swift + SwiftUI

## 3. Phase 1 Scope: Order Tracking (`/track/:orderId`)
The Order Tracking screen is the first native slice. It is high-visibility, read-heavy, and benefits immensely from native map integrations, animations, and background push notifications.

### 3.1 Android Implementation Details (Kotlin)
* **UI Layer:** Jetpack Compose (using `Material3`).
* **Architecture:** MVVM (Model-View-ViewModel).
* **Entry Point:** `TrackActivity` launched via Intent from Capacitor Plugin.
* **State Management:** `StateFlow` / `ViewModel`.
* **Networking:** Use existing backend APIs via Retrofit/OkHttp (Token passed from Web).
* **Maps:** Google Maps SDK for Jetpack Compose.

### 3.2 iOS Implementation Details (Swift)
* **UI Layer:** SwiftUI.
* **Architecture:** MVVM.
* **Entry Point:** `TrackViewController` (UIHostingController wrapping SwiftUI View) presented via Capacitor Plugin.
* **State Management:** `@StateObject`, `@Published`.
* **Networking:** `URLSession` async/await.
* **Maps:** MapKit for SwiftUI.

## 4. Bridge & Shell Architecture
1. **Host:** React web app inside Capacitor WebView.
2. **Router Interception:** React Router checks `VITE_FF_NATIVE_TRACK` before rendering the web `/track` component.
3. **Delegation:** If true, invokes `Capacitor.Plugins.NativeTrack.open(...)`.
4. **Execution:** The native OS launches the native Activity/ViewController over the WebView.
5. **Return:** When the user closes the native screen, focus returns to the WebView shell.

## 5. Deployment & CI/CD
* **Identity Preserved:** Application ID (`com.orderbhojan.app`) and signing keys remain untouched.
* **Dogfood Cohort:** Alpha releases distributed via internal app distribution (e.g., Firebase App Distribution / TestFlight) for the `bhojanos26@gmail.com` cohort first.
