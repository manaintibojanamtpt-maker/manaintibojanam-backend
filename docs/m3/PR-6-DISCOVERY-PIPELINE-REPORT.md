# M3 PR-6 — Discovery Pipeline Integration Report

**PR:** BHOS-M3-PR6  
**Date:** 2026-06-26  
**Version:** `DISCOVERY_SDK_VERSION = 0.5.0-pipeline`  
**Status:** ✅ Complete — orchestration only, zero production impact (flags OFF)

---

## 1. Files Changed

| Path | Purpose |
|------|---------|
| `src/sdk/discovery/pipeline/DiscoveryPipeline.ts` | Stage orchestration |
| `src/sdk/discovery/pipeline/DiscoveryMapper.ts` | `RankedCandidate[]` → `DiscoveryResult` |
| `src/sdk/discovery/pipeline/types.ts` | Telemetry DTOs + hooks |
| `src/sdk/discovery/pipeline/pipelineTelemetry.ts` | Timing + trace emission |
| `src/sdk/discovery/pipeline/resolvePipelineFlags.ts` | Eligibility flag resolution |
| `src/sdk/__tests__/discoveryPipeline.test.ts` | Pipeline tests |

**Updated:** `DefaultDiscoveryAdapter.ts`, `createDiscoverySDK.ts`, `dto/results.ts`, `shared/options.ts`, `version.ts`, `dto/index.ts`, `discoveryTenantRepository.test.ts`

**Not changed:** repository, eligibility engine, ranking engine, Firestore, facade, presentation, UI

---

## 2. Pipeline Diagram

```
DiscoveryFacade (FF_DISCOVERY_ENABLED)
        │
        ▼
DiscoverySDK.discoverNearby()
        │
        ▼
DiscoveryPipeline
   ├─ Repository.getDiscoveryCandidates()
   ├─ EligibilityEngine.evaluateCandidates()  [or passthrough if flag OFF]
   ├─ RankingEngine.rank()
   └─ DiscoveryMapper → DiscoveryResult
        │
        ▼
DiscoveryResult + telemetry
```

---

## 3. Stage Integration

| Stage | Input | Output | Flag |
|-------|-------|--------|------|
| Repository | `DiscoveryQuery` | `DiscoveryCandidate[]` | `FF_DISCOVERY_TENANT_REPOSITORY_ENABLED` (facade) |
| Eligibility | `DiscoveryCandidate[]` | `EligibleCandidate[]` | `FF_DISCOVERY_ELIGIBILITY_ENABLED` |
| Ranking | `EligibleCandidate[]` | `RankedCandidate[]` | `FF_DISCOVERY_RANKING_ENABLED` (policy) |
| Mapping | `RankedCandidate[]` | `DiscoveryResult` | — |

**Eligibility OFF:** passthrough wrapper (no eligibility engine rules invoked).  
**Ranking OFF:** distance-only policy (ranking stage still runs).

---

## 4. Telemetry

### Counts

`repositoryCount` → `eligibleCount` → `rankedCount` → `returnedCount`

### Timing (ms)

`repository` · `eligibility` · `ranking` · `mapping` · `total`

### Traces

Five stage traces emitted via `DiscoveryPipelineHooks.onStageComplete`.

### Flags snapshot

`eligibilityEnabled` · `weightedRankingEnabled`

Attached to `DiscoveryResult.telemetry`.

---

## 5. Performance

- All stages run in-process — no network beyond repository read
- Timing uses `performance.now()` with `Date.now()` fallback
- Limit applied at mapping stage only (no extra ranking work)
- Ineligible candidates excluded before ranking (no wasted scoring)

---

## 6. Testing

```bash
npm run test:sdk   # 169/169 pass (+12 PR-6)
```

| Scenario | Coverage |
|----------|----------|
| Pipeline success + telemetry | ✅ |
| Repository empty | ✅ |
| No eligible candidates | ✅ |
| Eligibility disabled (passthrough) | ✅ |
| Ranking disabled (distance-only) | ✅ |
| Weighted ranking enabled | ✅ |
| Query limit | ✅ |
| Per-stage timing | ✅ |
| Trace hooks | ✅ |
| Eligibility ON without engine → NOT_CONFIGURED | ✅ |
| `discoverNearby` adapter wiring | ✅ |
| Stub adapter still NOT_CONFIGURED | ✅ |

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Premature production enablement | All flags default OFF; facade master gate unchanged |
| Eligibility bypass surprises | Only when `FF_DISCOVERY_ELIGIBILITY_ENABLED` OFF; flagged in telemetry |
| Telemetry overhead | Lightweight timers; hooks optional |
| Pipeline bypasses frozen stages | No changes to stage internals — orchestration only |

---

## 8. Rollback

1. Keep `VITE_FF_DISCOVERY_ENABLED=false` (facade gate).
2. Pipeline code is inert until facade enables discovery and repository flag is ON.
3. Revert PR — `discoverNearby` returns NOT_CONFIGURED on stub adapter; no UI impact.

---

## 9. Definition of Done

| Criterion | Status |
|-----------|--------|
| `DiscoveryPipeline` orchestrates all stages | ✅ |
| `DiscoveryMapper` produces `DiscoveryResult` | ✅ |
| `discoverNearby()` wired in `DefaultDiscoveryAdapter` | ✅ |
| Feature flag orchestration | ✅ |
| Telemetry counts + timing + traces | ✅ |
| No repository / eligibility / ranking / UI changes | ✅ |
| All required tests | ✅ |
| Version `0.5.0-pipeline` | ✅ |

**Awaiting approval before enabling discovery flags in production.**
