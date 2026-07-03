# M6 PR-2 — Event Platform Infrastructure Report

**Program:** BHOS-M6-A  
**PR:** M6 PR-2 — Event Platform Infrastructure  
**Date:** 2026-06-26  
**Status:** Complete — awaiting ARB approval  
**ADR:** [ADR-018](../adr/ADR-018-event-platform.md) (unchanged — additive PR)

---

## Executive Summary

M6 PR-2 delivers the **infrastructure layer** behind EventSDK — publisher, subscriber, outbox, event store, schema registry, replay service, idempotency, dead-letter, validation, and telemetry. **Zero production impact** — all feature flags remain default OFF. No business events, no Firestore, no Command Platform.

PR-1 contracts are preserved. PR-2 adds infrastructure in `src/sdk/events/adapters/` without redesigning PR-1.

---

## Architecture

```
Command Platform (future)
        ↓
     Domain
        ↓
 Outbox Repository  ← DefaultOutboxRepository
        ↓
    Publisher        ← DefaultEventPublisher
        ↓
   Event Store       ← DefaultEventStore
        ↓
   Subscribers       ← DefaultEventSubscriber
        ↓
Projection Workers (future)
        ↓
  Frozen Read SDKs (M1–M5)
```

### Infrastructure Factory

`EventInfrastructureFactory.createEventInfrastructure()` composes:

| Component | Adapter | Responsibility |
|-----------|---------|----------------|
| Publisher | `DefaultEventPublisher` | Envelope validation, schema check, ID assignment, outbox + store write |
| Subscriber | `DefaultEventSubscriber` | Subscription matching, DLQ delegation, retry metadata |
| Outbox | `DefaultOutboxRepository` | append, listPending, markPublished, markFailed |
| Event Store | `DefaultEventStore` | append, read, readByAggregate, readByType |
| Schema Registry | `DefaultSchemaRegistry` | register, resolve, validateCompatibility |
| Replay | `DefaultReplayService` | replay, replayRange, replayByAggregate, replayByType |
| Idempotency | `InMemoryIdempotencyRepository` | has, get, put, purgeExpired (test only) |
| Dead Letter | `InMemoryDeadLetterRepository` | append, list (test only) |

### Repository Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  EventInfrastructureFactory                  │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Publisher   │  Subscriber  │   Replay     │ Schema Registry│
├──────────────┴──────────────┴──────────────┴────────────────┤
│              Outbox Repository  │  Event Store               │
├─────────────────────────────────┴──────────────────────────┤
│         Idempotency Repository  │  Dead Letter Repository    │
│              (in-memory test)   │    (in-memory test)        │
└─────────────────────────────────────────────────────────────┘
                              ↕
                    Provider Ports (future)
                    Firestore / Cloud / etc.
                              ↕
                         PR-3+ adapters
```

---

## Deliverables

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | `DefaultEventPublisher` | ✅ |
| 2 | `DefaultEventSubscriber` | ✅ |
| 3 | `DefaultOutboxRepository` | ✅ |
| 4 | `DefaultReplayService` | ✅ |
| 5 | `DefaultSchemaRegistry` | ✅ |
| 6 | `DefaultEventStore` | ✅ |
| 7 | `EventInfrastructureFactory` | ✅ |
| 8 | Idempotency (Key, Record, Repository, TTL) | ✅ |
| 9 | Dead Letter (Repository, Policy, Metadata) | ✅ |
| 10 | Validation (envelope, schema, metadata, aggregate, version) | ✅ |
| 11 | Infrastructure telemetry | ✅ |
| 12 | Factories (6) | ✅ |
| 13 | Unit tests | ✅ |
| 14 | Documentation | ✅ |

---

## Factories

| Factory | Location |
|---------|----------|
| `createEventPublisher()` | `EventInfrastructureFactory` |
| `createEventSubscriber()` | `EventInfrastructureFactory` |
| `createOutboxRepository()` | `EventInfrastructureFactory` |
| `createReplayService()` | `EventInfrastructureFactory` |
| `createEventStore()` | `EventInfrastructureFactory` |
| `createSchemaRegistry()` | `EventInfrastructureFactory` |
| `createEventInfrastructure()` | `EventInfrastructureFactory` |

---

## Telemetry Events

| Event | When |
|-------|------|
| `publish_started` | Publish pipeline begins |
| `publish_completed` | Publish succeeds |
| `publish_failed` | Validation or write failure |
| `outbox_append` | Outbox record created |
| `replay_started` | Replay operation begins |
| `replay_completed` | Replay operation ends |
| `subscriber_matched` | Handler matched for event type |
| `subscriber_failed` | Handler error |

No analytics — hook-based only via `onTelemetry`.

---

## Migration Notes

- **PR-1 → PR-2:** Version bumped to `0.2.0-infrastructure`. PR-1 `providers/` re-exports from `adapters/` for backward compatibility.
- **PR-2 → PR-3:** Firestore outbox adapter will implement `ExtendedOutboxRepositoryPort` without changing publisher/subscriber contracts.
- **IdempotencyStorePort → IdempotencyRepositoryPort:** `IdempotencyStoreAdapter` bridges PR-1 callers.

---

## Definition of Ready

- [x] M6 PR-1 complete and ARB-approved foundation
- [x] ADR-018 in place
- [x] No M1–M5 modifications required
- [x] Feature flags remain default OFF

## Definition of Done

- [x] All adapters in `src/sdk/events/adapters/`
- [x] Idempotency + dead-letter modules
- [x] Validation + telemetry
- [x] `eventSdkInfrastructure.test.ts` passes
- [x] All existing tests pass
- [x] No Firestore, no UI, no business events
- [x] Documentation complete

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PR-1 test breakage | Medium | Low | Re-exports + IdempotencyStoreAdapter |
| Accidental prod enable | Low | High | Flags default OFF unchanged |
| Schema validation blocks publish | Low | Medium | Optional — skipped when schema not registered |
| In-memory storage in prod | Low | Medium | Factory returns stub when flags OFF |

---

## Rollback Plan

1. Revert PR-2 merge — PR-1 stub path unchanged when flags OFF
2. No Firestore schema changes
3. No presentation or API changes
4. `npm run test:sdk` confirms M1–M5 + M6 tests pass

---

## Test Summary

| File | Tests |
|------|-------|
| `eventSdkFoundation.test.ts` | PR-1 regression (updated version) |
| `eventSdkInfrastructure.test.ts` | PR-2 infrastructure (18 tests) |
| `eventDomain.test.ts` | Domain unchanged |

---

**STOP.** Await explicit ARB approval before M6 PR-3 (Firestore Outbox Adapter / Shadow Publishing).
