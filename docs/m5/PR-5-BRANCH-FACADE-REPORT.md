# M5 PR-5 — Branch Facade Report

**PR:** BHOS-M5-PR5  
**Date:** 2026-06-26  
**Status:** ✅ Complete — presentation layer only

---

## 1. Presentation Architecture

```
UI / Pages (future PR-6+)
        ↓
BranchFacade  ← ONLY presentation entry point
        ↓
BranchSDK
        ↓
Repository + Domain
```

**Module layout:**

```
src/lib/branch/
├── BranchFacade.ts
├── BranchContext.ts
├── BranchSession.ts
├── BranchTelemetry.ts
├── BranchFeatureFlags.ts
├── BranchErrorMapper.ts
├── types.ts
├── README.md
└── __tests__/branchFacade.test.ts (via lib/__tests__)
```

---

## 2. Facade Flow

| Method | Flow |
|--------|------|
| `listBranches` | flag → context → SDK.listBranches → session |
| `getBranch` | flag → SDK.getBranch → session |
| `findEligibleBranches` | flag → context + location → SDK → session |
| `validateBranch` | flag → context → SDK.validateBranch (sync) → session |
| `estimateETA` | flag → context → SDK.estimateETA → session |
| `retry` | replay last request with retry limit |
| `resetSession` | clear in-memory session |
| `subscribeSession` | pub/sub on session changes |

No assignment. No scoring. No branch selection.

---

## 3. Session Lifecycle

**States:** `idle` · `loading` · `success` · `empty` · `error` · `disabled` · `retry` · `cancelled`

| Transition | Trigger |
|------------|---------|
| `disabled` | `FF_BRANCH_ENABLED` OFF |
| `loading` | Request started |
| `success` | SDK success with data |
| `empty` | SDK success with empty/invalid result |
| `error` | SDK or context failure |
| `retry` | `retry()` invoked |
| `idle` | `resetSession()` |

In-memory pub/sub via `subscribeSession()` — no React, no Firestore.

---

## 4. SDK Integration

`BranchFacade` delegates to `BranchSDK` via injectable deps:

```typescript
const outcome = await listBranches(
  { tenantId: 'paradise' },
  { sdk: myMockSdk, isEnabled: () => true }
);
```

Default SDK created via `createBranchSDK({ featureFlags: readBranchFeatureFlag })`.

Customer location read from `CustomerLocationFacade` session when not overridden.

---

## 5. Error Mapping

`BranchErrorMapper.normalizeBranchError` maps SDK errors to presentation errors with:

- `userMessage` — user-facing copy
- `retryable` — for UNAVAILABLE / RATE_LIMITED
- `featureDisabled` — when flag OFF

---

## 6. Telemetry

`BranchTelemetry.ts` records:

| Event | When |
|-------|------|
| `request` | Operation started |
| `success` | Completed successfully |
| `failure` | Error path |
| `retry` | Retry invoked |
| `cancel` | Reserved for future cancel flow |

Optional `onTelemetry` hook in facade deps. In-memory timing snapshot via `getBranchTelemetrySnapshot()`.

---

## 7. Testing

**File:** `src/lib/__tests__/branchFacade.test.ts`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| Flag gating (disabled) | ✅ |
| Facade orchestration (5 methods) | ✅ |
| Session lifecycle | ✅ |
| Retry + reset | ✅ |
| Error mapping | ✅ |
| Telemetry hook | ✅ |
| Pub/sub subscribers | ✅ |
| Empty state | ✅ |

Mock BranchSDK only — no live infrastructure.

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Presentation bypassing facade | Documented as ONLY entry point (ADR-015) |
| Runtime impact | `FF_BRANCH_ENABLED` default OFF |
| Assignment leakage | Not exposed from facade |
| Discovery / Checkout impact | Zero integration |
| Firestore access from UI | Facade blocks direct repository access |

---

## 9. Rollback

- Remove `src/lib/branch/` directory
- Remove test entry from `package.json`
- No UI wired yet — zero production impact

---

## 10. Definition of Done

- [x] `BranchFacade.ts` with all required methods
- [x] `BranchContext.ts`, `BranchSession.ts`, `BranchTelemetry.ts`
- [x] `BranchFeatureFlags.ts`, `BranchErrorMapper.ts`, `types.ts`
- [x] README
- [x] Unit tests (mock SDK)
- [x] No assignment / scoring / selection
- [x] No Discovery / Checkout / Firestore changes

**Await ARB approval before M5 PR-6.**

---

## Architectural Law

Permanent rules in [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

1. Tenant = Brand  
2. Branch = Fulfillment Unit  
3. Presentation uses BranchFacade only  
4. Only BranchSDK chooses branches (future PR)
