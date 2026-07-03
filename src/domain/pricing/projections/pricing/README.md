# Pricing Catalog Shadow Projection Domain — M8 PR-7

Pure domain for the first pricing shadow projection. **Metadata and counts only** — no price values, GST, coupons, offers, or campaign payloads.

## Read Model

`PricingCatalogProjectionReadModel` — aggregate root keyed by `priceListId`.

## Events (mock schemas)

- `pricing.catalog.created.v1`
- `pricing.catalog.updated.v1`
- `pricing.catalog.deleted.v1`

**STOP — parity/soak/operational validation requires ARB approval.**
