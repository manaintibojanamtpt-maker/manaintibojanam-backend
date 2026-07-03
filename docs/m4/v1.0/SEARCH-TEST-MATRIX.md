# Search Test Matrix v1.0

**Status:** Verified — M4 PR-10  
**Date:** 2026-06-26  
**Command:** `npm run test:sdk`  
**Result:** **301 / 301 pass** (66 suites, ~5.7s)

---

## 1. Coverage summary

| Layer | Test files | Tests (approx.) | Status |
|-------|------------|-----------------|--------|
| Domain | `searchDomain.test.ts` | 14 | ✅ |
| SDK foundation | `searchSdkFoundation.test.ts` | 9 | ✅ |
| SDK orchestration | `searchSdkOrchestration.test.ts` | 14 | ✅ |
| SDK discovery pipeline | `searchDiscoveryPipeline.test.ts` | 12 | ✅ |
| SDK repository | `searchRepository.test.ts` | 11 | ✅ |
| SDK suggestions | `searchSuggestions.test.ts` | 6 | ✅ |
| SearchFacade | `searchFacade.test.ts` | 13 | ✅ |
| Marketplace search | `marketplaceSearchFacade.test.ts` | 13 | ✅ |
| Marketplace filters | `marketplaceSearchFilters.test.ts` | 11 | ✅ |
| Marketplace autocomplete | `marketplaceAutocompleteFacade.test.ts` | 8 | ✅ |
| **Search-focused total** | **10 files** | **~111** | ✅ |
| **Full SDK suite** | **66 suites** | **301** | ✅ |

---

## 2. Capability matrix

| Capability | Test file | Cases |
|------------|-----------|-------|
| Feature flag OFF → stub | `searchSdkFoundation`, `searchFacade` | Master gate, NOT_CONFIGURED |
| Query validation | `searchFacade`, `searchSdkOrchestration` | Empty query, missing location |
| Repository orchestration | `searchSdkOrchestration` | Multi-path, cuisine, errors |
| Discovery enrichment | `searchDiscoveryPipeline` | Intersection, fallback, facets |
| Repository mappers | `searchRepository` | Firestore, index, factory |
| Domain normalizer | `searchDomain` | Tokenize, score, facets |
| Marketplace search flow | `marketplaceSearchFacade` | Success, empty, retry, disabled |
| Filters & sort | `marketplaceSearchFilters` | Facets, session, analytics |
| Autocomplete orchestration | `searchSuggestions` | Prefix, flag gates |
| Autocomplete facade | `marketplaceAutocompleteFacade` | Merge, analytics, location |
| Retry / cancel | `searchFacade` | Session state, max retries |
| Rollback stub | `searchSdkOrchestration` | StubSearchAdapter available |

---

## 3. PR-9 quality requirements (verified)

| Requirement | Test evidence |
|-------------|---------------|
| Debounce | Hook implementation; manual QA checklist in PR-9 report |
| Cancellation | Request ID pattern in `useMarketplaceAutocomplete` |
| Keyboard navigation | UI component; manual QA |
| Suggestion selection | `marketplaceAutocompleteFacade` analytics tests |
| Autocomplete selection | `loadMarketplaceAutocomplete` SDK wiring test |
| Recent searches | `recentSearchSession` + facade merge test |
| Feature flags | `searchSuggestions` gate tests |
| Accessibility | Documented PR-9; no automated a11y suite |

---

## 4. Gaps (accepted for v1.0)

| Gap | Severity | Plan |
|-----|----------|------|
| No E2E browser tests | Medium | Post-v1 Playwright backlog |
| No load / performance benchmarks | Medium | Staging soak + future perf CI |
| No automated axe a11y | Low | Manual QA PR-9 |
| `searchFood` not tested (NOT_CONFIGURED) | Low | v2 scope |
| No Firestore rules tests for search | N/A | Read-only scan; no new rules |

---

## 5. Regression gate

**Required before production flag enable:**

```bash
npm run test:sdk   # 301 pass
npm run lint       # pre-existing unrelated errors — search modules clean
```

Search-specific files in `test:sdk` script (package.json):

- `src/sdk/__tests__/search*.test.ts`
- `src/domain/search/__tests__/searchDomain.test.ts`
- `src/lib/__tests__/searchFacade.test.ts`
- `src/lib/__tests__/marketplaceSearch*.test.ts`
- `src/lib/__tests__/marketplaceAutocompleteFacade.test.ts`

---

## 6. Manual test plan (staging)

- [ ] Enable flags in preview; verify search bar + autocomplete
- [ ] Location denied → static suggestions only
- [ ] Filter chips + drawer + sort
- [ ] Empty results → `SEARCH_NO_RESULTS` analytics
- [ ] Disable `FF_SEARCH_ENABLED` → browse-only marketplace
- [ ] Keyboard-only autocomplete navigation
