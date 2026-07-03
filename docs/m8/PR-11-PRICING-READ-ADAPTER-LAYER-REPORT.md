# M8 PR-11 — Pricing Read Adapter Layer Report

**Program:** BHOS-M8  
**Milestone:** M8 PR-11 — Pricing Read Adapter Layer  
**Status:** Complete — Awaiting Architecture Review Board approval  
**Date:** 2026-07-03

---

## Executive Summary

M8 PR-11 delivers the **standalone Pricing Read Adapter Layer** — routing infrastructure between legacy pricing repository reads and the shadow projection read model with automatic fallback. The adapter is **NOT wired into `createPricingSDK()`**. PricingSDK continues reading legacy sources only.

**Test result:** 1275 / 1275 passing (+24 from PR-10 baseline of 1251).

---

## Architecture Validation

| Constraint | Status |
|------------|--------|
| PricingSDK contracts unchanged | ✓ |
| DTOs unchanged | ✓ |
| Existing pricing domain unchanged (additive adapter/) | ✓ |
| Repository / orchestration / facade unchanged | ✓ |
| PR-6 through PR-10 layers unchanged | ✓ |
| M1–M7 frozen platforms untouched | ✓ |
| Not wired into createPricingSDK() | ✓ |
| No Firestore / runtime / React | ✓ |
| Independent adapter feature flag | ✓ |

---

## Generated Files

### Domain (`src/domain/pricing/adapter/`)

| File | Purpose |
|------|---------|
| `PricingAdapterDecision.ts` | Decision types and factory helpers |
| `PricingReadSource.ts` | `legacy` \| `projection` source type |
| `PricingAdapterRules.ts` | Routing and fallback rules |
| `PricingAdapterMetadata.ts` | Module identity and fallback reason constants |
| `README.md` | Domain documentation |

### SDK (`src/sdk/pricing/adapter/`)

| File | Purpose |
|------|---------|
| `pricingAdapterPorts.ts` | Legacy/projection/readiness/adapter ports |
| `PricingReadAdapter.ts` | Routing orchestrator with automatic fallback |
| `LegacyPricingAdapter.ts` | Legacy repository delegate |
| `ProjectionPricingAdapter.ts` | Projection repository delegate |
| `mapProjectionToPricingDto.ts` | Projection → PriceResult normalization |
| `PricingAdapterFactory.ts` | Infrastructure factory |
| `PricingAdapterValidation.ts` | Query validation |
| `PricingAdapterTelemetry.ts` | Placeholder telemetry hooks |
| `pricingAdapterFeatureFlags.ts` | Independent adapter flag |
| `README.md` | SDK documentation |

### Feature Flag (additive, independent)

| Flag | Default | Environment Variable |
|------|---------|---------------------|
| `FF_PRICING_PROJECTION_ADAPTER_ENABLED` | `false` | `VITE_FF_PRICING_PROJECTION_ADAPTER_ENABLED` |

### Tests

| File | Tests |
|------|-------|
| `pricingAdapterDomain.test.ts` | 8 |
| `pricingReadAdapter.test.ts` | 16 |

---

## Routing Flow

```
Validate request
        ↓
Evaluate routing decision
        ↓
Projection selected?
   YES → ProjectionPricingAdapter → DTO normalization → Return
   NO  → LegacyPricingAdapter → Return
        ↓
Projection failure? → Automatic fallback → Legacy → Return
```

Presentation never knows which source responded.

---

## Decision Matrix

| Condition | Source |
|-----------|--------|
| `FF_PRICING_PROJECTION_ADAPTER_ENABLED` OFF | Legacy |
| Projection soak not READY | Legacy (fallback) |
| Operational validation not GREEN | Legacy (fallback) |
| Projection repository unhealthy | Legacy (fallback) |
| All gates satisfied | Projection |

---

## Fallback Strategy

Automatic fallback to legacy for:

| Failure | Fallback reason |
|---------|-----------------|
| `NOT_FOUND` | Projection price list not found |
| `UNAVAILABLE` | Projection read failed |
| `MAPPER_FAILED` | DTO normalization failed |
| `TIMEOUT` | Projection read timed out |
| `UNKNOWN` | Unexpected projection error |

Projection path never propagates failures to consumers when fallback is enabled.

---

## Telemetry

| Event | When |
|-------|------|
| `pricing_adapter_started` | Read begins |
| `pricing_adapter_completed` | Read finished |
| `pricing_adapter_failed` | Validation or unrecoverable failure |
| `pricing_adapter_projection_selected` | Projection path chosen |
| `pricing_adapter_legacy_selected` | Legacy path chosen |
| `pricing_adapter_fallback` | Fallback triggered |

---

## Testing Summary

| Area | Coverage |
|------|----------|
| Factory resolution | ✓ |
| Legacy routing | ✓ |
| Projection routing | ✓ |
| Projection unavailable | ✓ |
| Repository unhealthy | ✓ |
| Validation failure | ✓ |
| NOT_FOUND fallback | ✓ |
| UNAVAILABLE fallback | ✓ |
| Mapper failure fallback | ✓ |
| Telemetry | ✓ |
| Feature flag OFF | ✓ |
| Readiness not READY | ✓ |
| Operational not GREEN | ✓ |
| DTO normalization | ✓ |
| Adapter never throws | ✓ |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental SDK wiring | Adapter not imported by createPricingSDK() |
| Production routing | Adapter flag OFF by default; readiness gates required |
| DTO contract drift | Uses existing PriceResult DTO only |
| Prior layer regression | Separate adapter directory; PR-6–PR-10 untouched |

---

## Rollback Plan

1. Set `VITE_FF_PRICING_PROJECTION_ADAPTER_ENABLED=false` (default).
2. Remove test entries from `package.json` if reverting entirely.
3. Delete `src/domain/pricing/adapter/` and `src/sdk/pricing/adapter/` directories.
4. No database, runtime, or deployment changes to revert.

---

## Definition of Done

- [x] Standalone adapter implemented
- [x] Automatic fallback operational
- [x] Projection normalization operational
- [x] Telemetry operational
- [x] Feature flag OFF by default
- [x] PricingSDK unchanged
- [x] Not wired into createPricingSDK()
- [x] Documentation complete
- [x] All tests passing (1275)

---

## Certification Checklist

| Item | Status |
|------|--------|
| PricingSDK unchanged | ✓ |
| DTOs unchanged | ✓ |
| Domain (PR-2) unchanged | ✓ |
| Repository unchanged | ✓ |
| Orchestration unchanged | ✓ |
| Facade unchanged | ✓ |
| PR-6–PR-10 unchanged | ✓ |
| M1–M7 frozen | ✓ |
| No Firestore | ✓ |
| No runtime consumers | ✓ |
| Deterministic tests | ✓ |

---

**STOP — M8 PR-12 (Controlled Pricing Projection Rollout) requires explicit ARB approval.**
