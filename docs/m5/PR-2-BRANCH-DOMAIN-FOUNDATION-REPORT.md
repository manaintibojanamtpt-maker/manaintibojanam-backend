# M5 PR-2 — Branch Domain Foundation Report

**PR:** BHOS-M5-PR2  
**Date:** 2026-06-26  
**Status:** ✅ Complete — pure domain logic only

---

## 1. Domain Architecture

```
src/domain/branch/
├── assignment/
│   ├── BranchAssignmentPolicy.ts
│   ├── BranchAssignmentReason.ts
│   └── BranchAssignmentMetadata.ts
├── eligibility/
│   ├── BranchEligibilityRules.ts
│   └── BranchEligibilityValidator.ts
├── scoring/
│   ├── BranchScoreCalculator.ts
│   ├── BranchScoreBreakdown.ts
│   └── BranchScoreWeights.ts
├── validation/
│   └── BranchValidation.ts
├── shared/
│   ├── BranchConstants.ts
│   ├── BranchErrors.ts
│   └── BranchTypes.ts
├── __tests__/
│   └── branchDomain.test.ts
└── README.md
```

**Layering (target):**

```
BranchSDK (PR-1) → BranchAssignmentEngine (PR-4+)
                         ↑
              Branch Domain (PR-2) — pure calculations
```

**Constraints honoured:**

- No SDK imports
- No Firestore / repository
- No React / UI
- No network / browser APIs
- No assignment persistence
- No Discovery / Checkout integration

---

## 2. Domain Model

| Type | File | Purpose |
|------|------|---------|
| `BranchSelectionQuery` | `shared/BranchTypes.ts` | Input for branch selection |
| `BranchOperationalSnapshot` | `shared/BranchTypes.ts` | In-memory branch state for rules/scoring |
| `BranchEligibilityResult` | `shared/BranchTypes.ts` | Eligibility outcome per branch |
| `BranchValidationResult` | `shared/BranchTypes.ts` | Assignment readiness |
| `BranchScoreBreakdown` | `shared/BranchTypes.ts` | Weighted score + factor list |
| `BranchScoredCandidate` | `shared/BranchTypes.ts` | Branch + eligibility + score bundle |
| `BranchDomainResult<T>` | `shared/BranchErrors.ts` | Typed ok/fail result |

**Version:** `BRANCH_DOMAIN_VERSION = '0.1.0-foundation'`

---

## 3. Assignment Policy

| Export | Purpose |
|--------|---------|
| `DEFAULT_BRANCH_ASSIGNMENT_POLICY` | Tie-break (`branch_id_asc`), min score, failover limits |
| `resolvePreferredAssignmentReason` | Maps order type → reason code |
| `meetsMinimumScoreThreshold` | Score floor check |
| `shouldAttemptFailover` | Failover attempt guard |
| `BRANCH_ASSIGNMENT_REASONS` | Reason taxonomy (8 codes) |
| `createBranchAssignmentMetadata` | Pure metadata builder (no persistence) |

Override vs automatic reason helpers: `isOverrideAssignmentReason`, `isAutomaticAssignmentReason`.

---

## 4. Eligibility Model

**Rules (`BranchEligibilityRules.ts`):**

| Rule | Delivery | Pickup |
|------|----------|--------|
| Radius | Required | Skipped |
| Suspended / closed | Fail | Fail |
| Busy / not accepting | Fail | Fail |
| Inventory coverage | When cart items present | When cart items present |

**Validator (`BranchEligibilityValidator.ts`):**

- `evaluateBranchEligibility(branch, context)` → `BranchEligibilityResult`
- `filterEligibleBranches(branches, context)` → eligible subset

**Statuses:** `serviceable` · `out_of_radius` · `closed` · `busy` · `inventory_short` · `suspended`

---

## 5. Score Model

**Weights (`BRANCH_DOMAIN_SCORE_WEIGHTS`):**

| Signal | Weight |
|--------|--------|
| distance | 0.35 |
| eta | 0.25 |
| delivery_fee | 0.10 |
| capacity_headroom | 0.15 |
| inventory_availability | 0.10 |
| rating | 0.00 |
| open_status | 0.05 |
| **Sum** | **1.00** |

**Calculator (`BranchScoreCalculator.ts`):**

- `normalizeDistanceSignal` / `normalizeEtaSignal` — bounded 0–1 signals
- `computeInventoryCoverage` — cart item availability ratio
- `calculateBranchScore` — deterministic weighted total
- `rankScoredBranches` — sort by total desc, tie-break `branchId` asc

---

## 6. Validation

| Function | Purpose |
|----------|---------|
| `validateBranchSelectionQuery` | Structural query validation |
| `validateBranchDomainWeights` | Weights sum ≈ 1.0 |
| `validateBranchForAssignment` | Eligibility + issue aggregation |
| `selectBestEligibleBranch` | Filter → score → rank → best |

**Edge cases handled:**

- Empty / invalid tenantId
- Missing or zero customer point
- Invalid order type
- All branches ineligible → `NO_ELIGIBLE_BRANCH`
- Equal scores → deterministic `branch_id_asc` tie-break

---

## 7. Testing

**File:** `src/domain/branch/__tests__/branchDomain.test.ts`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| Version export | ✅ |
| Weight validation (sum = 1.0) | ✅ |
| Query validation | ✅ |
| Assignment reasons + policy | ✅ |
| Metadata creation | ✅ |
| Score normalization + calculation | ✅ |
| Deterministic ranking / tie-break | ✅ |
| Eligibility (radius, inventory, pickup) | ✅ |
| Filter + validate + select best | ✅ |
| No eligible branch error | ✅ |

**Result:** 337 / 337 tests pass (`npm run test:sdk`)

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Domain coupled to SDK/Firestore | Zero imports outside `src/domain/branch/` |
| Non-deterministic scoring | Pure functions; no `Date.now()` in calculators |
| Weight drift | `validateBranchScoreWeights` + test assertion |
| Premature engine wiring | No `BranchAssignmentEngine` implementation |
| Divergence from SDK DTOs | PR-4 adapter layer will map domain ↔ SDK |

---

## 9. Rollback

- Domain is isolated under `src/domain/branch/`
- No runtime consumers — SDK stub unchanged
- Remove directory + test entry in `package.json` if needed
- Zero production flag impact

---

## 10. Definition of Done

- [x] `assignment/` — policy, reasons, metadata
- [x] `eligibility/` — rules + validator
- [x] `scoring/` — weights, breakdown, calculator
- [x] `validation/` — query + assignment validation
- [x] `shared/` — types, constants, errors
- [x] `README.md`
- [x] 100% unit tested (18 domain cases)
- [x] No SDK / Firestore / React / API wiring
- [x] No assignment engine implementation
- [x] No Discovery / Checkout integration

**Await ARB approval before M5 PR-3.**

---

## Architectural Law

Permanent rules in [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

1. Tenant = Brand  
2. Branch = Fulfillment Unit  
3. Customers interact with Brands  
4. Only BranchSDK chooses branches  
5. Domain powers engine logic — domain does **not** select branches at runtime until SDK wires it
