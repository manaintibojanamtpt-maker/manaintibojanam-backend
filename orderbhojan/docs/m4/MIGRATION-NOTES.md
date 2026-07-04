# M4 Migration Notes — Search Intelligence Platform

## Version

`0.6.0-m4`

## Enabling search

Search is **OFF** by default:

```bash
VITE_FF_OB_SEARCH=true
VITE_MSW_ENABLED=true
# Optional — location-aware search results
VITE_FF_LOCATION_ENABLED=true
```

## Architecture change

Search UI consumes **SearchPlatform** only — never Marketplace API directly.

```
SearchExperience → SearchPlatform → SearchApiClient → Marketplace API
```

When `FF_OB_SEARCH=false`, M1.6 mock search page is preserved.

## API endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/marketplace/search` | Full search results (composable sections) |
| `GET /api/marketplace/search/suggestions` | Autocomplete suggestions |
| `GET /api/marketplace/search/trending` | Trending + popular terms |
| `GET /api/marketplace/search/recent` | Server recent (merged with local history) |
| `GET /api/marketplace/search/collections` | Zero-state browse sections |

Legacy `GET /api/marketplace/search?legacy=true` returns M0 hit format.

## Local search history

Recent searches persist in `localStorage` via `useSearchHistoryStore` (`ob-search-history-m4`).

## Out of scope

Restaurant detail, menu, cart, checkout, payments, orders, tracking, BhojanOS changes.

## Future hooks

Typo tolerance, synonym expansion, semantic/AI search, voice, and camera search plug into `SearchPlatform` adapters without UI changes.
