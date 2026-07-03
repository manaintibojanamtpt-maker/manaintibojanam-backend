# M7 PR-5 — Menu Facade & Presentation Orchestration Report

**Program:** BHOS-M7  
**PR:** M7 PR-5 — Menu Facade & Presentation Orchestration  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-5 introduces **MenuFacade** — the sole presentation entry point for menu reads. All facade operations delegate to **MenuSDK** only. No repository, domain, Firestore, React, or projection imports.

The facade maintains an in-memory session lifecycle, maps SDK errors to presentation-friendly codes, emits telemetry, and supports retry/reset/subscription. Feature flag `FF_MENU_ENABLED` remains **OFF** by default — no runtime behavior change for production.

---

## 2. Architecture

```
Future UI
    ↓
MenuFacade (src/lib/menu/)
    ↓
MenuSDK
    ↓
Repository → Domain
```

**Invariant:** Presentation MUST NOT import `MenuSDK`, `MenuRepository`, or `src/domain/menu/` directly.

---

## 3. Facade Lifecycle

1. **Gate** — `FF_MENU_ENABLED` check → `disabled` session if OFF
2. **Request** — emit `menu_facade_request`, mark `loading`, store `lastRequest`
3. **Delegate** — call matching `MenuSDK` method with query builders from `MenuContext`
4. **Outcome**
   - SDK success + empty data → `empty`
   - SDK success + data → `success`
   - SDK failure → `error` + mapped presentation error
5. **Retry** — re-invoke `lastRequest` (max 3 attempts on retryable failures)
6. **Reset** — return session to `idle`

---

## 4. Session Model

| Status | Meaning |
|--------|---------|
| `idle` | No active operation |
| `loading` | SDK call in flight |
| `success` | Data returned |
| `empty` | Valid response with no items/categories/hits |
| `error` | SDK or validation failure |
| `disabled` | Feature flag OFF |
| `retry` | Retry in progress |
| `cancelled` | Reserved for future cancel support |

In-memory module state with pub/sub via `subscribeSession()`. No React state. No Firestore.

---

## 5. SDK Integration

| Facade Method | MenuSDK Method |
|---------------|----------------|
| `getMenu` | `getMenu` |
| `getMenuItem` | `getMenuItem` |
| `listCategories` | `listCategories` |
| `searchMenu` | `searchMenu` |
| `getCombo` | `getCombo` |
| `validateMenu` | `validateMenu` (sync) |

Factory default: `createMenuSDK({ featureFlags: readMenuFlag })`. Injectable `sdk` for tests.

---

## 6. Error Mapping

| SDK Code | Presentation Code | Retryable |
|----------|-------------------|-----------|
| `NOT_FOUND` | `NOT_FOUND` | No |
| `UNAVAILABLE` | `UNAVAILABLE` | Yes |
| `VALIDATION` | `VALIDATION` | No |
| `NOT_CONFIGURED` | `NOT_CONFIGURED` | No |
| Other | `UNKNOWN` | Yes |

User-facing messages only — no internal layer details exposed.

---

## 7. Telemetry

| Event | When |
|-------|------|
| `menu_facade_request` | Operation started |
| `menu_facade_success` | SDK success (includes `empty` / `success` status) |
| `menu_facade_failure` | SDK or gate failure |
| `menu_facade_retry` | `retry()` invoked |
| `menu_facade_reset` | `resetSession()` invoked |

Hook: `onTelemetry` dep or `setMenuFacadeTelemetryHook()`.

---

## 8. Generated Files

| File | Purpose |
|------|---------|
| `src/lib/menu/MenuFacade.ts` | Presentation facade class |
| `src/lib/menu/MenuContext.ts` | Types, query builders, session snapshot |
| `src/lib/menu/MenuSession.ts` | In-memory session pub/sub |
| `src/lib/menu/MenuErrorMapper.ts` | SDK → presentation error mapping |
| `src/lib/menu/MenuTelemetry.ts` | Telemetry emitter |
| `src/lib/menu/MenuFacadeFactory.ts` | `createMenuFacade()` factory |
| `src/lib/menu/README.md` | Module documentation |
| `src/lib/__tests__/menuFacade.test.ts` | Facade tests (mock SDK only) |

---

## 9. Risk Assessment

| Risk | Mitigation |
|------|------------|
| UI bypasses facade | Lint/guard in future PR; README + ARB policy |
| Session global state | Module-scoped; `resetSession()` for tests |
| Flag accidentally ON | Default OFF; same env key as SDK |
| Retry storm | Max 3 retry attempts enforced |

---

## 10. Rollback

1. Remove `src/lib/menu/` directory
2. Remove `menuFacade.test.ts` from `test:sdk` script
3. No SDK/domain/repository changes to revert

Rollback-safe: entirely additive.

---

## 11. Migration Roadmap

| Phase | Action |
|-------|--------|
| PR-5 (this) | Facade foundation + tests |
| PR-6+ | Menu projection (blocked — ARB) |
| Future UI | Import `createMenuFacade()` only; never `MenuSDK` |

---

## 12. Definition of Ready

- [x] M7 PR-1 through PR-4 certified
- [x] MenuSDK contract frozen
- [x] `FF_MENU_ENABLED` defined
- [x] Search/Branch facade patterns available

---

## 13. Definition of Done

- [x] `MenuFacade` implements full public API
- [x] Session lifecycle (`idle` → `loading` → `success`/`empty`/`error`/`disabled`/`retry`)
- [x] Error mapping for all presentation codes
- [x] Telemetry events operational
- [x] `retry()`, `resetSession()`, `subscribeSession()`, `getSessionSnapshot()`
- [x] Tests mock MenuSDK only — no Firestore/repository/domain
- [x] Feature flag OFF by default
- [x] No modifications to frozen layers
- [x] Documentation complete

---

## 14. Certification Checklist

- [x] MenuFacade is the only presentation entry point (by policy)
- [x] No MenuSDK imports from future UI path (enforced at integration time)
- [x] SDK remains isolated behind facade
- [x] Session lifecycle verified in tests
- [x] Telemetry operational
- [x] `FF_MENU_ENABLED` default OFF
- [x] No runtime behavior changes
- [x] All tests passing

**STOP.** Do not begin M7 PR-6 until explicit ARB approval.
