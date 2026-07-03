# LocationSDK (`src/sdk/location`)

**Version:** `1.0.0-browser-location` (`LOCATION_SDK_VERSION`)  
**Frozen:** `false` (`LOCATION_SDK_FROZEN`)  
**Status:** M2 PR-8 — OpenGeocodingProvider (Nominatim backend); not wired to UI  
**Authority:** ADR-011, M2 Architecture Pack

---

## Purpose

LocationSDK is the **presentation boundary** for BhojanOS Location Intelligence Platform:

- Address Intelligence (India hierarchy, geocoding, validation)
- Map Intelligence (pin placement — MapLibre in future PRs)
- Branch Intelligence (nearby branches)
- Delivery Intelligence (distance, serviceability — domain in future PRs)
- Discovery Intelligence (marketplace search — future PRs)

---

## Structure

| Path | Role |
|------|------|
| `contracts/` | `LocationSDK` public interface |
| `adapters/` | `DefaultLocationAdapter`, repository stub, ReferenceSDK bridge |
| `createLocationSDK.ts` | Factory + exports |
| `dto/` | Presentation-safe read/write DTOs |
| `types/` | Branded IDs, enums, barrel exports |
| `providers/` | Specialized provider contracts, factory, registry, stubs |
| `repository/` | `LocationRepository` persistence port |
| `core/` | Feature flag contracts |
| `errors/` | Location-specific error extensions |
| `shared/` | Module constants, factory options |
| `version.ts` | `LOCATION_SDK_VERSION`, `LOCATION_SDK_FROZEN` |

---

## Public API

| Method | PR-6 status |
|--------|-------------|
| `searchAddress` | NOT_CONFIGURED (stub provider) |
| `forwardGeocode` / `reverseGeocode` | NOT_CONFIGURED (stub provider) |
| `validateAddress` | NOT_CONFIGURED (domain PR pending) |
| `detectCurrentLocation` | NOT_CONFIGURED (stub provider) |
| `calculateDistance` | ✅ Local Haversine |
| `encodeGeohash` / `decodeGeohash` | ✅ Local encode/decode |
| `findNearbyBranches` | NOT_CONFIGURED |
| `findNearbyRestaurants` | NOT_CONFIGURED |

---

## Usage

```typescript
import { createLocationSDK } from '@/sdk';

const location = createLocationSDK();

const distance = location.calculateDistance(
  { lat: 18.52, lng: 73.85 },
  { lat: 18.53, lng: 73.86 }
);

if (distance.ok) {
  console.log(distance.value.distanceKm);
}
```

With ReferenceSDK bridge:

```typescript
import { createLocationSDKWithReferenceBundle } from '@/sdk';

const location = createLocationSDKWithReferenceBundle();
```

---

## Feature flags (default OFF)

| Flag | Env var |
|------|---------|
| `FF_LOCATION_MAP_ENABLED` | `VITE_FF_LOCATION_MAP_ENABLED` |
| `FF_LOCATION_DISCOVERY_ENABLED` | `VITE_FF_LOCATION_DISCOVERY_ENABLED` |
| `FF_LOCATION_OWNER_REGISTRATION_ENABLED` | `VITE_FF_LOCATION_OWNER_REGISTRATION_ENABLED` |
| `FF_LOCATION_CUSTOMER_DETECTION_ENABLED` | `VITE_FF_LOCATION_CUSTOMER_DETECTION_ENABLED` |

---

## Rules

1. SDK must not import `firebase/*`, `maplibre-gl`, or call Nominatim directly.
2. Implementations belong in adapter modules until package split.
3. OrderSDK v1.0.0 (ADR-013) must not be modified by LocationSDK PRs.
4. Breaking contract changes require ADR when `LOCATION_SDK_FROZEN === true`.

---

## References

- [Adapter layer README](./adapters/README.md)
- [M2 Location SDK Design](../../../docs/m2/LOCATION-SDK-DESIGN.md)
- [M2 Architecture Pack](../../../docs/m2/README.md)
- [ADR-011 SDK Strangler](../../../docs/adr/ADR-011-sdk-strangler.md)

---

*M2 PR-6 — adapter infrastructure. Not wired to UI.*
