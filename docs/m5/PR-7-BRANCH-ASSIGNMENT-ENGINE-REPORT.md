# M5 PR-7 — Automatic Branch Selection Engine Report

**PR:** BHOS-M5-PR7  
**Date:** 2026-06-26  
**Status:** ✅ Complete — first PR permitted to perform automatic branch selection

---

## 1. Assignment Architecture

```
BranchSDK.findBestBranch()
        ↓
DefaultBranchAdapter (flag gate)
        ↓
DefaultBranchAssignmentEngine
        ↓
AssignmentCandidateBuilder → BranchRepository
        ↓
Domain: validateBranchForAssignment + calculateBranchScore
        ↓
AssignmentPolicyResolver
        ↓
selectBestEligibleBranch (domain tie-break)
        ↓
BranchAssignmentResult (synthetic ID, no persistence)
```

**BranchSDK is the ONLY platform permitted to choose fulfillment branches.**

| Module | Path |
|--------|------|
| Engine | `src/sdk/branch/assignment/DefaultBranchAssignmentEngine.ts` |
| Candidate builder | `src/sdk/branch/assignment/AssignmentCandidateBuilder.ts` |
| Score mapper | `src/sdk/branch/assignment/AssignmentScoreMapper.ts` |
| Policy resolver | `src/sdk/branch/assignment/AssignmentPolicyResolver.ts` |
| Telemetry | `src/sdk/branch/assignment/AssignmentTelemetry.ts` |
| Factory | `src/sdk/branch/assignment/createBranchAssignmentEngine.ts` |

Wiring: `createBranchSDK.ts` → `createBranchAssignmentEngine()` → `DefaultBranchAdapter.findBestBranch()`.

---

## 2. Assignment Flow

| Step | Action |
|------|--------|
| 1 | Validate `BranchSelectionQuery` (SDK validation) |
| 2 | Gate on `FF_BRANCH_ASSIGNMENT_ENABLED` — OFF → `NOT_CONFIGURED` |
| 3 | Resolve candidate seeds from optional `DiscoveryCandidate[]` or repository branch list |
| 4 | Load operational snapshots via `BranchRepository` |
| 5 | Evaluate eligibility per snapshot (`validateBranchForAssignment`) |
| 6 | Apply preferred-branch shortcut when valid and above threshold |
| 7 | Select best eligible branch (`selectBestEligibleBranch`) |
| 8 | Score winner (`calculateBranchScore`) and enforce policy threshold |
| 9 | Return synthetic `BranchAssignment` + ranked branch IDs |

No Checkout integration. No Order creation. No assignment persistence.

---

## 3. Eligibility Integration

Eligibility is delegated entirely to domain logic:

- `validateBranchForAssignment(snapshot, { orderType, cartItemIds })`
- `selectBestEligibleBranch(snapshots, context)` for winner selection
- Inventory checks use repository-loaded snapshots (including `getBranchInventory` when present)

When no branch passes eligibility → `NO_ELIGIBLE_BRANCH` validation error.

Discovery candidates are **seeds only** — eligibility is re-evaluated on operational snapshots, not on Discovery DTO eligibility fields.

---

## 4. Scoring Integration

Scoring reuses domain `calculateBranchScore`:

- Distance, prep queue, inventory availability, and operational signals from snapshots
- `AssignmentScoreMapper.mapDomainScoreToBranchScore` maps domain totals to SDK `BranchScore` DTO
- `AssignmentPolicyResolver.passesAssignmentScoreThreshold` rejects winners below routing threshold → `SCORE_BELOW_THRESHOLD`

Tie-breaking: domain `selectBestEligibleBranch` + explicit `branch_id` ascending sort in ranked output.

---

## 5. Policy Resolution

`AssignmentPolicyResolver` reads routing config from repository (`getRoutingPolicy`) and produces `BranchAssignmentPolicy`:

| Field | Source |
|-------|--------|
| Minimum score threshold | Routing policy or domain default |
| Preferred branch handling | Query `preferredBranchId` + policy |
| Assignment reason | Order type + policy (`resolveAssignmentReason`) |
| Tie-break | Domain selection + `branch_id` ascending |

When routing policy is unavailable, safe domain defaults apply.

---

## 6. Telemetry

`AssignmentTelemetry.ts` events (optional `onTelemetry` hook):

| Event | When |
|-------|------|
| `BRANCH_ASSIGNMENT_REQUEST` | Assignment started with candidate count |
| `BRANCH_ASSIGNMENT_SUCCESS` | Branch selected |
| `BRANCH_ASSIGNMENT_PREFERRED` | Preferred branch shortcut used |
| `BRANCH_ASSIGNMENT_NO_ELIGIBLE` | No eligible branch found |
| `BRANCH_ASSIGNMENT_SCORE_REJECTED` | Winner below threshold |
| `BRANCH_ASSIGNMENT_FAILURE` | Validation / repository errors |

Duration timing via `createAssignmentTelemetryTimer`.

---

## 7. Testing

**File:** `src/sdk/__tests__/branchAssignmentEngine.test.ts`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| Feature flag OFF → `NOT_CONFIGURED` | ✅ |
| Factory returns null when flag off | ✅ |
| Multi-branch deterministic selection | ✅ |
| Single branch | ✅ |
| No eligible branch (inventory failure) | ✅ |
| Tie-break by `branch_id` ascending | ✅ |
| Score mapper | ✅ |
| Policy resolver | ✅ |
| Telemetry on success | ✅ |
| Adapter delegation when enabled | ✅ |

Mock repositories only — no live Firestore.

**Result:** 402 / 402 tests pass (`npm run test:sdk`)

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Branch selection outside BranchSDK | Only `DefaultBranchAssignmentEngine` selects; Discovery/Search/Checkout unchanged |
| Production behaviour change | `FF_BRANCH_ASSIGNMENT_ENABLED` default OFF → `NOT_CONFIGURED` |
| Stale Discovery eligibility trusted | Re-evaluated on repository snapshots |
| Assignment persisted prematurely | Synthetic `assignmentId` only; no write path |
| Checkout / Orders coupling | Zero integration in this PR |
| Non-deterministic tie-breaks | Explicit `branch_id` ascending |

---

## 9. Rollback

- Set `FF_BRANCH_ASSIGNMENT_ENABLED` OFF → `findBestBranch` returns `NOT_CONFIGURED`
- Remove `src/sdk/branch/assignment/` module
- Revert `DefaultBranchAdapter.findBestBranch` and `createBranchSDK` wiring

No data migration required — no persistence was introduced.

---

## 10. Definition of Done

- [x] `DefaultBranchAssignmentEngine.ts`
- [x] `AssignmentCandidateBuilder.ts`
- [x] `AssignmentScoreMapper.ts`
- [x] `AssignmentPolicyResolver.ts`
- [x] `AssignmentTelemetry.ts`
- [x] `createBranchAssignmentEngine.ts`
- [x] README (`src/sdk/branch/assignment/README.md`)
- [x] `FF_BRANCH_ASSIGNMENT_ENABLED` (default OFF)
- [x] `DefaultBranchAdapter.findBestBranch` wired behind flag
- [x] Unit tests (mock repositories)
- [x] Eligibility, scoring, policy, tie-break, telemetry verified
- [x] No Checkout integration
- [x] No Orders modification
- [x] No assignment persistence
- [x] No Discovery changes

**Await ARB approval before M5 PR-8.**

---

## Architectural Law

From [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

- **Discovery** emits branch candidates as data — does not select
- **Search** finds brands — never selects branches
- **Checkout** consumes branch assignments — does not choose branches
- **BranchSDK** is the sole authority for fulfillment branch selection
