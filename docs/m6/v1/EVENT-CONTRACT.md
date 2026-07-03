# Event Contract — BhojanOS M6 v1 (Frozen)

**Version:** 1.0.0  
**Status:** Frozen  
**Effective:** 2026-06-26  
**Owner:** M6 Event Platform / Architecture Review Board  
**ADR:** [ADR-019](../../adr/ADR-019-event-contract-freeze.md)

---

## 1. Scope

This document is the **master contract** for all BhojanOS domain events. It applies to:

- Every platform that emits or consumes events (M1–M6 and future platforms)
- Every projection worker registered on the event spine
- Every schema registered in the Event Schema Registry

This contract governs **naming, versioning, compatibility, ownership, lifecycle, security, and observability**. It does not define runtime wiring — that remains in M6 PR-1 through PR-4 infrastructure.

---

## 2. Frozen Infrastructure Baseline

The following M6 deliverables are certified and form the implementation baseline:

| PR | Capability | SDK Version |
|----|------------|-------------|
| PR-1 | Event Platform Foundation | `0.1.0-foundation` |
| PR-2 | Event Infrastructure | `0.2.0-infrastructure` |
| PR-3 | Outbox Persistence + Shadow Publishing | `0.3.0-persistence` |
| PR-4 | Projection Worker Foundation | `0.4.0-projection` |

All feature flags default **OFF**. No business events are published in production until M6 PR-5+ with explicit ARB approval.

---

## 3. Canonical Envelope

Every event MUST conform to `EventEnvelope<TPayload>`:

```typescript
interface EventEnvelope<TPayload> {
  header: {
    eventId: EventId;              // UUID — idempotency key
    type: EventTypeName;           // e.g. order.created.v1
    version: string;               // Schema semver e.g. 1.0.0
    aggregateType: string;
    aggregateId: AggregateId;
    occurredAt: string;            // ISO 8601 UTC
  };
  metadata: {
    correlationId: CorrelationId;  // REQUIRED
    causationId?: CausationId;
    tenantId?: string;
    userId?: string;
    traceId?: string;
    idempotencyKey?: string;
  };
  payload: TPayload;
}
```

### Obligations

| Role | Obligation |
|------|------------|
| **Producer (Domain)** | Emit only after domain invariant validation; write to Outbox atomically with aggregate mutation |
| **EventSDK** | Validate envelope, enrich metadata, enforce schema registry lookup |
| **Subscriber** | Idempotent processing; respect consumer group partitioning |
| **Projection Worker** | Checkpoint after successful handler invocation; never skip validation |
| **Presentation** | NEVER accesses Firestore or event bus directly — Facades and Frozen SDKs only |

---

## 4. Event Naming

All event names MUST follow:

```
<context>.<aggregate>.<action>.v<major>
```

See [EVENT-NAMING-STANDARD.md](./EVENT-NAMING-STANDARD.md).

Examples:

- `order.created.v1`
- `menu.item.updated.v1`
- `branch.assignment.completed.v1`
- `projection.checkpoint.saved.v1`

Event names are **immutable** once Published. Create a new major version instead of renaming.

---

## 5. Versioning

Two independent version axes exist:

| Axis | Example | Governs |
|------|---------|---------|
| **Event name major** | `order.created.v1` → `order.created.v2` | Breaking payload or semantic change |
| **Schema semver** | `1.0.0` → `1.1.0` | Payload field evolution within a major |
| **Projection version** | `1.0.0` → `2.0.0` | Handler logic change (independent of event version) |

See [EVENT-VERSIONING.md](./EVENT-VERSIONING.md) and [EVENT-COMPATIBILITY.md](./EVENT-COMPATIBILITY.md).

---

## 6. Ownership

Every event MUST have a registered owner before publication. See [EVENT-OWNERSHIP-MATRIX.md](./EVENT-OWNERSHIP-MATRIX.md).

Required fields: Owner Platform, Aggregate, Producer, Consumers, Schema Version, Compatibility Policy, Retention, Replay Supported.

---

## 7. Lifecycle

Events progress through: **Draft → Approved → Published → Deprecated → Retired**.

No event may be consumed in production until **Published**. See [EVENT-LIFECYCLE.md](./EVENT-LIFECYCLE.md).

---

## 8. Compatibility

- **Backward compatible:** New consumers can read old events
- **Forward compatible:** Old consumers can read new events (within same event major)
- **Breaking changes:** Require new event major (`.v2`) and ARB approval

See [EVENT-COMPATIBILITY.md](./EVENT-COMPATIBILITY.md) and [EVENT-SCHEMA-EVOLUTION.md](./EVENT-SCHEMA-EVOLUTION.md).

---

## 9. Projection Contract

Every projection worker MUST declare immutable `ProjectionIdentity`:

```typescript
interface ProjectionIdentity {
  projectionName: string;
  projectionVersion: string;       // Semver — independent of event version
  consumerGroup: string;
  ownerPlatform: string;
  replaySupported: boolean;
  checkpointStrategy: 'event_id' | 'sequence';
}
```

Duplicate identity registration MUST fail. See [ADR-020](../../adr/ADR-020-projection-identity-freeze.md).

---

## 10. Security & Observability

- PII MUST NOT appear in event payloads without classification and ARB approval
- `correlationId` is REQUIRED on every envelope
- `causationId` MUST link derived events to their triggering event
- See [EVENT-SECURITY.md](./EVENT-SECURITY.md) and [EVENT-OBSERVABILITY.md](./EVENT-OBSERVABILITY.md)

---

## 11. Explicit Exclusions (v1 Freeze)

The following are **out of scope** for v1 governance freeze:

- Business event implementations (M6 PR-5+)
- Production event bus wiring
- Firestore checkpoint adapters for projections
- Order, Menu, Search, Discovery, Branch projection handlers
- Presentation layer changes
- M1–M5 frozen SDK modifications

---

## 12. Compliance

Any deviation from this contract requires:

1. Architecture Review Board approval
2. New or amended ADR
3. Catalog update in [EVENT-CATALOG.md](./EVENT-CATALOG.md)
4. Compatibility review per [EVENT-GOVERNANCE-CHECKLIST.md](./EVENT-GOVERNANCE-CHECKLIST.md)

---

## 13. References

- [EVENT-CATALOG.md](./EVENT-CATALOG.md)
- [OS-SPINE-ARCHITECTURE.md](../OS-SPINE-ARCHITECTURE.md)
- [ADR-018](../../adr/ADR-018-event-platform.md) — Event Platform Foundation
- M6 PR-1 through PR-4 reports

---

*Event Contract v1.0.0 — frozen 2026-06-26. Governed by ADR-019.*
