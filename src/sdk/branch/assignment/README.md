# BranchSDK — Assignment Engine

**Version:** M5 PR-7 — automatic branch selection  
**Flag:** `FF_BRANCH_ASSIGNMENT_ENABLED` (default **OFF**)

---

## Architecture

```
BranchSDK.findBestBranch()
        ↓
DefaultBranchAssignmentEngine
        ↓
DiscoveryCandidate[] (optional) / BranchRepository
        ↓
Domain eligibility + scoring + policy
        ↓
BranchAssignmentResult (no persistence)
```

**BranchSDK is the ONLY platform permitted to choose fulfillment branches.**

---

## Flow

1. Validate `BranchSelectionQuery`
2. Resolve candidate seeds (Discovery candidates or repository list)
3. Load operational snapshots from repository
4. Evaluate eligibility (domain)
5. Score candidates (domain)
6. Apply assignment policy + tie-break
7. Return synthetic `BranchAssignment` (no persistence)

---

## Module Layout

| File | Purpose |
|------|---------|
| `DefaultBranchAssignmentEngine.ts` | Selection orchestration |
| `AssignmentCandidateBuilder.ts` | Snapshot loading |
| `AssignmentScoreMapper.ts` | Domain score → SDK DTO |
| `AssignmentPolicyResolver.ts` | Policy + threshold |
| `AssignmentTelemetry.ts` | Assignment telemetry |
| `createBranchAssignmentEngine.ts` | Flag-gated factory |

---

## Constraints

- No Checkout / Orders integration
- No assignment persistence
- No Discovery ranking changes
- Reuses domain logic exclusively

---

*See [`docs/m5/PR-7-BRANCH-ASSIGNMENT-ENGINE-REPORT.md`](../../../docs/m5/PR-7-BRANCH-ASSIGNMENT-ENGINE-REPORT.md)*
