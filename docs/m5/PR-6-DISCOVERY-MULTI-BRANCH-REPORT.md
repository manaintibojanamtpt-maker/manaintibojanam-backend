# M5 PR-6 — Discovery Multi-Branch Candidate Expansion Report

**PR:** BHOS-M5-PR6  
**Date:** 2026-06-26  
**Status:** ✅ Complete — additive repository read only

---

## 1. Discovery Architecture

```
DiscoveryPipeline (unchanged ranking)
        ↓
DiscoveryRepository
        ↓
TenantDiscoveryRepositoryAdapter
        ↓
BranchCandidateResolver
        ↓
BranchDiscoveryReadPort (future branches/)
        ↓
BranchCandidateMapper → DiscoveryCandidate[]
```

**Discovery discovers, filters, ranks restaurants — BranchSDK owns branch selection (forbidden here).**

---

## 2. Candidate Expansion Flow

| Flag | Behaviour |
|------|-----------|
| `FF_BRANCH_DISCOVERY_ENABLED` OFF | Tenant-as-branch (`branchId === tenantId`) |
| ON + `BranchDiscoveryReadPort` | N branch candidates per brand |
| ON, no port | Safe fallback to tenant-as-branch |
| Empty branch collection | Tenant-as-branch fallback per brand |

---

## 3. Branch Candidate Model

| Type | Purpose |
|------|---------|
| `DiscoveryBranchReadRecord` | Neutral branch read model |
| `BrandBranchCollection` | Brand + branch list |
| `BranchDiscoveryReadPort` | Injectable read port |
| `BranchCandidateExpansionResult` | Expansion metadata |

Each `DiscoveryCandidate` retains `tenantId` (brand) + unique `branchId` (fulfillment unit).

---

## 4. Compatibility Analysis

| Scenario | Result |
|----------|--------|
| Flag OFF | Identical to M3 tenant-as-branch |
| Single branch per tenant | One candidate (same as before semantically) |
| Multiple branches | N candidates, same tenantId |
| Inactive branch | Excluded |
| Empty branches | Tenant-as-branch fallback |
| Ranking pipeline | Unchanged — receives more candidates, same engine |
| Presentation (DiscoveryFacade) | Unchanged |
| Search | Unchanged |
| Checkout / Orders | Unchanged |

No `BranchSDK.findBestBranch()` calls.

---

## 5. Telemetry

`BranchCandidateTelemetry.ts` events:

| Event | When |
|-------|------|
| `BRANCH_CANDIDATE_FLAG_OFF` | Tenant-as-branch mode |
| `BRANCH_CANDIDATE_EXPANSION_START` | Multi-branch expansion begins |
| `BRANCH_CANDIDATE_EXPANSION_COMPLETE` | Expansion finished with counts |
| `BRANCH_CANDIDATE_TENANT_FALLBACK` | Tenant-as-branch fallback used |

Optional `onTelemetry` hook via repository adapter options.

---

## 6. Testing

**File:** `src/sdk/__tests__/discoveryBranchCandidates.test.ts`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| Flag OFF compatibility | ✅ |
| Multi-branch expansion | ✅ |
| Brand-enriched names | ✅ |
| Inactive branch exclusion | ✅ |
| Empty collection fallback | ✅ |
| Deterministic ordering | ✅ |
| Telemetry | ✅ |
| Repository adapter integration | ✅ |

Mock ports only — no live Firestore.

**Result:** 390 / 390 tests pass (`npm run test:sdk`)

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental branch selection in Discovery | No BranchSDK calls; ranking only |
| Production behaviour change | `FF_BRANCH_DISCOVERY_ENABLED` default OFF |
| Ranking logic drift | Ranking engine untouched |
| Checkout / Orders impact | Zero changes |
| Firestore migration | Read models only — no collections created |

---

## 8. Rollback

- Set `FF_BRANCH_DISCOVERY_ENABLED` OFF → tenant-as-branch
- Remove `src/sdk/discovery/branch/` module
- Revert `TenantDiscoveryRepositoryAdapter` to direct mapper call

---

## 9. Definition of Done

- [x] `BranchCandidateTypes.ts`
- [x] `BranchCandidateMapper.ts`
- [x] `BranchCandidateResolver.ts`
- [x] `BranchCandidateTelemetry.ts`
- [x] README
- [x] Repository adapter wired (additive)
- [x] Unit tests (mock ports)
- [x] No ranking changes
- [x] No assignment / BranchSDK selection
- [x] No Checkout / Orders / Search / Firestore migration

**Await ARB approval before M5 PR-7.**

---

## Architectural Law

From [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

- **Discovery** ranks brands and emits branch candidates as data
- **BranchSDK** scores and selects branches — not Discovery
