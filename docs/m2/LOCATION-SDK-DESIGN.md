# M2 — LocationSDK Design (Contracts Only)

**Status:** Interface design — **no implementation**  
**Pattern:** Mirrors OrderSDK (ADR-011, ADR-013)  
**Version (proposed):** `0.1.0-scaffold` until freeze milestone

---

## 1. Factory

```typescript
interface LocationSDK {
  // Address Intelligence
  searchAddress(query: string, options?: AddressSearchOptions): SdkAsyncResult<AddressSearchResult[]>;
  forwardGeocode(input: ForwardGeocodeInput): SdkAsyncResult<GeocodedAddress>;
  reverseGeocode(point: GeoPoint): SdkAsyncResult<GeocodedAddress>;
  validateAddress(address: IndiaAddressInput): SdkAsyncResult<ValidatedAddress>;

  // Device / browser
  detectCurrentLocation(options?: GeolocationOptions): SdkAsyncResult<GeoPointWithAccuracy>;

  // Geo primitives
  calculateDistance(from: GeoPoint, to: GeoPoint, options?: DistanceOptions): SdkResult<DistanceResult>;
  encodeGeohash(point: GeoPoint, precision?: GeohashPrecision): SdkResult<string>;
  decodeGeohash(hash: string): SdkResult<GeoPoint>;

  // Branch / Discovery Intelligence
  findNearbyBranches(point: GeoPoint, filter: NearbyBranchFilter): SdkAsyncResult<BranchDiscoveryResult[]>;
  findNearbyRestaurants(point: GeoPoint, filter: NearbyRestaurantFilter): SdkAsyncResult<RestaurantDiscoveryResult[]>;
}

interface LocationSDKFactory {
  create(options?: LocationSDKOptions): LocationSDK;
}
```

---

## 2. Method Specifications

### 2.1 `searchAddress`

Autocomplete-style search for address strings (delegates to Nominatim or cached index).

```typescript
searchAddress(
  query: string,
  options?: AddressSearchOptions
): SdkAsyncResult<AddressSearchResult[]>

interface AddressSearchOptions {
  readonly countryCode?: 'IN';
  readonly limit?: number;              // default 5
  readonly bias?: GeoPoint;             // prefer results near point
  readonly cityContext?: string;
}

interface AddressSearchResult {
  readonly displayName: string;
  readonly point: GeoPoint;
  readonly pincode?: string;
  readonly confidence: number;          // 0–1
  readonly provider: 'nominatim' | 'local';
}
```

**Errors:** `VALIDATION` (empty query), `RATE_LIMITED`, `UNAVAILABLE`, `INTERNAL`

---

### 2.2 `forwardGeocode`

Structured or free-text → coordinates + parsed address hints.

```typescript
forwardGeocode(input: ForwardGeocodeInput): SdkAsyncResult<GeocodedAddress>

interface ForwardGeocodeInput {
  readonly query?: string;
  readonly structured?: Partial<IndiaAddressInput>;
}

interface GeocodedAddress {
  readonly point: GeoPoint;
  readonly parsed?: Partial<IndiaAddressInput>;
  readonly formattedAddress: string;
  readonly geohash: string;
}
```

---

### 2.3 `reverseGeocode`

Coordinates → address components.

```typescript
reverseGeocode(point: GeoPoint): SdkAsyncResult<GeocodedAddress>
```

**Errors:** `VALIDATION` (invalid coords), `NOT_FOUND` (no result)

---

### 2.4 `detectCurrentLocation`

Browser geolocation wrapper with SdkResult (no throw).

```typescript
detectCurrentLocation(options?: GeolocationOptions): SdkAsyncResult<GeoPointWithAccuracy>

interface GeoPointWithAccuracy extends GeoPoint {
  readonly accuracyM: number;
  readonly timestamp: IsoDateTime;
}

interface GeolocationOptions {
  readonly enableHighAccuracy?: boolean;
  readonly timeoutMs?: number;
  readonly maximumAgeMs?: number;
}
```

**Errors:** `FORBIDDEN` (permission denied), `UNAVAILABLE` (timeout), `NOT_CONFIGURED` (no geolocation API)

---

### 2.5 `validateAddress`

Pure validation against India Address Model rules (+ optional serviceability).

```typescript
validateAddress(address: IndiaAddressInput): SdkAsyncResult<ValidatedAddress>

interface IndiaAddressInput {
  readonly country?: 'IN';
  readonly stateCode?: string;
  readonly districtCode?: string;
  readonly cityCode?: string;
  readonly areaCode?: string;
  readonly pincode?: string;
  readonly street?: string;
  readonly landmark?: string;
  readonly coordinates?: GeoPoint;
}

interface ValidatedAddress {
  readonly address: IndiaAddress;       // fully normalized
  readonly geohash: string;
  readonly geoJson: LocationGeoJson;
  readonly warnings?: string[];
}
```

---

### 2.6 `calculateDistance`

Haversine with optional road factor (domain default: 1.2 — matches current `deliveryFee.ts`).

```typescript
calculateDistance(
  from: GeoPoint,
  to: GeoPoint,
  options?: DistanceOptions
): SdkResult<DistanceResult>

interface DistanceOptions {
  readonly unit?: 'km' | 'm';
  readonly roadFactor?: number;         // default 1.2
}

interface DistanceResult {
  readonly distanceKm: number;
  readonly unit: 'km';
}
```

---

### 2.7 `findNearbyBranches`

Tenant-scoped or platform-scoped branch discovery.

```typescript
findNearbyBranches(
  point: GeoPoint,
  filter: NearbyBranchFilter
): SdkAsyncResult<BranchDiscoveryResult[]>

interface NearbyBranchFilter {
  readonly tenantId?: TenantId;         // optional — single tenant branches
  readonly radiusKm?: number;           // default 10
  readonly limit?: number;              // default 20
  readonly geohashPrecision?: number;   // default 5 for pre-filter
  readonly includeClosed?: boolean;
}

interface BranchDiscoveryResult {
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly point: GeoPoint;
  readonly distanceKm: number;
  readonly geohash: string;
  readonly isServiceable: boolean;
  readonly deliveryConfig?: DeliveryConfigReadModel;
}
```

---

### 2.8 `findNearbyRestaurants`

Marketplace discovery (multi-tenant).

```typescript
findNearbyRestaurants(
  point: GeoPoint,
  filter: NearbyRestaurantFilter
): SdkAsyncResult<RestaurantDiscoveryResult[]>

interface NearbyRestaurantFilter {
  readonly radiusKm?: number;
  readonly limit?: number;
  readonly cuisineTags?: string[];
  readonly areaCode?: string;
  readonly minRating?: number;
  readonly sortBy?: 'distance' | 'rating' | 'eta' | 'delivery_fee';
}

interface RestaurantDiscoveryResult {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly name: string;
  readonly slug: string;
  readonly point: GeoPoint;
  readonly distanceKm: number;
  readonly estimatedDeliveryMins?: number;
  readonly rating?: number;
  readonly isOpen: boolean;
  readonly thumbnailUrl?: string;
}
```

---

### 2.9 `encodeGeohash` / `decodeGeohash`

```typescript
encodeGeohash(point: GeoPoint, precision?: GeohashPrecision): SdkResult<string>
decodeGeohash(hash: string): SdkResult<GeoPoint>

type GeohashPrecision = 5 | 6 | 7 | 8 | 9;  // default 7
```

Domain implementation — no external API.

---

## 3. Shared Types

```typescript
interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

type BranchId = string & { readonly __brand: 'BranchId' };
```

Reuses from SDK core: `TenantId`, `IsoDateTime`, `SdkResult`, `SdkAsyncResult`, `SdkError`.

---

## 4. DeliveryConfigReadModel (read-only DTO)

```typescript
interface DeliveryConfigReadModel {
  readonly enabled: boolean;
  readonly freeRadiusKm: number;
  readonly paidRadiusKm: number;
  readonly maxRadiusKm: number;
  readonly baseFee: number;
  readonly perKmCharge: number;
  readonly prepTimeMins: number;
}
```

Used by discovery + serviceability — **not** a write contract.

---

## 5. Explicit Non-Goals (v0.1 scaffold)

| Method | Status |
|--------|--------|
| `createBranch()` | ❌ Not in LocationSDK |
| `updateDeliveryZone()` | ❌ Not in LocationSDK |
| `getRoute()` | ❌ Future RoutingPort stub only |
| `rankRestaurants()` | ❌ Internal to discovery adapter |

---

## 6. Export Plan (`src/sdk/index.ts`)

M2 PR-2 adds:

```typescript
export type { LocationSDK, LocationSDKFactory } from './location/LocationSDK';
export { createLocationSDK } from './location/createLocationSDK';
export type { IndiaAddress, GeoPoint, ... } from './location/types';
```

Does **not** modify OrderSDK exports (ADR-013).

---

*LocationSDK Design — contracts only, await approval before PR-2.*
