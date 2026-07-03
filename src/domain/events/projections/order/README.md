# Order Read Projection Domain (M6 PR-7)

Shadow read model for order events. **Pure domain — no SDK imports. No Firestore.**

## Events Consumed

- `order.created.v1`
- `order.updated.v1`
- `order.cancelled.v1`

## Read Model

No PII — IDs only (`customerId`, `branchId`). No phone, email, or address.

**STOP.** Shadow only — OrderSDK continues reading legacy source.
