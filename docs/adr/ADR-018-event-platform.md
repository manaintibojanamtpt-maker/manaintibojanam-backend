# ADR-018: Event Platform Foundation (M6 PR-1)

**Status:** Proposed  
**Date:** 2026-06-26  
**Deciders:** Architecture Review Board  
**Supersedes:** N/A (first Event Platform ADR)  
**Related:** ADR-011 (SDK Strangler), OS-SPINE-ARCHITECTURE (M6 blueprint), BHOS-M6

---

## Context

BhojanOS M1–M5 delivered frozen read/intelligence platforms (Order, Location, Reference, Discovery, Search, Branch). All state mutations today bypass the spine — direct Firestore writes from `src/services/api.ts` and legacy checkout paths.

The OS Spine architecture (BHOS-OS-SPINE-ARCHITECTURE) approved **Event Platform as Platform Zero** — the durable nervous system through which every state change flows:

```
Commands → Domain → Events (Outbox) → Projection → Read Models → Frozen SDKs → Presentation
```

M6 PR-1 delivers the **foundation only**: contracts, DTOs, ports, domain logic, in-memory providers, feature flags (default OFF), and tests. No Firestore adapters. No Kafka, Pub/Sub, or RabbitMQ.

---

## Decision

1. **Introduce EventSDK** at `src/sdk/events/` version `0.1.0-foundation` — **not frozen**.

2. **Introduce Event Domain** at `src/domain/events/` version `0.1.0-foundation` — pure logic only.

3. **Canonical envelope:** All platforms MUST publish `EventEnvelope<T>` — never raw JSON.

4. **Event Platform owns:**
   - `EventEnvelope`, `EventMetadata`, `EventHeader`
   - `EventRegistry` / `SchemaRegistryPort`
   - `EventPublisherPort`, `EventSubscriberPort`
   - `OutboxRepositoryPort`, `EventStorePort`
   - `ReplayPort`, `IdempotencyStorePort`, `DeadLetterPort`
   - Correlation ID, causation ID, idempotency key standards

5. **Feature flags (all default OFF):**
   - `FF_EVENT_PLATFORM_ENABLED`
   - `FF_EVENT_OUTBOX_ENABLED`
   - `FF_EVENT_REPLAY_ENABLED`

6. **Stub adapters** when flags OFF → `NOT_CONFIGURED` — zero production impact.

7. **In-memory providers** when flags ON — dev/test only in PR-1.

8. **Explicit exclusions from PR-1:**
   - Firestore outbox adapter
   - Production event bus
   - Command platform wiring
   - Migration of legacy write paths
   - Modification of M1–M5 frozen SDKs

9. **No breaking changes** to OrderSDK, LocationSDK, ReferenceSDK, DiscoverySDK, SearchSDK, BranchSDK.

---

## Consequences

### Positive
- Platform Zero contracts established before any migration
- Provider-neutral ports enable future adapter swaps without SDK changes
- Strangler-safe: flags OFF = no runtime change
- Foundation tests validate envelope, outbox, idempotency, replay contracts

### Negative
- No immediate production value until PR-2+ adapters land
- Legacy write paths remain until Command Platform + outbox migration (separate ADRs)

### Neutral
- Event catalog (payload schemas per domain) deferred to originating platform ADRs
- Firestore outbox collection design deferred to ADR-019 (proposed)

---

## Compliance

| Rule | Status |
|------|--------|
| No M1–M5 SDK modifications | ✅ |
| No frozen SDK contract changes | ✅ |
| Strangler architecture | ✅ |
| Feature flags default OFF | ✅ |
| Provider-neutral (no Kafka/Pub/Sub/RabbitMQ) | ✅ |
| Additive, rollback-safe PR | ✅ |

---

## References

- [OS-SPINE-ARCHITECTURE.md](../m6/OS-SPINE-ARCHITECTURE.md)
- [PR-1-EVENT-PLATFORM-FOUNDATION-REPORT.md](../m6/PR-1-EVENT-PLATFORM-FOUNDATION-REPORT.md)
- [EventSDK README](../../src/sdk/events/README.md)
- [Event Domain README](../../src/domain/events/README.md)
