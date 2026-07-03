# M2 PR-2 — LocationSDK Foundation Report

**PR:** BHOS-M2-PR2  
**Date:** 2026-06-26  
**Status:** ✅ Complete — contracts only, no implementation  
**Authority:** ADR-011, ADR-013 (OrderSDK untouched), M2 Architecture Pack

---

## Executive Summary

LocationSDK v1.0 foundation is scaffolded under `src/sdk/location/` with interfaces, DTOs, provider/repository ports, feature flags, and version constants. **No adapters, no Nominatim, no MapLibre, no Firestore, no UI wiring.** All feature flags default OFF — zero runtime behaviour change.

---

## Repository Analysis (Pre-PR)

Location logic remains fragmented in presentation (`AutoLocationForm`, `deliveryFee.ts`). No LocationSDK existed. This PR establishes the contract layer only per M2 PR-2 scope.

Full audit: [PHASE-1-REPOSITORY-ANALYSIS.md](./PHASE-1-REPOSITORY-ANALYSIS.md)

---

## Files Created

### SDK (`src/sdk/location/`)

| Path | Purpose |
|------|---------|
| `version.ts` | `LOCATION_SDK_VERSION`, `LOCATION_SDK_FROZEN` |
| `README.md` | Module documentation |
| `contracts/LocationSDK.ts` | Public `LocationSDK` + factory interface |
| `dto/geo.ts` | GeoPoint, distance, GeoJSON |
| `dto/address.ts` | India address DTOs |
| `dto/discovery.ts` | Branch/restaurant discovery DTOs |
| `dto/delivery.ts` | DeliveryConfig, serviceability, ETA |
| `dto/reference.ts` | State/district/city/area reference DTOs |
| `dto/repository.ts` | Location/branch read models |
| `types/branded.ts` | BranchId, LocationId, Geohash, enums |
| `types/index.ts` | Public barrel exports |
| `providers/LocationProvider.ts` | Geo service provider contract |
| `providers/ReferenceProvider.ts` | India reference data provider |
| `repository/LocationRepository.ts` | Persistence read port |
| `core/featureFlags.ts` | Four location flags + defaults |
| `errors/locationErrors.ts` | Extended error codes |
| `shared/constants.ts` | Module id |
| `shared/options.ts` | Factory options |

### Domain (`src/domain/location/`)

| Path | Purpose |
|------|---------|
| `README.md` | Domain boundary docs |
| `address/.gitkeep` | Planned validation module |
| `geohash/.gitkeep` | Planned geohash module |
| `distance/.gitkeep` | Planned distance module |
| `delivery/.gitkeep` | Planned delivery rules module |

### Supporting

| Path | Purpose |
|------|---------|
| `src/lib/locationFeatureFlags.ts` | Presentation flag reader (default OFF) |
| `src/sdk/__tests__/locationSdkFoundation.test.ts` | Foundation tests |
| `src/sdk/index.ts` | LocationSDK public exports (updated) |

---

## Contracts Summary

### LocationSDK (10 methods — interface only)

- `searchAddress`, `forwardGeocode`, `reverseGeocode`, `validateAddress`
- `detectCurrentLocation`
- `calculateDistance`, `encodeGeohash`, `decodeGeohash`
- `findNearbyBranches`, `findNearbyRestaurants`

### Ports

| Port | File |
|------|------|
| `LocationProvider` | `providers/LocationProvider.ts` |
| `ReferenceProvider` | `providers/ReferenceProvider.ts` |
| `LocationRepository` | `repository/LocationRepository.ts` |

### Version

```typescript
LOCATION_SDK_VERSION = '1.0.0-foundation'
LOCATION_SDK_FROZEN = false
```

### Feature Flags (default OFF)

| Flag | Env var |
|------|---------|
| `FF_LOCATION_MAP_ENABLED` | `VITE_FF_LOCATION_MAP_ENABLED` |
| `FF_LOCATION_DISCOVERY_ENABLED` | `VITE_FF_LOCATION_DISCOVERY_ENABLED` |
| `FF_LOCATION_OWNER_REGISTRATION_ENABLED` | `VITE_FF_LOCATION_OWNER_REGISTRATION_ENABLED` |
| `FF_LOCATION_CUSTOMER_DETECTION_ENABLED` | `VITE_FF_LOCATION_CUSTOMER_DETECTION_ENABLED` |

---

## Architecture Validation

| Check | Result |
|-------|--------|
| ADR-011 strangler pattern | ✅ Contracts first, flags default OFF |
| ADR-013 OrderSDK frozen | ✅ No OrderSDK files modified |
| No Firestore in SDK | ✅ |
| No Nominatim/MapLibre/browser | ✅ |
| No React imports | ✅ |
| No business logic | ✅ |
| No `createLocationSDK` factory impl | ✅ Interface only |
| Presentation flag reader | ✅ Not wired to UI |

---

## Risk Assessment

| Risk | Status |
|------|--------|
| Accidental OrderSDK change | ✅ Avoided — no order files touched |
| Runtime behaviour change | ✅ None — types + flag reader only |
| Flag reader imported by UI | ✅ Not imported by any component |
| Contract drift from M2 design | ✅ Aligned with LOCATION-SDK-DESIGN.md |

---

## Testing Plan

| Test | Command | Result |
|------|---------|--------|
| TypeScript compile | `npm run lint` | Run post-merge |
| SDK foundation tests | `npm run test:sdk` | 6 new tests |
| Export smoke | `locationSdkFoundation.test.ts` imports `@/sdk` index | ✅ |
| Presentation lint | `npm run lint:presentation` | Unchanged |

---

## Rollback Plan

Single commit revert removes:

- Entire `src/sdk/location/` tree
- `src/domain/location/` scaffold
- `src/lib/locationFeatureFlags.ts`
- Location exports from `src/sdk/index.ts`
- Test file + `package.json` test script line

**Instant rollback:** No flags enabled, no UI imports, no data migration.

---

## Definition of Done

- [x] `src/sdk/location/` structure created
- [x] LocationSDK interface with 10 methods
- [x] LocationProvider, ReferenceProvider, LocationRepository interfaces
- [x] DTOs for address, geo, discovery, delivery, reference, repository
- [x] `LOCATION_SDK_VERSION` + `LOCATION_SDK_FROZEN=false`
- [x] Four feature flags with defaults OFF
- [x] Public exports from `src/sdk/index.ts`
- [x] Domain folders scaffolded
- [x] README documentation
- [x] Foundation tests added
- [x] OrderSDK untouched
- [x] No runtime/UI changes
- [x] PR report published

---

**STOP.** Do not implement LocationSDK adapters. Await M2 PR-3 (India Address Model).

---

*BHOS-M2-PR2 — LocationSDK Foundation complete.*
