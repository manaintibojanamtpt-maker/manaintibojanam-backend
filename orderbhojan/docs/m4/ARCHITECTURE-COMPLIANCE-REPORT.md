# M4 Architecture Compliance Report

**Milestone:** M4 — Search Intelligence Platform  
**Version:** `0.6.0-m4`

## Flow compliance

```
SearchExperiencePage
  └─ (FF_OB_SEARCH) SearchExperience
       └─ useSearchResults / useSearchBrowse → searchPlatform → searchApiClient → Marketplace API
```

Search UI never calls `getMarketplaceApiClient()` directly.

## API boundary

| Rule | Compliant |
|------|-----------|
| Marketplace APIs only | ✓ |
| No Firestore reads | ✓ |
| No BhojanOS changes | ✓ |
| MSW for unavailable backend | ✓ |

## Module layout

| Layer | Path |
|-------|------|
| Domain | `features/search/domain/` |
| Engine | `features/search/engine/searchPlatform.ts` |
| Infrastructure | `features/search/infrastructure/` |
| Analytics | `features/search/analytics/` |
| Hooks | `features/search/hooks/` |
| UI | `features/search/ui/` |

## Extensibility

- **Result types:** composable `SearchResultSection` — new entity types plug in without redesign
- **Typo/synonym:** `TypoToleranceAdapter`, `SynonymAdapter` (passthrough defaults)
- **Ranking:** `rankSearchResults()` hook for AI/semantic search
- **Analytics:** `SearchAnalyticsSink` interface for future recommendation pipelines

## M2/M3 preservation

No modifications to Discovery Engine architecture. Discovery module untouched.

## Design

BDS-only components. M1.6 premium visual language via `ob-search-platform` + existing `ob-search-premium` tokens.

## Feature flag

`FF_OB_SEARCH` defaults `false`. Mock M1.6 search page preserved when disabled.
