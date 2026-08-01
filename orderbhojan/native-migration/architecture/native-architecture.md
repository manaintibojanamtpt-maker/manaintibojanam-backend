# Native architecture (target)

## Android (Kotlin + Jetpack Compose)
```
:app (com.bhojanos.orderbhojan)
  RouteHostActivity          // deep link + push entry
  HybridWebViewFragment      // Capacitor/WebView for non-native routes
  :features:track            // Compose TrackScreen (slice 01)
  :core:network              // OkHttp + Bearer + version + correlation
  :core:auth                 // Firebase Auth (same project)
  :core:flags                // FF_NATIVE_* + sticky cohort
  :core:analytics            // parity event sink
```
- Pattern: single-activity Navigation Compose + hybrid host as default destination.
- DI: Hilt or manual factories (match team preference; start manual for slice 01).
- Polling: Kotlin Coroutines + Flow; 5s until terminal status (match hybrid).

## iOS (Swift + SwiftUI)
```
App (com.bhojanos.orderbhojan)
  RootRouter                 // flag → NativeTrack | WKWebViewHost
  HybridWebViewHost          // existing Capacitor bridge during coexistence
  Features/Track             // SwiftUI TrackScreen
  Core/Network               // URLSession + headers
  Core/Auth                  // Firebase Auth
  Core/Flags
  Core/Analytics
```
- Pattern: SwiftUI `NavigationStack` with hybrid host for unmigrated paths.
- Storage: Keychain for tokens/deviceId; UserDefaults for sticky cohort.

## Navigation strategy
1. Parse deep link / push `path` → route ID (contract table).
2. Evaluate `FF_NATIVE_HOST` ∧ route flag ∧ cohort.
3. Native screen **or** load hybrid URL path unchanged.
4. Never change path shape — hybrid and native share URLs.

## Contract boundaries
| Layer | Owns | Must not own |
|-------|------|--------------|
| Native UI | Presentation, local UX | Pricing rules, order state machine |
| Network clients | HTTP + headers + DTO parse | Business policy changes |
| Backend | Source of truth | Client UI decisions |
| Feature flags | Exposure | Permanent architecture |

## Feature-flag strategy
- Remote-capable env/build config first; Remote Config later if needed.
- Master kill `FF_NATIVE_HOST` + per-route `FF_NATIVE_*` + pct + internal emails.
- Sticky device cohort (same pattern as voice-core confirm/add).

## Observability strategy
- Emit parity analytics names with `impl=native|hybrid`, `client=android|ios|web`.
- Preserve `X-Correlation-Id` on API + client-errors.
- Crash: Play Vitals / Xcode Organizer + existing `/api/client-errors`.
- Abort on crash or track-error spike vs hybrid baseline.
