# PricingSDK — M8 Pricing & Commerce Platform

**Version:** `1.0.0`  
**Architecture:** v1.0 certified & frozen  
**Status:** **FROZEN** (`PRICING_SDK_FROZEN = true`)  
**Module:** `pricing`  
**Governance:** [ADR-025](../../docs/adr/ADR-025-pricing-platform-v1-freeze.md) (Accepted)

---

## Purpose

Provider-neutral **Pricing & Commerce Platform** for BhojanOS M8. Contracts, DTOs, ports, feature flags, orchestration, projection evidence chain, and standalone adapter/rollout/certification infrastructure.

**Runtime:** All flags default OFF. Legacy authoritative. No production routing.

**v1.0 documentation:** [docs/m8/v1.0/](../../docs/m8/v1.0/)

---

## Public API (frozen v1.0)

```typescript
import { createPricingSDK } from './factory/createPricingSDK';

const sdk = createPricingSDK();
const result = await sdk.getPrice({ tenantId, itemId });
```

### `PricingSDK` methods

| Method | Returns |
|--------|---------|
| `getPrice` | `SdkAsyncResult<PriceResult>` |
| `calculatePrice` | `SdkAsyncResult<PriceCalculation>` |
| `validatePricing` | `SdkResult<PricingValidationResult>` |
| `applyCoupon` | `SdkAsyncResult<CouponApplication>` |
| `calculateTaxes` | `SdkAsyncResult<TaxBreakdown>` |
| `calculateDeliveryFee` | `SdkAsyncResult<FeeResult>` |
| `calculatePackagingFee` | `SdkAsyncResult<FeeResult>` |
| `calculateFinalBill` | `SdkAsyncResult<FinalBill>` |

Full signatures: [PRICING-PUBLIC-API-v1.md](../../docs/m8/v1.0/PRICING-PUBLIC-API-v1.md)

---

## Architecture layers

```
PricingFacade (PR-5) → PricingSDK (PR-1, PR-4) → PricingRepository (PR-3)
                              LEGACY AUTHORITATIVE

Standalone (NOT wired): Projection · Parity · Soak · Operations · Adapter · Rollout · Certification
```

Diagram: [PRICING-ARCHITECTURE.md](../../docs/m8/v1.0/PRICING-ARCHITECTURE.md)

---

## Feature flags (11 total — all default OFF)

### Core SDK (`featureFlags/featureFlags.ts`)

| Flag | Env key |
|------|---------|
| `FF_PRICING_ENABLED` | `VITE_FF_PRICING_ENABLED` |
| `FF_DYNAMIC_PRICING_ENABLED` | `VITE_FF_DYNAMIC_PRICING_ENABLED` |
| `FF_COUPONS_ENABLED` | `VITE_FF_COUPONS_ENABLED` |
| `FF_OFFERS_ENABLED` | `VITE_FF_OFFERS_ENABLED` |
| `FF_PRICING_PROJECTION_ENABLED` | `VITE_FF_PRICING_PROJECTION_ENABLED` |
| `FF_PRICING_PROJECTION_PARITY_ENABLED` | `VITE_FF_PRICING_PROJECTION_PARITY_ENABLED` |
| `FF_PRICING_PROJECTION_SOAK_ENABLED` | `VITE_FF_PRICING_PROJECTION_SOAK_ENABLED` |
| `FF_PRICING_OPERATIONAL_VALIDATION_ENABLED` | `VITE_FF_PRICING_OPERATIONAL_VALIDATION_ENABLED` |

### Standalone infrastructure

| Flag | Module |
|------|--------|
| `FF_PRICING_PROJECTION_ADAPTER_ENABLED` | `adapter/` (PR-11) |
| `FF_PRICING_PROJECTION_ROLLOUT_ENABLED` | `rollout/` (PR-12) |
| `FF_PRICING_PROJECTION_CERTIFICATION_ENABLED` | `certification/` (PR-13) |

Matrix: [PRICING-COMPATIBILITY-MATRIX.md](../../docs/m8/v1.0/PRICING-COMPATIBILITY-MATRIX.md)

---

## Version metadata

| Constant | Value |
|----------|-------|
| `PRICING_SDK_VERSION` | `1.0.0` |
| `PRICING_SDK_FROZEN` | `true` |

Breaking changes require ADR + major version bump.

---

## Tests

```bash
npm run test:sdk
```

- **1326** full suite · **293** pricing-focused
- Matrix: [PRICING-TEST-MATRIX.md](../../docs/m8/v1.0/PRICING-TEST-MATRIX.md)

---

## Independence

M8 does **not** modify M1–M7 frozen platforms. Adapter, rollout, and certification are **not wired** into `createPricingSDK()`.

---

**STOP.** M8 PR-16 blocked until ARB approval.
