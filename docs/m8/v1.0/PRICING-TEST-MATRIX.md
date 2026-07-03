# Pricing Test Matrix v1.0

**Status:** Frozen — M8 PR-14  
**Date:** 2026-07-03  
**Full suite:** **1326 / 1326** passing (`npm run test:sdk`)  
**Pricing-focused subset:** **293 / 293** passing (21 test files)

---

## 1. Test summary

| Category | Files | Tests (approx) | Status |
|----------|-------|----------------|--------|
| Foundation | 3 | ~45 | ✅ |
| Domain | 5 | ~50 | ✅ |
| Repository | 1 | ~15 | ✅ |
| SDK orchestration | 1 | ~20 | ✅ |
| Facade | 1 | ~12 | ✅ |
| Projection foundation | 2 | ~25 | ✅ |
| Shadow projection | 2 | ~22 | ✅ |
| Parity | 2 | ~21 | ✅ |
| Soak | 2 | ~16 | ✅ |
| Operational validation | 2 | ~23 | ✅ |
| Read adapter | 2 | ~25 | ✅ |
| Rollout | 2 | ~29 | ✅ |
| Switch certification | 2 | ~21 | ✅ |
| **Total pricing-focused** | **21** | **293** | ✅ |
| **Full platform suite** | — | **1326** | ✅ |

---

## 2. Test file matrix

### Foundation & orchestration

| Test file | PR | Coverage |
|-----------|-----|----------|
| `src/sdk/__tests__/pricingSdkFoundation.test.ts` | PR-1 | Contract, stub adapter, flags |
| `src/domain/pricing/__tests__/pricingDomainFoundation.test.ts` | PR-2 | Domain models |
| `src/sdk/__tests__/pricingRepositoryFoundation.test.ts` | PR-3 | Repository port |
| `src/sdk/__tests__/pricingSdkOrchestration.test.ts` | PR-4 | Orchestrated adapter |
| `src/lib/__tests__/pricingFacade.test.ts` | PR-5 | Facade boundary |

### Projection chain

| Test file | PR | Coverage |
|-----------|-----|----------|
| `src/sdk/__tests__/pricingProjectionFoundation.test.ts` | PR-6 | Coordinator, checkpoint |
| `src/domain/pricing/projection/__tests__/pricingProjectionDomain.test.ts` | PR-6 | Projection domain |
| `src/domain/pricing/projections/pricing/__tests__/pricingProjectionDomain.test.ts` | PR-7 | Catalog read model domain |
| `src/sdk/__tests__/pricingCatalogShadowProjection.test.ts` | PR-7 | Shadow projection |
| `src/domain/pricing/parity/__tests__/pricingParityDomain.test.ts` | PR-8 | Parity rules |
| `src/sdk/__tests__/pricingProjectionParity.test.ts` | PR-8 | Parity comparator |
| `src/domain/pricing/parity/soak/__tests__/pricingProjectionSoakDomain.test.ts` | PR-9 | Soak rules |
| `src/sdk/__tests__/pricingProjectionSoak.test.ts` | PR-9 | Soak runner |
| `src/domain/pricing/operations/__tests__/pricingOperationsDomain.test.ts` | PR-10 | Operational rules |
| `src/sdk/__tests__/pricingProjectionOperational.test.ts` | PR-10 | Operational validator |

### Adapter, rollout, certification

| Test file | PR | Coverage |
|-----------|-----|----------|
| `src/domain/pricing/adapter/__tests__/pricingAdapterDomain.test.ts` | PR-11 | Adapter routing rules |
| `src/sdk/__tests__/pricingReadAdapter.test.ts` | PR-11 | Read adapter routing |
| `src/domain/pricing/rollout/__tests__/pricingRolloutDomain.test.ts` | PR-12 | Rollout policy |
| `src/sdk/__tests__/pricingProjectionRollout.test.ts` | PR-12 | Rollout stages |
| `src/domain/pricing/certification/__tests__/pricingProjectionCertificationDomain.test.ts` | PR-13 | Certification decisions |
| `src/sdk/__tests__/pricingProjectionSwitchCertification.test.ts` | PR-13 | Switch certification |

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
| Frozen platforms (M1–M7) | Full 1326 suite; no M8 changes to frozen code |
| PricingSDK contract drift | Contract tests + facade mapping tests |
| Flag default regression | Explicit OFF assertions in foundation tests |
| Adapter wiring accident | No integration test wiring adapter → PricingSDK |
| Production activation | Certification tests assert prohibited |

---

## 5. Known gaps (acceptable for v1.0 freeze)

| Gap | Mitigation | Target |
|-----|------------|--------|
| No production soak recorded | Staging soak required pre-activation | Post-ARB |
| No E2E UI tests | PricingFacade unit tests only | Presentation PR |
| No Firestore integration tests | Legacy port mocked | Future migration ADR |
| No load benchmarks | Performance posture documented | Future PR |

---

## 6. Verification command

```bash
npm run test:sdk
```

Expected: **1326 passed, 0 failed** (2026-07-03).
