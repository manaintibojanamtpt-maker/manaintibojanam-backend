# Pricing Operational Validation (M8 PR-10)

Evidence-only operational validation for the **Pricing Projection Platform**. No PricingSDK routing. No Firestore.

## Architecture

```
Operational Sample Source → PricingOperationalValidator
        → Lag Analyzer → Replay Validator → Drift Detector
        → Health Monitor → Operational Report → STOP
```

## Feature flags (quad gate)

- `FF_PRICING_PROJECTION_ENABLED`
- `FF_PRICING_PROJECTION_PARITY_ENABLED`
- `FF_PRICING_PROJECTION_SOAK_ENABLED`
- `FF_PRICING_OPERATIONAL_VALIDATION_ENABLED` (default OFF)

## Factory

`createPricingOperationalInfrastructure()`

**STOP.** Await ARB approval before M8 PR-11 (Pricing Read Adapter Layer).
