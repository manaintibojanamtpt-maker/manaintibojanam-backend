# Pricing Rollback Procedures v1.0

**Status:** Frozen — M8 PR-14  
**Date:** 2026-07-03  
**Default state:** All flags OFF — legacy authoritative

---

## 1. Rollback overview

| Level | Scope | Time to recover | Trigger |
|-------|-------|-----------------|---------|
| **L1** | Feature flag rollback | < 1 min | Any pricing flag ON causes issues |
| **L2** | Adapter rollback | < 5 min | Projection reads incorrect |
| **L3** | Deployment rollback | < 15 min | Code regression |
| **L4** | Projection replay | < 1 hour | Data corruption / cascade failure |

---

## 2. L1 — Feature flag rollback

**Fastest recovery.** Disable the offending flag(s). No redeployment required.

### Core flags

| Flag | Disable effect |
|------|----------------|
| `FF_PRICING_ENABLED` | All PricingSDK methods → `NOT_CONFIGURED` |
| `FF_COUPONS_ENABLED` | Coupons disabled |
| `FF_OFFERS_ENABLED` | Offers disabled |
| `FF_DYNAMIC_PRICING_ENABLED` | Dynamic pricing disabled |
| `FF_PRICING_PROJECTION_ENABLED` | Projection evidence stops |
| `FF_PRICING_PROJECTION_PARITY_ENABLED` | Parity checks stop |
| `FF_PRICING_PROJECTION_SOAK_ENABLED` | Soak monitoring stops |
| `FF_PRICING_OPERATIONAL_VALIDATION_ENABLED` | Operational checks stop |

### Infrastructure flags

| Flag | Disable effect |
|------|----------------|
| `FF_PRICING_PROJECTION_ADAPTER_ENABLED` | Adapter routing disabled → legacy only |
| `FF_PRICING_PROJECTION_ROLLOUT_ENABLED` | Rollout policy disabled → stage 0 |
| `FF_PRICING_PROJECTION_CERTIFICATION_ENABLED` | Certification evaluation stops |

### Emergency L1 sequence (all pricing flags OFF)

1. Set all 11 pricing flags to `false`
2. Verify `createPricingSDK()` returns stub / legacy behaviour
3. Confirm no projection telemetry emitted
4. Run smoke: `getPrice` via legacy path

**Recovery time:** < 1 minute (config change only).

---

## 3. L2 — Adapter rollback

When adapter is enabled and projection reads are incorrect:

1. **L2a:** Disable `FF_PRICING_PROJECTION_ADAPTER_ENABLED` → all reads route to legacy
2. **L2b:** If rollout was active, disable `FF_PRICING_PROJECTION_ROLLOUT_ENABLED`
3. Verify adapter telemetry shows `pricing_adapter_legacy_selected` only
4. Run parity check to confirm legacy data integrity

**Adapter default:** legacy only. Adapter OFF is the safe state.

**Note:** Adapter is not wired into PricingSDK in v1.0 — L2 applies when adapter is explicitly consumed.

---

## 4. L3 — Deployment rollback

When a code regression affects pricing behaviour:

1. Execute L1 (all flags OFF) immediately
2. Roll back deployment to last known-good release
3. Verify test suite: `npm run test:sdk` → 1326/1326
4. Re-enable flags one at a time in staging (see compatibility matrix enable sequence)
5. Do NOT re-enable in production without PR-13 certification `READY`

---

## 5. L4 — Projection replay

When projection data is corrupted:

1. Execute L1 + L2 immediately
2. Disable all projection flags
3. Replay projection from last known-good checkpoint (PR-6 infrastructure)
4. Re-run parity validation (PR-8) before re-enabling adapter
5. Require PR-13 certification `READY` before production re-activation

---

## 6. Rollback ordering

Reverse of enable sequence — see [PRICING-COMPATIBILITY-MATRIX.md](./PRICING-COMPATIBILITY-MATRIX.md).

---

**STOP.** Legacy remains authoritative in all rollback scenarios.
