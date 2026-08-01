# Phase backlog

## Phase 0 — Boundaries (LOCKED 2026-07-31)
- [x] Flow audit
- [x] Identity continuity confirmed (`com.bhojanos.orderbhojan`)
- [x] Contracts locked (routes, analytics, flags)
- [x] Native host architecture ADR
- [ ] Internal email list for dogfood finalized (use dogfood doc)

## Phase 1 — Native host + Track slice
- [x] Android: Compose TrackActivity + Capacitor plugin + hybrid MainActivity fallback
- [x] iOS: SwiftUI TrackHostingController + Capacitor plugin + hybrid fallback
- [x] Track API clients (Kotlin + Swift) against marketplace tracking endpoints
- [x] Flags: `FF_NATIVE_HOST`, `FF_NATIVE_TRACK`, pct, internal emails (default OFF)
- [x] Analytics: `native_track_open`, `native_track_fallback_hybrid`, `push_open_track`
- [x] Play internal + TestFlight dogfood (flags OFF until allowlist build)
- [x] Android debug dogfood APK build verified (local compile green)
- [ ] Install + manual verification matrix on device
- [ ] iOS TestFlight internal (Mac/Xcode)
- [ ] 48h internal hold before any 1% discussion

## Phase 2 — Location + push polish
- [ ] Native geolocation permission UX
- [ ] Push → native track deep link
- [ ] HTTPS App Links / Universal Links (optional but high value)

## Phase 3 — Discovery / menu / cart (read-mostly)
- [ ] Native home/discovery
- [ ] Native menu browse + add-to-cart (local cart parity)
- [ ] Keep checkout hybrid until payments hardened

## Phase 4 — Checkout / payments
- [ ] Native checkout with Razorpay/UPI native SDKs
- [ ] Highest risk — longest canary

## Phase 5 — Auth unification + retire hybrid routes
- [ ] Native auth primary
- [ ] Remove WebView for migrated routes only after 100% stable ≥ 14 days
- [ ] Voice / assistant last (flag-off today)

## Explicitly deferred
- Big-bang rewrite
- Flutter / RN reconsideration (see decision appendix in blueprint)
- Changing package/bundle IDs
- Backend schema breaks
