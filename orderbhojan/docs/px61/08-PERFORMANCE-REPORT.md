# PX6.1 — Performance Report (Pre-Migration Baseline)

**Captured:** PX6 Food Experience complete, pre-Firestore sync  
**Purpose:** Regression baseline for Phase 2–3

---

## Current metrics (OrderBhojan)

| Metric | Result | Limit |
|---|---|---|
| Production build | PASSED | — |
| JS bundle total | **1513 KB** | 1650 KB |
| CSS bundle | 110.52 KB (gzip 17.94 KB) | — |
| Unit tests | 152/152 | — |
| BDS certification | 100% | — |

---

## Performance implications of migration

| Change | Expected impact | Mitigation |
|---|---|---|
| Firestore reads vs MSW | +network latency on menu load | TanStack Query cache (existing); staleTime |
| Owner CDN images vs Unsplash manifest | Improved LCP if CDN edge | Keep BlurHash + srcset pipeline |
| Larger menu payloads (variants/addons) | +JSON size per item | Field selection in API; pagination if >100 items |
| Real-time open status | Optional polling | Cache 60s; WebSocket future |
| Remove mockCatalog direct import | Smaller home bundle when unified | Code-split discovery feed |

---

## Targets (unchanged post-sync)

| Metric | Target |
|---|---|
| LCP | < 2.5s |
| CLS | < 0.05 |
| INP | < 200ms |
| JS bundle | < 1650 KB |

---

## Monitoring additions (Phase 2)

- Log `[px61]` warnings for missing owner fields (dev/staging)
- API projection timing header `X-Projection-Ms`
- Cache hit rate on menu query keys

---

## Commands

```
npm run build
npm run test:performance
```

**Post-migration:** Re-run and compare against 1513 KB baseline.
