# Pricing Platform Public API v1.0

**Status:** Frozen — runtime `1.0.0` (PR-15)  
**Date:** 2026-07-03  
**Source:** `src/sdk/pricing/contracts/PricingSDK.ts`

---

## 1. PricingSDK (frozen public contract)

| Method | Input | Output | Notes |
|--------|-------|--------|-------|
| `getPrice` | `GetPriceQuery` | `SdkAsyncResult<PriceResult>` | Single item price lookup |
| `calculatePrice` | `CalculatePriceQuery` | `SdkAsyncResult<PriceCalculation>` | Full price calculation |
| `validatePricing` | `ValidatePricingInput` | `SdkResult<PricingValidationResult>` | Sync structural validation |
| `applyCoupon` | `ApplyCouponQuery` | `SdkAsyncResult<CouponApplication>` | Coupon application |
| `calculateTaxes` | `CalculateTaxesQuery` | `SdkAsyncResult<TaxBreakdown>` | Tax / GST breakdown |
| `calculateDeliveryFee` | `CalculateDeliveryFeeQuery` | `SdkAsyncResult<FeeResult>` | Delivery charge |
| `calculatePackagingFee` | `CalculatePackagingFeeQuery` | `SdkAsyncResult<FeeResult>` | Packaging charge |
| `calculateFinalBill` | `CalculateFinalBillQuery` | `SdkAsyncResult<FinalBill>` | Final bill assembly |

### Naming aliases (documentation only)

| Colloquial name | Frozen method |
|-----------------|---------------|
| `getTax` | `calculateTaxes` |
| `getFinalBill` | `calculateFinalBill` |

### Factory

```typescript
createPricingSDK(options?: CreatePricingSDKOptions): PricingSDK
```

**Default behaviour:** `FF_PRICING_ENABLED` OFF → `StubPricingAdapter` → `NOT_CONFIGURED`.

---

## 2. PricingRepository (frozen read/calculation port)

| Method | Input | Output |
|--------|-------|--------|
| `getPrice` | `GetPriceQuery` | `SdkAsyncResult<PriceResult>` |
| `calculatePrice` | `CalculatePriceQuery` | `SdkAsyncResult<PriceCalculation>` |
| `getPriceList` | `TenantId`, `PriceListId` | `SdkAsyncResult<unknown>` |
| `applyCoupon` | `ApplyCouponQuery` | `SdkAsyncResult<CouponApplication>` |
| `calculateTaxes` | `CalculateTaxesQuery` | `SdkAsyncResult<TaxBreakdown>` |
| `calculateDeliveryFee` | `CalculateDeliveryFeeQuery` | `SdkAsyncResult<FeeResult>` |
| `calculatePackagingFee` | `CalculatePackagingFeeQuery` | `SdkAsyncResult<FeeResult>` |
| `calculateFinalBill` | `CalculateFinalBillQuery` | `SdkAsyncResult<FinalBill>` |

Source: `src/sdk/pricing/contracts/ports.ts`

---

## 3. PricingFacade (frozen presentation surface)

Presentation MUST use `PricingFacade` — not PricingSDK, PricingRepository, or domain directly.

| Operation | Maps to PricingSDK |
|-----------|-------------------|
| `getPrice` | `getPrice` |
| `calculatePrice` | `calculatePrice` |
| `validatePricing` | `validatePricing` |
| `applyCoupon` | `applyCoupon` |
| `getDeliveryCharge` | `calculateDeliveryFee` |
| `getPackagingCharge` | `calculatePackagingFee` |
| Session lifecycle | `resetPricingSession`, retry, subscribe |

Source: `src/lib/pricing/PricingFacade.ts`

---

## 4. Standalone infrastructure (NOT part of PricingSDK public API)

These modules exist for staging evidence. They are **not wired** into `createPricingSDK()`:

| Module | Factory | Purpose |
|--------|---------|---------|
| Projection Foundation | `createPricingProjectionInfrastructure()` | Coordinator, checkpoint |
| Shadow Projection | `createPricingCatalogShadowProjection()` | Catalog read model |
| Parity | `createPricingParityInfrastructure()` | Legacy vs projection comparison |
| Soak | `createPricingProjectionSoakInfrastructure()` | Soak certification |
| Operational | `createPricingOperationalInfrastructure()` | Lag/drift/replay evidence |
| Read Adapter | `createPricingAdapterInfrastructure()` | Legacy ↔ projection routing |
| Rollout | `createPricingProjectionRollout()` | Staged percentage policy |
| Switch Certification | `createPricingCertificationInfrastructure()` | GO/NO-GO decision packages |

---

## 5. DTO stability

All DTOs in `src/sdk/pricing/dto/` are frozen for v1.0:

- `PriceResult`, `PriceCalculation`, `FinalBill`, `TaxBreakdown`, `FeeResult`
- `CouponApplication`, `PricingValidationResult`
- Query DTOs: `GetPriceQuery`, `CalculatePriceQuery`, `ApplyCouponQuery`, etc.
- Context: `PricingContext`, branded tenant/branch IDs

Breaking changes require ADR + major version bump post-freeze.

---

## 6. Error model

Standard `SdkAsyncResult<T>` / `SdkResult<T>` from SDK core.

Common codes: `NOT_CONFIGURED`, `VALIDATION`, `NOT_FOUND`, `UNAVAILABLE`, `FORBIDDEN`.

---

**STOP.** No contract changes without ADR-025 governance acceptance.
