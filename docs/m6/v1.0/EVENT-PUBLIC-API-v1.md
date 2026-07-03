# Event Platform Public API v1.0

**Status:** Frozen — `EVENT_SDK_VERSION = 1.0.0` · `EVENT_SDK_FROZEN = true`  
**Date:** 2026-06-27  
**Source:** `src/sdk/events/contracts/EventSDK.ts`

---

## 1. EventSDK (frozen public contract)

| Method | Input | Output | Notes |
|--------|-------|--------|-------|
| `publish` | `EventEnvelope<T>` | `SdkAsyncResult<PublishResult>` | Never raw JSON |
| `subscribe` | `Subscription`, `EventHandler` | `SdkAsyncResult<SubscribeResult>` | Consumer registration |
| `registerSchema` | `EventSchemaDefinition` | `SdkAsyncResult<EventSchemaDefinition>` | Versioned schemas |
| `resolveSchema` | `EventTypeName`, `EventVersion` | `SdkAsyncResult<EventSchemaDefinition \| null>` | Schema lookup |
| `replay` | `ReplayRequest` | `SdkAsyncResult<ReplayResult>` | Admin/rebuild replay |

### Factory

```typescript
createEventSDK(options?: CreateEventSDKOptions): EventSDK
```

**Default behaviour:** `FF_EVENT_PLATFORM_ENABLED` OFF → stub/no-op paths.

---

## 2. Infrastructure factories (frozen)

| Factory | Purpose |
|---------|---------|
| `createEventSDK(options?)` | Main SDK entry |
| `createEventPublisher(options?)` | Publisher port |
| `createEventSubscriber(options?)` | Subscriber port |
| `createOutboxRepository(options?)` | Outbox port |
| `createEventInfrastructure(options?)` | Full infrastructure bundle |
| `createReplayService(options?)` | Replay port |
| `createEventStore(options?)` | Event store port |
| `createSchemaRegistry(options?)` | Schema registry port |

---

## 3. EventEnvelope (frozen DTO)

All events MUST use `EventEnvelope<TPayload>` per ADR-019:

- `header` — type, version, schemaVersion, correlationId, causationId, idempotencyKey
- `payload` — typed business data
- `metadata` — tenant, actor, timestamp

Breaking envelope changes require ADR + major version bump.

---

## 4. Standalone infrastructure (NOT part of EventSDK public API)

| Module | Factory | Purpose |
|--------|---------|---------|
| Order Projection | `createOrderProjectionInfrastructure()` | Shadow order read model |
| Parity | `createOrderParityInfrastructure()` | Legacy vs projection comparison |
| Soak | `createProjectionParitySoakInfrastructure()` | Soak certification |
| Operational | `createEventOperationalInfrastructure()` | Lag/drift/replay evidence |
| Order Adapter | `createOrderAdapterInfrastructure()` | Legacy ↔ projection routing |
| Rollout | `createProjectionRollout()` | Staged percentage policy |
| Switch Certification | `createCertificationInfrastructure()` | GO/NO-GO decision packages |

**Not wired into `createEventSDK()` or OrderSDK.**

---

## 5. Frozen ports

| Port | Location |
|------|----------|
| `EventPublisherPort` | `contracts/ports/` |
| `EventSubscriberPort` | `contracts/ports/` |
| `OutboxRepositoryPort` | `contracts/ports/` |
| `SchemaRegistryPort` | `contracts/ports/` |
| `EventStorePort` | `contracts/ports/` |
| `ReplayPort` | `contracts/ports/` |
| `IdempotencyStorePort` | `idempotency/` |
| `DeadLetterPort` | `deadletter/` |

---

## 6. Error model

Standard `SdkAsyncResult<T>` from SDK core.

Event-specific codes include: `SCHEMA_VERSION_MISMATCH`, envelope validation errors.

---

**STOP.** No contract changes without ADR-024 governance.
