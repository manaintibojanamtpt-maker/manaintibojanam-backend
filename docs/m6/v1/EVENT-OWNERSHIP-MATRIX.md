# Event Ownership Matrix — BhojanOS M6 v1

**Version:** 1.0.0  
**Status:** Frozen  
**Effective:** 2026-06-26  
**ADR:** [ADR-019](../../adr/ADR-019-event-contract-freeze.md)

---

## 1. Purpose

Every event MUST define ownership before publication. This matrix is the authoritative registry of producer/consumer obligations.

---

## 2. Required Fields Per Event

| Field | Description | Required |
|-------|-------------|----------|
| **Event Name** | Canonical name per naming standard | ✅ |
| **Owner Platform** | Platform accountable for schema and lifecycle | ✅ |
| **Aggregate** | Domain aggregate root | ✅ |
| **Producer** | Service/domain that emits the event | ✅ |
| **Consumers** | Registered projection workers or subscribers | ✅ |
| **Schema Version** | Current semver in Schema Registry | ✅ |
| **Compatibility Policy** | `backward` / `forward` / `full` | ✅ |
| **Retention** | Event store retention period | ✅ |
| **Replay Supported** | Whether replay is permitted | ✅ |
| **Lifecycle Status** | Draft / Approved / Published / Deprecated / Retired | ✅ |
| **PII Classification** | `none` / `internal` / `sensitive` / `restricted` | ✅ |

---

## 3. Platform Ownership

| Platform | Namespace | Owner | Certification |
|----------|-----------|-------|---------------|
| M1 Order | `order.*` | Order Platform Team | ✅ Frozen |
| M2 Location | `location.*` | Location Intelligence Team | ✅ Frozen |
| M3 Discovery | `discovery.*` | Discovery Intelligence Team | ✅ Frozen |
| M4 Search | `search.*` | Search Intelligence Team | ✅ Frozen |
| M5 Branch | `branch.*` | Branch Intelligence Team | ✅ Frozen |
| M6 Event | `event.*`, `projection.*`, `infra.*` | Event Platform Team | 🔄 PR-4 complete |
| Menu (future) | `menu.*` | Menu Platform Team | 🔒 Not certified |
| Inventory (future) | `inventory.*` | Inventory Platform Team | 🔒 Not certified |
| Pricing (future) | `pricing.*` | Pricing Platform Team | 🔒 Not certified |

---

## 4. Event Registry

### M1 — Order Platform (Proposed — PR-5+)

| Event | Aggregate | Producer | Consumers | Schema | Compatibility | Retention | Replay |
|-------|-----------|----------|-----------|--------|---------------|-----------|--------|
| `order.created.v1` | Order | OrderDomain | order-summary, order-analytics | 1.0.0 | backward | 7 years | ✅ |
| `order.accepted.v1` | Order | OrderDomain | order-summary, kitchen-display | 1.0.0 | backward | 7 years | ✅ |
| `order.cancelled.v1` | Order | OrderDomain | order-summary, inventory-release | 1.0.0 | backward | 7 years | ✅ |
| `order.completed.v1` | Order | OrderDomain | order-summary, analytics | 1.0.0 | backward | 7 years | ✅ |
| `order.payment.captured.v1` | Payment | OrderDomain | order-summary, finance | 1.0.0 | backward | 7 years | ✅ |

### M5 — Branch Platform (Proposed — PR-5+)

| Event | Aggregate | Producer | Consumers | Schema | Compatibility | Retention | Replay |
|-------|-----------|----------|-----------|--------|---------------|-----------|--------|
| `branch.assignment.started.v1` | Assignment | BranchDomain | branch-assignment-log | 1.0.0 | backward | 2 years | ✅ |
| `branch.assignment.completed.v1` | Assignment | BranchDomain | branch-read-model, order-routing | 1.0.0 | backward | 2 years | ✅ |
| `branch.score.calculated.v1` | Score | BranchDomain | branch-analytics | 1.0.0 | forward | 1 year | ❌ |

### Menu Platform (Proposed)

| Event | Aggregate | Producer | Consumers | Schema | Compatibility | Retention | Replay |
|-------|-----------|----------|-----------|--------|---------------|-----------|--------|
| `menu.item.created.v1` | MenuItem | MenuDomain | menu-read-model, search-index | 1.0.0 | backward | 3 years | ✅ |
| `menu.item.updated.v1` | MenuItem | MenuDomain | menu-read-model, search-index | 1.0.0 | backward | 3 years | ✅ |

### Inventory Platform (Proposed)

| Event | Aggregate | Producer | Consumers | Schema | Compatibility | Retention | Replay |
|-------|-----------|----------|-----------|--------|---------------|-----------|--------|
| `inventory.reserved.v1` | Reservation | InventoryDomain | inventory-read-model | 1.0.0 | backward | 2 years | ✅ |
| `inventory.released.v1` | Reservation | InventoryDomain | inventory-read-model | 1.0.0 | backward | 2 years | ✅ |

### Pricing Platform (Proposed)

| Event | Aggregate | Producer | Consumers | Schema | Compatibility | Retention | Replay |
|-------|-----------|----------|-----------|--------|---------------|-----------|--------|
| `pricing.quote.generated.v1` | Quote | PricingDomain | pricing-cache | 1.0.0 | forward | 90 days | ❌ |

### M6 — Infrastructure (Registered)

| Event | Aggregate | Producer | Consumers | Schema | Compatibility | Retention | Replay |
|-------|-----------|----------|-----------|--------|---------------|-----------|--------|
| `event.outbox.published.v1` | OutboxEntry | EventSDK | ops-telemetry | 1.0.0 | forward | 90 days | ❌ |
| `event.outbox.failed.v1` | OutboxEntry | EventSDK | ops-alerts | 1.0.0 | forward | 1 year | ❌ |
| `event.deadletter.recorded.v1` | DeadLetter | EventSDK | ops-alerts | 1.0.0 | forward | 1 year | ✅ |
| `projection.checkpoint.saved.v1` | Checkpoint | ProjectionWorker | ops-telemetry | 1.0.0 | forward | 30 days | ❌ |
| `projection.replayed.v1` | Replay | ReplayEngine | audit-log | 1.0.0 | forward | 1 year | ❌ |

---

## 5. Consumer Registration Rules

1. Every consumer MUST register in Projection Registry with unique `ProjectionIdentity`
2. Consumer MUST declare supported event types and event majors
3. Cross-platform consumption requires both producer and consumer platform owner sign-off
4. Consumer MUST NOT perform another platform's domain logic (LAW 4)

---

## 6. Retention Defaults

| Classification | Default Retention | Override Requires |
|----------------|-------------------|-------------------|
| Business (order, payment) | 7 years | Legal review |
| Operational (branch, menu) | 2 years | Platform owner |
| Analytics / telemetry | 1 year | Platform owner |
| Infrastructure | 90 days | M6 owner |
| PII-containing | Per [EVENT-SECURITY.md](./EVENT-SECURITY.md) | Security + Legal |

---

## 7. Updating the Matrix

1. Submit ARB proposal with all required fields
2. Add row with status `Draft`
3. Upon approval → `Approved`
4. After first shadow publish → `Published`
5. Update [EVENT-CATALOG.md](./EVENT-CATALOG.md) simultaneously

---

## 8. References

- [EVENT-CATALOG.md](./EVENT-CATALOG.md)
- [EVENT-NAMING-STANDARD.md](./EVENT-NAMING-STANDARD.md)
- [EVENT-LIFECYCLE.md](./EVENT-LIFECYCLE.md)
- [EVENT-SECURITY.md](./EVENT-SECURITY.md)

---

*Event Ownership Matrix v1.0.0 — frozen 2026-06-26.*
