# M3 PR-3 — Tenant-as-Branch Repository Adapter Report

**PR:** BHOS-M3-PR3  
**Date:** 2026-06-26  
**Version:** `DISCOVERY_SDK_VERSION = 0.2.0-tenant-repository`  
**Status:** ✅ Complete — read-only candidates, zero production impact (flags OFF)

---

## 1. Files Created

| Path | Purpose |
|------|---------|
| `repository/ports/TenantRepositoryPort.ts` | Neutral tenant read port |
| `repository/mappers/DiscoveryCandidateMapper.ts` | Tenant → `DiscoveryCandidate` |
| `repository/adapters/TenantDiscoveryRepositoryAdapter.ts` | `DiscoveryRepository` implementation |
| `repository/adapters/FirestoreTenantRepositoryAdapter.ts` | Firestore → `TenantReadRecord` |
| `src/lib/discovery/firestoreTenantReadPort.ts` | Browser Firestore fetch (lib wiring) |
| `repository/adapters/StubDiscoveryRepository.ts` | NOT_CONFIGURED repository |
| `repository/createDiscoveryRepository.ts` | Repository factory |
| `adapters/DefaultDiscoveryAdapter.ts` | SDK adapter delegating `getDiscoveryCandidates` |
| `src/sdk/__tests__/discoveryTenantRepository.test.ts` | Mapper + repository tests |

**Updated:** `createDiscoverySDK.ts`, `discoveryFeatureFlags.ts`, `DiscoveryFacade.ts`, feature flags, `.env.example`

---

## 2. Repository Diagram

```
DiscoveryFacade
      ↓
DiscoverySDK (DefaultDiscoveryAdapter)
      ↓ getDiscoveryCandidates()
TenantDiscoveryRepositoryAdapter
      ↓ listActiveTenants()
FirestoreTenantRepositoryAdapter
      ↓ fetchTenantDocuments()
Firestore tenants collection
      ↓
DiscoveryCandidateMapper
      ↓
DiscoveryCandidate[]
```

---

## 3. Candidate Mapping

| Tenant field | DiscoveryCandidate |
|--------------|-------------------|
| `id` | `tenantId`, `branchId` (tenant-as-branch) |
| `slug` / `name` | `slug`, `name` |
| `location.lat/lng` | `point` (required) |
| `location.geohash` | `geohash` (encode if missing) |
| `deliveryConfig.maxRadius` | `maxRadiusKm` (passthrough) |
| `deliveryConfig.prepTime` | `prepTimeMins` (passthrough) |
| `storeOperations.isStoreOpen` | `isOpen` (passthrough, no filter) |
| `storeStatus` | `isLive` (passthrough) |

**Excluded:** inactive tenants, missing/zero coordinates. **Not set:** `distanceKm` (no distance calculation).

---

## 4. Testing

```bash
npm run test:sdk   # 136/136 pass (+9 PR-3)
```

| Test | Coverage |
|------|----------|
| Mapper tenant-as-branch | ✅ |
| Skip inactive / no location | ✅ |
| Geohash encode fallback | ✅ |
| Repository candidate list | ✅ |
| `findNearbyBranches` tenant scope only | ✅ |
| Search NOT_CONFIGURED | ✅ |
| SDK wiring + `discoverNearby` still stub | ✅ |

All tests use mocked tenant port — no real Firestore in unit tests.

---

## 5. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Full tenant collection scan | Interim only; geoIndex in PR-7 |
| Legacy tenants missing geohash | Local encode from lat/lng in mapper |
| Accidental distance/ranking | Not implemented in repository |
| Flag accidentally ON | Default OFF; `discoverNearby` still NOT_CONFIGURED |
| Firestore read in SDK adapter | Bounded to repository adapter layer |

---

## 6. Rollback

1. Set `FF_DISCOVERY_TENANT_REPOSITORY_ENABLED=false` (default).
2. Revert PR-3 files; `createDiscoverySDK` returns stub adapter.
3. Remove test file from `test:sdk` script.

No Firestore schema, checkout, or payment changes.

---

## 7. Definition of Done

| Criterion | Status |
|-----------|--------|
| `TenantRepositoryPort` | ✅ |
| `DiscoveryCandidateMapper` | ✅ |
| `TenantDiscoveryRepositoryAdapter` | ✅ |
| Returns `DiscoveryCandidate[]` only | ✅ |
| No distance / ETA / radius filter / rank | ✅ |
| Feature flag `FF_DISCOVERY_TENANT_REPOSITORY_ENABLED` OFF | ✅ |
| Tests pass | ✅ |
| STOP — await approval | ✅ |

---

**Next:** M3-PR-4 — Eligibility calculator (parity with `deliveryFee.ts`).
