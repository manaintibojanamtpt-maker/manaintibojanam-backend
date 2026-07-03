# M6 PR-7 — First Order Read Projection Report

**Program:** BHOS-M6-A  
**PR:** M6 PR-7 — First Order Read Projection (Shadow)  
**Date:** 2026-06-26  
**Status:** Complete — awaiting ARB approval  
**SDK Version:** `0.7.0-order-projection`

---

## 1. Executive Summary

M6 PR-7 delivers the **first business read projection** — a shadow order read model built from canonical order events. The projection consumes `order.created.v1`, `order.updated.v1`, and `order.cancelled.v1` events and maintains an in-memory read model for infrastructure validation.

**Shadow only.** OrderSDK continues reading the legacy source. No runtime consumers, no Firestore migration, no UI, no SDK modifications. Quad flag gate defaults OFF.

---

## 2. Architecture

```
Legacy Order Write (authoritative)
  ↓
Shadow Event (PR-5)
  ↓
Outbox
  ↓
Projection Worker (PR-4)
  ↓
OrderProjectionWorker (PR-7)
  ↓
OrderProjectionRepository (in-memory)
  ↓
OrderProjectionSnapshot (in-memory)
  ↓
STOP — OrderSDK reads legacy source
```

---

## 3. Projection Lifecycle

```
1. OrderProjectionWorker checks quad flag gate
2. Validate envelope (supported event type, correlationId)
3. Validate state transition (create/update/cancel rules)
4. Load existing read model from repository
5. Map event → read model via OrderProjectionMapper
6. Validate read model (required fields, no PII)
7. Save read model to repository
8. Build and save snapshot record
9. Emit telemetry (started, processed, completed, snapshot_saved)
10. Return OrderProjectionProcessResult { applied: true/false }
```

---

## 4. Read Model Schema

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `orderId` | string | Yes | Aggregate ID |
| `tenantId` | string | Yes | Tenant scope |
| `status` | string | Yes | Order status |
| `branchId` | string | No | From event metadata |
| `customerId` | string | No | From `userId` in payload — ID only |
| `totalAmount` | number | No | Monetary total |
| `currency` | string | Yes | Default `INR` |
| `createdAt` | ISO string | Yes | First event timestamp |
| `updatedAt` | ISO string | Yes | Last event timestamp |
| `version` | string | Yes | Event schema version |
| `projectionVersion` | string | Yes | `1.0.0` |

**No PII:** No phone, email, customerName, or address.

---

## 5. Projection State Transitions

| Event | Precondition | Action |
|-------|--------------|--------|
| `order.created.v1` | None (idempotent create allowed) | Build new read model |
| `order.updated.v1` | Read model must exist | Apply status/totalAmount update |
| `order.cancelled.v1` | Read model must exist | Set cancelled status |

Unsupported events are rejected at validation. Update/cancel without existing model returns `{ applied: false }`.

---

## 6. Telemetry

| Event | When |
|-------|------|
| `order_projection_started` | Processing begins |
| `order_projection_event_processed` | Event mapped and saved |
| `order_projection_completed` | Successful completion |
| `order_projection_failed` | Validation or mapping failure |
| `order_projection_snapshot_saved` | Snapshot persisted |

---

## 7. Feature Flags

| Flag | Default | Required |
|------|---------|----------|
| `FF_EVENT_PLATFORM_ENABLED` | OFF | Yes |
| `FF_EVENT_PROJECTION_ENABLED` | OFF | Yes |
| `FF_EVENT_PROJECTION_RUNTIME_ENABLED` | OFF | Yes |
| `FF_ORDER_READ_PROJECTION_ENABLED` | OFF | Yes |

All four flags must be enabled for projection execution.

---

## 8. Generated Files

### SDK — `src/sdk/events/projections/order/`

| File | Purpose |
|------|---------|
| `OrderProjectionWorker.ts` | Main projection processor |
| `OrderProjectionMapper.ts` | Event → read model mapping |
| `OrderProjectionRepository.ts` | In-memory shadow store |
| `OrderProjectionSnapshot.ts` | Snapshot persistence |
| `OrderProjectionValidator.ts` | Envelope and read model validation |
| `OrderProjectionTelemetry.ts` | Telemetry hooks |
| `createOrderProjectionWorker.ts` | Factory and bundle wiring |
| `README.md` | Module documentation |

### Domain — `src/domain/events/projections/order/`

| File | Purpose |
|------|---------|
| `OrderProjectionState.ts` | Read model and snapshot types |
| `OrderProjectionBuilders.ts` | State transition builders |
| `OrderProjectionValidation.ts` | Pure validation rules |
| `OrderProjectionMetadata.ts` | Identity and event constants |
| `README.md` | Domain documentation |

### Ports — `src/sdk/events/contracts/orderProjectionPorts.ts`

Repository, snapshot, worker, and process result contracts.

### Tests

| File | Tests |
|------|-------|
| `src/sdk/__tests__/eventSdkOrderProjection.test.ts` | 12 |
| `src/domain/events/projections/order/__tests__/orderProjectionDomain.test.ts` | 10 |

---

## 9. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Premature OrderSDK switch | No SDK changes; legacy remains authoritative |
| PII leakage in read model | Domain validation forbids phone/email/name/address |
| Production impact | Quad flag gate; all flags default OFF |
| Event ordering gaps | Update/cancel without create returns `applied: false` |
| Firestore migration pressure | In-memory repository only; no persistence layer |

---

## 10. Rollback Plan

1. Disable `FF_ORDER_READ_PROJECTION_ENABLED` (default OFF)
2. No data migration required — in-memory store only
3. OrderSDK unaffected — continues legacy reads
4. Remove handler registration if wired in future PRs
5. Revert SDK version to `0.6.0-projection-runtime` if needed

---

## 11. Migration Roadmap

| Phase | PR | Scope |
|-------|-----|-------|
| Shadow publish | PR-5 ✅ | Order events to outbox |
| Projection runtime | PR-6 ✅ | Generic runtime infrastructure |
| **Shadow read model** | **PR-7 ✅** | **First order projection** |
| Parity validation | PR-8 🔒 | Compare projection vs legacy (ARB blocked) |
| OrderSDK adapter switch | PR-8 🔒 | Route reads to projection (ARB blocked) |
| Firestore persistence | Future | Durable projection store |
| Production consumers | Future | After parity proven |

---

## 12. Definition of Ready

- [x] PR-5 order shadow events frozen and tested
- [x] PR-4 projection worker foundation available
- [x] PR-6 projection runtime available
- [x] Event catalog defines order.created/updated/cancelled v1
- [x] ARB scope approved for shadow projection only

---

## 13. Definition of Done

- [x] OrderProjectionWorker consumes three order event types
- [x] In-memory repository and snapshot store implemented
- [x] Pure domain layer with no SDK/Firestore imports
- [x] `FF_ORDER_READ_PROJECTION_ENABLED` added (default OFF)
- [x] Quad flag gate enforced
- [x] Telemetry events emitted
- [x] Deterministic tests with mocked infrastructure
- [x] No OrderSDK, Presentation, UI, or runtime consumer changes
- [x] SDK version bumped to `0.7.0-order-projection`
- [x] Documentation complete

---

## 14. Certification Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Shadow projection only | ✅ |
| 2 | OrderSDK unchanged | ✅ |
| 3 | No Firestore migration | ✅ |
| 4 | No runtime wiring | ✅ |
| 5 | No production consumers | ✅ |
| 6 | All flags default OFF | ✅ |
| 7 | No PII in read model | ✅ |
| 8 | Deterministic tests pass | ✅ |
| 9 | Additive changes only | ✅ |
| 10 | Rollback-safe | ✅ |

---

**STOP.** Do not proceed to M6 PR-8 (OrderSDK Adapter Switch) without explicit ARB approval.
