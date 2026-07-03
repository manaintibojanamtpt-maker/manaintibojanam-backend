# M5 PR-14 — Owner Branch Management UI Integration Report

**PR:** BHOS-M5-PR14  
**Date:** 2026-06-26  
**Status:** ✅ Complete — read-only owner branch UI wired through OwnerBranchFacade

---

## 1. UI Architecture

```
Owner UI (/owner/branches)
        ↓
OwnerBranchManagement (page)
        ↓
useOwnerBranchManagement + ownerBranchManagementApi
        ↓
OwnerBranchFacade
        ↓
BranchFacade
        ↓
BranchSDK / BranchOperationsSDK
```

React components communicate **only** with OwnerBranchFacade via the injectable `OwnerBranchManagementApi`. No BranchSDK, repository, or Firestore imports in presentation components.

| Module | Path |
|--------|------|
| Page | `src/pages/owner/OwnerBranchManagement.tsx` |
| View shell | `src/components/owner/branches/OwnerBranchManagementView.tsx` |
| Hook | `src/hooks/useOwnerBranchManagement.ts` |
| API adapter | `src/lib/owner-branches/ownerBranchManagementApi.ts` |
| View helpers | `src/lib/owner-branches/ownerBranchViewHelpers.ts` |
| Components | `src/components/owner/branches/*` |

Read-only. No creation, editing, deletion, assignment, checkout, or order persistence.

---

## 2. Component Tree

```
OwnerBranchManagement
└── OwnerBranchManagementView
    ├── Header (title + Refresh)
    ├── OwnerBranchStates (disabled | loading | empty | error)
    └── Grid (when data present)
        ├── OwnerBranchList
        │   └── OwnerBranchCard × N
        └── Detail column
            ├── OwnerBranchDetails
            ├── OwnerBranchOperationalStatus
            ├── OwnerBranchValidation (in OwnerBranchEta.tsx)
            └── OwnerBranchEta
```

---

## 3. Facade Integration

| UI action | OwnerBranchFacade delegate |
|-----------|---------------------------|
| Initial load / Refresh | `listOwnerBranches` → `getOwnerBranch` → parallel insights |
| Select branch | `getOwnerBranch` + insights |
| Operational panel | `getOwnerBranchOperationalAvailability` |
| Validation panel | `validateOwnerBranch` |
| ETA panel | `estimateOwnerBranchEta` |
| Retry | `retryOwnerBranch` |
| Refresh reset | `clearOwnerBranchSession` |

Route: `/owner/branches` (gated by `FF_BRANCH_OWNER_ENABLED` in nav + disabled page state).

---

## 4. Loading / Error States

| State | Component | Trigger |
|-------|-----------|---------|
| Disabled | `OwnerBranchDisabledState` | `FF_BRANCH_OWNER_ENABLED` OFF |
| Loading | `OwnerBranchLoadingState` | Facade session `loading` / initial fetch |
| Empty | `OwnerBranchEmptyState` | Zero branches returned |
| Error | `OwnerBranchErrorState` | Facade error with optional Retry |
| Ready | Full grid | Successful facade outcomes |

Refresh clears session and re-fetches list. Retry replays last facade operation (max 3 attempts via PR-13 session).

---

## 5. Accessibility

- Loading: `role="status"`, `aria-live="polite"`, `aria-busy="true"`
- Error: `role="alert"`, `aria-live="assertive"`
- Branch list: `aria-label` with branch count
- Branch cards: `aria-pressed`, descriptive `aria-label`
- Operational panel: composite `aria-label` for hours + capacity
- Refresh button: `aria-label="Refresh branch data"`
- Section headings with `aria-labelledby` on detail panel

---

## 6. Testing

**File:** `src/lib/__tests__/ownerBranchManagementUi.test.tsx`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| View helper formatting | ✅ |
| Loading / empty / error / disabled states | ✅ |
| Branch list, card, details | ✅ |
| Operational availability | ✅ |
| ETA + validation | ✅ |
| Full view — flag OFF (disabled) | ✅ |
| Full view — flag ON (ready) | ✅ |
| Error + retry affordance | ✅ |
| Accessibility attributes | ✅ |
| Deterministic rendering | ✅ |

Mocks presentation props and pure helpers only — no BranchSDK, Firestore, or external services.

**Result:** 505 / 505 tests pass (`npm run test:sdk`)

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| UI bypasses OwnerBranchFacade | All data via `ownerBranchManagementApi` |
| Accidental writes | Read-only UI; no mutation methods exposed |
| Production exposure | `FF_BRANCH_OWNER_ENABLED` default OFF; nav hidden when OFF |
| BranchSDK regression | BranchSDK untouched |
| Checkout / Orders impact | Zero changes |
| Capacitor import in tests | View shell isolated from page hook for test imports |

---

## 8. Rollback

- Set `FF_BRANCH_OWNER_ENABLED` OFF → nav hidden + disabled state on route
- Remove `/owner/branches` route and `src/components/owner/branches/` module
- Remove `src/pages/owner/OwnerBranchManagement.tsx`

No data migration required.

---

## 9. Definition of Done

- [x] `OwnerBranchManagement.tsx`
- [x] `OwnerBranchList.tsx`
- [x] `OwnerBranchCard.tsx`
- [x] `OwnerBranchDetails.tsx`
- [x] `OwnerBranchOperationalStatus.tsx`
- [x] `OwnerBranchEta.tsx` (+ validation panel)
- [x] `OwnerBranchStates.tsx`
- [x] README
- [x] Route + nav gated by `FF_BRANCH_OWNER_ENABLED`
- [x] Unit tests (mock facade surface / view props only)
- [x] No branch creation, editing, or deletion
- [x] No BranchSDK / Assignment / Checkout / Orders / Discovery / Search changes

**Await ARB approval before M5 PR-15 (Platform Certification & Freeze).**

---

## Architectural Law

From [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

- **OwnerBranchFacade** — owner presentation entry to BranchFacade only
- **UI** — presentation only; no SDK or repository imports
- All `FF_BRANCH_*` flags default **OFF**
