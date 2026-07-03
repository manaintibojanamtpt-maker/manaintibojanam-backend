# M3 Phase 1 — Repository Audit

**Status:** Complete (read-only audit)  
**Date:** 2026-06-26  
**Code changes:** None

---

## Executive Summary

BhojanOS today is a **single-tenant storefront** (`/k/{slug}`). Customers must know a kitchen slug to order. **No marketplace discovery exists.** Location infrastructure from M2 (geocoding, GPS, geohash math, owner structured address, customer detection facade) is complete behind feature flags, but **zero runtime discovery** is wired: no `geoIndex`, no repository reads, no ranked restaurant list, no discovery UI.

The pragmatic first implementation path (M3 PR-1+) is **tenant-as-branch**: read active `tenants` with embedded `location.geohash` before full `branches`/`geoIndex` migration.

---

## 1. Storefront Discovery

| Aspect | Current | Gap |
|--------|---------|-----|
| Entry | `/k/{tenantSlug}` direct link | No `/discover`, no nearby list |
| Platform root | Owner marketing on `bhojanos.com` | No customer marketplace home |
| Tenant listing | Super-admin `fetchAllTenants()` only | Not customer-facing |

**Key files:** `src/App.tsx`, `src/lib/tenantPath.ts`, `src/context/TenantContext.tsx`

---

## 2. Tenant Lookup & Slug Routing

```
/k/spice-kitchen/menu
  → parseStorefrontSlug() → "spice-kitchen"
  → sessionStorage cache OR getDoc(tenants/{id}) OR where('slug','==',slug)
  → tenantInfo applied
```

Lookup is **identity resolution**, not geo-filtered discovery.

**Key files:** `src/context/TenantContext.tsx`, `src/hooks/useStorefrontPath.ts`, `server.ts`

---

## 3. Home Page

- Single-tenant menu rails (categories, trending, specials)
- Firestore: `menu`, `categories`, `orders` scoped by `tenantId`
- Location prompt UI exists but **`showLocationPrompt` never opens** (auto-prompt removed)
- Manual location modal saves **text-only** address (no lat/lng/geohash)

**Key file:** `src/pages/Home.tsx`

---

## 4. Search

| Surface | Behaviour |
|---------|-----------|
| `Home.tsx` | Search navigates to `/menu` — no query passed |
| `Menu.tsx` | Client-side item filter (name, category, description) |
| Restaurant search | **Absent** |

**Design reference:** `docs/m2/SEARCH-INTELLIGENCE-ARCHITECTURE.md`

---

## 5. Customer Location Flow

| Component | Storage | Notes |
|-----------|---------|-------|
| `CustomerLocationFacade` | sessionStorage `bhos-customer-location-session` | Flag: `FF_LOCATION_CUSTOMER_DETECTION_ENABLED` (OFF) |
| `useDeliveryState` | localStorage `mana-delivery-state` | No geohash; not synced with facade |
| `AutoLocationForm` | Uses facade when flag ON | Still direct Nominatim for manual search |

**Gap:** Three disconnected stores; customer location does not drive discovery.

**Key files:** `src/lib/customerLocation/`, `src/lib/useDeliveryState.ts`, `src/components/AutoLocationForm.tsx`

---

## 6. Firestore Queries (Tenants / Geo)

### In use

| Collection | Geo fields | Queries |
|------------|------------|---------|
| `tenants/{id}` | `location.lat/lng/geohash?`, `deliveryConfig`, `slug`, `status` | `getDoc`, `where('slug')`, `where('ownerId')` |
| `menu`, `categories`, `orders` | `tenantId` only | Tenant-scoped |

### Designed, not implemented

- `branches/{branchId}`
- `locations/{locationId}`
- `geoIndex/{docId}`

**Indexes (`firestore.indexes.json`):** Only `orders` and `notification_outbox` — **no geo indexes**.

**Rules:** `tenants` public read — suitable for discovery once filtered server-side or via rules.

---

## 7. Delivery Calculations

| Function | File | Notes |
|----------|------|-------|
| `calculateDeliveryDistanceKm` | `src/lib/deliveryFee.ts` | Haversine × 1.2 road factor |
| `computeDeliveryFee` | `src/lib/deliveryFee.ts` | Tiered; `-1` = out of radius |
| `LocationSDK.calculateDistance` | SDK | Road factor defaults to 1.0 (not 1.2) |
| `ServiceabilityService.ts` | Dead code | Hardcoded Pune, never imported |

Serviceability is **single-tenant, inline in presentation** — not batch-ready for discovery.

---

## 8. Branch Readiness / Store Status

No branch entity. Tenant-level only:

| Check | Function |
|-------|----------|
| Open now | `isTenantStoreOpenNow()` — `src/lib/tenantStoreOperations.ts` |
| Live for orders | `isStoreLiveForOrders()` — `src/lib/planStatus.ts` |
| Setup complete | `computeStoreSetupProgress()` — includes location + delivery radius |
| Realtime | `useTenantStoreStatus()` — `onSnapshot(tenants/{id})` |

Structured location readiness (owner): `isStructuredTenantLocationComplete()` when owner registration flag ON.

---

## 9. LocationSDK Discovery Methods

| Method | Status |
|--------|--------|
| `findNearbyBranches` | `NOT_CONFIGURED` in `DefaultLocationAdapter` |
| `findNearbyRestaurants` | `NOT_CONFIGURED` |
| `LocationRepositoryImpl.queryGeoIndex` | Stub |

DTOs exist in `src/sdk/location/dto/discovery.ts`. Flag `FF_LOCATION_DISCOVERY_ENABLED` exists (OFF), no UI consumer.

---

## 10. Geohash Usage

| Implemented | Not implemented |
|-------------|-----------------|
| Local encode/decode | Firestore `geoIndex` collection |
| Open geocoding geohash | `queryGeoIndex()` adapter |
| Owner `tenants.location.geohash` (PR-9) | 8-neighbor prefix expansion query |
| Customer canonical geohash (PR-10) | Index writes on location save |

---

## Prioritized Gaps for M3

| Priority | Gap |
|----------|-----|
| P0 | `DiscoverySDK` + repository read adapter (tenant-as-branch interim) |
| P0 | Discovery UI route behind `FF_DISCOVERY_ENABLED` |
| P0 | Unify customer location → discovery query point |
| P1 | Search intelligence (cuisine, area, rank) |
| P1 | Batch serviceability via `DeliveryEligibility` DTO |
| P1 | Firestore indexes + rules for `geoIndex` |
| P2 | Multi-branch `branches` collection migration |
| P2 | MapLibre discovery markers |

---

## Key File Index

| Concern | Path |
|---------|------|
| Routing | `src/App.tsx`, `src/lib/tenantPath.ts` |
| Tenant | `src/context/TenantContext.tsx` |
| Home / Menu | `src/pages/Home.tsx`, `src/pages/Menu.tsx` |
| Location | `src/lib/customerLocation/`, `src/components/AutoLocationForm.tsx` |
| Delivery | `src/lib/deliveryFee.ts`, `src/lib/useDeliveryState.ts` |
| Store status | `src/lib/tenantStoreOperations.ts`, `src/hooks/useTenantStoreStatus.ts` |
| LocationSDK | `src/sdk/location/` |
| M2 design | `docs/m2/BRANCH-DISCOVERY-FLOW.md`, `SEARCH-INTELLIGENCE-ARCHITECTURE.md`, `FIRESTORE-SCHEMA-PROPOSAL.md` |
