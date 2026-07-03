# M2 PR-6 — LocationSDK Adapter Layer Report

**PR:** BHOS-M2-PR6  
**Date:** 2026-06-26  
**Version:** `LOCATION_SDK_VERSION = 1.0.0-adapter`  
**Status:** ✅ Complete — adapter implemented, not wired to UI

---

## 1. Files Created

| Path | Purpose |
|------|---------|
| `src/sdk/location/adapters/LocationPorts.ts` | DI port types |
| `src/sdk/location/adapters/notConfigured.ts` | NOT_CONFIGURED helpers |
| `src/sdk/location/adapters/localGeoComputation.ts` | Haversine + geohash pure functions |
| `src/sdk/location/adapters/LocationRepositoryImpl.ts` | Stub `LocationRepository` |
| `src/sdk/location/adapters/DefaultLocationAdapter.ts` | `LocationSDK` implementation |
| `src/sdk/location/adapters/ReferenceSdkReferenceProvider.ts` | ReferenceSDK → ReferenceProvider bridge |
| `src/sdk/location/adapters/StubReferenceProvider.ts` | Stub reference reads |
| `src/sdk/location/adapters/README.md` | Adapter flow docs |
| `src/sdk/location/providers/StubLocationProvider.ts` | Stub geo provider |
| `src/sdk/location/createLocationSDK.ts` | Factory + exports |
| `src/sdk/__tests__/locationAdapter.test.ts` | Unit + integration tests |

**Updated:** `src/sdk/index.ts`, `src/sdk/location/types/index.ts`, `src/sdk/location/version.ts`, `src/sdk/location/README.md`, `package.json`, `locationSdkFoundation.test.ts`

---

## 2. Architecture Validation

| Check | Result |
|-------|--------|
| LocationSDK → DefaultLocationAdapter → Repository / Providers | ✅ |
| ReferenceSDK bridge via ReferenceSdkReferenceProvider | ✅ |
| No UI / owner registration / customer detection | ✅ |
| No Nominatim / browser / MapLibre / Firestore | ✅ |
| No provider implementations (Nominatim, browser) | ✅ |
| OrderSDK untouched (ADR-013) | ✅ |
| SdkResult at boundary (no throw) | ✅ |
| Injectable ports for tests | ✅ |

---

## 3. Adapter Diagram

```
Presentation (future)
        │
        ▼
   LocationSDK  ◄── createLocationSDK()
        │
        ▼
 DefaultLocationAdapter
   ┌────┴────┬──────────────┐
   ▼         ▼              ▼
Location   Location      Reference
Provider   Repository    Provider
(stub)     (stub)           │
   │         │              ▼
 NOT_     NOT_         ReferenceSDK
CONFIGURED CONFIGURED   (PR-5 bundle)
   │
localGeoComputation
(distance, geohash)
```

---

## 4. Testing

```bash
npm run test:sdk
npm run test:reference
npm run lint
```

| Test | Coverage |
|------|----------|
| Factory surface | createLocationSDK exports all methods |
| Stub NOT_CONFIGURED | search, detect, validate, discovery |
| Repository stub | getLocationById |
| Haversine distance | roadFactor applied |
| Geohash round-trip | encode/decode Pune coords |
| Invalid geohash | VALIDATION error |
| Custom provider injection | searchAddress delegation |
| Reference bridge | MH states + districts from bundle |

---

## 5. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Premature UI wiring | Factory exported but not used in presentation |
| Reference bridge performance (code scans) | Acceptable for PR-6; index lookup in future PR |
| validateAddress deferred | NOT_CONFIGURED until domain PR |
| Version bump breaks consumers | Only version constant changed; no frozen contract |

---

## 6. Rollback

1. Remove `src/sdk/location/adapters/` (except if reverting partially, remove all PR-6 files).
2. Remove `src/sdk/location/createLocationSDK.ts` and `providers/StubLocationProvider.ts`.
3. Revert exports from `src/sdk/index.ts` and `location/types/index.ts`.
4. Restore `LOCATION_SDK_VERSION` to `1.0.0-foundation`.
5. Remove `locationAdapter.test.ts` from `test:sdk` script.

No database migrations. No feature flags enabled. No production wiring.

---

## 7. Definition of Done

| Criterion | Status |
|-----------|--------|
| `createLocationSDK()` factory | ✅ |
| `DefaultLocationAdapter` | ✅ |
| `LocationRepositoryImpl` | ✅ |
| Provider interfaces wired (stub) | ✅ |
| ReferenceSDK bridge (contracts) | ✅ |
| Version exports | ✅ `1.0.0-adapter` |
| README | ✅ |
| SDK tests pass | ✅ |
| Compile (tsc) | ✅ |
| No Nominatim / browser / MapLibre / React / Firestore | ✅ |
| Not wired to UI | ✅ |
| STOP — await provider PR approval | ✅ |

---

*M2 PR-6 — LocationSDK adapter layer. Provider implementations and UI wiring deferred.*
