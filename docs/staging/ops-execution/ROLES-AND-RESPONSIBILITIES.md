# Roles and Responsibilities

**Document ID:** BHOS-OPS-ROLES-001

---

## Platform Ops

| Phase | Responsibilities |
|-------|------------------|
| 0 | Pre-deploy validation, artifact verification, G0 sign-off |
| 1 | Terraform apply, module validation, G1 |
| 2 | GKE deploy, Helm releases, smoke tests, G2 |
| 4 | Tenant provisioning, T-0 export, G4 |
| 5 | LaunchDarkly init, flag verification, G5 |
| 6 | Sequential flag enable E1–E14, M1–M9, smoke tests, G6 |
| 7 | Parity samples (4h), checkpoint exports (6h), daily review lead |
| 9 | L1/L2 execution support, evidence upload |
| 10 | Parity report, drift report, evidence assembly |

**Accountability:** Deployment correctness, flag enable discipline, tenant data.

---

## SRE

| Phase | Responsibilities |
|-------|------------------|
| 0 | Security verification support, observability plan review |
| 3 | OTEL, Prometheus, Grafana, Alertmanager deploy, G3 |
| 7 | Hourly health collection, alert response, on-call 24/7 |
| 8 | Failure injection execution and documentation |
| 9 | L1–L4 drill execution, timing measurement, G9 |
| 10 | Replay, lag, operational, rollback reports |

**Accountability:** Observability uptime, incident response, rollback timing, metric integrity.

---

## Platform Architect

| Phase | Responsibilities |
|-------|------------------|
| 0 | Soak authorization sign-off |
| 6 | Approve E12–E14, M7–M9 (adapter/rollout/cert flags) |
| 7 | AMBER gate decisions, soak pause/resume approval |
| 8 | Review failure injection outcomes |
| 10 | Certification report, technical recommendation |

**Accountability:** Gate integrity, no premature adapter wiring, certification accuracy.

---

## ARB (Architecture Review Board)

| Phase | Responsibilities |
|-------|------------------|
| 0 | Authorize EXEC-002 |
| 6 | Witness enable sequence start (optional) |
| 7 | Review daily summaries (async) |
| 10 | Evaluate GO-NO-GO matrix, issue final verdict, production readiness statement |

**Accountability:** Independent certification, production blockers, executive summary.

**ARB does NOT:** Execute deployments, enable flags, or modify code.

---

## Business Sponsor

| Phase | Responsibilities |
|-------|------------------|
| 0 | Budget approval for staging soak month |
| 10 | Business sign-off checklist, accept operational risk for next phase |

**Accountability:** Business acceptance of soak results and spend.

---

## RACI summary

| Activity | Platform Ops | SRE | Architect | ARB | Business |
|----------|:------------:|:---:|:---------:|:---:|:--------:|
| Terraform deploy | R/A | C | I | I | I |
| Flag enable | R/A | C | A (E12+) | I | I |
| 72h soak monitoring | C | R/A | C | I | I |
| Incident response | C | R/A | A (P1) | I | I |
| Rollback drill | C | R/A | C | I | I |
| GO-NO-GO decision | C | C | C | R/A | C |
| Production rollout | I | I | C | A | A |

*R=Responsible, A=Accountable, C=Consulted, I=Informed*
