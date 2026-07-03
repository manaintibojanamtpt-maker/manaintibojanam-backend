# SearchSDK

**Version:** `0.1.0-foundation` (`SEARCH_SDK_VERSION`)  
**Status:** Contracts only — flags OFF by default  
**Mission:** Search intelligence — *"Find restaurants, cuisines, and food near the customer"*  
**Consumes:** DiscoverySDK (does not replace it)

---

## Architecture

```
Presentation → SearchFacade → SearchSDK → DiscoverySDK → Discovery Pipeline
                    ↑              ↓
              SearchRepository (read-only indexes — future PRs)
```

Presentation **must not** access Firestore or DiscoverySDK directly for search.

---

## Module Layout

| Path | Purpose |
|------|---------|
| `contracts/SearchSDK.ts` | Public SDK interface (`search`, `suggest`, `autocomplete`) |
| `dto/` | Read-only DTOs |
| `repository/SearchRepository.ts` | Read-only repository port (contract only) |
| `ranking/SearchRankingEngine.ts` | Ranking port + weight constants |
| `filters/SearchFilters.ts` | Pipeline filter stage types |
| `providers/` | Future Firestore/index adapters |
| `core/featureFlags.ts` | Feature flag defaults (all OFF) |
| `errors/` | Error message constants |
| `types/` | Branded types + barrel |
| `adapters/StubSearchAdapter.ts` | NOT_CONFIGURED stub |
| `createSearchSDK.ts` | Factory |
| `version.ts` | Version + frozen flag |

---

## Public API

| Method | Purpose | PR-1 status |
|--------|---------|-------------|
| `search(query)` | Full search pipeline → `SearchResult` | `NOT_CONFIGURED` |
| `suggest(query)` | Lightweight suggestions | `NOT_CONFIGURED` |
| `autocomplete(filter)` | Prefix completions | `NOT_CONFIGURED` |

```typescript
import { createSearchSDK } from '@/sdk/search/createSearchSDK';

const search = createSearchSDK();
const result = await search.search({ customerPoint: { lat, lng }, text: 'biryani' });
// result.ok === false, code NOT_CONFIGURED
```

---

## Feature Flags

| Flag | Env key | Default | Purpose |
|------|---------|---------|---------|
| `FF_SEARCH_ENABLED` | `VITE_FF_SEARCH_ENABLED` | OFF | Master search gate |
| `FF_SEARCH_AUTOCOMPLETE_ENABLED` | `VITE_FF_SEARCH_AUTOCOMPLETE_ENABLED` | OFF | Autocomplete |
| `FF_SEARCH_SUGGESTIONS_ENABLED` | `VITE_FF_SEARCH_SUGGESTIONS_ENABLED` | OFF | Suggest |
| `FF_SEARCH_REPOSITORY_ENABLED` | `VITE_FF_SEARCH_REPOSITORY_ENABLED` | OFF | Firestore scan repository |

---

## Constraints (M4 PR-1)

- **Contracts only** — no pipeline, repository, or ranking implementation
- **No Firestore** — no read adapters
- **No Discovery changes** — frozen pipeline untouched
- **No UI** — SearchFacade arrives in M4 PR-4
- OrderSDK v1.0.0 frozen (ADR-013)
- DiscoverySDK frozen (ADR-014)

---

## Documentation

- [`docs/m4/SEARCH-INTELLIGENCE-PLATFORM.md`](../../../docs/m4/SEARCH-INTELLIGENCE-PLATFORM.md)
- [`docs/m4/PHASE-1-REPOSITORY-AUDIT.md`](../../../docs/m4/PHASE-1-REPOSITORY-AUDIT.md)
- [`docs/m4/PR-1-SEARCH-SDK-FOUNDATION-REPORT.md`](../../../docs/m4/PR-1-SEARCH-SDK-FOUNDATION-REPORT.md)

---

**STOP.** Await approval before M4 PR-2 implementation.
