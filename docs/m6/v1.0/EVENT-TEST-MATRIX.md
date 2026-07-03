# Event Test Matrix v1.0

**Status:** Frozen — M6 PR-14  
**Date:** 2026-06-27  
**Full suite:** **1033 / 1033** passing (`npm run test:sdk`)  
**Event-focused subset:** **~280** tests (SDK + domain + order projection chain)

---

## 1. Test summary

| Category | Files | Status |
|----------|-------|--------|
| EventSDK foundation & infrastructure | 3 | ✅ |
| Persistence & shadow publishing | 1 | ✅ |
| Projection worker & runtime | 2 | ✅ |
| Order shadow events & projection | 2 | ✅ |
| Parity, soak, operational | 3 | ✅ |
| Order adapter, rollout, certification | 3 | ✅ |
| Event domain (pure) | 6+ | ✅ |
| **Full platform suite** | — | **1033** ✅ |

---

## 2. SDK test file matrix

| Test file | PR | Coverage |
|-----------|-----|----------|
| `eventSdkFoundation.test.ts` | PR-1 | Contract, flags, version |
| `eventSdkInfrastructure.test.ts` | PR-2 | Adapters, idempotency, DLQ |
| `eventSdkPersistence.test.ts` | PR-3 | Outbox, shadow publishing |
| `eventSdkProjection.test.ts` | PR-4 | Worker, checkpoint, registry |
| `eventSdkProjectionRuntime.test.ts` | PR-6 | Runtime coordinator |
| `eventSdkOrderShadow.test.ts` | PR-5 | Business shadow events |
| `eventSdkOrderProjection.test.ts` | PR-7 | Order read projection |
| `eventSdkOrderParity.test.ts` | PR-8 | Parity comparator |
| `eventSdkProjectionParitySoak.test.ts` | PR-9 | Soak certification |
| `eventSdkProjectionOperational.test.ts` | PR-10 | Operational validation |
| `orderReadAdapter.test.ts` | PR-11 | Read adapter routing |
| `projectionRollout.test.ts` | PR-12 | Rollout stages |
| `projectionSwitchCertification.test.ts` | PR-13 | Switch certification |

---

## 3. Domain test file matrix

| Test file | PR | Coverage |
|-----------|-----|----------|
| `eventDomain.test.ts` | PR-1 | Event domain rules |
| `projectionDomain.test.ts` | PR-4 | Projection domain |
| `projectionRuntimeDomain.test.ts` | PR-6 | Runtime domain |
| `orderEventDomain.test.ts` | PR-5 | Order event payloads |
| `orderProjectionDomain.test.ts` | PR-7 | Order projection state |
| `orderParityDomain.test.ts` | PR-8 | Parity rules |
| `paritySoakDomain.test.ts` | PR-9 | Soak rules |
| `projectionOperationsDomain.test.ts` | PR-10 | Operational rules |
| `orderAdapterDomain.test.ts` | PR-11 | Adapter routing |
| `rolloutDomain.test.ts` | PR-12 | Rollout policy |
| `projectionCertificationDomain.test.ts` | PR-13 | Certification decisions |

---

## 4. Quality gate coverage

| Gate | Test evidence |
|------|---------------|
| All flags default OFF | Foundation + infrastructure tests |
| Legacy authoritative | Adapter, certification tests |
| No production routing | Certification `productionActivationProhibited` |
| EventEnvelope stable | Foundation + shadow event tests |
| OrderSDK unchanged | No OrderSDK contract tests modified |
| Version metadata | Foundation + module version assertions |

---

## 5. Verification command

```bash
npm run test:sdk
```

Expected: **1033 passed, 0 failed** (2026-06-27).
