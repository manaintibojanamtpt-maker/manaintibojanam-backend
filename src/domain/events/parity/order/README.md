# Order Parity Domain (M6 PR-8)

Pure domain for order projection parity validation. **No SDK imports. No Firestore.**

## Purpose

Normalize legacy and projection order views into a shared canonical model and compare business fields without modifying either source.

## Compare

`orderId`, `tenantId`, `status`, `branchId`, `customerId`, `currency`, `totalAmount`, timestamps, line items, `version`

## Ignored

Projection metadata, telemetry, checkpoint metadata.

## Outcomes

`MATCH`, `MISSING_IN_PROJECTION`, `MISSING_IN_LEGACY`, `FIELD_MISMATCH`, `VERSION_MISMATCH`, `UNSUPPORTED_EVENT`

**STOP.** Validation only — OrderSDK continues reading legacy source.
