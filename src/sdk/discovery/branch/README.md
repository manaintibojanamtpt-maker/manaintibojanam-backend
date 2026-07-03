# Discovery — Multi-Branch Candidate Expansion

**Version:** M5 PR-6  
**Flag:** `FF_BRANCH_DISCOVERY_ENABLED` (default **OFF**)

---

## Architecture

```
DiscoveryRepository
        ↓
BranchCandidateResolver
        ↓
BranchDiscoveryReadPort (future branches/ reads)
        ↓
BranchCandidateMapper → DiscoveryCandidate[]
```

When flag **OFF** → existing tenant-as-branch (`branchId === tenantId`).

When flag **ON** + port → N branch candidates per brand (tenant).

**Discovery ranks candidates — BranchSDK selects branches (forbidden here).**

---

## Module Layout

| File | Purpose |
|------|---------|
| `BranchCandidateTypes.ts` | Neutral branch read models + port |
| `BranchCandidateMapper.ts` | Branch record → `DiscoveryCandidate` |
| `BranchCandidateResolver.ts` | Tenant → N candidates expansion |
| `BranchCandidateTelemetry.ts` | Expansion telemetry hooks |

---

## Deterministic Ordering

Candidates sorted by `tenantId` ascending, then `branchId` ascending.

---

## Fallback Rules

| Case | Behaviour |
|------|-----------|
| Flag OFF | Tenant-as-branch |
| Flag ON, no port | Tenant-as-branch |
| Flag ON, empty branches for tenant | Tenant-as-branch fallback |
| Inactive branch | Excluded |

---

## Constraints

- No `BranchSDK.findBestBranch()`
- No assignment or branch selection
- No Discovery ranking changes
- No Checkout / Orders / Search changes
- No Firestore migration

---

*See [`docs/m5/PR-6-DISCOVERY-MULTI-BRANCH-REPORT.md`](../../../docs/m5/PR-6-DISCOVERY-MULTI-BRANCH-REPORT.md)*
