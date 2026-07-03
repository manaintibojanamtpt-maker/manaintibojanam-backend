# M2 Phase 1 — Repository Analysis & Current Location Audit

**Status:** Complete (read-only audit)  
**Date:** 2026-06-26  
**Code changes:** None

---

## 1. Executive Findings

BhojanOS location handling is **fragmented, tenant-embedded, and presentation-coupled**. There is no domain layer for location, no SDK module (only `SDK_MODULE.LOCATION` constant), no geohash, and no visual map. The system works for **single-store storefronts** (slug-based tenant routing) but cannot support marketplace discovery, multi-branch, or scalable geo queries without architectural investment.

---

## 2. Current Location Usage Map

### 2.1 Customer-facing

| File | Role | External deps |
|------|------|---------------|
| `src/components/AutoLocationForm.tsx` | GPS detect, Nominatim reverse/forward geocode, distance/fee calc, address form | Nominatim OSM (direct `fetch`) |
| `src/components/HeaderLocationDropdown.tsx` | Saved addresses, opens AutoLocationForm, fee preview | `deliveryFee.ts`, Firestore `users` |
| `src/lib/useDeliveryState.ts` | Global delivery address state (localStorage) | None |
| `src/pages/Checkout.tsx` | Consumes location data, ETA heuristic, order address fields | AutoLocationForm (lazy) |
| `src/pages/Home.tsx` | Manual address modal, geolocation prompt (dismissible) | Browser geolocation |

### 2.2 Owner-facing

| File | Role | External deps |
|------|------|---------------|
| `src/pages/owner/OwnerSettings.tsx` | Kitchen address + lat/lng text fields, GPS auto-detect, delivery radius config | Browser geolocation |
| `src/pages/owner/OnboardingWizard.tsx` | Address/city/state/pincode free text; lat/lng copied from existing or `0` | None |

### 2.3 Shared utilities

| File | Role | Notes |
|------|------|-------|
| `src/lib/deliveryFee.ts` | Haversine distance (×1.2 road factor), tiered fee computation | **Canonical** fee logic |
| `src/lib/utils.ts` | Alternate `calculateDeliveryFee` | **Duplicate / divergent** |
| `src/services/ServiceabilityService.ts` | Hardcoded Pune shop, pincode allowlist, Haversine | **Dead code** — never imported |

### 2.4 Context / types

| File | Role |
|------|------|
| `src/context/TenantContext.tsx` | `TenantInfo.location`, `deliveryConfig` |
| `src/types.ts` | `Tenant.location`, `SavedAddress`, `UserProfile.savedAddresses` |
| `src/lib/storeSetupProgress.ts` | Location step = address + city present (no lat/lng required) |

---

## 3. Tenant / Store / Branch / Owner / Customer Models

### 3.1 Tenant = Store (today)

There is **no separate Store or Branch entity**. A `tenants/{tenantId}` document represents one kitchen/storefront.

```
Tenant (Firestore: tenants/{id})
├── slug, name, ownerId
├── location { address, city, state, pincode, lat, lng }   ← flat, no hierarchy
├── deliveryConfig { freeRadius, paidRadius, maxRadius, baseFee, perKmCharge, prepTime }
├── kyc.address / city / state / country / pincode          ← duplicate of location
└── storeOperations, paymentConfig, ...
```

**Gap:** KYC address and `location` can diverge. No `district`, `area`, `landmark`, `geohash`, or `GeoJSON`.

### 3.2 Branch model

- `src/domain/branch/.gitkeep` — placeholder only  
- `SDK_MODULE.BRANCH` in constants — no implementation  
- **No multi-branch support** in Firestore or UI

### 3.3 Owner model

- `UserProfile.role = 'owner'`, `ownedTenantIds[]`  
- Owner accesses single tenant via `useOwnerTenantId()`  
- Location edited in OwnerSettings / OnboardingWizard

### 3.4 Customer model

- `users/{uid}.savedAddresses[]` — flat structure (label, address, lat?, lng?, city?, pincode?, landmark?)  
- No structured India hierarchy  
- Delivery state in localStorage (`mana-delivery-state`)

### 3.5 Delivery model

- **Radius-based** (km circles): `freeRadius`, `paidRadius`, `maxRadius`  
- Fee: `computeDeliveryFee(distanceKm, deliveryConfig)` → `-1` if out of bounds  
- ETA: heuristic `prepTime + distanceKm × 4` minutes (Checkout)  
- **No polygon zones**, no geohash pre-filter, no routing

---

## 4. Firestore Schema (AS-IS)

### 4.1 `tenants/{tenantId}`

```typescript
location?: {
  address: string;      // free text "123 Food Street"
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
}

deliveryConfig?: {
  enabled?: boolean;
  freeRadius: number;    // km
  paidRadius: number;    // km
  maxRadius: number;     // km
  perKmCharge: number;
  baseFee: number;
  prepTime: number;      // minutes
  feesConfigured?: boolean;
  freeDeliveryMinOrder?: number;
}
```

### 4.2 `users/{uid}`

```typescript
savedAddresses?: Array<{
  id: string;
  label: string;
  address: string;
  isDefault: boolean;
  lat?: number;
  lng?: number;
  houseNumber?: string;
  buildingName?: string;
  landmark?: string;
  city?: string;
  pincode?: string;
}>
```

### 4.3 Orders (address snapshot)

Checkout persists address as string fields on order documents (via existing write path — **not modified in M2 design**). Coordinates may be embedded at order time from `deliveryState`.

### 4.4 Missing collections

- No `branches/`, `locations/`, `geoIndex/`, `deliveryZones/`  
- No geohash fields anywhere in codebase

---

## 5. Coordinates & Address Fields Audit

| Surface | lat/lng captured? | Validated? | Map pin? | Geohash? |
|---------|-------------------|------------|----------|----------|
| AutoLocationForm (customer) | ✅ GPS or search | Fee bounds only | ❌ | ❌ |
| OwnerSettings | ✅ GPS or manual text | ❌ | ❌ | ❌ |
| OnboardingWizard | ⚠️ Defaults 0,0 | ❌ | ❌ | ❌ |
| SavedAddress | Optional | ❌ | ❌ | ❌ |
| ServiceabilityService | Optional | Pincode list | ❌ | ❌ |

**Risk:** Onboarding can save `lat: 0, lng: 0` — location step marked complete without valid coordinates.

---

## 6. Map Components

| Component | Status |
|-----------|--------|
| MapLibre GL | **Not installed** |
| Google Maps SDK | **Not installed** (`.env.example` has unused `VITE_GOOGLE_MAPS_API_KEY`) |
| Leaflet | **Not installed** |
| Visual map | **None** — Lucide `Map`/`MapPin` icons only |
| Nominatim | Direct browser calls in `AutoLocationForm` |

---

## 7. Existing APIs & Server

| Endpoint / service | Location-related? |
|--------------------|-------------------|
| `server.ts` | No geocode/nominatim proxy |
| `src/services/api.ts` | No location endpoints |
| Nominatim | Client-side only (`nominatim.openstreetmap.org`) |

**Gap:** No server-side rate limiting, caching, or User-Agent compliance for Nominatim usage policy.

---

## 8. Dependencies

From `package.json`:

- **No** map libraries (maplibre, leaflet, google-maps)
- **No** geohash library (ngeohash, latlon-geohash)
- **No** turf.js / GeoJSON utilities

Location logic is **zero-dependency** inline math + fetch.

---

## 9. SDK / Domain State

| Artifact | Status |
|----------|--------|
| `src/sdk/` OrderSDK | ✅ Frozen v1.0.0 (ADR-013) |
| `src/sdk/` LocationSDK | ❌ Does not exist |
| `src/domain/` | Scaffold folders only (`branch/.gitkeep`) |
| `SDK_MODULE.LOCATION` | Constant only |

---

## 10. Duplication & Technical Debt

| Issue | Severity | Location |
|-------|----------|----------|
| Dual Haversine implementations | Medium | `deliveryFee.ts` vs `ServiceabilityService.ts` |
| Dual fee calculators | Medium | `deliveryFee.ts` vs `utils.ts` |
| Dead ServiceabilityService | Low | Never wired |
| Nominatim in presentation | High | Rate limits, no proxy |
| KYC vs location address split | Medium | Tenant model |
| Onboarding lat/lng = 0 default | High | Invalid geo data |
| No structured India address | High | All forms free text |
| Store setup doesn't require coords | Medium | `storeSetupProgress.ts` |

---

## 11. Feature Flag State

No location-related feature flags exist. M2 PRs should introduce:

- `FF_SDK_LOCATION_ENABLED` (master)
- Per-surface flags as needed (registration, discovery, customer detect)

---

## 12. Audit Conclusion

The repository is **ready for M2 architecture** but **not ready for multi-branch or marketplace** without:

1. LocationSDK + domain extraction from `AutoLocationForm` / `deliveryFee.ts`  
2. India Address Model + reference data (states/districts/pincodes)  
3. MapLibre integration for pin placement  
4. Firestore schema extension (Branch, Location, GeoIndex) — design only until approved migration PR  
5. Nominatim proxy adapter (server-side) for production compliance  

**No code changes in Phase 1.**

---

*M2 Phase 1 — Repository Analysis complete.*
