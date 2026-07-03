# Discovery Pipeline Contract (Frozen)

**Status:** ✅ Frozen — M3 PR-5  
**Date:** 2026-06-26  
**Scope:** Official platform contract for BhojanOS Discovery Intelligence

---

## Pipeline

```
DiscoveryRepository
        │
        ▼
DiscoveryCandidate[]
        │
        ▼
EligibilityEngine
        │
        ▼
EligibleCandidate[]
        │
        ▼
RankingEngine
        │
        ▼
RankedCandidate[]
        │
        ▼
DiscoveryResult
        │
        ▼
DiscoveryFacade
        │
        ▼
Presentation
```

---

## Stage Boundaries

| Stage | Input | Output | May | Must NOT |
|-------|-------|--------|-----|----------|
| **Repository** | `DiscoveryQuery` | `DiscoveryCandidate[]` | Read Firestore tenants | Rank, filter eligibility, search |
| **Eligibility** | `DiscoveryCandidate[]` + customer point | `EligibleCandidate[]` | Distance calc, radius validation | Rank, search, Firestore |
| **Ranking** | `EligibleCandidate[]` + `DiscoveryQuery` | `RankedCandidate[]` | Weighted/distance scoring | Eligibility, Firestore, search |
| **Result assembly** | `RankedCandidate[]` | `DiscoveryResult` | Map to presentation DTOs | Business logic duplication |
| **Facade** | UI context | SDK calls | Feature flags, session | Firestore, ranking math |
| **Presentation** | UI context | Facade DTOs | Render cards | Firestore, SDK direct calls |

---

## DTO Flow

```
TenantReadRecord (Firestore)
  → DiscoveryCandidate        (repository mapper)
  → EligibleCandidate         (eligibility engine)
  → RankedCandidate           (ranking engine)
  → NearbyRestaurant / NearbyBranch
  → DiscoveryResult
```

---

## Feature Flags

| Flag | Default | Stage |
|------|---------|-------|
| `FF_DISCOVERY_TENANT_REPOSITORY_ENABLED` | OFF | Repository |
| `FF_DISCOVERY_ELIGIBILITY_ENABLED` | OFF | Eligibility |
| `FF_DISCOVERY_GEOINDEX_ENABLED` | OFF | Repository geoIndex path |
| `FF_DISCOVERY_RANKING_ENABLED` | OFF | Ranking policy (OFF = distance-only, ON = weighted) |
| `FF_DISCOVERY_ENABLED` | OFF | Facade master gate |
| `FF_DISCOVERY_MARKETPLACE_ENABLED` | OFF | Presentation (future) |

---

## Versioning

| Component | Version constant |
|-----------|------------------|
| DiscoverySDK | `DISCOVERY_SDK_VERSION` |
| Ranking algorithm | `DISCOVERY_RANKING_ALGORITHM_VERSION` |
| Ranking policy bundle | `DISCOVERY_RANKING_VERSION` |

Breaking changes to stage inputs/outputs require ADR + version bump.

---

## Constraints (immutable)

- **Read-only** — no Firestore writes in discovery path
- **Deterministic** — no randomness, AI, or ML in ranking
- **Explainable** — every rank carries factor breakdown + reasons
- **Stable sort** — tie-break by distance, then `tenantId`
- **No cross-stage leakage** — eligibility does not rank; ranking does not re-check eligibility

---

## Implementation Map

| Stage | Domain | SDK |
|-------|--------|-----|
| Repository | — | `repository/adapters/` |
| Eligibility | `domain/discovery/eligibility/` | `sdk/discovery/eligibility/` |
| Ranking | `domain/discovery/ranking/` | `sdk/discovery/ranking/` |
| Facade | — | `lib/discovery/` |

---

## Future PRs (out of scope for PR-6)

- **M3 PR-8:** Marketplace presentation UI
- **M3 PR-9:** Search by cuisine/name

**M3 PR-6:** ✅ `discoverNearby` full pipeline orchestration — complete
