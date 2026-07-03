# Event Naming Standard — BhojanOS M6 v1

**Version:** 1.0.0  
**Status:** Frozen  
**Effective:** 2026-06-26  
**ADR:** [ADR-019](../../adr/ADR-019-event-contract-freeze.md)

---

## 1. Canonical Pattern

```
<context>.<aggregate>.<action>.v<major>
```

| Segment | Rules | Examples |
|---------|-------|----------|
| `context` | Lowercase bounded context / platform identifier | `order`, `menu`, `branch`, `inventory` |
| `aggregate` | Lowercase aggregate root or sub-entity | `order`, `item`, `assignment`, `quote` |
| `action` | Lowercase past-tense verb phrase | `created`, `cancelled`, `updated`, `completed` |
| `v<major>` | Integer major version, no zero-padding required | `v1`, `v2` |

---

## 2. Format Rules

1. **Lowercase only** — no camelCase, PascalCase, or snake_case in event names
2. **Dot-separated** — exactly four segments before major version suffix
3. **Past tense actions** — `created` not `create`, `cancelled` not `cancel`
4. **Immutable once Published** — never rename; create new major version
5. **No environment suffixes** — no `.staging`, `.prod`, `.test` in event names
6. **No tenant suffixes** — multi-tenancy via metadata, not event name

---

## 3. Valid Examples

| Event Name | Context | Aggregate | Action | Major |
|------------|---------|-----------|--------|-------|
| `order.created.v1` | order | order | created | 1 |
| `order.cancelled.v1` | order | order | cancelled | 1 |
| `order.accepted.v1` | order | order | accepted | 1 |
| `menu.item.created.v1` | menu | item | created | 1 |
| `menu.item.updated.v1` | menu | item | updated | 1 |
| `inventory.reserved.v1` | inventory | reserved | reserved | 1 |
| `inventory.released.v1` | inventory | released | released | 1 |
| `branch.assignment.completed.v1` | branch | assignment | completed | 1 |
| `pricing.quote.generated.v1` | pricing | quote | generated | 1 |
| `projection.checkpoint.saved.v1` | projection | checkpoint | saved | 1 |
| `projection.replayed.v1` | projection | replayed | replayed | 1 |

---

## 4. Invalid Examples

| Invalid | Reason |
|---------|--------|
| `OrderCreated` | Wrong format — not dot-separated lowercase |
| `order.create.v1` | Present tense — must be past tense |
| `order.created` | Missing major version suffix |
| `order.created.v1.staging` | Environment suffix forbidden |
| `orders.created.v1` | Plural context — use singular `order` |
| `order.v1.created` | Wrong segment order |

---

## 5. Multi-Word Actions

Use dot notation within the action segment only when the action is a compound domain term:

| Valid | Invalid |
|-------|---------|
| `order.payment.captured.v1` | `order.paymentCaptured.v1` |
| `branch.assignment.completed.v1` | `branch.assignment-completed.v1` |

When action requires a sub-entity, insert it as an additional segment **before** action:

```
<context>.<sub-entity>.<action>.v<major>
```

Example: `order.payment.captured.v1` — context=`order`, sub-entity=`payment`, action=`captured`.

---

## 6. Reserved Namespaces

The following context prefixes are **reserved**. Platforms MUST NOT emit events outside their ownership without ARB approval.

| Namespace | Owner Platform | Status |
|-----------|----------------|--------|
| `order.*` | M1 Order Platform | Reserved |
| `location.*` | M2 Location Intelligence | Reserved |
| `discovery.*` | M3 Discovery Intelligence | Reserved |
| `search.*` | M4 Search Intelligence | Reserved |
| `branch.*` | M5 Branch Intelligence | Reserved |
| `event.*` | M6 Event Platform | Reserved (infrastructure) |
| `projection.*` | M6 Event Platform | Reserved (infrastructure) |
| `infra.*` | M6 Event Platform | Reserved (test harness only) |
| `system.*` | Platform Engineering | Reserved |
| `audit.*` | Security / Compliance | Reserved |

### Cross-Platform Rule (LAW 4)

Platforms MUST NOT emit events that imply another platform's domain responsibility:

- Search MUST NOT emit `branch.assignment.*`
- Discovery MUST NOT emit `order.created.*`
- Branch MUST NOT emit `search.index.*`

Only the **owning platform** may publish events in its namespace.

---

## 7. Test and Infrastructure Events

| Event | Purpose | Production |
|-------|---------|------------|
| `infra.projection.probe` | Unit test harness (no version suffix) | ❌ Never |
| `event.outbox.published.v1` | Infrastructure telemetry | Shadow only |
| `projection.checkpoint.saved.v1` | Projection infrastructure | Shadow only |

Test events MUST NOT appear in production catalogs as Published.

---

## 8. Registration Process

1. Propose event name in ARB review using [EVENT-GOVERNANCE-CHECKLIST.md](./EVENT-GOVERNANCE-CHECKLIST.md)
2. Verify namespace ownership against reserved table
3. Add to [EVENT-CATALOG.md](./EVENT-CATALOG.md) with status `Draft`
4. Upon ARB approval, transition to `Approved`
5. After first shadow publish (PR-5+), transition to `Published`

---

## 9. References

- [EVENT-CONTRACT.md](./EVENT-CONTRACT.md)
- [EVENT-OWNERSHIP-MATRIX.md](./EVENT-OWNERSHIP-MATRIX.md)
- [EVENT-CATALOG.md](./EVENT-CATALOG.md)

---

*Event Naming Standard v1.0.0 — frozen 2026-06-26.*
