# Menu Test Matrix v1.0

**Status:** Frozen — M7 PR-14  
**Date:** 2026-06-27  
**Full suite:** **1033 / 1033** passing (`npm run test:sdk`)  
**Menu-focused subset:** **253 / 253** passing (21 test files)

---

## 1. Test summary

| Category | Files | Tests (approx) | Status |
|----------|-------|----------------|--------|
| SDK foundation & orchestration | 4 | ~80 | ✅ |
| Projection chain | 5 | ~90 | ✅ |
| Read adapter | 1 | ~20 | ✅ |
| Rollout | 1 | ~15 | ✅ |
| Switch certification | 1 | ~15 | ✅ |
| Domain (pure) | 8 | ~25 | ✅ |
| MenuFacade | 1 | ~8 | ✅ |
| **Total menu-focused** | **21** | **253** | ✅ |
| **Full platform suite** | — | **1033** | ✅ |

---

## 2. Test file matrix

### SDK layer

| Test file | PR | Coverage |
|-----------|-----|----------|
| `src/sdk/menu/__tests__/menuSdkFoundation.test.ts` | PR-1 | Contract, stub adapter, flags |
| `src/sdk/menu/__tests__/menuRepositoryFoundation.test.ts` | PR-2 | Repository port |
| `src/sdk/menu/__tests__/menuSdkOrchestration.test.ts` | PR-4 | Orchestrated adapter |
| `src/sdk/menu/__tests__/menuProjectionFoundation.test.ts` | PR-6 | Coordinator, checkpoint |
| `src/sdk/menu/__tests__/menuCatalogShadowProjection.test.ts` | PR-7 | Shadow read model |
| `src/sdk/menu/__tests__/menuCatalogParity.test.ts` | PR-8 | Parity comparator |
| `src/sdk/menu/__tests__/menuCatalogProjectionSoak.test.ts` | PR-9 | Soak certification |
| `src/sdk/menu/__tests__/menuCatalogProjectionOperational.test.ts` | PR-10 | Operational validation |
| `src/sdk/menu/__tests__/menuReadAdapter.test.ts` | PR-11 | Read adapter routing |
| `src/sdk/menu/__tests__/menuProjectionRollout.test.ts` | PR-12 | Rollout stages |
| `src/sdk/menu/__tests__/menuProjectionSwitchCertification.test.ts` | PR-13 | Switch certification |

### Domain layer

| Test file | PR | Coverage |
|-----------|-----|----------|
| `src/domain/menu/__tests__/menuDomainFoundation.test.ts` | PR-1 | Catalog domain |
| `src/domain/menu/projection/__tests__/menuProjectionDomain.test.ts` | PR-6 | Projection domain |
| `src/domain/menu/parity/__tests__/menuParityDomain.test.ts` | PR-8 | Parity rules |
| `src/domain/menu/soak/__tests__/menuProjectionSoakDomain.test.ts` | PR-9 | Soak rules |
| `src/domain/menu/operations/__tests__/menuOperationsDomain.test.ts` | PR-10 | Operational rules |
| `src/domain/menu/adapter/__tests__/menuAdapterDomain.test.ts` | PR-11 | Adapter routing rules |
| `src/domain/menu/rollout/__tests__/menuRolloutDomain.test.ts` | PR-12 | Rollout policy |
| `src/domain/menu/certification/__tests__/menuProjectionCertificationDomain.test.ts` | PR-13 | Certification decisions |

### Presentation layer

| Test file | PR | Coverage |
|-----------|-----|----------|
| `src/lib/__tests__/menuFacade.test.ts` | PR-5 | Facade boundary |

---

## 3. Quality gate coverage

| Gate | Test evidence |
|------|---------------|
| All flags default OFF | Foundation + orchestration tests |
| Legacy authoritative | Adapter, rollout, certification tests |
| No production routing | Certification `productionActivationProhibited` |
| Stub when disabled | Foundation tests |
| Parity evidence chain | PR-8 through PR-10 tests |
| Rollback safety | Adapter legacy fallback tests |
| Public API stability | Contract + facade tests |
| Provider neutrality | Repository port abstraction tests |

---

## 4. Regression protection

| Risk area | Protection |
|-----------|------------|
| Frozen platforms (M1–M6) | Full 1033 suite; no M7 changes to frozen code |
| MenuSDK contract drift | Contract tests + facade mapping tests |
| Flag default regression | Explicit OFF assertions in foundation tests |
| Adapter wiring accident | No integration test wiring adapter → MenuSDK |
| Production activation | Certification tests assert prohibited |

---

## 5. Known gaps (acceptable for v1.0 freeze)

| Gap | Mitigation | Target |
|-----|------------|--------|
| No production soak recorded | Staging soak required pre-activation | Post-ARB |
| No E2E UI tests | MenuFacade unit tests only | Presentation PR |
| No Firestore integration tests | Legacy port mocked | Future migration ADR |
| No load benchmarks | Performance posture documented | Future PR |

---

## 6. Verification command

```bash
npm run test:sdk
```

Expected: **1033 passed, 0 failed** (2026-06-27).
