# Slice 01 — Order tracking (Phase 1 wired)

## Status
Phase 0 contracts **LOCKED**. Phase 1 host wiring landed in Capacitor app hosts.

## Dispatch
```
if FF_NATIVE_HOST && FF_NATIVE_TRACK && inCohort → NativeTrack
else → HybridWebView("/orders/{orderId}/track")
```

## Implementation locations (real modules)

| Layer | Path |
|-------|------|
| JS flags | `orderbhojan/src/featureFlags/flags.ts` (`FF_NATIVE_HOST`, `FF_NATIVE_TRACK`) |
| JS rollout | `orderbhojan/src/features/nativeTrack/nativeTrackRollout.ts` |
| JS bridge | `orderbhojan/src/features/nativeTrack/nativeTrackBridge.ts` |
| Route handoff | `OrderBhojanTrackingPage` + `capacitorBootstrap` + push listeners |
| Android Track | `orderbhojan/android/.../track/` + `OrderBhojanNativeTrackPlugin.kt` |
| iOS Track | `orderbhojan/ios/App/App/Track*.swift` + `OrderBhojanNativeTrackPlugin.swift` |

Scaffolds in `android-native/` / `ios-native/` are historical stubs; prefer the wired modules above.

## API (unchanged)
- `GET /api/marketplace/orders/{orderId}/tracking`
- `GET /api/marketplace/orders/{orderId}/guest-tracking?phone=`
- Headers: Bearer (if signed in), `X-Marketplace-API-Version`, `X-Correlation-Id`

## Dogfood
See `../../rollout/internal-dogfood.md`
