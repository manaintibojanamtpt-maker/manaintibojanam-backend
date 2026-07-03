# Pricing Compatibility Matrix v1.0

**Status:** Frozen — M8 PR-14  
**Date:** 2026-07-03

---

## 1. Supported clients

| Client | Integration path | v1.0 support | Notes |
|--------|------------------|--------------|-------|
| **Presentation (future)** | `PricingFacade` → `PricingSDK` | ✅ Full | PR-5; legacy when flag OFF |
| **Server / SSR** | `createPricingSDK()` with injected ports | ✅ Supported | No UI in SDK core |
| **Unit tests** | Mock `PricingSDK` + facade deps | ✅ Supported | 293 pricing-focused tests |
| **Menu platform** | No pricing integration | ✅ Unchanged | Frozen M7 |
| **Order platform** | No pricing integration | ✅ Unchanged | Frozen M6 |
| **Event platform** | No pricing integration | ✅ Unchanged | Frozen M6 |

---

## 2. Platform dependency matrix

| Dependency | Required for | If unavailable |
|------------|--------------|----------------|
| `FF_PRICING_ENABLED` | Any PricingSDK method | `StubPricingAdapter` → `NOT_CONFIGURED` |
| `FF_COUPONS_ENABLED` | `applyCoupon` | Coupon returns `NOT_CONFIGURED` |
| `FF_OFFERS_ENABLED` | Offer paths | Offer returns `NOT_CONFIGURED` |
| `FF_DYNAMIC_PRICING_ENABLED` | Dynamic pricing | Static pricing only |
| Legacy persistence port | Live pricing reads | Stub / unavailable |
| Projection flags (PR-6+) | Shadow evidence only | Evidence modules skip |
| Adapter flag (PR-11) | Adapter routing | Legacy only (default) |
| Rollout flag (PR-12) | Rollout policy | Stage 0 / legacy |
| Certification flag (PR-13) | Switch certification | `NOT_READY` |

**Production default:** all OFF. Legacy authoritative.

---

## 3. Feature flag inventory (11 flags)

### Core PricingSDK (`src/sdk/pricing/featureFlags/featureFlags.ts`)

| Flag | Default | Env key |
|------|---------|---------|
| `FF_PRICING_ENABLED` | OFF | `VITE_FF_PRICING_ENABLED` |
| `FF_DYNAMIC_PRICING_ENABLED` | OFF | `VITE_FF_DYNAMIC_PRICING_ENABLED` |
| `FF_COUPONS_ENABLED` | OFF | `VITE_FF_COUPONS_ENABLED` |
| `FF_OFFERS_ENABLED` | OFF | `VITE_FF_OFFERS_ENABLED` |
| `FF_PRICING_PROJECTION_ENABLED` | OFF | `VITE_FF_PRICING_PROJECTION_ENABLED` |
| `FF_PRICING_PROJECTION_PARITY_ENABLED` | OFF | `VITE_FF_PRICING_PROJECTION_PARITY_ENABLED` |
| `FF_PRICING_PROJECTION_SOAK_ENABLED` | OFF | `VITE_FF_PRICING_PROJECTION_SOAK_ENABLED` |
| `FF_PRICING_OPERATIONAL_VALIDATION_ENABLED` | OFF | `VITE_FF_PRICING_OPERATIONAL_VALIDATION_ENABLED` |

### Standalone infrastructure

| Flag | Default | Env key | Module |
|------|---------|---------|--------|
| `FF_PRICING_PROJECTION_ADAPTER_ENABLED` | OFF | `VITE_FF_PRICING_PROJECTION_ADAPTER_ENABLED` | Read adapter (PR-11) |
| `FF_PRICING_PROJECTION_ROLLOUT_ENABLED` | OFF | `VITE_FF_PRICING_PROJECTION_ROLLOUT_ENABLED` | Rollout (PR-12) |
| `FF_PRICING_PROJECTION_CERTIFICATION_ENABLED` | OFF | `VITE_FF_PRICING_PROJECTION_CERTIFICATION_ENABLED` | Switch cert (PR-13) |

---

## 4. Feature flag combinations

### Core PricingSDK

| `FF_PRICING` | `FF_COUPONS` | `FF_OFFERS` | Behaviour |
|--------------|--------------|-------------|-----------|
| OFF | * | * | Stub SDK — no pricing reads |
| ON | OFF | OFF | Core reads; coupons/offers `NOT_CONFIGURED` |
| ON | ON | ON | Full SDK surface (when repository configured) |

### Projection evidence chain (standalone — not PricingSDK routing)

| Projection | Parity | Soak | Operational | Behaviour |
|------------|--------|------|-------------|-----------|
| OFF | * | * | * | No projection evidence |
| ON | OFF | * | * | Foundation only |
| ON | ON | OFF | * | Parity validation |
| ON | ON | ON | OFF | Soak certification |
| ON | ON | ON | ON | Full operational evidence |

### Adapter / rollout / certification (standalone)

| Adapter | Rollout | Certification | Behaviour |
|---------|---------|---------------|-----------|
| OFF | * | * | Legacy only; no adapter routing |
| ON | OFF | * | Adapter gates; stage 0 |
| ON | ON | OFF | Staged rollout policy |
| ON | ON | ON | Full switch certification |

**None of these flags change PricingSDK default routing in v1.0.**

---

## 5. Enable sequence (staging)

1. `FF_PRICING_ENABLED` — core SDK reads
2. `FF_COUPONS_ENABLED` / `FF_OFFERS_ENABLED` — as needed
3. `FF_PRICING_PROJECTION_ENABLED` — projection foundation
4. `FF_PRICING_PROJECTION_PARITY_ENABLED` — parity validation
5. `FF_PRICING_PROJECTION_SOAK_ENABLED` — soak certification
6. `FF_PRICING_OPERATIONAL_VALIDATION_ENABLED` — operational evidence
7. `FF_PRICING_PROJECTION_ADAPTER_ENABLED` — adapter (staging only)
8. `FF_PRICING_PROJECTION_ROLLOUT_ENABLED` — rollout policy (staging only)
9. `FF_PRICING_PROJECTION_CERTIFICATION_ENABLED` — switch certification

**Production enable sequence:** identical order with ARB sign-off at each gate. Default remains all OFF.

---

## 6. Rollback ordering (reverse enable sequence)

1. Disable `FF_PRICING_PROJECTION_CERTIFICATION_ENABLED`
2. Disable `FF_PRICING_PROJECTION_ROLLOUT_ENABLED`
3. Disable `FF_PRICING_PROJECTION_ADAPTER_ENABLED`
4. Disable `FF_PRICING_OPERATIONAL_VALIDATION_ENABLED`
5. Disable `FF_PRICING_PROJECTION_SOAK_ENABLED`
6. Disable `FF_PRICING_PROJECTION_PARITY_ENABLED`
7. Disable `FF_PRICING_PROJECTION_ENABLED`
8. Disable `FF_COUPONS_ENABLED` / `FF_OFFERS_ENABLED` / `FF_DYNAMIC_PRICING_ENABLED`
9. Disable `FF_PRICING_ENABLED` (full pricing off)

---

## 7. SDK version compatibility

| Version | Status | Notes |
|---------|--------|-------|
| `0.1.0-foundation` | Pre-release | Internal development only |
| `1.0.0` | **Current runtime** | Post-ARB metadata promotion (PR-15) |
| `< 1.0.0` | Pre-release | Internal development only |

### Provider neutrality

- Repository port abstracts Firestore, REST, or in-memory providers
- No provider-specific types in public DTOs
- Orchestration delegates to injected `PricingRepository`

---

## 8. Migration prerequisites

Before any production enablement:

1. ARB acceptance of ADR-025
2. M8 PR-15 version constant promotion
3. 72-hour staging soak with flags ON (staging only)
4. PR-13 switch certification `READY` or `CONDITIONAL`
5. Explicit production activation approval (separate from v1.0 freeze)

---

**STOP.** No production routing in v1.0 documentation freeze.
