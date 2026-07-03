# M8 PR-2 — Pricing Domain Foundation Report

**Program:** BHOS-M8  
**Milestone:** M8 PR-2 — Pricing Domain Foundation  
**Status:** Complete — Awaiting Architecture Review Board approval  
**Domain Version:** `0.2.0-domain-foundation`  
**Date:** 2026-07-03

---

## Executive Summary

M8 PR-2 delivers the complete **pure Pricing Domain Foundation** for the BhojanOS Commerce Platform. All domain models, validation rules, builders, constants, and deterministic validators are implemented under `src/domain/pricing/` without modifying PricingSDK contracts, DTOs, feature flags, or any frozen M1–M7 platforms.

This PR establishes validation-only business rules for Money, GST, Pricing, Discounts, Coupons, Campaigns, Offers, Delivery, and Packaging. No pricing engine, tax calculations, coupon redemption, repository, Firestore, runtime wiring, or presentation changes were introduced.

**Test result:** 1080 / 1080 passing (+27 from PR-1 baseline of 1053).

---

## Architecture Validation

| Constraint | Status |
|------------|--------|
| M1–M7 frozen platforms unchanged | ✓ |
| PricingSDK public contracts unchanged | ✓ |
| Pricing DTOs unchanged | ✓ |
| Feature flag defaults unchanged | ✓ |
| No repository implementation | ✓ |
| No Firestore | ✓ |
| No runtime wiring | ✓ |
| No UI / React | ✓ |
| No Event integration | ✓ |
| No Menu integration | ✓ |
| No Order integration | ✓ |
| Pure domain functions only | ✓ |
| Deterministic validators | ✓ |

---

## Generated Files

### Shared

| File | Purpose |
|------|---------|
| `shared/PricingDomainConstants.ts` | Version, schema, decimal precision |
| `shared/PricingReasonCodes.ts` | Expanded reason codes and messages |
| `shared/PricingDomainResult.ts` | Result and validation result helpers |
| `shared/PricingDomainTypes.ts` | Shared domain type aliases |

### Modules

| Module | Files |
|--------|-------|
| `money/` | Money, Currency, MoneyBuilder, MoneyValidation, index |
| `gst/` | GST types, GSTValidation |
| `tax/` | Re-exports GST (placeholder) |
| `pricing/` | BasePrice, EffectivePrice, PriceSnapshot, PriceList, BranchPriceOverride, PricingValidation |
| `discount/` | Discount, DiscountPolicy, DiscountResult, DiscountValidation |
| `coupon/` | Coupon, CouponEligibility, CouponResult, CouponValidation |
| `campaign/` | Campaign, CampaignWindow, CampaignEligibility, CampaignValidation |
| `offer/` | Offer, OfferRule, OfferPriority, OfferValidation |
| `delivery/` | DeliveryZone, DeliveryRule, DeliveryCharge, DeliveryValidation |
| `packaging/` | PackagingRule, PackagingCharge, PackagingValidation |

### Validators

| File | Purpose |
|------|---------|
| `validation/MoneyValidator.ts` | Money facade |
| `validation/GSTValidator.ts` | GST facade |
| `validation/PriceValidator.ts` | Pricing facade |
| `validation/DiscountValidator.ts` | Discount facade |
| `validation/CouponValidator.ts` | Coupon facade |
| `validation/CampaignValidator.ts` | Campaign facade |
| `validation/OfferValidator.ts` | Offer facade |
| `validation/DeliveryValidator.ts` | Delivery facade |
| `validation/PackagingValidator.ts` | Packaging facade |
| `validation/PricingDomainValidator.ts` | Aggregate facade |
| `validation/pricingRules.ts` | Legacy re-exports |

### Tests & Docs

| File | Purpose |
|------|---------|
| `__tests__/pricingDomainFoundation.test.ts` | 37 domain tests |
| `README.md` | Domain module documentation |
| `docs/m8/PR-2-PRICING-DOMAIN-FOUNDATION-REPORT.md` | This report |

### Removed (PR-1 scaffold superseded)

- `price/Price.ts`
- `priceList/PriceList.ts`
- `branch/BranchPricing.ts`
- `charges/Charges.ts`
- `tax/Tax.ts`

---

## Domain Model

```
Presentation (future)
        ↓
PricingFacade (future)
        ↓
PricingSDK (M8 PR-1 — frozen)
        ↓
Pricing Domain (M8 PR-2 — THIS PR)
        ↓
Repository (future — M8 PR-3)
        ↓
Persistence (future)
```

### Key Models

- **Money** — Immutable `{ amount, currency }`; zero allowed; decimal precision capped at 2
- **GSTRate** — CGST, SGST, IGST, CESS placeholder; validation only
- **BasePrice / EffectivePrice** — Structural pricing with branch override placeholder
- **PriceSnapshot** — Immutable captured price state
- **Discount** — Percentage, fixed; manual/automatic modes
- **Coupon** — Tenant, expiry, usage limit, enabled/active validation
- **Campaign** — Time window and eligibility validation
- **Offer** — Percentage, fixed, buy_x_get_y placeholder
- **DeliveryRule / PackagingRule** — Charge structure validation

---

## Validation Rules

All validators return `PricingDomainValidationResult` with `{ valid, errors[] }`.

| Validator | Key Rules |
|-----------|-----------|
| MoneyValidator | amount ≥ 0, finite; currency required; decimal precision ≤ 2 |
| GSTValidator | rates 0–100%; category required; breakdown amounts ≥ 0 |
| PriceValidator | non-negative money; price list non-empty; branch override ids required |
| DiscountValidator | type enum; value ≥ 0; percentage ≤ 100 |
| CouponValidator | code required; enabled/active; not expired; usage not exceeded |
| CampaignValidator | window valid; active in window; tenant required |
| OfferValidator | kind enum; buy_x_get_y quantities positive integers |
| DeliveryValidator | zone/rule ids; non-negative charges |
| PackagingValidator | rule label; non-negative charges |

---

## Business Rules

1. **Immutability** — MoneyBuilder and snapshot builders return frozen objects
2. **No negative amounts** — All monetary values must be ≥ 0
3. **Currency required** — All money-bearing structures require currency code
4. **Effective price builder** — Applies active branch override when item matches (structural only)
5. **Coupon temporal validation** — Expiry and usage checked deterministically with injectable `nowIso`
6. **Campaign window validation** — Active campaigns must fall within `[startsAt, endsAt]`
7. **No execution** — Discounts, coupons, campaigns, offers validate structure only

---

## Testing Summary

| Suite | Tests | Status |
|-------|-------|--------|
| Full `npm run test:sdk` | 1080 | ✓ Pass |
| `pricingDomainFoundation.test.ts` | 37 | ✓ Pass |
| `pricingSdkFoundation.test.ts` (PR-1) | 13 | ✓ Pass (unchanged) |

Coverage areas: Money, Currency, GST, Price, Discount, Coupon, Campaign, Offer, Delivery, Packaging, Validators, Reason codes, Constants, Result helpers.

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Domain/SDK drift | Low | SDK not modified; domain isolated |
| Breaking PR-1 imports | Low | Legacy `pricingRules.ts` re-exports maintained |
| Premature execution logic | None | Validation-only; no engines |
| Production impact | None | No runtime wiring |

---

## Rollback Plan

1. Revert `src/domain/pricing/` to PR-1 scaffold (git revert)
2. Restore deleted PR-1 files if needed (`price/`, `priceList/`, etc.)
3. Revert domain version constants to `0.1.0-foundation`
4. Run `npm run test:sdk` — expect 1053 passing
5. No SDK, flag, or infrastructure changes required for rollback

---

## Definition of Done

- [x] Complete domain module structure per spec
- [x] All validators operational and deterministic
- [x] No infrastructure imports
- [x] PricingSDK unchanged
- [x] DTOs unchanged
- [x] Feature flags unchanged
- [x] Documentation complete
- [x] 1070+ tests passing (1080 achieved)

---

## Certification Checklist

- [x] Pure domain foundation only
- [x] No production behaviour changes
- [x] Rollback safe
- [x] Provider neutral
- [x] Frozen platforms untouched
- [x] M8 PR-3 NOT started

---

**STOP — M8 PR-3 (Pricing Repository Foundation) requires explicit Architecture Review Board approval.**
