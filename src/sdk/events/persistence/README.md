# Event Persistence (M6 PR-3)

**Version:** `0.3.0-persistence`  
**Status:** Firestore adapters + shadow publishing foundation  
**Governance:** [PR-3 Report](../../docs/m6/PR-3-OUTBOX-PERSISTENCE-REPORT.md)

---

## Purpose

Persistence adapters for EventSDK — provider-neutral ports with Firestore as the first implementation. Shadow publishing writes to outbox only (no dispatch, subscribers, or projection workers).

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
   Mock / Firestore (PR-3+: adapter)
```

---

## Collections (design only — no migration)

| Default | Purpose |
|---------|---------|
| `event_outbox` | Durable outbox records |
| `event_store` | Append-only event log |
| `event_dead_letters` | Failed publication attempts |
| `event_idempotency` | Idempotency keys + TTL metadata |

Configurable via `collections` factory option.

---

## Factories

```typescript
import {
  createFirestoreOutboxPersistence,
  createFirestoreEventStore,
  createFirestoreDeadLetterStore,
  createFirestoreIdempotencyStore,
  createShadowPublisherFactory,
  createMockFirestorePersistence,
} from '@/sdk/events';
```

---

## Feature Flags (default OFF)

| Flag | Purpose |
|------|---------|
| `FF_EVENT_PLATFORM_ENABLED` | Master switch |
| `FF_EVENT_OUTBOX_ENABLED` | Outbox persistence |
| `FF_EVENT_SHADOW_PUBLISHING_ENABLED` | Shadow publish (outbox write-only) |

---

## Shadow Publishing

- Receives `EventEnvelope` / `DomainEvent`
- Persists to outbox only (`status: pending`, `published: false`)
- Returns `PublishResult`
- Does **not** dispatch externally, invoke subscribers, or projection workers

---

**STOP.** Await ARB approval before M6 PR-4 (Projection Worker Foundation).
