# M1 PR-2 — SDK Foundation Report

**Milestone:** M1 Foundation Refactoring — Phase 1  
**PR:** PR-2 — SDK Foundation Scaffolding  
**Authority:** ADR-011, BHOS-000, BHOS-PAF-001, FEB-001  
**Date:** 2026-06-30  
**Status:** Complete

---

## 1. Repository Analysis

| Aspect | Before PR-2 | After PR-2 |
|--------|-------------|------------|
| SDK package | None | `src/sdk/` contracts scaffold |
| Domain layer | None | `src/domain/` boundary folders |
| Presentation → Firestore | ~36 allowlisted files | Unchanged |
| Runtime wiring | `src/services/api.ts` monolith | Unchanged — SDK not imported by app |
| Build | Vite + tsc | Unchanged — new files typecheck only |

PR-2 adds **zero imports** from existing application code into `src/sdk/`.

---

## 2. Implementation Plan (executed)

1. Create `src/sdk/` module tree per approved spec  
2. Define infrastructure-agnostic contracts (Result, errors, adapters, OrderSDK interface)  
3. Export public surface via `src/sdk/index.ts`  
4. Create `src/domain/` folder boundaries with README  
5. Document SDK usage rules in `src/sdk/README.md`  
6. Verify build, lint, smoke — no behaviour change  

---

## 3. Files Created

### `src/sdk/`

| File | Purpose |
|------|---------|
| `README.md` | SDK usage and rules |
| `index.ts` | Public re-exports |
| `core/types.ts` | Branded IDs, pagination, metadata |
| `core/errors.ts` | `SdkError` contract |
| `core/result.ts` | `SdkResult<T>` discriminated union |
| `core/featureFlags.ts` | Flag names + defaults (all off) |
| `adapters/HttpAdapter.ts` | HTTP transport interface |
| `adapters/RepositoryAdapter.ts` | Generic repository interface |
| `orders/types.ts` | Order read-model contracts |
| `orders/OrderSDK.ts` | `OrderSDK` interface (no impl) |
| `shared/constants.ts` | `SDK_VERSION`, module IDs |
| `shared/interfaces.ts` | `BhojanSdk` root interface |

### `src/domain/`

| Path | Purpose |
|------|---------|
| `README.md` | Domain layer charter |
| `orders/.gitkeep` | Boundary placeholder |
| `customers/.gitkeep` | Boundary placeholder |
| `menu/.gitkeep` | Boundary placeholder |
| `inventory/.gitkeep` | Boundary placeholder |
| `branch/.gitkeep` | Boundary placeholder |
| `payments/.gitkeep` | Boundary placeholder |
| `notifications/.gitkeep` | Boundary placeholder |

### Documentation

| File | Purpose |
|------|---------|
| `docs/m1/PR-2-SDK-FOUNDATION-REPORT.md` | This report |

---

## 4. Files Modified

**None** (per scope — only new SDK/domain/docs files).

---

## 5. Architecture Validation

| Rule (ADR-011 / BHOS-000) | Status |
|---------------------------|--------|
| SDK does not import Firestore/Firebase/Express | ✅ Verified — no such imports |
| SDK does not use fetch/axios | ✅ Interfaces only |
| No business logic in SDK scaffold | ✅ Types + interfaces only |
| Presentation unchanged | ✅ No app imports of `@/sdk` |
| Feature flags default off | ✅ `SDK_FEATURE_FLAG_DEFAULTS` |
| Strangler pattern preserved | ✅ Legacy `api.ts` untouched |
| Architecture frozen | ✅ No ADR required |

**Future flow (not wired):**

```
Presentation → OrderSDK (interface) → adapter impl (PR-3) → Platform API / legacy bridge
```

---

## 6. Risk Assessment

| Risk | Level | Notes |
|------|-------|-------|
| Production regression | **None** | SDK not imported by runtime |
| Bundle size | **None** | Tree-shaken — unused exports |
| Type conflicts with `src/types.ts` | **Low** | SDK uses separate read models |
| Developer confusion | **Low** | README + report document scaffold-only status |

**Overall:** **Minimal**

---

## 7. Testing Plan

| Test | Command | Expected |
|------|---------|----------|
| Typecheck | `npm run lint` | Pass (SDK types compile) |
| Presentation guard | `npm run lint:presentation` | Pass |
| Smoke | `npm run test:smoke` | 22/22 pass |
| Security | `npm run test:security` | Unchanged |

**No new unit tests in PR-2** — no executable SDK code to test.

---

## 8. Rollback Plan

```bash
git revert <PR-2-commit-sha>
```

Single revert removes `src/sdk/` and `src/domain/` additions. Zero production impact.

---

## 9. Definition of Done

| Criterion | Status |
|-----------|--------|
| SDK folder exists | ✅ |
| SDK contracts exist | ✅ |
| Domain folders exist | ✅ |
| Project builds | ✅ |
| Zero runtime behaviour changes | ✅ |
| Zero API / Firestore changes | ✅ |
| Zero customer-visible changes | ✅ |
| Documentation complete | ✅ |
| Ready for M1 PR-3 | ✅ |

---

## Next Step

**M1 PR-3 — OrderSDK read-only implementation** (wrap `fetchOrderByIdApi` / guest token behind adapter; **not started**).

**STOP — await approval before PR-3.**

---

*M1 PR-2 SDK Foundation — BhojanOS Engineering*
