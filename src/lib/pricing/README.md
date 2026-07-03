# Pricing Facade — M8 PR-5

**The only presentation entry point** for pricing operations. Delegates exclusively to `PricingSDK`.

## Architecture

```
Future UI
    ↓
PricingFacade (this module)
    ↓
PricingSDK
    ↓
Repository → Domain
```

## Usage

```typescript
import { createPricingFacade } from '@/lib/pricing/PricingFacadeFactory';

const facade = createPricingFacade();

const outcome = await facade.getPrice({
  tenantId: 'tenant-1',
  itemId: 'item-1',
});

if (outcome.ok) {
  console.log(outcome.value.totalPrice);
} else {
  console.log(outcome.error.userMessage);
}
```

## Session Lifecycle

States: `idle` | `loading` | `success` | `empty` | `error` | `disabled` | `retry` | `cancelled`

```typescript
facade.subscribeSession((snapshot) => console.log(snapshot.status));
facade.resetSession();
await facade.retry(); // max 3 retries for retryable failures
```

## Factory

Default: `createPricingSDK({ featureFlags: readPricingFlag })`

When `FF_PRICING_ENABLED` is OFF → disabled session + `NOT_CONFIGURED`

## API

| Method | SDK Delegation |
|--------|----------------|
| `getPrice` | `PricingSDK.getPrice` |
| `calculatePrice` | `PricingSDK.calculatePrice` |
| `validatePricing` | `PricingSDK.validatePricing` |
| `applyCoupon` | `PricingSDK.applyCoupon` |
| `getDeliveryCharge` | `PricingSDK.calculateDeliveryFee` |
| `getPackagingCharge` | `PricingSDK.calculatePackagingFee` |
| `getPriceList` | `NOT_CONFIGURED` (awaiting SDK surface) |

## Rules

- No repository, domain, Firestore, or runtime imports
- No React hooks
- Telemetry placeholders only

**STOP — M8 PR-6 (Pricing Projection Foundation) requires ARB approval.**
