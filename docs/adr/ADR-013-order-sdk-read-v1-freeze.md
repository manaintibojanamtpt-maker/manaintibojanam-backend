# ADR-013: OrderSDK Read API v1.0 Freeze

**Status:** Accepted  
**Date:** 2026-06-26  
**Deciders:** Architecture Review Board  
**Supersedes:** N/A (first stable read API release)  
**Related:** ADR-011 (SDK Strangler), ADR-012 (Guest Order Access), FEB-001, BHOS-000, BHOS-TDD-001

> **Note:** The freeze prompt referenced ADR-012; that number is allocated to [ADR-012 Guest Order Access](./ADR-012-guest-order-access.md). This freeze is recorded as **ADR-013**.

---

## Context

BhojanOS is migrating presentation code to an SDK-first boundary (ADR-011). M1A/M1B strangler PRs implemented read paths for OrderTracking, MyOrders, and OwnerOrders behind feature flags. Order Domain Certification conditionally approved freezing the **read-only** OrderSDK surface as v1.0.0 after documentation and staging soak.

External-style consumers (presentation facades, future npm package) require a stable contract: method signatures, DTOs, error codes, and result types must not change without governance.

---

## Decision

1. **Freeze** OrderSDK Read API at version **1.0.0** effective 2026-06-26.  
2. **Frozen public surface** — four methods on `OrderSDK`:
   - `getOrderById`
   - `listOrdersForUser`
   - `listOrdersForTenant`
   - `requestGuestViewToken`
3. **Frozen artifacts** — DTOs, branded IDs, `SdkResult`/`SdkError` as used by read methods (documented in `docs/sdk/v1.0/`).  
4. **Version constant** — `ORDER_SDK_READ_API_VERSION = '1.0.0'`, `ORDER_SDK_READ_API_FROZEN = true`.  
5. **Git tag** — `orders-sdk-read-v1.0` recommended after staging soak.  
6. **Explicit exclusions from v1.0.0:**
   - Write operations  
   - Checkout, payments, menu, inventory, notifications  
   - `RealtimeProvider` (companion beta, unwired)  
   - `OrderApiAdapter` / ports (internal)  
7. **No runtime behavior changes** in the freeze PR — documentation and version metadata only.

---

## Consequences

### Positive

- Presentation teams can depend on stable read contracts.  
- Breaking changes require ADR + major version bump.  
- Certification baseline for future Order domain work (writes = v2+).  

### Negative / deferred

- Hybrid transport (HTTP vs Firestore) remains implementation detail; not unified in v1.0.  
- Passthrough DTO fields are transitional; documented but not fully normalized.  
- Feature flags default OFF; production validation pending 72h staging soak.  
- `SDK_VERSION` remains `0.1.0-scaffold` until M2 package split.  

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Freeze entire Order domain (reads + writes) | Writes not migrated; certification No-Go |
| Wait for RealtimeProvider wiring | Realtime is separate concern; polling sufficient for v1.0 read |
| No version constant | Consumers cannot assert contract version at runtime |
| Reuse ADR-012 number | Already assigned to guest JWT access |

---

## References

- `docs/sdk/v1.0/` — full API specification  
- `docs/releases/orders-sdk-read-v1.0.md` — release notes  
- `docs/sdk/ORDER-SDK-READ-v1.0-CERTIFICATION.md` — certification report  
- `docs/m1/SDK-COVERAGE-DASHBOARD.md`  
- Order Domain Certification (2026-06, conditional Go)

---

## Compliance

Future changes to frozen symbols require:

- **Patch:** bug fix only  
- **Minor:** additive only  
- **Major:** new ADR + Architecture Board approval  

---

*ADR-013 — OrderSDK Read API v1.0.0 freeze.*
