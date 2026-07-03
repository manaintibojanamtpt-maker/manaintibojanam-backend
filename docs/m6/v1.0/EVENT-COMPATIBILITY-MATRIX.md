# Event Compatibility Matrix v1.0

**Status:** Frozen — M6 PR-14  
**Date:** 2026-06-27

---

## 1. Supported clients

| Client | Integration path | v1.0 support | Notes |
|--------|------------------|--------------|-------|
| **Order projection worker** | EventSDK subscribe + projection | ✅ Full | Flags OFF by default |
| **Shadow publishers** | Outbox + business events | ✅ Full | Staging only |
| **Admin replay** | `replay()` | ✅ Full | `FF_EVENT_REPLAY_ENABLED` |
| **OrderSDK** | No direct EventSDK coupling | ✅ Unchanged | ADR-013 frozen |
| **M1–M5 frozen SDKs** | No event integration | ✅ Unchanged | Consumer-only |
| **M7 Menu Platform** | Independent | ✅ Unchanged | Frozen ADR-023 |

---

## 2. Feature flag combinations

### Core Event Platform

| `FF_EVENT_PLATFORM` | Behaviour |
|---------------------|-----------|
| OFF | Stub SDK — no publish/subscribe |
| ON | Core event infrastructure active |

### Projection evidence chain (standalone)

| Platform | Projection | Runtime | Order Projection | Behaviour |
|----------|------------|---------|------------------|-----------|
| OFF | * | * | * | No projection |
| ON | OFF | * | * | Platform only |
| ON | ON | OFF | * | Worker foundation |
| ON | ON | ON | OFF | Runtime active |
| ON | ON | ON | ON | Order shadow projection |

### Parity / soak / operational

Requires cumulative flags ON through order projection before parity/soak/operational activate.

### Order adapter / rollout / certification (standalone)

| Adapter | Rollout | Certification | Behaviour |
|---------|---------|---------------|-----------|
| OFF | * | * | Legacy only |
| ON | OFF | * | Adapter gates; stage 0 |
| ON | ON | OFF | Staged rollout policy |
| ON | ON | ON | Full switch certification |

**None of these flags change OrderSDK default routing in v1.0.**

---

## 3. SDK version compatibility

| Version | Status | Notes |
|---------|--------|-------|
| `0.10.0-operational-validation` | Superseded | Pre-freeze scaffold |
| `1.0.0` | **Current** | ADR-024 frozen |
| `< 1.0.0` | Pre-release | Internal development only |

### Backward compatibility

- EventSDK 5-method contract stable since PR-1
- EventEnvelope shape frozen per ADR-019
- All PR-5–PR-13 modules additive
- OrderSDK read API (ADR-013) unchanged

---

## 4. Migration prerequisites

Before production enablement:

1. ARB acceptance of ADR-024 ✅
2. PR-14 metadata promotion ✅
3. 72-hour staging soak with flags ON (staging only)
4. PR-13 switch certification `READY` or `CONDITIONAL`
5. Explicit production activation approval

---

## 5. Recommended staging enable sequence

1. `FF_EVENT_PLATFORM_ENABLED`
2. `FF_EVENT_OUTBOX_ENABLED`
3. `FF_EVENT_SHADOW_PUBLISHING_ENABLED` (if Firestore shadow needed)
4. `FF_EVENT_PROJECTION_ENABLED`
5. `FF_ORDER_SHADOW_EVENTS_ENABLED`
6. `FF_EVENT_PROJECTION_RUNTIME_ENABLED`
7. `FF_ORDER_READ_PROJECTION_ENABLED`
8. `FF_ORDER_PROJECTION_PARITY_ENABLED`
9. `FF_ORDER_PROJECTION_SOAK_ENABLED`
10. `FF_EVENT_OPERATIONAL_VALIDATION_ENABLED`
11. `FF_ORDER_PROJECTION_ADAPTER_ENABLED` (staging only)
12. `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` (staging only)
13. `FF_ORDER_PROJECTION_CERTIFICATION_ENABLED`

**Production:** identical order with ARB sign-off at each gate.

---

## 6. Frozen platform matrix

| Platform | Modified by M6 PR-14 | Status |
|----------|----------------------|--------|
| OrderSDK read API | No | Frozen ADR-013 |
| SearchSDK | No | Frozen |
| DiscoverySDK | No | Frozen |
| BranchSDK | No | Frozen |
| MenuSDK | No | Frozen ADR-023 |
| LocationSDK / ReferenceSDK | No | Frozen |
