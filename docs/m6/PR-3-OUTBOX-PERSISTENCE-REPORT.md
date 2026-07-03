# M6 PR-3 — Outbox Persistence + Shadow Publishing Report

**Program:** BHOS-M6-A  
**PR:** M6 PR-3 — Outbox Persistence + Shadow Publishing Foundation  
**Date:** 2026-06-26  
**Status:** Complete — awaiting ARB approval  
**ADR:** [ADR-018](../adr/ADR-018-event-platform.md) (additive)

---

## Executive Summary

M6 PR-3 introduces **Firestore persistence adapters** and **shadow publishing** for EventSDK. All adapters implement existing PR-1 ports without contract changes. **Zero production impact** — all flags default OFF including new `FF_EVENT_SHADOW_PUBLISHING_ENABLED`.

No business event producers, consumers, projection workers, or legacy write modifications.

---

## Architecture

```
Command Platform (future)
        ↓
     Domain
        ↓
 OutboxRepositoryPort
        ↓
FirestoreOutboxPersistenceAdapter
        ↓
FirestorePersistencePort (vendor-neutral)
        ↓
 MockFirestorePersistence (tests) / Firestore (future runtime adapter)
        ↓
Event Infrastructure (PR-2)
        ↓
Future Publisher (PR-4+)
```

### Shadow Publishing Flow

```
EventEnvelope
      ↓
ShadowPublisher (FF_EVENT_SHADOW_PUBLISHING_ENABLED)
      ↓
Validate envelope + metadata
      ↓
Idempotency check (optional)
      ↓
OutboxRepository.append (status: pending, published: false)
      ↓
PublishResult
```

**Explicit exclusions:** No external dispatch, no subscribers, no projection workers.

---

## Collection Design (no migration)

| Collection | Default Name | Document Fields |
|------------|--------------|-----------------|
| Outbox | `event_outbox` | outboxId, eventId, eventType, eventVersion, aggregateId, aggregateType, payload, metadata, envelope, status, published, publishedAt, createdAt, attemptCount, lastError |
| Event Store | `event_store` | eventId, eventType, eventVersion, aggregateId, aggregateType, occurredAt, payload, metadata, envelope, createdAt |
| Dead Letters | `event_dead_letters` | deadLetterId, eventId, eventType, envelope, consumerGroup, reason, attemptCount, failedAt, correlationId, metadata |
| Idempotency | `event_idempotency` | key, eventId, recordedAt, expiresAt |

Collection names configurable via `FirestorePersistenceFactoryOptions.collections`.

---

## Repository Diagram

```
┌──────────────────────────────────────────────────────────────┐
│              FirestorePersistenceFactory                      │
├────────────────┬─────────────────┬──────────────┬──────────────┤
│ Outbox Adapter │ Event Store     │ Dead Letter  │ Idempotency  │
│                │ Adapter         │ Adapter      │ Adapter      │
├────────────────┴─────────────────┴──────────────┴──────────────┤
│                  FirestorePersistencePort                       │
│            (set / get / update / query)                         │
├─────────────────────────────────────────────────────────────────┤
│     MockFirestorePersistence (tests)  │  Firestore SDK (future) │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│ ShadowPublisher  │──► OutboxRepositoryPort only
└──────────────────┘
```

---

## Deliverables

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | `FirestoreOutboxPersistenceAdapter` | ✅ |
| 2 | `FirestoreEventStoreAdapter` | ✅ |
| 3 | `FirestoreDeadLetterAdapter` | ✅ |
| 4 | `FirestoreIdempotencyAdapter` | ✅ |
| 5 | `FirestorePersistenceFactory` | ✅ |
| 6 | `ShadowPublisher` | ✅ |
| 7 | `MockFirestorePersistence` | ✅ |
| 8 | `FF_EVENT_SHADOW_PUBLISHING_ENABLED` | ✅ |
| 9 | Persistence telemetry | ✅ |
| 10 | Unit tests (mock Firestore) | ✅ |
| 11 | Documentation | ✅ |

---

## Feature Flags

| Flag | Default | Env Key |
|------|---------|---------|
| `FF_EVENT_PLATFORM_ENABLED` | OFF | `VITE_FF_EVENT_PLATFORM_ENABLED` |
| `FF_EVENT_OUTBOX_ENABLED` | OFF | `VITE_FF_EVENT_OUTBOX_ENABLED` |
| `FF_EVENT_SHADOW_PUBLISHING_ENABLED` | OFF | `VITE_FF_EVENT_SHADOW_PUBLISHING_ENABLED` |

---

## Migration Roadmap

| Phase | PR | Scope |
|-------|-----|-------|
| PR-1 | ✅ | Event contracts |
| PR-2 | ✅ | Infrastructure adapters (in-memory) |
| **PR-3** | ✅ | Firestore persistence + shadow publish |
| PR-4 | 🔒 | Projection Worker Foundation |
| PR-5+ | 🔒 | Runtime Firestore SDK adapter, Command Platform wiring |

---

## Definition of Ready

- [x] M6 PR-1 + PR-2 complete
- [x] Existing port contracts frozen
- [x] No M1–M5 modifications
- [x] Mock Firestore test strategy defined

## Definition of Done

- [x] All persistence adapters in `src/sdk/events/persistence/`
- [x] ShadowPublisher write-only to outbox
- [x] No contract changes to PR-1 ports
- [x] No business events, consumers, or projection workers
- [x] All flags default OFF
- [x] `eventSdkPersistence.test.ts` passes
- [x] All existing tests pass
- [x] Documentation complete

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Accidental shadow publish in prod | Low | High | Triple flag gate (platform + outbox + shadow) |
| Collection name collision | Low | Medium | Configurable names; defaults prefixed `event_` |
| Idempotency TTL without cleanup | Medium | Low | TTL metadata only; cleanup deferred to PR-4+ |
| Firestore SDK coupling | Low | Medium | Vendor-neutral `FirestorePersistencePort` |

---

## Rollback Plan

1. Revert PR-3 — no runtime wiring exists when flags OFF
2. PR-1/PR-2 behavior unchanged
3. No Firestore collections created (design only, mock tests)
4. No presentation or API changes
5. `npm run test:sdk` confirms all tests pass

---

## Test Summary

| File | Scope |
|------|-------|
| `eventSdkPersistence.test.ts` | Mock Firestore adapters, shadow publish, idempotency, DLQ, telemetry |
| `eventSdkFoundation.test.ts` | PR-1 regression + new flag |
| `eventSdkInfrastructure.test.ts` | PR-2 regression |

---

**STOP.** Await explicit ARB approval before M6 PR-4 (Projection Worker Foundation).
