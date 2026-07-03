# Event Risk Assessment v1.0

**Status:** Frozen — M6 PR-14  
**Date:** 2026-06-27  
**Overall risk level:** **LOW** (flags OFF, legacy authoritative)

---

## 1. Risk matrix

| ID | Risk | Likelihood | Impact | Level | Mitigation |
|----|------|------------|--------|-------|------------|
| R1 | Accidental production flag enable | Low | High | Medium | All OFF; L1 rollback < 1 min |
| R2 | Adapter wired prematurely | Low | High | Medium | Not wired; separate ADR |
| R3 | Order projection parity failure | Medium | Medium | Medium | PR-8 parity; legacy authoritative |
| R4 | Projection lag / drift | Medium | Medium | Medium | PR-10 operational validation |
| R5 | EventEnvelope drift | Low | Critical | Low | ADR-019 frozen |
| R6 | OrderSDK regression | Low | Critical | Low | ADR-013; no OrderSDK changes |
| R7 | Cross-platform impact (M7) | Low | High | Low | No Menu changes in PR-14 |
| R8 | Firestore migration complexity | High | High | High | Deferred to future ADR |
| R9 | Certification bypass | Low | Critical | Medium | `productionActivationProhibited` |

---

## 2. PR-14 specific risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Version test assertion drift | Low | Updated 9 test files |
| Accidental scope creep | Medium | Metadata + docs only |
| Frozen platform modification | Low | Diff limited to events/version + docs |

**PR-14 overall: LOW**

---

## 3. Prerequisites before production activation

1. ADR-024 accepted ✅
2. PR-14 metadata promotion ✅
3. 72-hour staging soak
4. PR-13 certification `READY` or `CONDITIONAL`
5. Observability dashboards
6. L1 + L2 rollback drill
7. OrderSDK → adapter wiring ADR
8. Explicit ARB production approval

---

## 4. Risk acceptance (v1.0 freeze)

All risks mitigated to Low or acceptable Medium with flags OFF. No production activation in this release.
