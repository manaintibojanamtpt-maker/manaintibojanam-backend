# Search Platform v1.0 — Release Notes

**Release:** Search Intelligence Platform v1.0.0  
**Date:** 2026-06-26  
**PR series:** BHOS-M4-PR1 … BHOS-M4-PR10  
**Tag (recommended):** `search-platform-v1.0`

---

## Overview

BhojanOS Search Platform v1.0 delivers cross-tenant marketplace search behind feature flags. Search **consumes** the frozen Discovery pipeline for enriched restaurant cards — it does not replace or modify Discovery.

**Default state:** All `FF_SEARCH_*` flags **OFF** — no production behaviour change until rollout.

---

## What's included

### Core platform (PR-1 … PR-6)

- **SearchSDK** contract: `search`, `suggest`, `autocomplete`
- **Search domain** — normalization, scoring, facet evaluation
- **SearchRepository** — Firestore scan adapter (flag-gated)
- **SearchFacade** — presentation boundary with session + telemetry
- **Discovery enrichment** — intersection + safe fallback

### Marketplace experience (PR-7 … PR-9)

- Search bar on `MarketplaceHome`
- Result cards with match badges and highlights
- Recent searches (session)
- Filters: open now, veg, distance, rating, delivery time
- Sort: recommended, distance, rating
- Autocomplete dropdown with keyboard navigation
- Suggestions: recent, popular cuisines, nearby cuisines, trending placeholder
- Accessibility: combobox / listbox ARIA

### Analytics & observability (PR-8 … PR-9)

- 12 search analytics event types
- Facade telemetry snapshot
- SDK `timingMs` + `correlationId` in results

---

## Feature flags

| Flag | Env key | Default |
|------|---------|---------|
| `FF_SEARCH_ENABLED` | `VITE_FF_SEARCH_ENABLED` | `false` |
| `FF_SEARCH_REPOSITORY_ENABLED` | `VITE_FF_SEARCH_REPOSITORY_ENABLED` | `false` |
| `FF_SEARCH_AUTOCOMPLETE_ENABLED` | `VITE_FF_SEARCH_AUTOCOMPLETE_ENABLED` | `false` |
| `FF_SEARCH_SUGGESTIONS_ENABLED` | `VITE_FF_SEARCH_SUGGESTIONS_ENABLED` | `false` |

Requires Discovery + Marketplace flags for full UI — see [SEARCH-COMPATIBILITY-MATRIX.md](./SEARCH-COMPATIBILITY-MATRIX.md).

---

## Public API

Frozen surface documented in [SEARCH-PUBLIC-API-v1.md](./SEARCH-PUBLIC-API-v1.md).

**Presentation entry:** `SearchFacade` — not direct SearchSDK imports in UI.

---

## Testing

- **301 / 301** automated tests pass (`npm run test:sdk`)
- **~111** search-focused unit tests
- Manual staging checklist in [SEARCH-TEST-MATRIX.md](./SEARCH-TEST-MATRIX.md)

---

## Known limitations (v1.0)

- Firestore full-scan repository (not indexed)
- `searchFood` not implemented (`NOT_CONFIGURED`)
- Trending restaurants — placeholder only
- Veg filter passed through; menu-level filtering deferred
- No AI / semantic / embedding search
- `SEARCH_SDK_VERSION` runtime constant remains `0.1.0-foundation` until ARB post-freeze bump

---

## Upgrade / rollout

1. ARB approves ADR-014
2. 72h staging soak with flags enabled
3. Enable `FF_SEARCH_REPOSITORY_ENABLED` → `FF_SEARCH_ENABLED` → autocomplete/suggestions
4. Monitor [SEARCH-OBSERVABILITY.md](./SEARCH-OBSERVABILITY.md) dashboards

**Rollback:** [SEARCH-ROLLBACK.md](./SEARCH-ROLLBACK.md) — disable `FF_SEARCH_ENABLED` (L1, instant)

---

## Documentation pack

| Document | Purpose |
|----------|---------|
| [SEARCH-PLATFORM-v1-CERTIFICATION.md](./SEARCH-PLATFORM-v1-CERTIFICATION.md) | Certification report |
| [SEARCH-PIPELINE-CONTRACT-v1.md](./SEARCH-PIPELINE-CONTRACT-v1.md) | Frozen pipeline |
| [SEARCH-PUBLIC-API-v1.md](./SEARCH-PUBLIC-API-v1.md) | API reference |
| [SEARCH-COMPATIBILITY-MATRIX.md](./SEARCH-COMPATIBILITY-MATRIX.md) | Client support |
| [SEARCH-TEST-MATRIX.md](./SEARCH-TEST-MATRIX.md) | Test coverage |
| [SEARCH-PERFORMANCE-REPORT.md](./SEARCH-PERFORMANCE-REPORT.md) | Latency targets |
| [SEARCH-OBSERVABILITY.md](./SEARCH-OBSERVABILITY.md) | Telemetry & analytics |
| [SEARCH-ROLLBACK.md](./SEARCH-ROLLBACK.md) | Emergency rollback |

---

## Contributors / milestones

| PR | Deliverable |
|----|-------------|
| M4 PR-1 | SDK foundation |
| M4 PR-2 | Domain layer |
| M4 PR-3 | Repository |
| M4 PR-4 | SearchFacade |
| M4 PR-5 | SDK orchestration |
| M4 PR-6 | Discovery enrichment |
| M4 PR-7 | Marketplace search UI |
| M4 PR-8 | Filters & analytics |
| M4 PR-9 | Autocomplete & suggestions |
| M4 PR-10 | v1.0 certification (this release) |

---

**Await Architecture Review Board approval before production flag rollout.**
