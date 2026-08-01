# OrderBhojan True-Native Migration

**Status:** Phase 0 **LOCKED** (2026-07-31) · Phase 1 host wiring **landed** (flags OFF; dogfood next)  
**Strategy:** Strangler-pattern — Capacitor hybrid remains default; native screens ship behind route-level flags.  
**App ID (immutable):** `com.bhojanos.orderbhojan` (Android + iOS)

### Phase 0 lock (do not drift)
Contracts under `contracts/` are approved and frozen for slice 01. Changes require coordinator approval.

## Documents
| Artifact | Path |
|----------|------|
| Route / deep-link / auth contracts | `contracts/route-and-session-contracts.md` |
| Analytics parity matrix | `contracts/analytics-parity-matrix.md` |
| Feature-flag / rollout contracts | `contracts/feature-flags-and-rollout.md` |
| Native architecture | `architecture/native-architecture.md` |
| Decision appendix (RN/Flutter) | `architecture/decision-appendix.md` |
| Phase backlog | `backlog/phase-backlog.md` |
| First slice: order tracking | `slices/01-order-tracking/` |
| Rollout checklist | `rollout/rollout-checklist.md` |
| Test strategy | `qa/test-strategy.md` |

## First native slice
**Order tracking** (`track` / `/orders/:orderId/track`) behind `FF_NATIVE_HOST` + `FF_NATIVE_TRACK`.
Hybrid remains default; kill switch restores WebView instantly.

## Hard rules
1. Do not change package/bundle ID.
2. Backend APIs remain system of record.
3. Hybrid stays operational until a route is proven native.
4. Every native route needs a kill switch + hybrid fallback.
5. No big-bang cutover.
