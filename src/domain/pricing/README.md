# Pricing Domain — M8 PR-2

Pure domain layer for the BhojanOS Pricing platform. **Validation and structural rules only** — no pricing engine, tax calculations, coupon redemption, or persistence.

## Version

- Domain version: `0.2.0-domain-foundation`
- Schema version: `2`

## Structure

```
src/domain/pricing/
├── money/        Money, Currency, MoneyBuilder, MoneyValidation
├── gst/          GSTRate, GSTCategory, GSTBreakdown, GSTValidation
├── tax/          Re-exports GST types (placeholder for future tax modules)
├── pricing/      BasePrice, EffectivePrice, PriceSnapshot, PriceList, BranchPriceOverride
├── discount/     Discount, DiscountType, DiscountPolicy, DiscountResult
├── coupon/       Coupon, CouponEligibility, CouponValidation, CouponResult
├── campaign/     Campaign, CampaignWindow, CampaignEligibility
├── offer/        Offer, OfferRule, OfferPriority
├── delivery/     DeliveryCharge, DeliveryRule, DeliveryZone
├── packaging/    PackagingCharge, PackagingRule
├── validation/   Module validators + PricingDomainValidator facade
└── shared/       Constants, reason codes, result types
```

## Rules

- Pure functions only
- No SDK, Firestore, repository, Event, Menu, or Order imports
- No async business logic
- Deterministic validators

## Usage

```typescript
import { PricingDomainValidator } from './validation/PricingDomainValidator';
import { buildMoney } from './money';

const validator = new PricingDomainValidator();
const result = validator.validateMoney(buildMoney(100));
```

## Out of Scope (PR-2)

Pricing engine · GST calculations · Coupon/campaign/offer execution · Repository · Firestore · Runtime · UI

**STOP — M8 PR-3 (Repository Foundation) requires ARB approval.**
