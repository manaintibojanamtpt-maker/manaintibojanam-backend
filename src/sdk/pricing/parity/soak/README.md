# Pricing Projection Soak & Certification (M8 PR-9)

Evidence-only certification over **pricing projection parity reports**. No PricingSDK routing. No Firestore.

## Architecture

```
Pricing Parity Reports
        ↓
PricingProjectionSoakRunner
        ↓
PricingProjectionAnalyzer
        ↓
Health Assessment → Certification Report → STOP
```

## Feature flags (triple gate)

- `FF_PRICING_PROJECTION_ENABLED`
- `FF_PRICING_PROJECTION_PARITY_ENABLED`
- `FF_PRICING_PROJECTION_SOAK_ENABLED` (default OFF)

## Factory

`createPricingProjectionSoakInfrastructure()`

**STOP.** Await ARB approval before M8 PR-10 (Pricing Operational Validation).
