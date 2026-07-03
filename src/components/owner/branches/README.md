# Owner Branch Management UI

**Version:** M5 PR-14 — owner branch management presentation  
**Flag:** `FF_BRANCH_OWNER_ENABLED` (default **OFF**)

---

## Architecture

```
Owner UI
        ↓
OwnerBranchManagement
        ↓
OwnerBranchFacade (via ownerBranchManagementApi)
        ↓
BranchFacade
        ↓
BranchSDK / BranchOperationsSDK
```

React components **must not** import BranchSDK, repositories, or Firestore.

---

## Module Layout

| File | Purpose |
|------|---------|
| `OwnerBranchManagement.tsx` | Page + testable view shell |
| `OwnerBranchList.tsx` | Branch list panel |
| `OwnerBranchCard.tsx` | Selectable branch summary card |
| `OwnerBranchDetails.tsx` | Branch detail panel |
| `OwnerBranchOperationalStatus.tsx` | Operational availability panel |
| `OwnerBranchEta.tsx` | ETA + validation panels |
| `OwnerBranchStates.tsx` | Loading, empty, error, disabled states |
| `useOwnerBranchManagement.ts` | Hook orchestrating OwnerBranchFacade |
| `ownerBranchManagementApi.ts` | Injectable facade surface for UI/tests |

---

## Supported Features

Read-only display of branch list, details, operational availability, ETA, and validation status.

Loading, empty, error, retry, and refresh states included.

No creation, editing, deletion, assignment, or persistence writes.

---

## Feature Flag

When `FF_BRANCH_OWNER_ENABLED` is OFF, the page renders the disabled state and the route remains hidden from owner navigation.

When ON, `/owner/branches` is available in the owner portal.

---

## Testing

**File:** `src/lib/__tests__/ownerBranchManagementUi.test.tsx`

Mocks `OwnerBranchManagementApi` only — no BranchSDK, Firestore, or external services.

---

*See [`docs/m5/PR-14-OWNER-BRANCH-MANAGEMENT-UI-REPORT.md`](../../../../docs/m5/PR-14-OWNER-BRANCH-MANAGEMENT-UI-REPORT.md)*
