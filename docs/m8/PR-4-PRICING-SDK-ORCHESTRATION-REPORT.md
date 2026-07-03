# M8 PR-4 — Pricing SDK Orchestration Report

**Program:** BHOS-M8  
**Milestone:** M8 PR-4 — Pricing SDK Orchestration  
**Status:** Complete — Awaiting Architecture Review Board approval  
**Date:** 2026-07-03

---

## Executive Summary

M8 PR-4 delivers the **Pricing SDK Orchestration layer**, wiring `DefaultPricingAdapter` → `PricingSdkOrchestrator` → `PricingRepository` → `PricingDomainValidator` → SDK DTOs. The factory `createPricingSDK()` now routes to orchestrated default adapter when `FF_PRICING_ENABLED` is ON, with stub fallback when OFF.

No changes to PricingSDK public contracts, DTOs, domain models, repository contracts, or feature flag defaults.

**Test result:** 1119 / 1119 passing (+21 from PR-3 baseline of 1098).

---

## Architecture Validation

| Constraint | Status |
|------------|--------|
| PricingSDK contracts unchanged | ✓ |
| DTOs unchanged | ✓ |
| Pricing Domain unchanged | ✓ |
| Repository contracts unchanged | ✓ |
| M1–M7 frozen platforms untouched | ✓ |
| No Firestore | ✓ |
| No runtime / presentation / React | ✓ |
| No cross-platform integration | ✓ |
| Feature flag defaults unchanged | ✓ |

---

## Generated Files

| File | Purpose |
|------|---------|
| `orchestration/PricingSdkOrchestrator.ts` | Request orchestration pipeline |
| `orchestration/DefaultPricingAdapter.ts` | PricingSDK implementation delegating to orchestrator |
| `orchestration/PricingDomainMapper.ts` | SDK DTO ↔ domain structural mapping |
| `orchestration/PricingErrorMapper.ts` | Repository/domain → SDK error translation |
| `orchestration/PricingTelemetry.ts` | Placeholder telemetry hook |
| `orchestration/PricingSdkFactory.ts` | `createOrchestratedPricingSDK()` |
| `orchestration/README.md` | Module documentation |
| `__tests__/pricingSdkOrchestration.test.ts` | 21 orchestration tests |

### Updated (orchestration wiring only)

| File | Change |
|------|--------|
| `factory/createPricingSDK.ts` | Delegates to orchestrated factory |
| `shared/options.ts` | Added repository/persistence/telemetry options |
| `adapters/DefaultPricingAdapter.ts` | Re-exports orchestration adapter |
| `validation/validatePricingQuery.ts` | Added `validateCalculatePriceQuery` |

---

## SDK Flow

1. **Structural validation** — `validateGetPriceQuery`, `validateCalculatePriceQuery`, `validatePricingInput`
2. **Repository enabled check** — `UNAVAILABLE` when flag ON without injection
3. **Repository read** — `getPrice`, `calculatePrice` via `PricingRepository`
4. **Domain validation** — `PricingDomainValidator` on money/effective price
5. **DTO return** — mapped SDK result or error

Calculator methods (`applyCoupon`, taxes, fees, bill) return `NOT_CONFIGURED` — deferred to future PRs.

---

## Repository Integration

Reuses `createPricingRepository()` from M8 PR-3.

| Injection | `repositoryEnabled` | Behavior |
|-----------|---------------------|----------|
| `pricingRepository` | true | Direct repository |
| `persistencePort` | true | Adapter-backed repository |
| Neither (flag ON) | false | `UNAVAILABLE` on repo methods |

---

## Domain Integration

- `mapMoneyDtoToDomain` — structural money mapping
- `mapPriceResultDtoToDomainEffectivePrice` — post-repository domain validation
- `mapValidatePricingInputToDomainLines` — sync validation input mapping
- `PricingDomainValidator.validateMoney` / `validateEffectivePrice`

---

## Factory Resolution

```
createPricingSDK(options)
  → pricingSdk injected? return it
  → FF_PRICING_ENABLED OFF? StubPricingAdapter
  → DefaultPricingAdapter(repository, repositoryEnabled, onTelemetry)
```

Public `CreatePricingSDKOptions` signature extended with optional fields only — backward compatible.

---

## Validation Flow

| Operation | SDK Validation | Repository | Domain Validation |
|-----------|----------------|------------|-----------------|
| getPrice | ✓ | ✓ | ✓ |
| calculatePrice | ✓ | ✓ | ✓ |
| validatePricing | ✓ | — | ✓ |
| applyCoupon / taxes / fees | — | — | NOT_CONFIGURED |

---

## Telemetry

Placeholder `PricingTelemetryHook` emitting: `pricing_request`, `repository_read`, `validation_completed`, `pricing_success`, `pricing_failure`. No runtime consumers.

---

## Testing Summary

| Suite | Tests | Status |
|-------|-------|--------|
| Full `npm run test:sdk` | 1119 | ✓ Pass |
| `pricingSdkOrchestration.test.ts` | 21 | ✓ Pass |
| `pricingSdkFoundation.test.ts` | Updated for orchestration | ✓ Pass |

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Flag ON without repo surprises | Low | Documented UNAVAILABLE behavior |
| Foundation test drift | Low | Tests updated |
| Production impact | None | Flags default OFF |
| Circular factory imports | Low | Same pattern as Menu SDK |

---

## Rollback Plan

1. Revert `createPricingSDK.ts` to return stub default adapter
2. Remove `src/sdk/pricing/orchestration/` directory
3. Restore `shared/options.ts` to PR-1 shape
4. Remove orchestration test from `package.json`
5. Run `npm run test:sdk` — expect 1098 passing

---

## Definition of Done

- [x] Pricing SDK orchestration completed
- [x] DefaultPricingAdapter operational
- [x] Repository integration complete
- [x] Domain validation integrated
- [x] Factory updated
- [x] PricingSDK public API unchanged
- [x] DTOs unchanged
- [x] Feature flags unchanged
- [x] No runtime wiring
- [x] Documentation complete
- [x] 1115+ tests passing (1119 achieved)

---

## Certification Checklist

- [x] Orchestration only — no pricing engine
- [x] No production behavior changes
- [x] Rollback safe
- [x] Frozen platforms untouched
- [x] M8 PR-5 NOT started

---

**STOP — M8 PR-5 (Pricing Facade & Presentation Orchestration) requires explicit Architecture Review Board approval.**
