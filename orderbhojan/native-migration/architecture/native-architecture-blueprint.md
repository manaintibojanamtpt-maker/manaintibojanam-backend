# Native Architecture Blueprint
**Status**: Draft (Founder Beta Phase)

This document defines the high-level architectural rules for the native rewrite of BhojanOS (Android & iOS). This architecture ensures safety, maintainability, and parity with the existing web backend during the phased migration from the hybrid React/Capacitor model to true native code.

## 1. Core Principles

1.  **Strangler Pattern**: The migration happens route-by-route. The existing Capacitor web view remains the backbone. Native routes are invoked via feature flags. If a native route fails or its feature flag is turned off, the app gracefully falls back to the hybrid web view.
2.  **API Contract Parity**: Native clients must not require backend schema changes. They must consume the exact same REST APIs that the React frontend currently consumes.
3.  **Identity Preservation**: Package IDs, bundle IDs, signing certificates, and push notification configurations remain completely unchanged to ensure a seamless update path for existing users.
4.  **UI/UX Fidelity**: The native apps must match the premium, venture-backable design language defined in the web UI/UX, prioritizing fluid motion, haptics, and native performance.

## 2. Android Architecture (Kotlin + Jetpack Compose)

*   **UI Framework**: Jetpack Compose (100%). Legacy XML layouts should be avoided except for the hybrid web view wrapper (`TrackActivity` as an interim bridge if necessary, though pure Compose is the target).
*   **Architecture Pattern**: MVVM (Model-View-ViewModel).
*   **Networking**: Retrofit + OkHttp. Coroutines and Flow for async streams.
*   **Dependency Injection**: Hilt.
*   **Navigation**: Jetpack Navigation Compose.
*   **State Management**: `StateFlow` and `SharedFlow` exposed from ViewModels to Compose UI.
*   **Data Layer**: Repository pattern mapping DTOs (Data Transfer Objects) to Domain Models.

## 3. iOS Architecture (Swift + SwiftUI)

*   **UI Framework**: SwiftUI (100%). UIKit only where absolutely necessary (e.g., legacy bridge components).
*   **Architecture Pattern**: MVVM (Model-View-ViewModel).
*   **Networking**: `URLSession` + Combine (or Swift Concurrency `async/await` depending on iOS target minimum). Preference for `async/await` for new code.
*   **Dependency Injection**: Factory pattern or lightweight DI container (e.g., Swinject) to maintain clean initialization.
*   **Navigation**: SwiftUI `NavigationStack` / Router pattern.
*   **State Management**: `@StateObject`, `@Published`, and `ObservableObject` (or Observation framework if targeting iOS 17+).
*   **Data Layer**: Repository pattern mapping `Codable` DTOs to Domain Models.

## 4. Bridge & Routing

The existing Capacitor `app.js` will orchestrate the feature flag evaluation.

When a user taps an order to track:
1.  React/Web checks `VITE_FF_NATIVE_TRACK`.
2.  If `true`, invoke Capacitor plugin: `NativeTrack.open({ orderId: "..." })`.
3.  Native plugin intercepts, launches the Native Activity / SwiftUI View Controller.
4.  If `false`, React/Web navigates to standard web route `/tracking/:orderId`.

## 5. Testing & Safety

*   **Feature Flags**: Every native slice is gated by a remote feature flag.
*   **Telemetry**: Analytics events must fire from the native side using the exact same taxonomy as the web.
*   **Gradual Rollout**: 0% (Internal Dogfood) -> 10% (Canary) -> 50% -> 100%.
