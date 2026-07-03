# M6 Event Platform — PR-1 Foundation Report

**Program:** BHOS-M6-A  
**PR:** M6 PR-1 — Event Platform Foundation  
**Date:** 2026-06-26  
**Status:** Complete — awaiting ARB approval  
**ADR:** [ADR-018](../adr/ADR-018-event-platform.md)

---

## Executive Summary

M6 PR-1 establishes **Platform Zero** — the Event Platform foundation for BhojanOS. All contracts, DTOs, ports, domain logic, feature flags, and foundation tests are delivered. **Zero production impact** — all flags default OFF.

No M1–M5 frozen SDKs were modified. No Firestore or messaging adapters were introduced.

---

## 1. Repository Audit

### 1.1 Current Write Paths (Legacy)

All direct Firestore writes identified in `src/services/api.ts`:

| Write Path | Collection | Operation | Line(s) | Migration Target |
|------------|------------|-----------|---------|------------------|
| User registration | `users` | `setDoc` | ~241 | Identity Command Platform (M6+) |
| User role update | `users` | `updateDoc` | ~259 | Identity Command Platform |
| Referral creation | `referrals` | `setDoc` | ~275, ~299 | Identity Command Platform |
| Referral code update | `users` | `updateDoc` | ~296 | Identity Command Platform |
| User profile update | `users` | `updateDoc` | ~337 | Identity Command Platform |
| Draft order save | `orders` (draft) | `setDoc` | ~379 | Order Command Platform |
| **Order creation** | `orders` | `setDoc` | ~415 | Order Command Platform → `order.created` event |
| Order item update | `orders` | `updateDoc` | ~463 | Order Command Platform |
| Order status update | `orders` | `updateDoc` | ~560 | Order Command Platform → `order.status_changed` |
| Order branch update | `orders` | `updateDoc` | ~620 | Order Command Platform |
| Order metadata update | `orders` | `updateDoc` | ~654 | Order Command Platform |
| Batch order update | `orders` | `updateDoc` | ~719 | Order Command Platform |
| **Menu item create** | `menu` | `addDoc` | ~873 | Menu Command Platform → `menu.item_created` |
| **Menu item update** | `menu` | `updateDoc` | ~888 | Menu Command Platform → `menu.item_updated` |
| Menu item delete | `menu` | `deleteDoc` | ~898 | Menu Command Platform → `menu.item_deleted` |
| **Tenant status update** | `tenants` | `updateDoc` | ~974 | Tenant Command Platform → `tenant.status_changed` |
| Sales pipeline update | `salesPipeline` | `updateDoc` | ~978 | CRM Platform (future) |

### 1.2 Checkout Writes

Checkout flow (`src/lib/checkout/`) uses `CheckoutBranchFacade` (M5) for branch assignment intelligence. Order persistence still routes through legacy `createOrder` in `api.ts` when order write flags are OFF.

### 1.3 Read Paths (Frozen SDKs — Untouched)

M1–M5 read SDKs and facades remain the presentation read boundary:

- `OrderSDK` / order facades
- `LocationSDK` / location facades
- `ReferenceSDK`
- `DiscoverySDK` / discovery facades
- `SearchSDK` / search facades
- `BranchSDK` / branch facades

### 1.4 Audit Conclusion

**100% of production writes bypass the Event Platform today.** PR-1 does not migrate any write path. Future PRs will introduce Command Platforms that emit `EventEnvelope<T>` via outbox.

---

## 2. Architecture

### 2.1 Bounded Context

**Event Platform** owns event metadata only — envelope, routing, outbox, schema registry, replay, idempotency. It does **not** own business aggregates (Order, Menu, Tenant, Branch).

### 2.2 Ownership

| Component | Owner | Location |
|-----------|-------|----------|
| EventEnvelope, DTOs | EventSDK | `src/sdk/events/dto/` |
| Ports (Publisher, Subscriber, Outbox, Store, Replay) | EventSDK | `src/sdk/events/contracts/` |
| Feature flags | EventSDK | `src/sdk/events/core/featureFlags.ts` |
| Domain validation, outbox policy, replay planning | Event Domain | `src/domain/events/` |
| In-memory providers (dev/test) | EventSDK | `src/sdk/events/providers/` |
| Firestore adapters | **Not in PR-1** | Future PR-2+ |

### 2.3 Dependency Graph

```
Presentation
    ↓ (future: Command handlers)
Command Platform (future)
    ↓
Domain (business aggregates — future)
    ↓
Event Domain (envelope validation, outbox policy)
    ↓
EventSDK (OutboxRepository → Publisher → EventStore)
    ↓
Projection Workers (future)
    ↓
Read Models
    ↓
Frozen SDKs (M1–M5)
    ↓
Presentation
```

### 2.4 Platform Law

1. No platform publishes raw JSON — `EventEnvelope<T>` only
2. Commands → Domain → Events (Outbox) → Projection → Read Models → Frozen SDKs → Presentation
3. Read SDKs remain consumers only
4. Provider-neutral — no vendor lock-in in foundation

---

## 3. Deliverables Checklist

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Repository audit | ✅ This document §1 |
| 2 | Architecture report | ✅ This document §2 |
| 3 | SDK `src/sdk/events/` | ✅ |
| 4 | Domain `src/domain/events/` | ✅ |
| 5 | DTOs (13 types) | ✅ |
| 6 | Ports (8+) | ✅ |
| 7 | Factories (4) | ✅ |
| 8 | Feature flags (3, default OFF) | ✅ |
| 9 | Foundation tests | ✅ |
| 10 | ADR-018 | ✅ |
| 11 | Migration roadmap | ✅ §4 |
| 12 | DoR / DoD | ✅ §5 |
| 13 | Risk assessment | ✅ §6 |
| 14 | Rollback plan | ✅ §7 |

---

## 4. Migration Roadmap

| Phase | PR | Scope | Flags |
|-------|-----|-------|-------|
| **PR-1** | M6 PR-1 | Foundation contracts, domain, in-memory providers | All OFF |
| PR-2 | M6 PR-2 | Firestore outbox adapter, event store adapter | `FF_EVENT_OUTBOX_ENABLED` dev only |
| PR-3 | M6 PR-3 | Order Command Platform — `order.created` via outbox | Per-platform flags |
| PR-4 | M6 PR-4 | Menu Command Platform — menu events | Per-platform flags |
| PR-5 | M6 PR-5 | Projection workers — order read model | Projection flags |
| PR-6+ | M6+ | Tenant, Identity, remaining write path migration | Incremental |

**Strangler rule:** Each PR independently deployable. Legacy write paths remain until corresponding Command Platform PR enables outbox for that aggregate.

---

## 5. Definition of Ready / Done

### Definition of Ready (PR-1)

- [x] OS Spine architecture approved
- [x] ADR-018 drafted
- [x] No M1–M5 SDK modifications required
- [x] Feature flag strategy defined
- [x] Test strategy defined (mock only, no Firestore)

### Definition of Done (PR-1)

- [x] `src/sdk/events/` complete with README
- [x] `src/domain/events/` complete with README
- [x] All DTOs and ports implemented
- [x] Factories: `createEventSDK`, `createEventPublisher`, `createEventSubscriber`, `createOutboxRepository`
- [x] Feature flags default OFF
- [x] Foundation tests pass (`eventSdkFoundation.test.ts`, `eventDomain.test.ts`)
- [x] ADR-018 written
- [x] Repository audit documented
- [x] No production wiring
- [x] STOP — no Identity Platform, no Firestore adapters

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Accidental flag enablement in prod | Low | High | All flags default OFF; env keys require explicit `VITE_FF_*` |
| Envelope schema drift | Medium | Medium | SchemaRegistryPort + version resolver in domain |
| Duplicate event publish | Medium | High | IdempotencyStorePort + idempotencyKey on metadata |
| Legacy writes continue during migration | Certain | Medium | Strangler — dual-write only when Command Platform PR lands |
| Breaking frozen SDKs | Low | Critical | PR-1 touches zero M1–M5 files |

---

## 7. Rollback Plan

PR-1 is **fully rollback-safe**:

1. All feature flags default OFF — removing the PR code path has zero runtime effect
2. No Firestore schema changes
3. No API route changes
4. No presentation layer changes
5. Rollback = revert PR merge; `npm run test:sdk` confirms M1–M5 tests still pass

---

## 8. Test Summary

| Test File | Scope |
|-----------|-------|
| `src/sdk/__tests__/eventSdkFoundation.test.ts` | SDK version, flags, stub adapter, envelope validation, publish/subscribe/replay with mocks |
| `src/domain/events/__tests__/eventDomain.test.ts` | Pure domain: outbox builder, registry, replay policy, subscription matching |

---

**STOP.** Await ARB approval before M6 PR-2. Do not continue to Identity Platform.
