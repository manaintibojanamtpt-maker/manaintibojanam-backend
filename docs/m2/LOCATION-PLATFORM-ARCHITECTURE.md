# M2 — Location Platform Architecture

**Status:** Design only — no implementation  
**Authority:** ADR-011 (strangler), BHOS-PAF-001 (layer flow)

---

## 1. Layer Model

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  AutoLocationForm │ OwnerRegistration │ Discovery │ Checkout │
│  (imports LocationSDK only — future)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      LocationSDK                             │
│  Public contract: geocode, validate, distance, discovery     │
│  Returns SdkResult<T> — same pattern as OrderSDK             │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ LocationDomain│  │ LocationAdapter │  │LocationRepository│
│ Pure rules    │  │ External I/O    │  │ Persistence port │
└───────────────┘  └────────┬────────┘  └────────┬─────────┘
                            │                     │
                    ┌───────▼───────┐     ┌───────▼───────┐
                    │LocationProvider│     │   Firestore   │
                    │ Strategy       │     │   (future)    │
                    └───────┬───────┘     └───────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         Nominatim     MapLibre/OSM   Browser Geo
         (geocode)     (render)       (detect)
```

---

## 2. Five Location Intelligences

### 2.1 Address Intelligence

**Owns:** Structured India address hierarchy, validation, normalization, pincode rules.

| In scope | Out of scope |
|----------|--------------|
| State/district/city/area dropdowns | International addresses (M2+) |
| Pincode ↔ area validation | Address autocomplete ML |
| `IndiaAddress` DTO | Order address writes (Checkout unchanged until PR) |

**Domain:** `src/domain/location/address/` (future)

### 2.2 Map Intelligence

**Owns:** Map rendering, tile sources, pin UX, coordinate capture from map interaction.

| In scope | Out of scope |
|----------|--------------|
| MapLibre GL + OSM raster/vector tiles | Google Maps, Mapbox paid tiers |
| Draggable pin → lat/lng | 3D maps, turn-by-turn UI |
| GeoJSON point storage format | Offline map packs (future) |

**Provider:** `MapLibreLocationProvider` (presentation adapter, not in SDK core)

### 2.3 Branch Intelligence

**Owns:** Tenant↔Branch relationship, branch discovery, branch-scoped delivery config.

| In scope | Out of scope |
|----------|--------------|
| `findNearbyBranches` | Branch CRUD writes (separate milestone) |
| Branch read models | Franchise billing |
| Multi-branch per tenant | Cross-tenant admin (superadmin) |

**Note:** M2 designs Branch entity; **writes deferred** per quality gate.

### 2.4 Delivery Intelligence

**Owns:** Serviceability, radius/polygon zones, fee calculation, ETA estimation.

| In scope | Out of scope |
|----------|--------------|
| Circle radius (existing model) | Valhalla routing (future interface only) |
| Distance (Haversine + road factor) | Real-time traffic |
| Fee tiers from `DeliveryConfig` | Third-party delivery partner APIs |

**Migrates:** Logic from `src/lib/deliveryFee.ts` → `LocationDomain`

### 2.5 Discovery Intelligence

**Owns:** Nearby restaurant search, ranking signals, filter composition.

| In scope (architecture) | Out of scope (M2 impl) |
|-------------------------|------------------------|
| Search pipeline design | Full marketplace UI |
| Ranking weights (distance, rating, ETA) | AI recommendations engine |
| Geohash pre-filter strategy | Paid listing / ads |

---

## 3. Component Responsibilities

### 3.1 LocationSDK

**Path (proposed):** `src/sdk/location/`

| Responsibility | Detail |
|----------------|--------|
| Public API surface | Methods listed in LOCATION-SDK-DESIGN.md |
| Contract stability | Follow OrderSDK patterns (SdkResult, branded IDs) |
| No I/O | Interface + types only in foundation PR |
| Factory | `createLocationSDK(port?)` |

**Must NOT:** Import Firestore, fetch, MapLibre, or React.

### 3.2 LocationDomain

**Path (proposed):** `src/domain/location/`

| Responsibility | Detail |
|----------------|--------|
| Pure functions | Distance, geohash encode/decode, address validation |
| Fee calculation | Port `computeDeliveryFee` rules |
| Serviceability rules | Radius, pincode, polygon (future) |
| No side effects | No fetch, no DOM, no Firebase |

### 3.3 LocationAdapter

**Path (proposed):** `src/sdk/location/adapters/`

| Responsibility | Detail |
|----------------|--------|
| Implements LocationSDK | Delegates to ports |
| Nominatim geocoding | Via `GeocodingPort` |
| Error mapping | HTTP/network → SdkError |
| Rate limit handling | Retry/backoff at adapter layer |

**Ports:**

```typescript
interface GeocodingPort {
  forwardGeocode(query: string, options?: GeocodeOptions): Promise<GeocodeResult[]>;
  reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult>;
}

interface BranchDiscoveryPort {
  findBranchesNear(point: GeoPoint, filter: BranchDiscoveryFilter): Promise<BranchReadModel[]>;
}
```

### 3.4 LocationProvider

**Path (proposed):** `src/sdk/location/providers/`

Strategy pattern for **external geo services** (similar to OrderSDK RealtimeProvider):

| Provider | Kind | M2 status |
|----------|------|-----------|
| `NominatimGeocodingProvider` | `nominatim` | Primary |
| `BrowserGeolocationProvider` | `browser` | Primary |
| `CachedGeocodingProvider` | `cache` | Future (Redis) |
| `PostGISDiscoveryProvider` | `postgis` | Future stub |

Factory: `createLocationProvider({ kind: 'nominatim' | ... })`

### 3.5 LocationRepository

**Path (proposed):** `src/sdk/location/repository/`

| Responsibility | Detail |
|----------------|--------|
| Persistence port | Read/write locations, branches, geo index |
| Firestore implementation | Outside SDK core (adapter in `src/lib/`) |
| GeoIndex queries | Geohash prefix scan (design in Firestore schema) |

**M2 PR-7+:** Read paths only behind flags. **No migration** until dedicated ADR.

---

## 4. Module Boundaries

```
┌────────────────┐     ┌────────────────┐
│   OrderSDK     │     │  LocationSDK   │
│  (frozen v1.0) │     │  (M2 new)      │
└───────┬────────┘     └───────┬────────┘
        │                      │
        │   Checkout composes  │
        └──────────┬───────────┘
                   ▼
            Presentation facades
            (locationReads.ts — future)
```

**Rule:** Checkout may call LocationSDK for distance/fee **without** modifying OrderSDK or order write paths.

---

## 5. Data Flow Boundaries

| Flow | Address | Map | Branch | Delivery | Discovery |
|------|---------|-----|--------|----------|-----------|
| Customer detect | ✅ | ✅ | — | ✅ | — |
| Owner registration | ✅ | ✅ | ✅ | ✅ | — |
| Nearby discovery | ✅ | — | ✅ | ✅ | ✅ |
| Checkout fee | — | — | — | ✅ | — |

---

## 6. Future Extension Points (Design Only)

| System | Interface hook | M2 action |
|--------|----------------|-----------|
| Redis | `CachedGeocodingProvider` | Stub interface |
| PostGIS | `PostGISDiscoveryPort` | Type-only stub |
| Valhalla | `RoutingPort.getRoute()` | Type-only stub |
| Location AI | `DiscoveryRankerPort` | Architecture in Search Intelligence |

---

## 7. Alignment with ADR-011

| Strangler rule | M2 application |
|----------------|----------------|
| SDK contracts first | PR-2 LocationSDK foundation |
| Feature flags | `FF_SDK_LOCATION_*` per PR |
| No delete legacy until parity | Keep `AutoLocationForm` path until PR-6/7 soak |
| Presentation lint | Extend `lint:presentation` for location imports |

---

## 8. File Structure (Proposed)

```
src/
├── sdk/
│   └── location/
│       ├── LocationSDK.ts          # interface
│       ├── types.ts                  # DTOs
│       ├── version.ts
│       ├── createLocationSDK.ts
│       ├── adapters/
│       │   ├── LocationApiAdapter.ts
│       │   └── GeocodingPort.ts
│       ├── providers/
│       │   ├── NominatimProvider.ts
│       │   └── BrowserGeolocationProvider.ts
│       └── repository/
│           └── LocationRepositoryPort.ts
├── domain/
│   └── location/
│       ├── address/
│       ├── geohash/
│       ├── distance/
│       └── delivery/
└── lib/
    └── locationReads.ts              # presentation facade (future)
```

---

*Location Platform Architecture — design only, await approval.*
