# BhojanOS Event Catalog — v1 (Canonical Registry)

**Version:** 1.0.0  
**Status:** Frozen — canonical registry  
**Effective:** 2026-06-26  
**Owner:** M6 Event Platform / Architecture Review Board  
**Supersedes:** [docs/m6/EVENT-CATALOG.md](../EVENT-CATALOG.md) (redirects here)

---

## Governance

Every event name is a **permanent platform contract**. All future events MUST:

1. Follow `<context>.<aggregate>.<action>.v<major>` per [EVENT-NAMING-STANDARD.md](./EVENT-NAMING-STANDARD.md)
2. Be registered in this catalog before implementation
3. Complete [EVENT-GOVERNANCE-CHECKLIST.md](./EVENT-GOVERNANCE-CHECKLIST.md) before publication

---

## Naming Convention

```
<context>.<aggregate>.<action>.v<major>
```

| Segment | Example |
|---------|---------|
| context | `order`, `menu`, `branch` |
| aggregate | `order`, `item`, `assignment` |
| action | `created`, `cancelled`, `updated` |
| v major | `v1`, `v2` |

---

## Status Legend

| Status | Meaning |
|--------|---------|
| 🔒 Proposed | Registered; not approved for emission |
| ✅ Approved | ARB approved; shadow publish only |
| 🟢 Published | Active in production (with flags) |
| ⚠️ Deprecated | Superseded; sunset in progress |
| ⛔ Retired | No longer emitted |

---

## Order Platform (M1)

| Event Name | Description | Schema | Status |
|------------|-------------|--------|--------|
| `order.created.v1` | Order aggregate created | 1.0.0 | ✅ Approved (shadow) |
| `order.updated.v1` | Order aggregate updated | 1.0.0 | ✅ Approved (shadow) |
| `order.accepted.v1` | Order accepted by kitchen | 1.0.0 | 🔒 Proposed |
| `order.cancelled.v1` | Order cancelled | 1.0.0 | ✅ Approved (shadow) |
| `order.completed.v1` | Order fulfilled | 1.0.0 | 🔒 Proposed |
| `order.payment.captured.v1` | Payment captured | 1.0.0 | 🔒 Proposed |

## Menu Platform

| Event Name | Description | Schema | Status |
|------------|-------------|--------|--------|
| `menu.item.created.v1` | Menu item created | 1.0.0 | 🔒 Proposed |
| `menu.item.updated.v1` | Menu item updated | 1.0.0 | 🔒 Proposed |
| `menu.item.removed.v1` | Menu item removed | 1.0.0 | 🔒 Proposed |
| `menu.category.updated.v1` | Category structure changed | 1.0.0 | 🔒 Proposed |

## Branch Platform (M5)

| Event Name | Description | Schema | Status |
|------------|-------------|--------|--------|
| `branch.assignment.started.v1` | Branch assignment initiated | 1.0.0 | 🔒 Proposed |
| `branch.assignment.completed.v1` | Branch assignment resolved | 1.0.0 | 🔒 Proposed |
| `branch.score.calculated.v1` | Branch scoring completed | 1.0.0 | 🔒 Proposed |

## Discovery Platform (M3)

| Event Name | Description | Schema | Status |
|------------|-------------|--------|--------|
| `discovery.feed.refreshed.v1` | Discovery feed regenerated | 1.0.0 | 🔒 Proposed |
| `discovery.ranking.updated.v1` | Ranking model applied | 1.0.0 | 🔒 Proposed |

## Search Platform (M4)

| Event Name | Description | Schema | Status |
|------------|-------------|--------|--------|
| `search.index.updated.v1` | Search index refreshed | 1.0.0 | 🔒 Proposed |
| `search.query.logged.v1` | Search query telemetry | 1.0.0 | 🔒 Proposed |

## Inventory Platform

| Event Name | Description | Schema | Status |
|------------|-------------|--------|--------|
| `inventory.reserved.v1` | Stock reserved for order | 1.0.0 | 🔒 Proposed |
| `inventory.released.v1` | Stock reservation released | 1.0.0 | 🔒 Proposed |
| `inventory.depleted.v1` | Item out of stock | 1.0.0 | 🔒 Proposed |

## Pricing Platform

| Event Name | Description | Schema | Status |
|------------|-------------|--------|--------|
| `pricing.quote.generated.v1` | Price quote computed | 1.0.0 | 🔒 Proposed |
| `pricing.rule.updated.v1` | Pricing rule changed | 1.0.0 | 🔒 Proposed |

## M6 Event Infrastructure

| Event Name | Description | Schema | Status |
|------------|-------------|--------|--------|
| `event.outbox.published.v1` | Outbox entry published | 1.0.0 | ✅ Approved |
| `event.outbox.failed.v1` | Outbox publish failed | 1.0.0 | ✅ Approved |
| `event.deadletter.recorded.v1` | Event moved to DLQ | 1.0.0 | ✅ Approved |
| `projection.checkpoint.saved.v1` | Checkpoint persisted | 1.0.0 | ✅ Approved |
| `projection.replayed.v1` | Replay batch completed | 1.0.0 | ✅ Approved |
| `projection.execution.started.v1` | Batch execution started | 1.0.0 | ✅ Approved |
| `projection.execution.completed.v1` | Batch execution completed | 1.0.0 | ✅ Approved |
| `projection.execution.failed.v1` | Batch execution failed | 1.0.0 | ✅ Approved |

## Test Harness (Never Published)

| Event Name | Description | Production |
|------------|-------------|------------|
| `infra.projection.probe` | Unit test probe (no version suffix) | ❌ Never |

---

## Envelope Contract

All events conform to `EventEnvelope<TPayload>`. See [EVENT-CONTRACT.md](./EVENT-CONTRACT.md).

---

## Registration Process

1. Propose in ARB with ownership matrix row
2. Add here as 🔒 Proposed
3. ARB approval → ✅ Approved
4. First shadow publish (PR-5+) → 🟢 Published
5. Never rename — create new `.v<N>` major

---

## Projection vs Event Version

| Concept | Scope | Example |
|---------|-------|---------|
| Event major | Payload contract | `order.created.v1` |
| Schema semver | Field evolution | `1.2.0` |
| Projection version | Handler logic | `order-summary@2.0.0` |

Changing projection logic requires new `projectionVersion`. Event versions remain backward compatible per LAW 7.

---

**This document is the canonical registry. All future events must be registered here before implementation.**
