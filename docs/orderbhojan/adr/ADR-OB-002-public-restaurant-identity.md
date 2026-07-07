# ADR-OB-002 — Public Restaurant Identity (Opaque IDs)

**Status:** Proposed — M0 ARB Review  
**Date:** 2026-07-03  
**Supersedes:** Draft API contracts exposing `tenantId` / `branchId` to clients

---

## Context

OrderBhojan customers must never see BhojanOS internal identifiers:

- `tenantId`, `tenantSlug`, `branchId`
- Firestore paths or document IDs

They interact with marketplace concepts: **restaurant**, **menu**, **order**.

BhojanOS internally uses `tenantId` (+ future `organizationId`, `brandId`, `branchId`).

---

## Decision

### Public identifiers (customer-visible)

| Field | Description |
|-------|-------------|
| `restaurantId` | Opaque, stable public ID (e.g. `obr_` prefixed ULID or deterministic hash of brand) |
| `restaurantSlug` | SEO-safe URL slug for deep links (`/restaurant/:restaurantSlug`) |
| `orderId` | Existing public order ID (unchanged) |

### Internal identifiers (server-only)

| Field | Scope |
|-------|-------|
| `tenantId` | BhojanOS tenant document |
| `branchId` | Assigned branch after routing |
| `organizationId` | Future org hierarchy |

### Mapping layer

```
Marketplace API Gateway
        │
        ▼
RestaurantIdentityResolver
  restaurantId → { tenantId, brandId?, defaultBranchId? }
  restaurantSlug → restaurantId
        │
        ▼
BranchAssignmentService (per request with customer location)
  → branchId (never returned to client by default)
```

### API response rule

Responses include `restaurantId`, `restaurantSlug`, `displayName`, `logo`, `rating`, `eta`, `deliveryFee`.

They **exclude** `tenantId`, `branchId`, `tenantSlug`, Firestore paths.

### Session binding

After branch assignment, server stores mapping in:

- **Option A (recommended v1):** Signed, HttpOnly session cookie `ob_session` containing `{ restaurantId, branchId, assignedAt, customerPointHash }` — not readable by JS
- **Option B:** Opaque `contextToken` returned to client, validated on each quote/checkout call

Client sends `restaurantId` + `contextToken` (if Option B). Server resolves branch internally.

---

## ARB critical review

**Previous draft flaw:** Exposed `tenantId` and `branchId` in Discovery/Menu DTOs. **Rejected** — violates tenant security requirement.

**Challenge:** Favorites in OrderBhojan Firestore previously keyed by `tenantId`. **Fix:** Key by `restaurantId` only.

**Challenge:** Deep links today use `/k/{slug}`. **Fix:** OrderBhojan uses `/restaurant/{restaurantSlug}`; server maps slug → identity; legacy storefront URLs remain on BhojanOS domain.

---

## Organization model (future-ready)

```
Organization (owner account)
    └── Brand (customer-facing restaurant brand)
            └── Branch (fulfillment location)
```

Public `restaurantId` maps to **Brand** (not Branch). Branch assignment remains server-side per session.

BhojanOS v1 production: Brand ≈ Tenant (1:1). ADR does not require org schema migration for M0–M3.

---

## Consequences

- Requires `RestaurantIdentityResolver` in Marketplace API (M0 stub, M3 production)
- Slightly more server state for branch binding
- Stronger protection against cross-tenant manipulation attacks

**ARB sign-off:** ☐ Pending M0
