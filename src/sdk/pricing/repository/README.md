# Pricing Repository — M8 PR-3

Persistence abstraction layer for PricingSDK. **Mapping only** — no pricing calculations, domain validation, or Firestore implementation.

## Architecture

```
PricingSDK (unchanged)
        ↓
PricingRepository (contract — ports.ts)
        ↓
PricingRepositoryAdapter
        ↓
PricingPersistencePort (contract only)
        ↓
Future Firestore Adapter (M8 PR-4+)
```

## Factory Resolution

```typescript
import { createPricingRepository } from '@/sdk/pricing/repository/PricingRepositoryFactory';

const repository = createPricingRepository({
  repository?,      // 1. Use injected repository directly
  persistencePort?, // 2. With FF_PRICING_ENABLED + port → adapter
  featureFlags?,    // 3. Otherwise → stub (NOT_CONFIGURED)
});
```

**Not wired into `createPricingSDK()`** — standalone factory only.

## Files

| File | Purpose |
|------|---------|
| `PricingPersistenceModels.ts` | Provider-neutral persistence records |
| `PricingRepositoryPorts.ts` | `PricingPersistencePort` + factory options |
| `PricingRepositoryMapper.ts` | Record → DTO mapping, sort/filter |
| `PricingRepositoryAdapter.ts` | Persistence-backed `PricingRepository` |
| `StubPricingRepository.ts` | All methods → `NOT_CONFIGURED` |
| `PricingRepositoryFactory.ts` | `createPricingRepository()` |

## Error Mapping

Known codes pass through: `NOT_FOUND`, `VALIDATION`, `NOT_CONFIGURED`, `UNAVAILABLE`.  
Unknown codes → `UNAVAILABLE`.

## Out of Scope

Firestore adapter · Pricing engine · GST calculations · Runtime wiring · `createPricingSDK()` integration

**STOP — M8 PR-4 (Pricing SDK Orchestration) requires ARB approval.**
