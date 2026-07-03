# M3 — Discovery Intelligence Platform

**Status:** ✅ Architecture approved — contracts only, no implementation  
**Date:** 2026-06-26  
**Mission:** Answer *"Which BhojanOS branches can serve this customer?"* — **read-only**

---

## 1. Repository Audit

See [`PHASE-1-REPOSITORY-AUDIT.md`](./PHASE-1-REPOSITORY-AUDIT.md).

**Bottom line:** Single-tenant storefront today. M2 LocationSDK shell complete. Zero runtime discovery. Tenant-as-branch is the pragmatic interim read model.

---

## 2. Discovery Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  DiscoverPage / SearchBar / BranchCards (future PRs)        │
│  DiscoveryFacade (src/lib/discoveryReads.ts — future)       │
└───────────────────────────┬─────────────────────────────────┘
                            │ SdkAsyncResult only
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      DiscoverySDK                            │
│  findNearbyRestaurants / search / rank / eligibility         │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
                ▼                         ▼
┌───────────────────────┐     ┌───────────────────────────────┐
│     LocationSDK       │     │    DiscoveryRepository        │
│  geohash, distance,   │     │  Firestore read-only port     │
│  encode/decode        │     │  (tenant-as-branch → geoIndex)  │
└───────────────────────┘     └───────────────┬───────────────┘
                                              ▼
                                    ┌─────────────────┐
                                    │    Firestore     │
                                    │ tenants / geoIndex│
                                    └─────────────────┘
```

### Boundaries (frozen)

| Layer | May | Must NOT |
|-------|-----|----------|
| Presentation | Call `DiscoveryFacade` | Query Firestore |
| DiscoveryFacade | Map UI ↔ SDK DTOs | Business ranking logic |
| DiscoverySDK | Orchestrate pipeline | Write Firestore |
| LocationSDK | Geo math, geohash | Own restaurant ranking |
| DiscoveryRepository | Read-only queries | Mutations |

### Relationship to LocationSDK

LocationSDK `findNearbyBranches` / `findNearbyRestaurants` remain **NOT_CONFIGURED** until DiscoverySDK adapter PR explicitly delegates or deprecates them. **Discovery logic belongs in DiscoverySDK**, not presentation or LocationSDK adapters.

---

## 3. DiscoverySDK Design

**Module:** `src/sdk/discovery/`  
**Version:** `DISCOVERY_SDK_VERSION = 0.1.0-foundation`  
**Pattern:** Same as OrderSDK v1.0.0 and LocationSDK — interface-first, `SdkResult`, ADR-011 strangler.

### Public contract (`DiscoverySDK`)

| Method | Purpose |
|--------|---------|
| `discoverNearby(query)` | Primary entry — location → ranked `DiscoveryResult` |
| `findNearbyBranches(filter)` | Tenant-scoped branch list |
| `findNearbyRestaurants(filter)` | Marketplace list |
| `getDiscoveryCandidates(query)` | Pre-rank candidate set |
| `calculateEligibility(candidate, point)` | Delivery radius gate |
| `calculateDistance(from, to)` | Delegates to LocationSDK |
| `rankCandidates(candidates, context)` | Deterministic rank (flag-gated weights) |
| `searchByCuisine(filter)` | Cuisine tag filter |
| `searchByName(filter)` | Text + geo search |

All methods return `SdkAsyncResult<T>`. No throws at boundary.

### Factory

```typescript
createDiscoverySDK(options?: CreateDiscoverySDKOptions): DiscoverySDK
```

Dependencies injected via ports: `DiscoveryRepository`, `LocationSDK`, optional `RankingEngine`.

---

## 4. DTO Design

Read-only DTOs in `src/sdk/discovery/dto/`:

| DTO | Purpose |
|-----|---------|
| `DiscoveryQuery` | Customer point + filters + search text |
| `SearchFilter` | Cuisine, area, name, radius, sort |
| `DiscoveryCandidate` | Raw branch/tenant before ranking |
| `NearbyBranch` | Tenant-scoped branch result |
| `NearbyRestaurant` | Marketplace card shape |
| `DiscoveryResult` | Final ranked list + metadata |
| `DeliveryEligibility` | Serviceable / reason / distance / fee hint |
| `ETAEstimate` | Prep + delivery minutes |
| `RankingReason` | Explainable score breakdown |

### Mapping from Firestore (future)

```
tenants/{id} + location + deliveryConfig + storeOperations
  → DiscoveryCandidate
  → calculateEligibility()
  → rankCandidates()
  → NearbyRestaurant
```

No write DTOs. No order/checkout types.

---

## 5. Repository Contracts

**Interface:** `DiscoveryRepository` (`src/sdk/discovery/repository/DiscoveryRepository.ts`)

| Method | Returns |
|--------|---------|
| `findNearbyBranches(filter)` | `DiscoveryCandidate[]` |
| `findNearbyRestaurants(filter)` | `DiscoveryCandidate[]` |
| `getDiscoveryCandidates(query)` | `DiscoveryCandidate[]` |
| `searchByCuisine(filter)` | `DiscoveryCandidate[]` |
| `searchByName(filter)` | `DiscoveryCandidate[]` |

**Interim adapter (M3 PR-3+):** Read `tenants` where `status=active`, client-side geohash prefix filter + distance refine.

**Target adapter (M3 PR-7+):** Read `geoIndex` by `geohashPrefix`.

No implementation in foundation PR.

---

## 6. Ranking Architecture

**Interface:** `RankingEngine` (`src/sdk/discovery/ranking/RankingEngine.ts`) — no implementation.

### Factors & default weights (deterministic, explainable)

| Factor | Weight | Signal | Notes |
|--------|--------|--------|-------|
| Distance | 0.30 | `1 / normalizedDistanceKm` | Primary — closer wins |
| Delivery radius | 0.20 | Binary eligible + margin | Ineligible → excluded pre-rank |
| Kitchen open | 0.15 | `isOpenNow` | Closed demoted or filtered |
| Store availability | 0.10 | `isStoreLiveForOrders` | Unpublished excluded |
| Preparation time | 0.08 | Lower prep mins | From `deliveryConfig.prepTime` |
| Delivery ETA | 0.07 | Lower total ETA | Distance + prep heuristic |
| Cuisine match | 0.05 | Tag overlap with query | Search context only |
| Rating | 0.05 | Normalized 0–5 | When available |
| Promoted | 0.00 | Future | Requires ADR |
| AI recommendation | 0.00 | Future | Requires ADR |

### Score formula

```
score = Σ (weight_i × signal_i)
```

Each contribution recorded in `RankingReason.factors[]` for UI transparency.

### Flag behaviour

| Flag | Effect |
|------|--------|
| `FF_DISCOVERY_RANKING_ENABLED` OFF | Sort by distance ASC only |
| `FF_DISCOVERY_RANKING_ENABLED` ON | Full weighted rank |

Weights are **constants in SDK** for M3; admin-configurable weights require future ADR.

---

## 7. Discovery Pipeline

```
Customer Location (CustomerCanonicalLocation / GeoPoint)
        │
        ▼
Geohash Prefix (precision 5 ≈ 4.9 km)
        │
        ▼
Candidate Branches (DiscoveryRepository.getDiscoveryCandidates)
        │
        ▼
Distance Filter (LocationSDK.calculateDistance, roadFactor 1.2)
        │
        ▼
Delivery Radius Filter (calculateEligibility → maxRadiusKm)
        │
        ▼
Availability Filter (isOpen + isLive + status=active)
        │
        ▼
Ranking (RankingEngine — flag-gated)
        │
        ▼
DiscoveryResult DTO
        │
        ▼
Presentation UI (future PR — flag-gated)
```

**Read-only at every stage.** No side effects.

---

## 8. Firestore Read Model

### Interim (tenant-as-branch)

Read from existing `tenants/{tenantId}`:

| Field | Discovery use |
|-------|---------------|
| `location.lat/lng/geohash` | Distance + prefix filter |
| `deliveryConfig.maxRadius/freeRadius/prepTime` | Eligibility + ETA |
| `storeOperations.isStoreOpen` | Availability |
| `storeStatus` / `sandboxMode` | Live gate |
| `slug`, `name` | Card display |
| `status` | Active filter |

### Target (no migration in foundation)

| Collection | Role |
|------------|------|
| `tenants/{id}` | Root entity |
| `branches/{id}` | Multi-branch per tenant |
| `locations/{id}` | Normalized address + geohash |
| `geoIndex/{id}` | Denormalized prefix index |

See `docs/m2/FIRESTORE-SCHEMA-PROPOSAL.md` for full schema. **Migration requires dedicated ADR.**

---

## 9. Required Indexes

### Current (`firestore.indexes.json`)

None for geo.

### Interim (tenant scan — no new index)

Full collection scan or `where('status','==','active')` — acceptable for low tenant count pilot.

### Target (geoIndex)

| Collection | Fields | Query |
|------------|--------|-------|
| `geoIndex` | `geohashPrefix ASC`, `status ASC` | Prefix lookup |
| `geoIndex` | `tenantId ASC`, `status ASC` | Tenant branch list |
| `branches` | `tenantId ASC`, `status ASC` | Branch enumeration |
| `tenants` | `status ASC`, `storeStatus ASC` | Active store filter |

```json
{
  "collectionGroup": "geoIndex",
  "fields": [
    { "fieldPath": "geohashPrefix", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

Index creation deferred to implementation PR with migration ADR.

---

## 10. Feature Flags

| Flag | Env key | Default | Purpose |
|------|---------|---------|---------|
| `FF_DISCOVERY_ENABLED` | `VITE_FF_DISCOVERY_ENABLED` | **OFF** | Master discovery gate |
| `FF_DISCOVERY_RANKING_ENABLED` | `VITE_FF_DISCOVERY_RANKING_ENABLED` | **OFF** | Weighted ranking vs distance-only |
| `FF_DISCOVERY_MARKETPLACE_ENABLED` | `VITE_FF_DISCOVERY_MARKETPLACE_ENABLED` | **OFF** | Multi-restaurant marketplace UI |

**SDK defaults:** `src/sdk/discovery/core/featureFlags.ts`  
**Presentation reader:** `src/lib/discoveryFeatureFlags.ts` (future PR-2)

All flags OFF → **zero production impact**.

Note: Existing `FF_LOCATION_DISCOVERY_ENABLED` (LocationSDK) remains separate; M3 PR-2 will document deprecation path toward `FF_DISCOVERY_*`.

---

## 11. Migration Roadmap

| Phase | Deliverable | Firestore writes |
|-------|-------------|------------------|
| M3 PR-1 | Foundation contracts (this pack) | None |
| M3 PR-2 | DiscoveryFacade + feature flag reader | None |
| M3 PR-3 | Tenant-as-branch repository adapter | None (reads only) |
| M3 PR-4 | Eligibility + distance port (reuse `deliveryFee` parity) | None |
| M3 PR-5 | Ranking engine implementation | None |
| M3 PR-6 | Discovery pipeline orchestration | None |
| M3 PR-7 | geoIndex read adapter + index deploy | **ADR required** for index writes |
| M3 PR-8 | Marketplace UI (`/discover`) | None |
| M3 PR-9 | Search intelligence | None |
| Future | `branches`/`locations` migration | **ADR required** |

OrderSDK v1.0.0 remains frozen (ADR-013). Checkout/payment untouched until explicit ADR.

---

## 12. PR Breakdown

| PR | Scope | Flag | Rollback |
|----|-------|------|----------|
| **M3-PR-1** | Architecture + SDK foundation (contracts, DTOs, interfaces) | N/A | Delete `src/sdk/discovery/` |
| **M3-PR-2** | `DiscoveryFacade`, presentation flag reader, foundation tests | OFF | Delete facade |
| **M3-PR-3** | `TenantDiscoveryRepository` — read `tenants` | `FF_DISCOVERY_ENABLED` | Flag OFF |
| **M3-PR-4** | Eligibility calculator (parity with `deliveryFee.ts`) | OFF | Revert adapter |
| **M3-PR-5** | `DefaultRankingEngine` | `FF_DISCOVERY_RANKING_ENABLED` | Flag OFF → distance sort |
| **M3-PR-6** | `DefaultDiscoveryAdapter` — full pipeline | `FF_DISCOVERY_ENABLED` | Flag OFF |
| **M3-PR-7** | geoIndex read model + indexes | OFF until index populated | Remove adapter |
| **M3-PR-8** | Discover page UI | `FF_DISCOVERY_MARKETPLACE_ENABLED` | Flag OFF |
| **M3-PR-9** | Search by cuisine/name | `FF_DISCOVERY_ENABLED` | Flag OFF |

Each PR: independent deploy, `npm run test:sdk` extended, no checkout/payment/menu changes.

---

## 13. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Full tenant scan at scale | Slow queries | geoIndex prefix path in PR-7 |
| Dual discovery flags (Location vs Discovery) | Confusion | Document mapping; deprecate Location discovery in PR-2 |
| Road factor mismatch (1.0 vs 1.2) | Wrong eligibility | Parity tests against `deliveryFee.ts` in PR-4 |
| Customer location split stores | Wrong query point | Unify in PR-2 facade |
| Premature marketplace UI | User confusion | `FF_DISCOVERY_MARKETPLACE_ENABLED` separate from core |
| Firestore schema creep | Migration debt | ADR gate for any writes |
| Ranking opacity | Trust issues | `RankingReason` on every result |

---

## 14. Definition of Ready (M3 PR-1)

| Criterion | Status |
|-----------|--------|
| M2 LocationSDK stable | ✅ |
| M2 customer + owner location complete | ✅ |
| Repository audit complete | ✅ |
| DiscoverySDK folder structure defined | ✅ |
| DTOs specified | ✅ |
| Repository interface specified | ✅ |
| Ranking architecture documented | ✅ |
| Pipeline documented | ✅ |
| Feature flags defined (default OFF) | ✅ |
| No Firestore migration in foundation | ✅ |
| Architecture Review Board approval | ⏳ Pending |

---

## 15. Definition of Done (M3 Platform — future)

| Criterion | Target |
|-----------|--------|
| Customer can see ranked nearby kitchens | PR-8 |
| Discovery is read-only | All PRs |
| Presentation has zero Firestore imports for discovery | PR-2+ |
| Ranking is deterministic and explainable | PR-5 |
| Feature flags default OFF | ✅ Foundation |
| Zero production impact when flags OFF | ✅ Foundation |
| `npm run test:sdk` covers discovery module | PR-2+ |
| OrderSDK / Checkout / Payment unchanged | All PRs |

---

**STOP.** Foundation contracts only. Await Architecture Review Board approval before M3-PR-2 implementation.
