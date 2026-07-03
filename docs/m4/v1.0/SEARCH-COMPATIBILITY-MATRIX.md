# Search Compatibility Matrix v1.0

**Status:** Frozen — M4 PR-10  
**Date:** 2026-06-26

---

## 1. Supported clients

| Client | Integration path | v1.0 support | Notes |
|--------|------------------|--------------|-------|
| **BhojanOS Marketplace Web** | `useMarketplaceSearch` → `MarketplaceSearchFacade` → `SearchFacade` | ✅ Full | Primary consumer |
| **Marketplace Autocomplete** | `useMarketplaceAutocomplete` → `MarketplaceAutocompleteFacade` | ✅ Full | PR-9 |
| **Server / SSR** | `createSearchSDK()` with injected ports | ✅ Supported | No `import.meta` in SDK core |
| **Node unit tests** | Mock `SearchSDK` + `SearchFacadeDeps` | ✅ Supported | 111 search tests |
| **Future npm package** | `SearchSDK` contract + DTOs | ✅ Ready | Version constant in metadata |
| **Single-tenant Menu search** | `Menu.tsx` client filter | ⚪ Out of scope | Unchanged — not SearchSDK |
| **Admin CRM tenant filter** | Client-side | ⚪ Out of scope | Not cross-tenant search |
| **Mobile native (Capacitor)** | Same web bundle | ✅ Compatible | Feature flags via env |
| **Discovery-only browse** | `DiscoveryFacade` without Search | ✅ Compatible | Search flags OFF |

---

## 2. Platform dependency matrix

| Dependency | Required for | If unavailable |
|------------|--------------|----------------|
| Customer location session | Full search, suggest | `location_required` presentation state |
| `FF_SEARCH_ENABLED` | Any search | Stub adapter; `NOT_CONFIGURED` |
| `FF_SEARCH_REPOSITORY_ENABLED` | Repository-backed results | `REPOSITORY_UNAVAILABLE` |
| `FF_DISCOVERY_ENABLED` | Enriched cards | Repository placeholders; safe fallback |
| `FF_DISCOVERY_MARKETPLACE_ENABLED` | Marketplace search UI | Search bar hidden |
| Firebase Firestore read | Repository adapter | Stub / error when flag ON without port |

---

## 3. Feature flag combinations

| `FF_SEARCH` | `FF_REPO` | `FF_AUTO` | `FF_SUGGEST` | `FF_DISCOVERY` | Behaviour |
|-------------|-----------|-----------|--------------|----------------|-----------|
| OFF | * | * | * | * | No search — stub SDK |
| ON | OFF | * | * | * | Search validates; repository unavailable |
| ON | ON | OFF | OFF | ON | Full search; no autocomplete/suggest |
| ON | ON | ON | ON | ON | Full platform v1.0 |
| ON | ON | ON | ON | OFF | Search + autocomplete; no enrichment |

**Production default:** all OFF.

---

## 4. Browser compatibility

| Capability | Minimum | Used by |
|------------|---------|---------|
| ES2020 modules | Vite build target | All |
| `sessionStorage` | Optional | Recent searches, filter prefs |
| `localStorage` | Dev/preview only | Flag overrides |
| Geolocation API | Optional | Customer location detection |
| ARIA combobox | Modern browsers | Autocomplete (PR-9) |

---

## 5. Backward compatibility guarantees (v1.0)

| Guarantee | Status |
|-----------|--------|
| No changes to DiscoverySDK contract | ✅ |
| No changes to Discovery pipeline stages | ✅ |
| No changes to `NearbyRestaurant` DTO | ✅ |
| No changes to Order / Reference / Location SDKs | ✅ |
| Marketplace browse mode when search OFF | ✅ |
| StubSearchAdapter for emergency rollback | ✅ |

---

## 6. Breaking change policy

Post-v1.0 freeze (ADR-014):

- Additive DTO fields: minor version bump + changelog
- Method signature changes: major version + ADR
- Pipeline stage reorder: ADR + contract version bump
