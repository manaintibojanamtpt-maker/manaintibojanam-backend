# Pricing Read Adapter (M8 PR-11)

Standalone adapter routing pricing reads between **legacy repository** and **shadow projection**. **NOT wired into `createPricingSDK()`.**

## Architecture

```
Presentation → PricingSDK (unchanged) → Legacy Repository ✓

Standalone: PricingReadAdapter → Legacy | Projection → PriceResult DTO
```

## Feature flag

- `FF_PRICING_PROJECTION_ADAPTER_ENABLED` (default OFF, independent from PricingSDK flags)

## Routing gates

Projection selected only when:

1. `FF_PRICING_PROJECTION_ADAPTER_ENABLED` = ON
2. Projection soak = READY
3. Operational validation = GREEN
4. Projection repository healthy

Otherwise → legacy with automatic fallback on projection failures.

## Factory

`createPricingAdapterInfrastructure()`

**STOP.** Await ARB approval before M8 PR-12 (Controlled Pricing Projection Rollout).
