# Event Schema Evolution — BhojanOS M6 v1

**Version:** 1.0.0  
**Status:** Frozen  
**Effective:** 2026-06-26  
**ADR:** [ADR-022](../../adr/ADR-022-schema-evolution-policy.md)

---

## 1. Purpose

This document defines how event payload schemas evolve over time while preserving platform stability. Schema evolution is governed by the Schema Registry — not ad-hoc code changes.

---

## 2. Schema Registry Contract

Every Published event MUST have a registered schema:

```typescript
interface EventSchema {
  type: EventTypeName;           // e.g. order.created.v1
  version: string;               // Semver e.g. 1.0.0
  payloadSchema: JSONSchema;     // Draft 2020-12 or compatible
  compatibility: 'backward' | 'forward' | 'full' | 'none';
  changelog: string;
  deprecated?: boolean;
  deprecationDate?: string;
  retirementDate?: string;
}
```

---

## 3. Evolution Strategies

### Strategy A — Additive (Preferred)

Add optional fields. Bump schema **minor**.

```json
// v1.0.0
{ "orderId": "...", "totalAmount": 100 }

// v1.1.0 — additive
{ "orderId": "...", "totalAmount": 100, "currency": "INR" }
```

Consumers ignore `currency` if unknown. **No event major bump.**

### Strategy B — Alias Field

Rename with dual-write period. Bump schema **minor** during alias; **major** on removal.

```json
// v1.1.0 — alias period
{ "customerId": "...", "clientId": "..." }  // clientId deprecated

// v1.2.0 — alias only in docs
{ "customerId": "..." }
```

### Strategy C — New Event Major

Breaking semantic or structural change. New event name.

```
order.created.v1  (schema 1.x.x) — legacy
order.created.v2  (schema 1.0.0) — new contract
```

Dual-publish during migration. Deprecate v1 per [EVENT-DEPRECATION.md](./EVENT-DEPRECATION.md).

### Strategy D — Wrapper Envelope (Discouraged)

Nested versioned payload — only for external integrations. Requires ARB exception.

---

## 4. Field Type Evolution

| From → To | Allowed | Strategy |
|-----------|---------|----------|
| `string` → `string` (format change) | ⚠️ | Alias or new major |
| `number` → `string` | ❌ | New event major |
| `optional` → `required` | ❌ | New event major |
| `required` → `optional` | ✅ | Schema minor |
| `enum` add value | ✅ | Schema minor |
| `enum` remove value | ❌ | New event major |
| `array` → `array` (item type change) | ❌ | New event major |
| `object` add optional property | ✅ | Schema minor |
| `object` remove property | ❌ | Deprecation period → new major |

---

## 5. Metadata Evolution

`EventMetadata` fields follow the same rules as payload:

| Field | Required | Evolution |
|-------|----------|-----------|
| `correlationId` | ✅ Always | Immutable |
| `causationId` | Recommended | Additive only |
| `tenantId` | Context-dependent | Additive only |
| `userId` | Context-dependent | Additive only |
| `traceId` | Recommended | Additive only |
| `idempotencyKey` | Recommended for commands | Additive only |

New metadata fields MUST be optional.

---

## 6. Schema Validation Rules

| Stage | Validation |
|-------|------------|
| **Publish (Outbox write)** | Domain validates business invariants; SDK validates envelope |
| **Schema Registry resolve** | Payload validated against registered schema |
| **Projection dispatch** | Version compatibility check |
| **Replay** | Schema version at `occurredAt` MUST be resolved from registry history |

---

## 7. Changelog Requirements

Every schema version MUST include:

```markdown
## 1.2.0 — 2026-07-15
- Added optional `currency` field (default: INR)
- Compatibility: backward + forward
- Consumers: order-summary@1.x.x, order-analytics@1.x.x
```

---

## 8. Anti-Patterns (Forbidden)

| Anti-Pattern | Why Forbidden |
|--------------|---------------|
| Untyped `payload: any` | Breaks schema registry |
| Inline schema in handler | Bypasses registry |
| Silent field removal | Breaks consumers |
| Shared mutable payload objects | Race conditions in projections |
| Platform-specific fields without namespace | Violates ownership matrix |
| PII in unstructured metadata | Security violation |

---

## 9. Projection Schema Independence

Projection read model schemas are **independent** of event payload schemas:

- Event schema evolution does not automatically change projection output
- Projection version bump required when read model shape changes
- Checkpoint `schemaVersion` records last processed **event** schema version

---

## 10. References

- [EVENT-COMPATIBILITY.md](./EVENT-COMPATIBILITY.md)
- [EVENT-VERSIONING.md](./EVENT-VERSIONING.md)
- [EVENT-DEPRECATION.md](./EVENT-DEPRECATION.md)
- [ADR-022](../../adr/ADR-022-schema-evolution-policy.md)

---

*Event Schema Evolution v1.0.0 — frozen 2026-06-26.*
