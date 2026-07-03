# Order Event Domain (M6 PR-5)

Pure domain types and builders for order business events. **No SDK imports. No Firestore.**

## Events

| Event | Payload builder |
|-------|-----------------|
| `order.created.v1` | `buildOrderCreatedPayload()` |
| `order.updated.v1` | `buildOrderUpdatedPayload()` |
| `order.cancelled.v1` | `buildOrderCancelledPayload()` |

## Schema

- Schema version: `1.0.0`
- Payload version: `1.0.0`
- Aggregate type: `Order`

See `docs/m6/v1/EVENT-CATALOG.md` for governance.

**STOP.** Shadow publish only — no consumers or projections in PR-5.
