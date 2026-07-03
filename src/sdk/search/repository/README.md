# SearchSDK — Repository

**Version:** M4 PR-3 — Firestore scan (interim)  
**Flag:** `FF_SEARCH_REPOSITORY_ENABLED` (default **OFF**)

---

## Architecture

```
SearchSDK (future PR-6)
        ↓
SearchRepository (contract)
        ↓
SearchRepositoryAdapter
        ↓
FirestoreSearchRepository
        ↓
FirestoreSearchPort → Firestore tenant documents
        ↓
SearchIndexMapper → SearchIndexHit[]
```

**Repository responsibilities only:**

- Retrieve active tenant documents
- Map to `SearchIndexHit`
- Return deterministic sorted results

**Repository must NOT:**

- Rank composite scores (pipeline PR-6)
- Evaluate delivery eligibility
- Call DiscoverySDK or GeoIndex
- Import React or presentation code

---

## Module Layout

| File | Purpose |
|------|---------|
| `SearchRepository.ts` | Port contract |
| `FirestoreSearchPort.ts` | Firestore read port |
| `SearchTenantReadRecord.ts` | Neutral tenant DTO (includes area metadata) |
| `SearchFirestoreMapper.ts` | Firestore document → tenant record |
| `SearchIndexMapper.ts` | Tenant + filter → `SearchIndexHit[]` |
| `FirestoreSearchRepository.ts` | Active tenant loader |
| `SearchRepositoryAdapter.ts` | `SearchRepository` implementation |
| `SearchRepositoryFactory.ts` | Flag-gated factory |
| `adapters/StubSearchRepository.ts` | `NOT_CONFIGURED` stub |

---

## Implemented Methods

| Method | Status |
|--------|--------|
| `searchRestaurants` | ✅ Name, slug, description scan |
| `searchCuisine` | ✅ `cuisineTags` any/all |
| `searchArea` | ✅ areaCode, locality, city, pincode, district |
| `searchTags` | ✅ Tag overlap on `cuisineTags` |
| `searchFood` | `NOT_CONFIGURED` |
| `suggest` | `NOT_CONFIGURED` |
| `autocomplete` | `NOT_CONFIGURED` |

---

## Feature Flag

| Flag | Default | Behaviour |
|------|---------|-----------|
| `FF_SEARCH_REPOSITORY_ENABLED` | **OFF** | `StubSearchRepository` |
| ON + `firestoreSearchPort` | — | Firestore scan repository |
| ON without port | — | Stub (safe default) |

```typescript
import { createSearchRepository } from '@/sdk/search/repository/SearchRepositoryFactory';

const repository = createSearchRepository({
  firestoreSearchPort: myPort,
  featureFlags: () => true,
});
```

---

## Deterministic Ordering

Results sorted by:

1. `score` descending
2. `tenantId` ascending (stable tie-break)

Inactive tenants (`status !== 'active'`) are excluded.

---

## Future

Denormalized `searchIndex` collection will replace Firestore full scan **without changing** `SearchRepository` contract.

---

*See [`docs/m4/PR-3-SEARCH-REPOSITORY-REPORT.md`](../../../docs/m4/PR-3-SEARCH-REPOSITORY-REPORT.md)*
