# ADR-OB-003 — Search Provider Abstraction

**Status:** Proposed — M0 ARB Review  
**Date:** 2026-07-03

---

## Context

Search must support restaurant, cuisine, dish, category, area, pincode, locality, and "near me" from day one — with future migration to Algolia, Typesense, Meilisearch, or Elasticsearch without UI changes.

---

## Decision

Search is implemented as a **backend port** inside the Marketplace API layer, not in the OrderBhojan frontend.

```
OrderBhojan UI
      │
      ▼
GET /api/marketplace/search?q=&lat=&lng=&type=
      │
      ▼
SearchOrchestrator (Marketplace API)
      │
      ├── SearchProviderPort (interface)
      │     ├── FirestoreSearchProvider (v1 — wraps BhojanOS SearchSDK)
      │     ├── AlgoliaSearchProvider (future)
      │     └── TypesenseSearchProvider (future)
      │
      └── DiscoveryEnricher (eligibility, distance, open-now — read-only M3/M4)
      │
      ▼
SearchResultDTO (public IDs only — ADR-OB-002)
```

### UI rule

OrderBhojan `features/search` depends only on `SearchResultDTO` and `SearchFacade`. **No provider-specific fields** in view models.

### Query types (v1 contract)

| `type` param | Behaviour |
|--------------|-----------|
| `all` | Blended ranking |
| `restaurant` | Brand/name match |
| `cuisine` | Cuisine tag match |
| `dish` | Menu item match (cross-restaurant) |
| `area` / `locality` / `pincode` | Geo-text hybrid |
| `near_me` | Discovery-weighted with text optional |

Dish search may be `NOT_CONFIGURED` in v1 provider — return empty with `meta.capability=dish_search_pending` rather than fake results.

---

## Alternatives considered

| Alternative | Verdict |
|-------------|---------|
| Client-side Fuse.js on discovery cache | Fails at scale; no dish cross-tenant search |
| Direct Algolia in frontend | Leaks index structure; bypasses eligibility |
| Only Firestore forever | Acceptable v1 if port exists; migrate when >500 tenants |

**ARB sign-off:** ☐ Pending M0
