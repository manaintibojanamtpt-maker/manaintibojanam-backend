# LocationSDK Adapters (`src/sdk/location/adapters`)

**PR:** M2 PR-6 — adapter layer only  
**Status:** Infrastructure wired; external providers stubbed

---

## Flow

```
createLocationSDK(options?)
  └─ DefaultLocationAdapter
       ├─ LocationProvider (StubLocationProvider by default)
       ├─ LocationRepositoryImpl (NOT_CONFIGURED persistence)
       └─ ReferenceProvider (StubReferenceProvider or ReferenceSdkReferenceProvider)
            └─ ReferenceSDK (optional — PR-5 static bundle)
```

---

## Components

| Module | Role |
|--------|------|
| `DefaultLocationAdapter.ts` | Implements `LocationSDK`; delegates to ports |
| `LocationRepositoryImpl.ts` | Stub `LocationRepository` — no Firestore |
| `ReferenceSdkReferenceProvider.ts` | Maps `ReferenceSDK` → `ReferenceProvider` DTOs |
| `StubReferenceProvider.ts` | NOT_CONFIGURED reference reads |
| `localGeoComputation.ts` | Pure Haversine + geohash encode/decode |
| `notConfigured.ts` | Shared NOT_CONFIGURED SdkFailure helpers |
| `LocationPorts.ts` | Dependency injection types |

---

## Method routing

| LocationSDK method | Layer | PR-6 behaviour |
|--------------------|-------|----------------|
| `searchAddress` | LocationProvider | NOT_CONFIGURED (stub) |
| `forwardGeocode` / `reverseGeocode` | LocationProvider | NOT_CONFIGURED (stub) |
| `detectCurrentLocation` | LocationProvider | NOT_CONFIGURED (stub) |
| `validateAddress` | Domain (future) | NOT_CONFIGURED |
| `calculateDistance` | localGeoComputation | ✅ Pure math |
| `encodeGeohash` / `decodeGeohash` | localGeoComputation | ✅ Pure math |
| `findNearbyBranches` | Repository + discovery | NOT_CONFIGURED |
| `findNearbyRestaurants` | Discovery | NOT_CONFIGURED |

---

## Factory usage

```typescript
import { createLocationSDK, createLocationSDKWithReferenceBundle } from '@/sdk';

const location = createLocationSDK();
const withReference = createLocationSDKWithReferenceBundle();
```

Injectable overrides for tests:

```typescript
createLocationSDK({
  locationProvider: mockProvider,
  repository: mockRepository,
  referenceSdk: createReferenceSDK(mockPort),
});
```

---

## Rules

1. No Nominatim, browser geolocation, MapLibre, React, or Firestore in this layer.
2. No UI wiring — presentation facades arrive in later PRs.
3. OrderSDK v1.0.0 (ADR-013) must not be modified.

---

*M2 PR-6 — adapter infrastructure. Provider implementations await approval.*
