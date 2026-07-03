# Pricing Platform Architecture v1.0

**Status:** Frozen — M8 PR-14  
**Date:** 2026-07-03

---

## 1. Architecture overview

The Pricing & Commerce Platform follows the BhojanOS layered SDK pattern with strangler-fig migration for projection reads.

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation                          │
│                 PricingFacade (PR-5)                     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                 PricingSDK (PR-1, PR-4)                  │
│             createPricingSDK() → Orchestrator              │
│        8 methods · flags · stub when disabled            │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│            PricingRepository (PR-3)                        │
│          Provider-neutral read/calc port                 │
│              LEGACY AUTHORITATIVE                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         Standalone Infrastructure (NOT wired)            │
│                                                          │
│  PR-6  Projection Foundation                           │
│  PR-7  Shadow Catalog Projection                       │
│  PR-8  Parity Validation                               │
│  PR-9  Soak Certification                              │
│  PR-10 Operational Validation                          │
│  PR-11 Read Adapter (legacy ↔ projection)              │
│  PR-12 Staged Rollout Policy                           │
│  PR-13 Switch Certification                            │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Layer responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Domain** | `src/domain/pricing/` | Pure business rules — money, tax, coupons, projection, parity, soak, operations, adapter, rollout, certification |
| **SDK** | `src/sdk/pricing/` | Contracts, DTOs, orchestration, infrastructure factories, telemetry |
| **Presentation** | `src/lib/pricing/` | `PricingFacade` — maps UI operations to SDK |
| **Repository** | `src/sdk/pricing/repository/` | Read/calculation port abstraction |

---

## 3. Domain modules

| Module | PR | Purpose |
|--------|-----|---------|
| Core models | PR-2 | Money, tax, coupons, price lists |
| `projection/` | PR-6 | Checkpoint, snapshot rules |
| `projections/pricing/` | PR-7 | Catalog read model |
| `parity/` | PR-8 | Comparison rules |
| `parity/soak/` | PR-9 | Soak thresholds |
| `operations/` | PR-10 | Lag, drift, replay rules |
| `adapter/` | PR-11 | Routing decisions |
| `rollout/` | PR-12 | Stage policy |
| `certification/` | PR-13 | GO/NO-GO decisions |

---

## 4. SDK modules

| Module | PR | Wired to PricingSDK? |
|--------|-----|----------------------|
| `contracts/` | PR-1 | ✅ Public API |
| `dto/` | PR-1 | ✅ Public API |
| `orchestration/` | PR-4 | ✅ Default path |
| `repository/` | PR-3 | ✅ Injected port |
| `featureFlags/` | PR-1 | ✅ Gating |
| `projection/` | PR-6 | ❌ Standalone |
| `projections/pricing/` | PR-7 | ❌ Standalone |
| `parity/` | PR-8 | ❌ Standalone |
| `parity/soak/` | PR-9 | ❌ Standalone |
| `operations/` | PR-10 | ❌ Standalone |
| `adapter/` | PR-11 | ❌ Standalone |
| `rollout/` | PR-12 | ❌ Standalone |
| `certification/` | PR-13 | ❌ Standalone |

---

## 5. Feature flag architecture

```
FF_PRICING_ENABLED ─────────────► PricingSDK gate
  ├── FF_COUPONS_ENABLED ────────► applyCoupon gate
  ├── FF_OFFERS_ENABLED ─────────► offer paths
  ├── FF_DYNAMIC_PRICING_ENABLED ► dynamic pricing
  ├── FF_PRICING_PROJECTION_ENABLED ► projection evidence
  │     ├── FF_PRICING_PROJECTION_PARITY_ENABLED
  │     ├── FF_PRICING_PROJECTION_SOAK_ENABLED
  │     └── FF_PRICING_OPERATIONAL_VALIDATION_ENABLED
  ├── FF_PRICING_PROJECTION_ADAPTER_ENABLED (standalone)
  ├── FF_PRICING_PROJECTION_ROLLOUT_ENABLED (standalone)
  └── FF_PRICING_PROJECTION_CERTIFICATION_ENABLED (standalone)
```

---

## 6. Certification flow (PR-13 — standalone)

```
Evidence → Certification Engine → Readiness → Decision Package → STOP
```

No routing. No adapter activation. No SDK wiring.

---

## 7. Version metadata (PR-14 unchanged)

| Constant | Value | PR-14 |
|----------|-------|-------|
| `PRICING_SDK_VERSION` | `1.0.0` | Promoted PR-15 |
| `PRICING_SDK_FROZEN` | `true` | Promoted PR-15 |

Promotion to `1.0.0` / `true` completed in M8 PR-15.

---

**STOP.** Architecture certified at documentation level only.
