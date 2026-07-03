# M4 PR-2 — Search Domain Foundation Report

**PR:** BHOS-M4-PR2  
**Date:** 2026-06-26  
**Version:** `SEARCH_DOMAIN_VERSION = 0.1.0-domain`  
**Status:** ✅ Complete — pure domain logic only

---

## 1. Domain Architecture

```
RawSearchQueryInput
        ↓
QueryNormalizer + SearchTokenizer + SearchLanguage
        ↓
NormalizedSearchQuery
        ↓
SearchMatchClassifier → ClassifiedMatch
        ↓
SearchFilterEvaluator → FilterEvaluationResult
        ↓
SearchScore + SearchWeights → ComputedSearchScore
```

**Boundary:** Domain has **zero** infrastructure imports. SDK adapter layer (M4 PR-6) will map SDK DTOs ↔ domain types.

| Rule | Enforced |
|------|----------|
| No SDK imports | ✅ |
| No Firestore | ✅ |
| No Discovery | ✅ |
| No React / HTTP | ✅ |
| Pure + stateless + deterministic | ✅ |

---

## 2. Files Created

### `shared/`

| File | Purpose |
|------|---------|
| `SearchMatchType.ts` | Match type enum + base signals |
| `SearchConstants.ts` | Limits, stop words, cuisine inference map |
| `SearchLanguage.ts` | Diacritic folding, locale normalization |
| `SearchValidation.ts` | Query and facet validation |
| `types.ts` | Domain input/output DTOs |
| `index.ts` | Barrel exports |

### `normalize/`

| File | Purpose |
|------|---------|
| `SearchTokenizer.ts` | Stop-word stripping, token limits |
| `QueryNormalizer.ts` | Full normalization + cuisine inference |

### `matching/`

| File | Purpose |
|------|---------|
| `SearchMatchClassifier.ts` | Exact / prefix / contains classification |

### `filters/`

| File | Purpose |
|------|---------|
| `SearchFilterEvaluator.ts` | Facet + tag filter evaluation |

### `ranking/`

| File | Purpose |
|------|---------|
| `SearchWeights.ts` | Domain-owned composite weights (sum = 1.0) |
| `SearchScore.ts` | Signal normalization + explainable score |

### Tests

| File | Purpose |
|------|---------|
| `__tests__/searchDomain.test.ts` | 16 domain unit tests |

**Not created:** Repository, pipeline, facade, UI, Firestore adapters.

---

## 3. Normalizer Design

`normalizeSearchQuery(input)`:

1. `validateRawSearchQuery` — length bounds
2. `normalizeForMatch` — lowercase, trim, diacritic strip
3. `tokenizeSearchText` — split, drop stop words, cap at 32 tokens
4. `inferCuisineTags` — phrase map (`CUISINE_INFERENCE_PHRASES`)

Output: `NormalizedSearchQuery` with `text`, `normalizedText`, `tokens`, `inferredCuisineTags`.

---

## 4. Matching Strategy

`classifyTextMatch(query, fieldValue, field)` priority:

| Order | Type | Signal |
|-------|------|--------|
| 1 | `exact` | 1.0 |
| 2 | `prefix` | 0.85 |
| 3 | `contains` | 0.65 |
| 4 | `none` | 0 |

Also: `classifyTokenMatch`, `classifyRestaurantNameMatch`, `classifyTagOverlap`.

---

## 5. Filter Evaluation

`evaluateSearchFacets(target, constraints)`:

| Facet | Rule |
|-------|------|
| `openNow` | `target.isOpen === true` |
| `vegOnly` | `target.hasVegItems === true` |
| `minRating` | `rating >= min` |
| `maxDeliveryMins` | `etaMins <= max` |
| `maxDistanceKm` | `distanceKm <= max` |

`evaluateTagFilter` — `any` / `all` tag modes with slug-normalized tokens.

---

## 6. Validation Rules

| Rule | Code |
|------|------|
| Query max 256 chars | `QUERY_TOO_LONG` |
| `minRating` in 0–5 | `INVALID_MIN_RATING` |
| `maxDeliveryMins` ≥ 0 | `INVALID_MAX_DELIVERY` |
| `maxDistanceKm` > 0 | `INVALID_MAX_DISTANCE` |
| Intent check | `hasSearchIntent(text \| facets)` |

---

## 7. Testing

**File:** `src/domain/search/__tests__/searchDomain.test.ts`

| Suite | Tests |
|-------|-------|
| SearchTokenizer | Stop word removal |
| QueryNormalizer | Normalization + cuisine inference + max length |
| SearchLanguage | Diacritic folding |
| SearchMatchClassifier | exact/prefix/contains/none |
| SearchFilterEvaluator | Facets + tag any/all |
| SearchScore | Weights sum, composite score, distance signal |
| SearchValidation | Intent detection |

Run: `npm run test:sdk`

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Domain imports SDK | Grep-verified zero SDK imports |
| Weight drift vs SDK | Same numeric values; SDK adapter maps in PR-6 |
| Cuisine inference false positives | Phrase map is conservative; expandable |
| i18n gaps | v1 English + diacritic fold only |

---

## 9. Rollback

Delete `src/domain/search/` (except README if desired) and remove test entry from `package.json`. No runtime or production impact.

---

## 10. Definition of Done

- [x] `normalize/` — `QueryNormalizer`, `SearchTokenizer`
- [x] `matching/` — `SearchMatchClassifier`
- [x] `filters/` — `SearchFilterEvaluator`
- [x] `ranking/` — `SearchScore`, `SearchWeights`
- [x] `shared/` — `SearchConstants`, `SearchValidation`, `SearchLanguage`, `SearchMatchType`
- [x] Pure, stateless, deterministic
- [x] No SDK, Firestore, Discovery, React, HTTP
- [x] Domain tests pass
- [x] No repository, search pipeline, or UI

**Awaiting approval before M4 PR-3 (SearchRepository).**

---

## Related

- [`SEARCH-INTELLIGENCE-PLATFORM.md`](./SEARCH-INTELLIGENCE-PLATFORM.md)
- [`PR-1-SEARCH-SDK-FOUNDATION-REPORT.md`](./PR-1-SEARCH-SDK-FOUNDATION-REPORT.md)
