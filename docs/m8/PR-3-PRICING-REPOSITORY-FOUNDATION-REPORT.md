# M8 PR-3 — Pricing Repository Foundation Report

**Program:** BHOS-M8  
**Milestone:** M8 PR-3 — Pricing Repository Foundation  
**Status:** Complete — Awaiting Architecture Review Board approval  
**Date:** 2026-07-03

---

## Executive Summary

M8 PR-3 delivers the **Pricing Repository Foundation** — persistence abstraction for PricingSDK with provider-neutral record models, a persistence port contract, repository adapter, mapper, stub repository, and standalone factory. No changes were made to PricingSDK public contracts, DTOs, pricing domain, feature flags, or frozen M1–M7 platforms.

**Test result:** 1098 / 1098 passing (+18 from PR-2 baseline of 1080).

---

## Architecture Validation

| Constraint | Status |
|------------|--------|
| PricingSDK public contracts unchanged | ✓ |
| Pricing DTOs unchanged | ✓ |
| Pricing Domain unchanged | ✓ |
| M1–M7 frozen platforms untouched | ✓ |
| No Firestore implementation | ✓ |
| No runtime wiring | ✓ |
| No UI / React | ✓ |
| No Event / Menu / Order integration | ✓ |
| No `createPricingSDK()` wiring | ✓ |
| No new feature flags | ✓ |

---

## Generated Files

| File | Purpose |
|------|---------|
| `repository/PricingPersistenceModels.ts` | 12 persistence record types + search result |
| `repository/PricingRepositoryPorts.ts` | `PricingPersistencePort` + DI options |
| `repository/PricingRepositoryMapper.ts` | Record → DTO mapping, sort/filter helpers |
| `repository/PricingRepositoryAdapter.ts` | Persistence-backed repository + connection/search helpers |
| `repository/StubPricingRepository.ts` | All methods → `NOT_CONFIGURED` |
| `repository/PricingRepositoryFactory.ts` | `createPricingRepository()` |
| `repository/README.md` | Module documentation |
| `__tests__/pricingRepositoryFoundation.test.ts` | 18 repository tests |

---

## Persistence Models

Provider-neutral records (no Firestore types):

- `PriceRecord`, `TaxRecord`, `GSTRecord`
- `DiscountRecord`, `CouponRecord`, `CampaignRecord`, `OfferRecord`
- `PriceListRecord`, `BranchPriceOverrideRecord`
- `DeliveryChargeRecord`, `PackagingChargeRecord`
- `PricingSearchRecordResult`

---

## Repository Mapping

| Persistence | SDK / Mapped Output |
|-------------|---------------------|
| `PriceRecord` | `PriceResult` |
| `PriceListRecord` | `MappedPriceList` (sorted, active-filtered entries) |
| `BranchPriceOverrideRecord` | `MappedBranchPricing` (via mapper helper) |
| `CouponRecord` | `MappedCoupon` |
| `CampaignRecord` | `MappedCampaign` |
| `OfferRecord` | `MappedOffer` |
| Search hits | `MappedPricingSearchResult` |

`calculatePrice` and `getBranchPricing` (contract) return `NOT_CONFIGURED` — calculations and branch resolution require future orchestration context.

---

## Dependency Injection

```typescript
createPricingRepository({
  repository?,       // Priority 1: use directly
  persistencePort?,  // Priority 2: with FF_PRICING_ENABLED → adapter
  featureFlags?,     // Priority 3: stub
});
```

Uses existing `resolvePricingEnabled()` from `createPricingSDK.ts` without modifying SDK factory wiring.

---

## Error Mapping

| Incoming | Outgoing |
|----------|----------|
| `NOT_FOUND` | Pass through |
| `VALIDATION` | Pass through |
| `NOT_CONFIGURED` | Pass through |
| `UNAVAILABLE` | Pass through |
| Unknown | `UNAVAILABLE` |

---

## Testing Summary

| Suite | Tests | Status |
|-------|-------|--------|
| Full `npm run test:sdk` | 1098 | ✓ Pass |
| `pricingRepositoryFoundation.test.ts` | 18 | ✓ Pass |

Coverage: factory resolution, stub, adapter, mapper, DI, sorting, filtering, persistence model mapping, error mapping, connection validation, search delegation.

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| SDK contract drift | None | ports.ts untouched |
| Domain coupling | None | No domain imports |
| Accidental runtime wiring | Low | Factory standalone; not in createPricingSDK |
| Production impact | None | Stub default; flags OFF |

---

## Rollback Plan

1. Remove `src/sdk/pricing/repository/` directory
2. Remove `pricingRepositoryFoundation.test.ts` from `package.json` test:sdk
3. Run `npm run test:sdk` — expect 1080 passing
4. No SDK, domain, or flag changes required

---

## Definition of Done

- [x] Repository abstraction completed
- [x] Persistence port defined
- [x] Mapper operational
- [x] Stub repository operational
- [x] Factory operational
- [x] Dependency injection complete
- [x] PricingSDK unchanged
- [x] Pricing Domain unchanged
- [x] No runtime wiring
- [x] Documentation complete
- [x] 1095+ tests passing (1098 achieved)

---

## Certification Checklist

- [x] Repository abstraction only
- [x] Persistence contracts complete
- [x] Provider neutral
- [x] No runtime behaviour changes
- [x] Rollback safe
- [x] Frozen platforms untouched
- [x] M8 PR-4 NOT started

---

**STOP — M8 PR-4 (Pricing SDK Orchestration) requires explicit Architecture Review Board approval.**
