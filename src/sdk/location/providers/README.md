# LocationSDK Providers (`src/sdk/location/providers`)

**PR:** M2 PR-7 — provider framework (stubs only)  
**Status:** Interfaces + factory + registry; no external implementations

---

## Architecture

```
createLocationSDK()
        │
        ▼
createLocationProviderFramework()
        │
        ├─ LocationProviderRegistry
        │     ├─ GeocodingProvider   (stub)
        │     ├─ BrowserLocationProvider (stub)
        │     └─ MapProvider         (stub)
        │
        └─ CompositeLocationProvider → DefaultLocationAdapter
```

---

## Provider interfaces

| Interface | Responsibility | PR-7 default |
|-----------|----------------|--------------|
| `GeocodingProvider` | search, forward, reverse geocode | `StubGeocodingProvider` |
| `BrowserLocationProvider` | GPS / device location | `StubBrowserLocationProvider` |
| `MapProvider` | viewport + pin validation (no render) | `StubMapProvider` |

Legacy `LocationProvider` (PR-2) is composed from geocoding + browser slots.

---

## Factory

```typescript
import {
  createLocationProviderFramework,
  createDefaultLocationProviderRegistry,
} from '@/sdk';

const { registry, locationProvider } = createLocationProviderFramework();

registry.register('geocoding', customGeocodingProvider);
```

Unsupported kinds (`nominatim`, `browser`, `maplibre`) throw at factory — not implemented until future PRs.

---

## Dependency injection

`createLocationSDK({ providerRegistry })` passes the registry into `DefaultLocationAdapter`, which routes:

- `searchAddress` / `forwardGeocode` / `reverseGeocode` → `registry.getGeocoding()`
- `detectCurrentLocation` → `registry.getBrowser()`
- Map slot reserved for future LocationSDK map methods

---

## Rules

1. No HTTP, Nominatim, `navigator.geolocation`, MapLibre, Firestore, or React in this layer.
2. Stub map provider may return a static India viewport — no DOM side effects.
3. OrderSDK v1.0.0 (ADR-013) must not be modified.

---

*M2 PR-7 — provider framework. External providers await approval.*
