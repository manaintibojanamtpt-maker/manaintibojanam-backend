# GO / NO-GO Decision Matrix

**Document ID:** BHOS-OPS-GONOGO-001  
**Execution ID:** EXEC-002  
**Use at:** Phase 10 — ARB final decision

---

## Verdict definitions

| Verdict | Meaning | Production action |
|---------|---------|-------------------|
| **READY** | All gates pass; soak evidence sufficient | Proceed to prod Stage-0 **planning** (separate ARB) |
| **CONDITIONAL** | One AMBER dimension with approved mitigation | Deferred prod; re-verify mitigations in 30 days |
| **NOT_READY** | Any RED gate or insufficient evidence | Re-soak required; production blocked |

---

## Infrastructure gates (Phases 0–5)

| Gate | Metric | READY | CONDITIONAL | NOT_READY |
|------|--------|-------|-------------|-----------|
| G1 Terraform | Apply success | Exit 0 | — | Failed |
| G2 Services | Deployments Available | 100% | 1 pod flapping <1h | Any down >1h |
| G3 Observability | Prometheus targets UP | 100% | 1 target missing <4h | Blind >4h |
| G4 Tenants | Provisioned | 10/10 | 9/10 with plan | <9 |
| G5 Flags | Staging init | 23/23 OFF default | — | Any prod ON |

---

## Enable gates (Phase 6)

| Gate | Metric | READY | CONDITIONAL | NOT_READY |
|------|--------|-------|-------------|-----------|
| Enable completion | Steps E1–E14, M1–M9 | 100% smoke pass | 1 AMBER smoke with fix | Any RED stop |
| E9 parity | Initial match rate | ≥99% | 97–99% | <97% |
| M4 parity | Initial match rate | ≥99% | 97–99% | <97% |
| Control tenants | Legacy reads | 100% pass | — | Any fail |

---

## Soak gates (Phase 7 — rolling 72h)

### Order projection (M6)

| Metric | READY | CONDITIONAL | NOT_READY |
|--------|-------|-------------|-----------|
| Parity % | ≥ **99.9** | **97.0 – 99.9** | **< 97.0** |
| Soak health score | ≥ **99.0%** | **95.0 – 99.0%** | **< 95.0%** |
| Max lag | ≤ **30s** | **30s – 5min** | **> 5min** |
| Replay success | ≥ **99.0%** | **95.0 – 99.0%** | **< 95.0%** |
| Worker uptime | ≥ **99.5%** | **99.0 – 99.5%** | **< 99.0%** |
| Duplicate events | ≤ **0.5%** | **0.5 – 1.0%** | **> 1.0%** |
| Dropped events | ≤ **0.1%** | **0.1 – 0.5%** | **> 0.5%** |
| Checkpoint age | ≤ **60s** | **60s – 5min** | **> 5min** |

### Menu projection (M7)

| Metric | READY | CONDITIONAL | NOT_READY |
|--------|-------|-------------|-----------|
| Parity % | ≥ **99.9** | **97.0 – 99.9** | **< 97.0** |
| Critical drift count | **0** | **1 – 2** | **> 2** |
| Max lag | ≤ **30s** | **30s – 5min** | **> 5min** |
| Replay success | ≥ **99.0%** | **95.0 – 99.0%** | **< 95.0%** |
| Worker uptime | ≥ **99.0%** | **95.0 – 99.0%** | **< 95.0%** |

### Program-level soak

| Metric | READY | CONDITIONAL | NOT_READY |
|--------|-------|-------------|-----------|
| Continuous soak duration | ≥ **72h** | **≥60h** with approved pause | **< 60h** |
| Parity samples collected | ≥ **18** | **12 – 17** | **< 12** |
| Hourly health exports | ≥ **72** | **60 – 71** | **< 60** |
| Prod spine flags enabled | **0** entire period | — | **> 0** |
| P1 incidents unresolved | **0** | **0** with closed RCA | **≥ 1** open |

---

## Rollback gates (Phase 9)

| Level | READY | CONDITIONAL | NOT_READY |
|-------|-------|-------------|-----------|
| L1 recovery | **< 60s** | **60 – 120s** | **> 120s** |
| L2 recovery | **< 5min** | **5 – 10min** | **> 10min** |
| L3 recovery | **< 15min** | **15 – 30min** | **> 30min** |
| L4 recovery | **< 60min** | **60 – 90min** | **> 90min** |
| Post-rollback parity | ≥ **99%** | **97 – 99%** | **< 97%** |
| Post-rollback test:sdk | **1033/1033** | — | **< 1033** |

---

## Failure injection gates (Phase 8)

| Metric | READY | CONDITIONAL | NOT_READY |
|--------|-------|-------------|-----------|
| Scenarios executed | ≥ **7/9** | **5 – 6/9** | **< 5/9** |
| Data loss incidents | **0** | — | **≥ 1** |
| Unrecoverable corruption | **0** | — | **≥ 1** |

---

## Evidence gates (Phase 10)

| Artifact | READY | NOT_READY |
|----------|-------|-----------|
| All reports populated | Observed metrics, no N/A | Placeholder N/A |
| GCS evidence package | Complete EXEC-002 tree | Missing ≥2 categories |
| Business sign-off | Signed | Unsigned |
| Rollback drill report | L1–L4 timed | Missing L1 |

---

## Composite decision logic

```
IF any NOT_READY gate → NOT_READY
ELSE IF any CONDITIONAL gate AND mitigation approved → CONDITIONAL
ELSE IF all READY gates → READY
ELSE → NOT_READY (insufficient evidence)
```

### Production blockers (remain until READY)

- [ ] 72h soak not executed with evidence
- [ ] Parity below cert minimum (99%) without mitigation
- [ ] L1 rollback not timed
- [ ] Prod spine flag ON during program
- [ ] Adapter not wired (by design — separate ADR)

---

## Decision record template

| Field | Value |
|-------|-------|
| Execution ID | EXEC-002 |
| Decision date | |
| Composite verdict | READY / CONDITIONAL / NOT_READY |
| RED gates triggered | |
| CONDITIONAL mitigations | |
| ARB Chair signature | |
| Next action | |
