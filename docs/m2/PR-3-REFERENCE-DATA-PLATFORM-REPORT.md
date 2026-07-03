# M2 PR-3 — Reference Data Platform Foundation Report

**PR:** BHOS-M2-PR3  
**Date:** 2026-06-30  
**Status:** ✅ Complete — contracts only, no data, no implementation  
**Authority:** ADR-011, ADR-013 (OrderSDK untouched), M2 Architecture Pack

---

## 1. Repository Analysis

### Pre-PR state

| Artifact | Status |
|----------|--------|
| `src/sdk/reference/` | Did not exist |
| India admin data | Designed in M2 docs only (`INDIA-ADDRESS-MODEL.md`) |
| LocationSDK `ReferenceProvider` | PR-2 companion contract (area-centric, not canonical) |
| Static JSON (`src/data/india/`) | Not created (explicitly out of scope) |
| UI dropdowns | Not implemented |

### Alignment gap (documented, not fixed in PR-3)

LocationSDK PR-2 used `AreaReference` naming; ReferenceSDK canonical term is **`Locality`**. LocationSDK `ReferenceProvider` will delegate to ReferenceSDK in a future alignment PR — not in PR-3.

---

## 2. SDK Contracts

### ReferenceSDK (public interface)

| Method | Parent parameter |
|--------|------------------|
| `getCountries(filter?)` | — |
| `getStates(countryId, filter?)` | `CountryId` |
| `getDistricts(stateId, filter?)` | `StateId` |
| `getCities(districtId, filter?)` | `DistrictId` |
| `getLocalities(cityId, filter?)` | `CityId` |
| `getPincodes(localityId, filter?)` | `LocalityId` |

All methods return `SdkAsyncResult<T[]>`.

### Ports

| Port | File | Role |
|------|------|------|
| `ReferenceRepository` | `repository/ReferenceRepository.ts` | Persistence / bundle read |
| `ReferenceDataProvider` | `providers/ReferenceDataProvider.ts` | Data-source strategy |

**No `createReferenceSDK` factory implementation** — interface only.

---

## 3. DTO Design

### Base shape (`ReferenceEntityBase`)

Every entity includes:

- `id` — stable branded ID  
- `officialCode` — government / postal code  
- `displayName` — UI label  
- `parentId` — parent relationship (`null` for country)  
- `active` — selectable flag  
- `kind` — entity discriminator  

### Entities

| DTO | Parent | Extra fields |
|-----|--------|--------------|
| `ReferenceCountry` | `null` | `isoCode` |
| `ReferenceState` | `CountryId` | `administrationType` |
| `ReferenceDistrict` | `StateId` | — |
| `ReferenceCity` | `DistrictId` | — |
| `ReferenceLocality` | `CityId` | — |
| `ReferencePincode` | `LocalityId` | `postalCode` |

### Branded IDs

`CountryId`, `StateId`, `DistrictId`, `CityId`, `LocalityId`, `PincodeId`, `IsoCountryCode`

---

## 4. Repository Interfaces

`ReferenceRepository` mirrors `ReferenceSDK` method-for-method — adapter layer will implement repository first, SDK delegates in future PR.

`ReferenceDataProvider` duplicates read surface for static bundle / API strategies (kind: `static_bundle` | `api` | `stub`).

---

## 5. Version Strategy

```typescript
REFERENCE_SDK_VERSION = '1.0.0-foundation'
REFERENCE_SDK_FROZEN = false
```

| Bump | When |
|------|------|
| Patch | DTO docs, non-breaking metadata |
| Minor | Additive optional fields |
| Major | ID/code changes, method signature changes — requires ADR |

Freeze milestone: after India dataset v1 loaded + staging soak (future PR).

`SDK_MODULE.REFERENCE` added to shared constants.

---

## 6. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Duplicate reference contracts (Location vs Reference SDK) | Documented; alignment PR deferred |
| Premature JSON loading | Explicitly excluded from PR-3 |
| OrderSDK regression | No order files modified |
| Runtime behaviour change | No UI imports, no data files |
| ID instability when data loads | Stable `id` separate from `officialCode` by design |

---

## 7. Testing Plan

| Test | Command | Expected |
|------|---------|----------|
| SDK foundation | `npm run test:sdk` | +4 tests pass |
| Module load | `referenceSdkFoundation.test.ts` | No Firebase side effects |
| Type exports | Barrel import from `reference/types` | Compiles under tsx |

---

## 8. Rollback Plan

Single commit revert removes:

- Entire `src/sdk/reference/` tree  
- Reference exports from `src/sdk/index.ts`  
- `SDK_MODULE.REFERENCE` from `shared/constants.ts`  
- Test file + package.json test line  

Zero runtime impact — nothing wired.

---

## 9. Definition of Done

- [x] `src/sdk/reference/` structure created  
- [x] ReferenceSDK interface (6 hierarchy methods)  
- [x] ReferenceRepository + ReferenceDataProvider interfaces  
- [x] DTOs: Country, State, District, City, Locality, Pincode  
- [x] Each entity: id, officialCode, displayName, parentId, active  
- [x] `REFERENCE_SDK_VERSION` + `REFERENCE_SDK_FROZEN=false`  
- [x] Public exports from `src/sdk/index.ts`  
- [x] README + PR report  
- [x] Foundation tests  
- [x] No JSON, API, Firestore, UI, dropdowns  
- [x] OrderSDK untouched  

---

## Files Created

```
src/sdk/reference/
├── version.ts
├── README.md
├── contracts/ReferenceSDK.ts
├── dto/base.ts
├── dto/entities.ts
├── dto/filters.ts
├── repository/ReferenceRepository.ts
├── providers/ReferenceDataProvider.ts
├── types/branded.ts
├── types/index.ts
├── errors/referenceErrors.ts
└── shared/constants.ts
    shared/options.ts

src/sdk/__tests__/referenceSdkFoundation.test.ts
docs/m2/PR-3-REFERENCE-DATA-PLATFORM-REPORT.md
```

---

**STOP.** Do not load reference data. Do not implement dropdowns or owner registration. Await approval for data bundle PR.

---

*BHOS-M2-PR3 — Reference Data Platform Foundation complete.*
