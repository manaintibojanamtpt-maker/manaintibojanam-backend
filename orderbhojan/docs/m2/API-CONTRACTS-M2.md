# M2 API Contracts — Location Intelligence

**Status:** PROPOSED — Planning only  
**Governance:** ADR-OB-001, ADR-OB-004  
**Implementation owner (future):** Agent 08 Marketplace API  
**Do not modify** `orderbhojan/openapi/marketplace-api.yaml` until implementation approval.

---

## Principles

1. OrderBhojan client **never** calls Nominatim, Google Maps, or Mapbox directly.
2. All geocoding and serviceability logic runs **server-side** via BhojanOS Location SDK adapters.
3. Public responses contain **no** `tenantId`, `branchId`, or internal geohash indexes.
4. M2 ships with **MSW mocks** until backend endpoints are certified.

---

## New Endpoints (Proposed)

### Reverse Geocode

#### `GET /api/marketplace/location/reverse`

Convert coordinates to customer-safe place label and structured hints.

**Query**

| Param | Type | Required |
|-------|------|----------|
| `lat` | number | yes |
| `lng` | number | yes |
| `language` | string | no — default `en` |

**Response**

```typescript
type ApiSuccessReverseGeocode = ApiSuccess<{
  displayLabel: string;              // "Koregaon Park, Pune"
  hints?: {
    stateName?: string;
    cityName?: string;
    areaName?: string;
    pincode?: string;
  };
  confidence: 'high' | 'medium' | 'low';
}>;
```

**Errors:** `LOCATION_REQUIRED`, `GEOCODE_UNAVAILABLE` (retryable)

**Internal:** LocationSDK.reverseGeocode → Nominatim proxy with cache

---

### Validate Pincode

#### `GET /api/marketplace/location/validate-pincode`

Validate 6-digit pincode against reference data.

**Query:** `pincode` (string), optional `stateCode`

**Response**

```typescript
ApiSuccess<{
  valid: boolean;
  stateCode?: string;
  districtName?: string;
  cityName?: string;
  areas?: { areaCode: string; areaName: string }[];
  message?: string;
}>;
```

---

### Serviceability Preview

#### `POST /api/marketplace/location/serviceability`

Check delivery availability for a point. Used in M2 for **preview messaging only** — not checkout.

**Body**

```typescript
{
  lat: number;
  lng: number;
  restaurantId?: string;       // optional — when viewing restaurant context (M5+)
  contextToken?: string;       // optional — branch binding
  orderType?: 'delivery' | 'pickup';
}
```

**Response**

```typescript
ApiSuccess<{
  delivery: boolean;
  pickup: boolean;
  message?: string;            // "Delivery available" | "Outside delivery area"
  distanceKm?: number;
  etaMinutes?: { min: number; max: number };
}>;
```

**Errors:** `UNSERVICEABLE` (422), `RESTAURANT_NOT_FOUND`, `CONTEXT_INVALID`

**Note:** Server authoritative — client displays only.

---

### Reference Data (Optional — reduces client bundle)

#### `GET /api/marketplace/location/reference/states`

#### `GET /api/marketplace/location/reference/districts?stateCode=`

#### `GET /api/marketplace/location/reference/cities?districtCode=`

#### `GET /api/marketplace/location/reference/areas?cityCode=`

**Response:** Static JSON arrays matching domain model codes.

**M2 decision:** Client bundles reference data by default; API fetch is Phase 2 if bundle exceeds budget (see ARB open question).

---

## Existing Endpoints — Location Dependency (No M2 calls)

These require `lat`/`lng` but are **out of M2 implementation scope**:

| Endpoint | Milestone | M2 relationship |
|----------|-----------|-----------------|
| `GET /discover` | M3 | Consumes `CustomerLocation` from M2 store |
| `GET /search` | M4 | Same |
| `GET /restaurants/:slug` | M5 | Serviceability + contextToken |
| `POST /quote` | M8 | `deliveryAddress` from SavedAddress |

---

## MSW Mock Contract (M2 Client)

Location Platform agent owns handlers in `orderbhojan/src/marketplace-api/mocks/` **at implementation** — gated by `FF_LOCATION_GEOCODE_API`.

| Handler | Fixture behavior |
|---------|------------------|
| reverse | Pune area labels for MH coords |
| validate-pincode | 411001 valid |
| serviceability | delivery true within 8km mock |

---

## Error Codes (Extended)

| Code | HTTP | Meaning |
|------|------|---------|
| `LOCATION_REQUIRED` | 400 | lat/lng missing |
| `GEOCODE_UNAVAILABLE` | 503 | Upstream geocoder down — retryable |
| `PINCODE_NOT_FOUND` | 404 | Unknown pincode |
| `UNSERVICEABLE` | 422 | Outside delivery zone |

---

## Versioning

Header: `X-Marketplace-API-Version: 1.0`  
Location endpoints additive in v1.0 — minor OpenAPI bump to `1.0.0-m2` at implementation.

---

## Review Status

| Reviewer | Date | Status |
|----------|------|--------|
| ARB | 2026-06-26 | **Reviewed** — contracts align with ADR-OB-001 |
| Marketplace API agent | — | Pending implementation assignment |

---

*BhojanOS backend reference: `docs/m2/LOCATION-SDK-DESIGN.md`, `docs/m2/BRANCH-DISCOVERY-FLOW.md`*
