# Pricing Catalog Shadow Projection — M8 PR-7

First pricing shadow projection worker using **mock event envelopes only**.

## Flow

```
Mock pricing event envelope
        ↓
PricingProjectionWorker (FF_PRICING_PROJECTION_ENABLED)
        ↓
In-memory repository + metadata snapshot
        ↓
{ applied: true | false }
```

## Events

- `pricing.catalog.created.v1`
- `pricing.catalog.updated.v1`
- `pricing.catalog.deleted.v1`

## Read Model

Metadata only: `priceListId`, counts, `pricingVersion`, `status` — **no price values**.

## Flag

`FF_PRICING_PROJECTION_ENABLED` — default **OFF**

**STOP — M8 PR-8 (Parity Validation) requires ARB approval.**
