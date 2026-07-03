# Pricing Projection Parity (M8 PR-8)

Validation-only parity between **legacy pricing repository** reads and **shadow projection** read models. No PricingSDK routing switch. No Firestore.

## Architecture

```
Legacy Pricing Repository → PricingParityMapper → Canonical Pricing Model
Projection Repository     → PricingParityMapper → Canonical Pricing Model
                                                    ↓
                                          PricingParityComparator
                                                    ↓
                                             Parity Report
                                                    ↓
                                                  STOP
```

## Feature flags

- `FF_PRICING_PROJECTION_ENABLED`
- `FF_PRICING_PROJECTION_PARITY_ENABLED` (default OFF)

Both flags must be ON for parity validation to run.

## Factory

`createPricingParityInfrastructure()`

**STOP.** Await ARB approval before M8 PR-9 (Pricing Projection Soak & Certification).
