# M6 PR-13 — Projection Read Switch Certification Report

**Program:** BHOS-M6-A  
**PR:** M6 PR-13 — Projection Read Switch Certification  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval  
**Certification Version:** `0.1.0-projection-switch-certification`

---

## 1. Executive Summary

M6 PR-13 introduces a **projection read switch certification engine** that evaluates operational evidence and produces a readiness assessment and decision package. Certification statuses are `READY`, `CONDITIONAL`, or `NOT_READY`.

**This PR does not switch production routing.** OrderSDK, the adapter layer, rollout engine, and projection runtime are **unchanged**. `FF_ORDER_PROJECTION_CERTIFICATION_ENABLED` defaults **OFF**. Legacy remains the authoritative read path until M6 PR-14 production activation.

---

## 2. Architecture

```
Operational Evidence (parity, ops, rollout, replay, soak, drift)
      ↓
Certification Engine (ProjectionSwitchCertification)
      ↓
Switch Readiness Assessment
      ↓
Decision Package (GO / CONDITIONAL GO / NO GO)
      ↓
STOP — no production activation
```

---

## 3. Evidence Sources

| Source | Evidence Type |
|--------|---------------|
| Projection parity reports | `ParityCertificationEvidence` |
| Operational validation | `OperationalValidationEvidence` |
| Rollout metrics | `RolloutMetricsEvidence` |
| Rollback statistics | `RollbackStatisticsEvidence` |
| Projection health | `ProjectionHealthEvidence` |
| Projection lag | `ProjectionLagEvidence` |
| Replay validation | `ReplayValidationEvidence` |
| Staging soak | `StagingSoakEvidence` |
| Drift detection | `DriftEvidence` |
| Governance | `GovernanceEvidence` (ARB approval, production approval state) |

---

## 4. Readiness Rules

### READY requires all of:

| Gate | Requirement |
|------|-------------|
| Feature flag | `FF_ORDER_PROJECTION_CERTIFICATION_ENABLED` ON |
| Parity | Certified + `parityPercent ≥ 99%` |
| Operational | `health === GREEN` |
| Staging soak | Complete + `≥ 72 hours` |
| Replay | `replaySuccessPercent ≥ 99%` |
| Rollback rate | `≤ 2%` |
| Projection lag | `maximumLagMs ≤ 5000ms` |
| Drift | `unresolvedCriticalCount === 0` |
| ARB approval | `arbApprovalRecorded === true` |
| Repository | `repositoryHealthy === true` |
| Production approval | `manualProductionApprovalGranted === false` (pending) |

### CONDITIONAL

Borderline evidence — partial gate failures with recoverable blockers.

### NOT_READY

Critical gate failures — legacy remains authoritative.

---

## 5. Certification Matrix

| Flag | Parity | Ops | Soak | Replay | Rollback | Lag | Drift | ARB | Status |
|------|--------|-----|------|--------|----------|-----|-------|-----|--------|
| OFF | * | * | * | * | * | * | * | * | NOT_READY |
| ON | Not certified | * | * | * | * | * | * | * | NOT_READY |
| ON | Certified | RED | * | * | * | * | * | * | NOT_READY |
| ON | Certified | GREEN | Incomplete | * | * | * | * | * | NOT_READY |
| ON | Certified | GREEN | Complete | Fail | * | * | * | * | NOT_READY |
| ON | All pass | GREEN | Complete | Pass | Pass | Pass | 0 | Yes | READY |

---

## 6. Go / No-Go

| Status | Go/No-Go | Recommendation |
|--------|----------|----------------|
| READY | GO | Certification READY; await explicit production activation (PR-14) |
| CONDITIONAL | CONDITIONAL GO | Investigate blockers before activation |
| NOT_READY | NO GO | Legacy remains authoritative |

**Decision package always sets:**
- `legacyAuthoritative: true`
- `productionActivationProhibited: true`

---

## 7. Telemetry

| Event | When |
|-------|------|
| `projection_certification_started` | Certification begins |
| `projection_certification_completed` | Certification completes |
| `projection_certification_failed` | Evidence/report/save failure |
| `projection_certification_ready` | Status READY |
| `projection_certification_not_ready` | Status NOT_READY |

---

## 8. Feature Flags

| Flag | Default | Env Key | Purpose |
|------|---------|---------|---------|
| `FF_ORDER_PROJECTION_CERTIFICATION_ENABLED` | OFF | `VITE_FF_ORDER_PROJECTION_CERTIFICATION_ENABLED` | Enable certification evaluation |

---

## 9. Generated Files

### SDK — `src/sdk/order/certification/`

| File | Purpose |
|------|---------|
| `ProjectionSwitchCertification.ts` | Certification orchestrator |
| `ProjectionCertificationEvaluator.ts` | Evaluation and persistence |
| `ProjectionCertificationEvidence.ts` | Evidence collector + healthy defaults |
| `ProjectionCertificationReport.ts` | Report and assessment generator |
| `ProjectionCertificationTelemetry.ts` | Telemetry hooks |
| `ProjectionCertificationFactory.ts` | `createProjectionCertificationInfrastructure()` |
| `InMemoryProjectionCertificationRepository.ts` | In-memory certification store |
| `projectionCertificationPorts.ts` | Port contracts |
| `certificationFeatureFlags.ts` | Certification flag |
| `README.md` | Module documentation |

### Domain — `src/domain/order/certification/`

| File | Purpose |
|------|---------|
| `ProjectionReadinessRules.ts` | Pure readiness evaluation |
| `ProjectionCertificationStatus.ts` | Status and decision package types |
| `ProjectionCertificationEvidence.ts` | Evidence bundle types |
| `ProjectionCertificationMetadata.ts` | Constants and block reasons |
| `ProjectionCertificationThresholds.ts` | Configurable thresholds |
| `README.md` | Domain documentation |

### Ports

| Port | Responsibility |
|------|----------------|
| `ProjectionCertificationRepositoryPort` | Persist certification records |
| `ProjectionCertificationEvidencePort` | Collect evidence bundle |
| `ProjectionCertificationReportPort` | Generate reports and assessments |

---

## 10. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental production switch | Certification only; no routing changes |
| False READY signal | Multi-source evidence gates + ARB approval required |
| Premature activation | `productionActivationProhibited: true` on all decision packages |
| Incomplete soak | 72-hour minimum enforced |
| Drift regression | Critical drift blocks READY |

---

## 11. Rollback

Certification has **no runtime effect**. Rollback is inherent:

1. Flag defaults OFF — no certification evaluation in production
2. Decision package always prohibits activation
3. Legacy path unchanged — disabling certification has zero routing impact

---

## 12. Migration Plan

1. **PR-13 (this PR):** Certification engine — evidence, evaluation, decision package
2. **Evidence collection:** Wire evidence ports to parity/ops/soak reports in staging (future integration)
3. **ARB review:** Present decision package for Architecture Review Board approval
4. **PR-14:** Production projection activation (explicitly prohibited until certification READY + business sign-off)

---

## 13. Definition of Ready

- [x] M6 PR-12 Controlled Projection Rollout complete
- [x] Parity certification framework available (PR-9)
- [x] Operational validation framework available (PR-10)
- [x] 763/763 baseline tests passing before PR-13
- [x] No frozen SDK modifications

---

## 14. Definition of Done

- [x] Certification engine exists
- [x] Readiness report generated
- [x] Decision package generated
- [x] Feature flag default OFF
- [x] Telemetry events defined and emitted
- [x] Mock-only deterministic tests
- [x] No OrderSDK changes
- [x] No adapter changes
- [x] No rollout engine changes
- [x] No production switch
- [x] Documentation complete

---

## 15. Certification Checklist

| Check | Status |
|-------|--------|
| OrderSDK public API unchanged | ✅ |
| Adapter layer unchanged | ✅ |
| Rollout engine unchanged | ✅ |
| Projection runtime unchanged | ✅ |
| Business events unchanged | ✅ |
| Presentation unchanged | ✅ |
| Certification flag default OFF | ✅ |
| Legacy remains authoritative | ✅ |
| Production activation prohibited | ✅ |
| PR-14 not started | ✅ |

---

## 16. STOP — PR-14 Prohibited

Production activation remains **prohibited** until:

- Certification status = READY
- 72-hour soak evidence accepted
- ARB approval recorded
- Explicit production rollout approval
- Business owner sign-off

**Legacy remains the authoritative read path until PR-14.**
