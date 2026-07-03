# M4 PR-3 — Search Repository Foundation Report

**PR:** BHOS-M4-PR3  
**Date:** 2026-06-26  
**Status:** ✅ Complete — Firestore scan repository behind flag

---

## 1. Repository Architecture

```
SearchRepository (contract)
        ↓
SearchRepositoryFactory [FF_SEARCH_REPOSITORY_ENABLED]
   OFF → StubSearchRepository (NOT_CONFIGURED)
   ON  → SearchRepositoryAdapter
        ↓
FirestoreSearchRepository
        ↓
FirestoreSearchPort
        ↓
SearchFirestoreMapper → SearchTenantReadRecord[]
        ↓
SearchIndexMapper → SearchIndexHit[]
```

**Boundaries enforced:**

| May | Must NOT |
|-----|----------|
| Read tenant documents | Rank composite scores |
| Map to `SearchIndexHit` | Evaluate eligibility |
| Deterministic sort | Call DiscoverySDK / GeoIndex |
| Use domain text classifiers | Import React / presentation |

---

## 2. Firestore Read Strategy

**Interim approach:** full tenant collection scan via injected `FirestoreSearchPort`.

1. `fetchTenantDocuments()` returns neutral `FirestoreSearchDocument[]`
2. `mapFirestoreSearchDocument` extracts search fields including structured location metadata
3. Filter `status === 'active'`
4. Optional `tenantIds` scope on restaurant/cuisine queries
5. Map matching tenants to `SearchIndexHit[]`

**No live Firebase in tests** — all tests use mock `FirestoreSearchPort`.

Future denormalized index replaces scan **without contract change**.

---

## 3. Mapping Strategy

| Method | Match fields | Domain helper |
|--------|--------------|---------------|
| `searchRestaurants` | `name`, `slug`, `description` | `classifyTextMatch` |
| `searchCuisine` | `cuisineTags` (any/all) | `classifyTagOverlap` |
| `searchArea` | `areaCode`, `localityName`, `cityName`, `pincode`, `districtName` | `classifyTextMatch` |
| `searchTags` | `cuisineTags` as tags | `classifyTagOverlap` |

**Sort:** `score` DESC → `tenantId` ASC (stable)

**NOT_CONFIGURED:** `searchFood`, `suggest`, `autocomplete`

---

## 4. Feature Flag Behaviour

| `FF_SEARCH_REPOSITORY_ENABLED` | Behaviour |
|--------------------------------|-----------|
| **OFF** (default) | `StubSearchRepository` → all methods `NOT_CONFIGURED` |
| **ON** + port | Firestore scan adapter |
| **ON** without port | Stub (safe fallback) |

Env: `VITE_FF_SEARCH_REPOSITORY_ENABLED`

Instant rollback: disable flag → stub repository.

---

## 5. Testing

**File:** `src/sdk/__tests__/searchRepository.test.ts`

| Case | Covered |
|------|---------|
| Firestore mapper + area metadata | ✅ |
| Inactive tenant exclusion | ✅ |
| Restaurant name search | ✅ |
| Cuisine search | ✅ |
| Area locality + pincode | ✅ |
| Deterministic ordering | ✅ |
| Flag OFF → stub | ✅ |
| Flag ON → firestore adapter | ✅ |
| Food search NOT_CONFIGURED | ✅ |

Run: `npm run test:sdk`

---

## 6. Performance Analysis

| Aspect | Interim scan | Future index |
|--------|--------------|--------------|
| Read pattern | O(n) tenant scan | O(log n) or O(1) prefix |
| Network | Full collection fetch | Targeted index query |
| Memory | All active tenants in memory | Bounded result set |
| Suitability | Dev / low tenant count | Production scale |

**Mitigation today:** repository applies `limit` (default 50) after sort; discovery intersection (PR-6) further reduces downstream work.

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Full scan latency at scale | Flag OFF default; index ADR planned |
| Area field schema drift | Flexible mapper (`city`/`cityName`, `localityCode`/`areaCode`) |
| Tag search limited to cuisineTags | Documented; general tags in future schema ADR |
| Accidental discovery bypass | Repository returns hits only — pipeline intersects in PR-6 |

---

## 8. Rollback

1. Set `VITE_FF_SEARCH_REPOSITORY_ENABLED=false`
2. Or delete `src/sdk/search/repository/` implementation files

No Discovery, UI, or production behaviour changes with flag OFF.

---

## 9. Definition of Done

- [x] `FirestoreSearchPort`, `FirestoreSearchRepository`, `SearchRepositoryAdapter`
- [x] `SearchIndexMapper`, `SearchRepositoryFactory`, repository README
- [x] Restaurant name, cuisine, area, locality, pincode, metadata search
- [x] Inactive restaurants excluded
- [x] Deterministic ordering
- [x] `FF_SEARCH_REPOSITORY_ENABLED` default OFF
- [x] Food / suggest / autocomplete remain `NOT_CONFIGURED`
- [x] Mocked Firestore tests only
- [x] No SearchSDK orchestration, ranking, UI, Discovery changes

**Awaiting approval before M4 PR-4 (SearchFacade).**

---

## Files Created

```
src/sdk/search/repository/
  FirestoreSearchPort.ts
  SearchTenantReadRecord.ts
  SearchFirestoreMapper.ts
  SearchIndexMapper.ts
  FirestoreSearchRepository.ts
  SearchRepositoryAdapter.ts
  SearchRepositoryFactory.ts
  adapters/StubSearchRepository.ts
  README.md
src/sdk/__tests__/searchRepository.test.ts
```

---

## Related

- [`PR-2-SEARCH-DOMAIN-FOUNDATION-REPORT.md`](./PR-2-SEARCH-DOMAIN-FOUNDATION-REPORT.md)
- [`SEARCH-INTELLIGENCE-PLATFORM.md`](./SEARCH-INTELLIGENCE-PLATFORM.md)
