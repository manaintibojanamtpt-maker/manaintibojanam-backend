# M3 PR-7 — GeoIndex Repository Optimization Report

**PR:** BHOS-M3-PR7  
**Date:** 2026-06-26  
**Version:** `DISCOVERY_SDK_VERSION = 0.6.0-geoindex`  
**Status:** ✅ Complete — geoIndex path behind flag, tenant scan retained as fallback

---

## 1. Repository Architecture

```
DiscoveryPipeline (unchanged)
        ↓
DiscoveryRepository (contract unchanged)
        ├─ GeoIndexRepositoryAdapter  [FF_DISCOVERY_GEOINDEX_ENABLED ON]
        │     ├─ DefaultGeoIndexRepository
        │     ├─ GeoIndexPort
        │     └─ TenantRepositoryPort.getTenantsByIds()
        └─ TenantDiscoveryRepositoryAdapter  [fallback / flag OFF]
```

GeoIndex is fully hidden behind `DiscoveryRepository`. No pipeline, eligibility, ranking, facade, or UI changes.

---

## 2. GeoIndex Flow Diagram

```
Customer Location / Geohash
        ↓
GeoHashPrefixResolver (precision 6)
        ↓
GeoIndexStrategy (prefix + expansion precision 5)
        ↓
GeoIndexPort.queryByPrefixes()
        ↓
GeoIndexMapper → unique tenant IDs
        ↓
TenantRepository.getTenantsByIds()
        ↓
DiscoveryCandidateMapper
        ↓
DiscoveryCandidate[] (stable tenantId sort)
```

**Fallback triggers:** unknown geohash · empty geoIndex · tenant fetch error → full tenant scan.

---

## 3. Geohash Prefix Strategy

| Setting | Default | Purpose |
|---------|---------|---------|
| Primary precision | **6** | ~1.2km cell |
| Expansion precision | **5** | Broader cell when primary empty |
| Neighbor cells | Reserved | `includeNeighborCells` flag (future) |

Prefixes deduplicated deterministically. Customer geohash from `query.customerGeohash` or encoded from `customerPoint` (precision 7).

---

## 4. Repository Mapping

| geoIndex field | Usage |
|----------------|-------|
| `tenantId` | Tenant fetch key |
| `branchId` | Dedup key (tenant-as-branch) |
| `geohashPrefix` | Query key |
| `status` | Active filter |

| Output | Rule |
|--------|------|
| `DiscoveryCandidate[]` | Same mapper as tenant scan |
| Order | Stable sort by `tenantId` |
| Dedup | By `tenantId` across prefix matches |

---

## 5. Feature Flag Behaviour

| Flag | Default | Behaviour |
|------|---------|-----------|
| `FF_DISCOVERY_GEOINDEX_ENABLED` | **OFF** | Tenant scan only |
| ON + `geoIndexPort` | — | GeoIndex path with fallback |
| ON without port | — | Tenant scan (safe default) |

Instant rollback: disable flag → previous tenant scan path.

---

## 6. Telemetry

`GeoIndexRepositoryTelemetry` via `geoIndexHooks.onTelemetry`:

| Field | Description |
|-------|-------------|
| `geoIndexLookupMs` | Prefix query duration |
| `tenantFetchMs` | Tenant-by-ID fetch duration |
| `candidateCount` | Mapped candidates |
| `returnedCount` | After repository limit |
| `fallbackUsed` | Whether tenant scan was used |
| `fallbackReason` | `unknown_geohash` · `empty_geoindex` · `tenant_fetch_failed` |
| `prefixesQueried` | Prefixes sent to geoIndex |
| `tenantIdsMatched` | IDs from geoIndex |

No UI exposure — hooks only.

---

## 7. Performance Analysis

| Path | Complexity | Notes |
|------|------------|-------|
| Tenant scan (OFF) | O(n tenants) | Unchanged interim path |
| GeoIndex (ON) | O(prefixes + matched tenants) | Scales with cell density, not total tenants |
| Fallback | O(n tenants) | Only on empty/error geohash |

Pipeline strips `limit` before repository (PR-6); geoIndex adapter applies limit on return for direct `getDiscoveryCandidates` calls.

---

## 8. Testing Results

```bash
npm run test:sdk   # 181/181 pass (+12 PR-7)
```

| Scenario | Coverage |
|----------|----------|
| GeoIndex enabled | ✅ |
| GeoIndex disabled (tenant scan) | ✅ |
| Unknown geohash fallback | ✅ |
| Empty geoIndex fallback | ✅ |
| Multiple prefix matches + dedup | ✅ |
| Expansion prefix query | ✅ |
| Stable candidate output | ✅ |
| Telemetry timing + fallback | ✅ |
| Pipeline contract preserved | ✅ |
| All Firestore mocked | ✅ |

---

## 9. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Empty geoIndex in production | Automatic fallback to tenant scan |
| geoIndex stale vs tenants | Tenant fetch validates active records via mapper |
| Flag accidentally ON | Requires `geoIndexPort` injection; falls back without port |
| Pipeline regression | Zero pipeline changes; contract tests pass |

---

## 10. Rollback Plan

1. Set `VITE_FF_DISCOVERY_GEOINDEX_ENABLED=false` (default).
2. Repository reverts to `TenantDiscoveryRepositoryAdapter` only.
3. No pipeline, facade, or UI changes required.

---

## 11. Definition of Done

| Criterion | Status |
|-----------|--------|
| Repository contract unchanged | ✅ |
| DiscoveryPipeline unchanged | ✅ |
| GeoIndex hidden behind repository | ✅ |
| Tenant scan fallback retained | ✅ |
| `FF_DISCOVERY_GEOINDEX_ENABLED` OFF by default | ✅ |
| Deterministic candidate retrieval | ✅ |
| Telemetry exposed (hooks only) | ✅ |
| All required tests | ✅ |
| Version `0.6.0-geoindex` | ✅ |

**STOP — awaiting Architecture Review Board approval before PR-8 (Marketplace UI).**
