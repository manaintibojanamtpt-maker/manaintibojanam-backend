# Pricing Platform Release Notes v1.0

**Release:** Pricing & Commerce Platform v1.0.0  
**Date:** 2026-07-03  
**Program:** BHOS-M8 PR-15

---

## Summary

M8 PR-15 promotes Pricing Platform **version metadata** to v1.0.0 frozen. No runtime behaviour changes. No feature flag changes. ADR-025 Accepted.

---

## Metadata promoted

| Constant | Before | After |
|----------|--------|-------|
| `PRICING_SDK_VERSION` | `0.1.0-foundation` | `1.0.0` |
| `PRICING_SDK_FROZEN` | `false` | `true` |

---

## What's included

### Public API (frozen)

- `PricingSDK` — 8 methods
- `createPricingSDK()` factory
- `PricingRepository` port
- `PricingFacade` presentation surface

### Version exports

```typescript
PRICING_SDK_VERSION  // '1.0.0'
PRICING_SDK_FROZEN   // true
```

---

## What's NOT included

- Production pricing enablement
- PricingSDK → adapter wiring
- Firestore migration
- Feature flag rollout (flags default OFF)
- Git tag execution (commands documented only)

---

## Test evidence

```
npm run test:sdk
1326 / 1326 passing
```

---

## Upgrade notes

No upgrade required for behaviour — metadata promotion only. Consumers should assert `PRICING_SDK_VERSION === '1.0.0'` and `PRICING_SDK_FROZEN === true`.

---

## Certification verdict

**CONDITIONAL GO** — platform frozen; production activation prohibited.

---

## References

- [PRICING-PLATFORM-CERTIFICATION.md](./PRICING-PLATFORM-CERTIFICATION.md)
- [docs/releases/pricing-platform-v1.0.md](../../releases/pricing-platform-v1.0.md)
- [ADR-025](../../adr/ADR-025-pricing-platform-v1-freeze.md)

---

**STOP.** Await ARB approval before M8 PR-16.
