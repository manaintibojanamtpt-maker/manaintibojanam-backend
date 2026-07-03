# Release Notes — Pricing & Commerce Platform v1.0.0

**Tag:** `pricing-platform-v1.0`  
**Date:** 2026-07-03  
**Authority:** ADR-025  
**Program:** M8 PR-1 through PR-15

---

## Summary

First **stable, frozen** release of the Pricing & Commerce Platform. Public contracts are frozen for external-style consumption. PR-15 promotes version metadata only — no new features, no behaviour changes.

---

## Version

```typescript
PRICING_SDK_VERSION  // '1.0.0'
PRICING_SDK_FROZEN   // true
```

---

## Architecture Summary

```
PricingFacade → PricingSDK → PricingRepository (LEGACY AUTHORITATIVE)

Standalone (NOT wired): Projection · Parity · Soak · Operations · Adapter · Rollout · Certification
```

All 11 feature flags default **OFF**. No production routing.

---

## Public API (frozen)

| Method | Description |
|--------|-------------|
| `getPrice` | Single item price lookup |
| `calculatePrice` | Full price calculation |
| `validatePricing` | Sync structural validation |
| `applyCoupon` | Coupon application |
| `calculateTaxes` | Tax / GST breakdown |
| `calculateDeliveryFee` | Delivery charge |
| `calculatePackagingFee` | Packaging charge |
| `calculateFinalBill` | Final bill assembly |

Factory: `createPricingSDK(options?)`

---

## Compatibility

- **Backward compatible** with `0.1.0-foundation` — identical behaviour
- All 11 `FF_PRICING_*` flags remain default OFF
- Adapter, rollout, certification not wired into PricingSDK
- M1–M7 frozen platforms unchanged

Matrix: `docs/m8/v1.0/PRICING-COMPATIBILITY-MATRIX.md`

---

## Release Notes

- Metadata promotion only (PR-15)
- ADR-025 Accepted
- Governance pack complete (PR-14)
- 1326 / 1326 tests passing

Full notes: `docs/m8/v1.0/PRICING-RELEASE-NOTES-v1.md`

---

## Rollback

```bash
git revert <PR-15-commit>
# Restore PRICING_SDK_VERSION = '0.1.0-foundation', PRICING_SDK_FROZEN = false
npm run test:sdk
```

If tag applied:

```bash
git tag -d pricing-platform-v1.0
git push origin :refs/tags/pricing-platform-v1.0
```

Procedures: `docs/m8/v1.0/PRICING-ROLLBACK.md`

---

## Certification

**Verdict:** CONDITIONAL GO  
**Production activation:** NO GO (flags OFF; staging soak required)

Report: `docs/m8/v1.0/PRICING-PLATFORM-CERTIFICATION.md`

---

## Documentation

| Document | Path |
|----------|------|
| Certification | `docs/m8/v1.0/PRICING-PLATFORM-CERTIFICATION.md` |
| Public API | `docs/m8/v1.0/PRICING-PUBLIC-API-v1.md` |
| Compatibility | `docs/m8/v1.0/PRICING-COMPATIBILITY-MATRIX.md` |
| Rollback | `docs/m8/v1.0/PRICING-ROLLBACK.md` |
| ADR | `docs/adr/ADR-025-pricing-platform-v1-freeze.md` |

---

## Pre-tag checklist

- [x] Public methods documented  
- [x] DTOs documented  
- [x] ADR-025 accepted  
- [x] Version constant promoted to `1.0.0`  
- [x] `PRICING_SDK_FROZEN = true`  
- [x] SDK tests pass (`npm run test:sdk`)  
- [ ] Git tag `pricing-platform-v1.0` applied  
- [ ] **72h staging soak** before production flag enablement  

---

## Git tag commands (do not execute automatically)

```bash
git checkout main
git pull origin main
npm run test:sdk
git tag -a pricing-platform-v1.0 -m "Pricing Platform v1.0.0 — ADR-025 frozen release (M8 PR-15)"
git show pricing-platform-v1.0
git push origin pricing-platform-v1.0
```

---

**STOP.** Production activation prohibited until staging soak and explicit ARB rollout approval.
