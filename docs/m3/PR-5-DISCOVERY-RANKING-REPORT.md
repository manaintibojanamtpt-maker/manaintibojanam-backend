# M3 PR-5 — Discovery Ranking Engine Report

**PR:** BHOS-M3-PR5  
**Date:** 2026-06-26  
**Version:** `DISCOVERY_SDK_VERSION = 0.4.0-ranking`  
**Status:** ✅ Complete — weighted ranking OFF by default (distance-only policy)

---

## 1. Files Created

| Path | Purpose |
|------|---------|
| `docs/m3/DISCOVERY-PIPELINE-CONTRACT.md` | Frozen pipeline architecture contract |
| `src/sdk/discovery/dto/rankedCandidate.ts` | `RankedCandidate`, `RankingBreakdown` DTOs |
| `src/domain/discovery/ranking/RankingVersion.ts` | Algorithm + policy version metadata |
| `src/domain/discovery/ranking/RankingWeights.ts` | Weight validation |
| `src/domain/discovery/ranking/RankingPolicy.ts` | Weighted + distance-only policies |
| `src/domain/discovery/ranking/RankingSignals.ts` | Per-factor signal normalization |
| `src/domain/discovery/ranking/RankingMapper.ts` | Sort + explainable mapping |
| `src/domain/discovery/ranking/RankingEngine.ts` | Domain ranking stage |
| `src/sdk/discovery/ranking/DefaultRankingEngine.ts` | SDK adapter |
| `src/sdk/discovery/ranking/createRankingEngine.ts` | Factory + flag resolution |
| `src/sdk/__tests__/discoveryRanking.test.ts` | Unit tests |

**Updated:** `RankingEngine.ts` (port), `DefaultDiscoveryAdapter`, `createDiscoverySDK`, `DiscoverySDK` contract, `version.ts`, `dto/index.ts`, `types/index.ts`

**Not changed:** repository, facade, presentation, UI, search, marketplace

---

## 2. Ranking Diagram

```
EligibleCandidate[]
        │
        ▼
RankingEngine
   ├─ RankingPolicy (weighted-v1 | distance-only-v1)
   ├─ RankingSignals (8 factor normalization)
   ├─ RankingWeights (sum = 1.0 validation)
   └─ RankingMapper (stable sort + breakdown)
        │
        ▼
RankedCandidate[]
        │
        ▼
DiscoveryResult (PR-6)
```

---

## 3. Breakdown Design

### `RankedCandidate`

| Field | Type | Purpose |
|-------|------|---------|
| `candidate` | `EligibleCandidate` | Eligible input preserved |
| `score` | `number` | Policy-computed score (higher = better) |
| `breakdown` | `RankingBreakdown` | Rank, policy, weighted factors |
| `reasons` | `string[]` | Top-3 human-readable explanations |
| `algorithmVersion` | `string` | `1.0.0-weighted-deterministic` |
| `rankingVersion` | `string` | `2026.06-ranking-v1` |

### `RankingBreakdown`

| Field | Type |
|-------|------|
| `weightedScore` | Final score |
| `rank` | 1-based position |
| `policy` | `weighted-v1` or `distance-only-v1` |
| `factors` | `RankingFactor[]` (factor, weight, signal, contribution) |

---

## 4. Weight Validation

| Factor | Weight |
|--------|--------|
| Distance | 0.30 |
| Delivery Radius | 0.20 |
| Kitchen Open | 0.15 |
| Store Availability | 0.10 |
| Preparation Time | 0.08 |
| ETA | 0.07 |
| Cuisine Match | 0.05 |
| Rating | 0.05 |
| Promoted | 0.00 |
| AI Recommendation | 0.00 |

**Active weights sum:** `1.0` (validated by `validateRankingWeights()`)

**Policy switch:**
- `FF_DISCOVERY_RANKING_ENABLED` **OFF** → `distance-only-v1` (distance signal only)
- `FF_DISCOVERY_RANKING_ENABLED` **ON** → `weighted-v1` (all 8 factors)

---

## 5. Testing

```bash
npm run test:sdk   # 157/157 pass (+10 PR-5)
```

| Scenario | Coverage |
|----------|----------|
| Distance dominance (distance-only policy) | ✅ |
| Weighted policy with 8 factors | ✅ |
| Tie breaking by tenantId | ✅ |
| Stable sort across input order | ✅ |
| Weight totals = 1.0 | ✅ |
| Ranking explanation + version metadata | ✅ |
| Ineligible candidates excluded | ✅ |
| SDK adapter + adapter wiring | ✅ |

---

## 6. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Score drift vs future ML ranking | `promoted` / `aiRecommendation` weights reserved at 0 |
| Tie ambiguity | Deterministic secondary sort: distance → tenantId |
| Ineligible candidates ranked | Filtered before scoring |
| Policy change without version bump | `rankingVersion` + `algorithmVersion` on every result |

---

## 7. Rollback Plan

1. Keep `VITE_FF_DISCOVERY_RANKING_ENABLED=false` (default) — distance-only policy.
2. Revert PR — `rankCandidates` still works with distance-only; no presentation impact.
3. Pipeline contract doc is additive — safe to keep frozen architecture reference.

---

## 8. Definition of Done

| Criterion | Status |
|-----------|--------|
| `RankingEngine` + policy + mapper | ✅ |
| `RankedCandidate` + `RankingBreakdown` DTOs | ✅ |
| `FF_DISCOVERY_RANKING_ENABLED` OFF by default | ✅ |
| Deterministic, stable, explainable | ✅ |
| No Firestore / repository / eligibility / presentation | ✅ |
| Pipeline architecture frozen | ✅ |
| All required tests | ✅ |
| Version `0.4.0-ranking` | ✅ |

**Awaiting approval before wiring ranking into `discoverNearby` (M3 PR-6).**
