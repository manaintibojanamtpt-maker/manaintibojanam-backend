# Open Geocoding Provider (`src/sdk/location/providers/open-geocoding`)

**PR:** M2 PR-8 — first production location provider  
**Vendor-neutral name:** `OpenGeocodingProvider`  
**Default backend:** `NominatimProvider`

---

## Architecture

```
GeocodingProvider (interface)
        │
        ▼
OpenGeocodingProvider
  ├─ OpenGeocodingRateLimiterPort  (1 req/s default)
  ├─ OpenGeocodingCachePort          (15 min TTL default)
  └─ OpenGeocodingBackend
           │
           ▼
     NominatimProvider  →  OpenGeocodingHttpPort
```

Swap the backend or HTTP port without changing SDK contracts.

---

## Usage

```typescript
import { createGeocodingProvider, createOpenGeocodingProvider } from '@/sdk';

const geocoding = createGeocodingProvider({ kind: 'nominatim' });

// Or with explicit options:
const provider = createOpenGeocodingProvider({
  config: { userAgent: 'MyApp/1.0 (contact@example.com)' },
});
```

Registry:

```typescript
import { createDefaultLocationProviderRegistry, createLocationSDK } from '@/sdk';

const registry = createDefaultLocationProviderRegistry({ geocoding: 'nominatim' });
const location = createLocationSDK({ providerRegistry: registry });
```

---

## Nominatim policy

- Configurable `User-Agent` (required by Nominatim usage policy)
- Default interval ≥ 1.1s between requests on public instance
- Timeout default 8s with limited retries on `UNAVAILABLE` / `RATE_LIMITED`

---

## Rules

1. Unit tests must inject `OpenGeocodingHttpPort` — no real network calls.
2. No UI wiring in this PR.
3. MapLibre and browser geolocation are out of scope.

---

*M2 PR-8 — Open Geocoding Provider. Owner registration UI deferred.*
