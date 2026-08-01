# Feature flags and rollout contracts

**STATUS: PHASE 0 LOCKED — 2026-07-31**  
Defaults remain **OFF**. Hybrid fallback must not be removed.

## Kill switches
| Flag | Default | Meaning |
|------|---------|---------|
| `FF_NATIVE_HOST` | false | Master: allow any native screen host |
| `FF_NATIVE_TRACK` | false | Order tracking native screen |
| `FF_NATIVE_TRACK_PCT` | 0 | Sticky % of devices (0–100) |
| `FF_NATIVE_TRACK_INTERNAL_EMAILS` | "" | Smallest cohort allowlist |

Pattern matches existing voice-core rollout: **master + pct + internal emails**. Instant rollback = master false.

## Rollout sequence (every native route)
1. Internal email dogfood (pct=0)
2. Play internal / TestFlight
3. 1% → 5% → 10% → 25% → 100%
4. On mismatch/error spike → master OFF (hybrid resumes)

## Coexistence
- Capacitor shell remains the installed app binary during Phase 0–2.
- Native Compose/SwiftUI screens mount **inside** the same application ID (Activity/UIViewController host) OR as modules loaded by a thin native shell that still embeds hybrid for non-migrated routes.
- Preferred strangler: **Native shell + hybrid WebView fallback** per route.

## Version-aware routing
```
if FF_NATIVE_HOST && FF_NATIVE_TRACK && inCohort(user, device):
  show NativeTrack(orderId)
else:
  show HybridWebView("/orders/{orderId}/track")
```
