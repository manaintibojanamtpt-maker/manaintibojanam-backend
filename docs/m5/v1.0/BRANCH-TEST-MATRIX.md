# Branch Test Matrix v1.0

**Status:** Frozen — M5 PR-15  
**Date:** 2026-06-26

---

## 1. Regression gate

**Required before production flag enable:**

```bash
npm run test:sdk   # 505 pass (2026-06-26)
npm run lint:presentation   # no new Firestore imports in presentation
```

Branch-specific files in `test:sdk` script (`package.json`):

---

## 2. SDK layer

| File | Focus | PR |
|------|-------|-----|
| `src/sdk/__tests__/branchSdkFoundation.test.ts` | Version, flags, contract exports | PR-1 |
| `src/sdk/__tests__/branchRepository.test.ts` | Repository port + mapper | PR-3 |
| `src/sdk/__tests__/branchSdkOrchestration.test.ts` | Adapter factory, stub/default | PR-4 |
| `src/sdk/__tests__/branchAssignmentEngine.test.ts` | Scoring, eligibility, selection | PR-7 |
| `src/sdk/__tests__/branchOperationsRepository.test.ts` | Operations repository reads | PR-11 |
| `src/sdk/__tests__/branchOperationsSdk.test.ts` | Operations orchestration | PR-12 |
| `src/sdk/__tests__/discoveryBranchCandidates.test.ts` | Discovery multi-candidate | PR-6 |

---

## 3. Domain layer

| File | Focus | PR |
|------|-------|-----|
| `src/domain/branch/__tests__/branchDomain.test.ts` | Eligibility, scoring rules | PR-2 |
| `src/domain/branch/__tests__/branchOperations.test.ts` | Hours, capacity, inventory evaluators | PR-10 |

---

## 4. Presentation layer

| File | Focus | PR |
|------|-------|-----|
| `src/lib/__tests__/branchFacade.test.ts` | BranchFacade operations, session | PR-5 |
| `src/lib/__tests__/checkoutBranchFacade.test.ts` | Checkout assignment, legacy path | PR-8 |
| `src/lib/__tests__/orderBranchPersistence.test.ts` | Order snapshot persistence | PR-9 |
| `src/lib/__tests__/ownerBranchFacade.test.ts` | Owner facade, retry, telemetry | PR-13 |
| `src/lib/__tests__/ownerBranchManagementUi.test.tsx` | Owner UI rendering, a11y | PR-14 |

---

## 5. Test coverage by capability

| Capability | Test evidence |
|------------|---------------|
| Flag OFF → stub/disabled | ✅ All facade + SDK tests |
| Flag ON → live adapter path | ✅ Orchestration + repository tests |
| Assignment engine | ✅ `branchAssignmentEngine.test.ts` |
| Operations pipeline | ✅ Repository + SDK + domain tests |
| Checkout legacy path | ✅ `checkoutBranchFacade.test.ts` |
| Order persistence skip | ✅ `orderBranchPersistence.test.ts` |
| Owner read-only ops | ✅ `ownerBranchFacade.test.ts` |
| UI states (loading/empty/error) | ✅ `ownerBranchManagementUi.test.tsx` |
| Retry / session lifecycle | ✅ Facade tests (branch, checkout, owner) |
| Error mapping | ✅ Facade + SDK tests |
| Deterministic outputs | ✅ Domain + assignment tests |
| Discovery tenant-as-branch fallback | ✅ `discoveryBranchCandidates.test.ts` |

---

## 6. Mocking policy

| Layer | Mock target | Never mock |
|-------|-------------|------------|
| SDK tests | Repository, assignment engine | Firestore directly |
| Facade tests | `BranchSDK` via deps | Firestore |
| Checkout tests | `BranchFacadeDeps` | BranchSDK direct |
| Owner facade tests | `BranchFacadeDeps` | BranchSDK direct |
| Owner UI tests | View props / pure helpers | External services |
| Operations SDK | Repository + domain evaluator | Live Firestore |

**No React in SDK tests. No Firestore in unit tests.**

---

## 7. Branch-focused test count

| Scope | Tests | Status |
|-------|-------|--------|
| Branch-focused subset (14 files) | 204 | ✅ Pass |
| Full `npm run test:sdk` | 505 | ✅ Pass |

Run branch subset:

```bash
node --import tsx --test \
  src/sdk/__tests__/branchSdkFoundation.test.ts \
  src/sdk/__tests__/branchRepository.test.ts \
  src/sdk/__tests__/branchSdkOrchestration.test.ts \
  src/sdk/__tests__/branchAssignmentEngine.test.ts \
  src/sdk/__tests__/branchOperationsRepository.test.ts \
  src/sdk/__tests__/branchOperationsSdk.test.ts \
  src/sdk/__tests__/discoveryBranchCandidates.test.ts \
  src/domain/branch/__tests__/branchDomain.test.ts \
  src/domain/branch/__tests__/branchOperations.test.ts \
  src/lib/__tests__/branchFacade.test.ts \
  src/lib/__tests__/checkoutBranchFacade.test.ts \
  src/lib/__tests__/orderBranchPersistence.test.ts \
  src/lib/__tests__/ownerBranchFacade.test.ts \
  src/lib/__tests__/ownerBranchManagementUi.test.tsx
```

---

## 8. Gaps (accepted for v1.0)

| Gap | Severity | Plan |
|-----|----------|------|
| No E2E browser tests for checkout assignment | Medium | Post-v1 Playwright backlog |
| No load / performance benchmarks | Medium | Staging soak + future perf CI |
| No automated axe a11y suite | Low | Manual QA PR-14; static markup tests |
| No Firestore rules tests for branch collections | N/A | Collections not live until ADR-017 |
| No integration test with live Firestore | Low | Staging only |

---

## 9. Manual test plan (staging)

- [ ] Enable flags in preview per compatibility matrix enable order
- [ ] Verify checkout assigns branch before payment
- [ ] Verify order draft receives `branchId` when persistence ON
- [ ] Verify owner branch page at `/owner/branches`
- [ ] Verify operational availability panel loads
- [ ] Disable `FF_BRANCH_ENABLED` → legacy paths restore
- [ ] Verify Discovery still ranks brands (no branch scoring in Discovery)

---

## References

- M5 PR-1…PR-14 completion reports
- [BRANCH-PLATFORM-CERTIFICATION.md](./BRANCH-PLATFORM-CERTIFICATION.md)
