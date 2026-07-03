# Pricing SDK Orchestration — M8 PR-4

Orchestration layer wiring PricingSDK → Repository → Domain → DTOs.

## Flow

```
PricingSDK (contract)
        ↓
DefaultPricingAdapter
        ↓
PricingSdkOrchestrator
        ↓
PricingRepository + PricingDomainValidator
        ↓
SDK DTOs
```

## Factory Resolution

```typescript
import { createPricingSDK } from '@/sdk/pricing/factory/createPricingSDK';

const sdk = createPricingSDK({
  pricingSdk?,           // 1. Injected SDK
  featureFlags?,         // 2. FF_PRICING_ENABLED → DefaultPricingAdapter
  pricingRepository?,    //    (requires repository or persistencePort)
  persistencePort?,
  onTelemetry?,          // 3. Else → StubPricingAdapter
});
```

**Flag ON without repository injection → `UNAVAILABLE` for repository-backed methods.**

## Supported Operations

| Method | Repository | Domain Validation | Notes |
|--------|------------|-------------------|-------|
| `getPrice` | ✓ | ✓ | Full orchestration |
| `calculatePrice` | ✓ | ✓ | Repository must support calculation |
| `validatePricing` | — | ✓ | Input validation only |
| `applyCoupon`, taxes, fees, bill | — | — | `NOT_CONFIGURED` (calculator PR) |

## Telemetry

Placeholder hook only — events: `pricing_request`, `repository_read`, `validation_completed`, `pricing_success`, `pricing_failure`.

**STOP — M8 PR-5 (Pricing Facade) requires ARB approval.**
