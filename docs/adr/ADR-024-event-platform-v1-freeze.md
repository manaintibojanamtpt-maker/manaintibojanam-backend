# ADR-024: Event Platform v1.0 Freeze

**Status:** Accepted  
**Date:** 2026-06-27  
**Accepted:** 2026-06-27 (ARB)  
**Deciders:** Architecture Review Board  
**Supersedes:** N/A (first stable Event Platform release)  
**Related:** ADR-018 (Event Platform Foundation), ADR-019–022 (Event Governance), ADR-011, ADR-013, FEB-001, BHOS-M6

---

## Context

BhojanOS M6 (Event Platform / OS Spine) delivered PR-1 through PR-13:

- **EventSDK** with 5 public methods and `createEventSDK()` factory
- **EventEnvelope** governance contract (ADR-019)
- **Outbox persistence** and shadow publishing infrastructure
- **Projection worker foundation** and projection runtime
- **Order business shadow events** — `order.created.v1`, `order.updated.v1`, `order.cancelled.v1`
- **Order read projection** — shadow read model
- **Parity validation** — legacy vs projection comparison
- **Soak certification** — health monitoring
- **Operational validation** — lag, drift, replay evidence
- **Order read adapter** — legacy ↔ projection routing (standalone)
- **Staged rollout** — percentage-based policy (standalone)
- **Switch certification** — GO/NO-GO decision packages (standalone)

All functionality ships behind 14 `FF_EVENT_*` / `FF_ORDER_PROJECTION_*` feature flags defaulting **OFF**. Legacy remains the authoritative read source for OrderSDK. Adapter, rollout, and certification are **not wired** into `createEventSDK()` or OrderSDK factory.

M6 PR-14 promotes version metadata to v1.0.0 without runtime code changes, mirroring M7 PR-15 (Menu Platform).

**Governance foundation:** ADR-019 through ADR-022 (`docs/m6/v1/` enterprise contract pack).

**Test evidence:** 1033 / 1033 passing (`npm run test:sdk`).

---

## Decision

1. **Freeze** Event Platform at version **1.0.0** effective upon ARB acceptance of this ADR.

2. **Frozen public surface — `EventSDK`:**
   - `publish(envelope)`
   - `subscribe(subscription, handler)`
   - `registerSchema(definition)`
   - `resolveSchema(type, version)`
   - `replay(request)`
   - `createEventSDK(options?)`

3. **Frozen DTOs:**
   - `EventEnvelope`, `EventMetadata`, `OutboxRecord`, `Subscription`
   - `PublishResult`, `SubscribeResult`, `ReplayRequest`, `ReplayResult`
   - All types in `src/sdk/events/dto/`

4. **Frozen ports:**
   - `EventPublisherPort`, `EventSubscriberPort`, `OutboxRepositoryPort`
   - `SchemaRegistryPort`, `EventStorePort`, `ReplayPort`
   - `IdempotencyStorePort`, `DeadLetterPort`

5. **Frozen projection infrastructure contracts:**
   - Projection worker, runtime, order projection (internal — not OrderSDK public API)
   - Order read adapter, rollout, certification (standalone — not wired)

6. **Frozen feature flags (names and defaults):**
   - `FF_EVENT_PLATFORM_ENABLED` — default OFF
   - `FF_EVENT_OUTBOX_ENABLED` — default OFF
   - `FF_EVENT_REPLAY_ENABLED` — default OFF
   - `FF_EVENT_SHADOW_PUBLISHING_ENABLED` — default OFF
   - `FF_EVENT_PROJECTION_ENABLED` — default OFF
   - `FF_ORDER_SHADOW_EVENTS_ENABLED` — default OFF
   - `FF_EVENT_PROJECTION_RUNTIME_ENABLED` — default OFF
   - `FF_ORDER_READ_PROJECTION_ENABLED` — default OFF
   - `FF_ORDER_PROJECTION_PARITY_ENABLED` — default OFF
   - `FF_ORDER_PROJECTION_SOAK_ENABLED` — default OFF
   - `FF_EVENT_OPERATIONAL_VALIDATION_ENABLED` — default OFF
   - `FF_ORDER_PROJECTION_ADAPTER_ENABLED` — default OFF
   - `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` — default OFF
   - `FF_ORDER_PROJECTION_CERTIFICATION_ENABLED` — default OFF

7. **Version constants (M6 PR-14 — promoted 2026-06-27):**
   - `EVENT_SDK_VERSION = '1.0.0'` ✅
   - `EVENT_SDK_FROZEN = true` ✅
   - Git tag: `event-platform-v1.0` (pending — see release commands)

8. **Explicit exclusions from v1.0:**
   - OrderSDK → adapter wiring
   - Production routing / read switch
   - Firestore production migration
   - Production feature flag enablement
   - Performance benchmarks and prod dashboards
   - UI / Presentation changes
   - M1–M5 frozen SDK contract changes
   - M7 Menu Platform changes

9. **No runtime behaviour changes in PR-14** — metadata and documentation only.

10. **Certification verdict:** CONDITIONAL GO
    - **GO** for metadata freeze and ARB acceptance
    - **NO GO** for production activation until staging soak and explicit rollout approval

---

## Consequences

### Positive

- Stable EventSDK contract for spine consumers
- Complete order projection evidence chain documented
- Governance pack (ADR-019–022) + v1.0 platform pack unified
- Rollback procedures documented (L1–L4)
- No impact on frozen platforms (M1–M5, M7, OrderSDK read API)

### Negative / trade-offs

- Adapter/rollout infrastructure exists but is not usable via OrderSDK
- No production soak evidence yet
- Order projection is shadow-only until explicit activation

### Governance

- Breaking changes to frozen surface require new ADR + major version bump
- Wiring adapter into OrderSDK requires separate ADR + ARB approval
- Production activation requires PR-13 certification `READY` or `CONDITIONAL`

---

## Alternatives considered

1. **Extend ADR-019 instead of new ADR-024** — Rejected. ADR-019 covers event contract governance; platform v1.0 freeze follows M7 ADR-023 pattern.

2. **Combine metadata promotion with production activation** — Rejected. Violates incremental rollout strategy.

3. **Defer freeze until production soak** — Rejected. Architecture complete; soak proceeds post-freeze in staging.

---

## References

- [EVENT-PLATFORM-CERTIFICATION.md](../m6/v1.0/EVENT-PLATFORM-CERTIFICATION.md)
- [EVENT-PUBLIC-API-v1.md](../m6/v1.0/EVENT-PUBLIC-API-v1.md)
- [docs/m6/v1/](../m6/v1/) — governance contract pack
- [docs/m6/README.md](../m6/README.md)
- ADR-023 (Menu Platform v1.0 freeze — template)

---

**M6 PR-14 complete.** Metadata promoted. Production activation prohibited until staging soak and explicit rollout approval.
