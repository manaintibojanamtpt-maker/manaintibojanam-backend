# BAEO Escalation Matrix

**Version:** 1.1.0  
**Scope:** AI agent organization — product engineering milestones  
**Note:** BhojanOS staging/production ops escalation remains in [staging/ops-execution/ESCALATION-MATRIX.md](staging/ops-execution/ESCALATION-MATRIX.md)

---

## Priority Definitions

| Priority | Definition | Example |
|----------|------------|---------|
| **P0** | Production down, data loss, auth bypass, secret leak | Firebase rules open to world |
| **P1** | Major feature broken, release blocker, security high | Login broken on staging |
| **P2** | Minor feature defect, gate failure, non-customer-facing | ESLint regression |
| **P3** | Cosmetic, docs typo, backlog item | Spacing inconsistency |

---

## Escalation Matrix

| Priority | Responsible Agent | Review Board | Expected SLA | Escalate To |
|----------|-------------------|--------------|--------------|-------------|
| **P0** | Domain agent (ARB assigns) | **ERB** | Response 30m · Mitigate 4h | CEO + Security + Release Manager |
| **P1** | Owning agent per [ownership-matrix.md](ownership-matrix.md) | **QRB** | Response 2h · Fix 24h | Release Manager → ARB |
| **P2** | Owning agent | Domain reviewer | Response 8h · Fix 48h | Product Manager |
| **P3** | Owning agent | — | Next milestone | Product Manager backlog |

---

## By Issue Type

| Issue Type | L1 Agent | L2 Review Board | L3 | SLA |
|------------|----------|-----------------|-----|-----|
| Scope ambiguity | Product Manager (01) | CEO (00) | — | 4h |
| Architecture conflict | ARB (02) | CEO (00) | — | 24h |
| UX / brand conflict | DRB (03) | Experience Evolution (18) | CEO | 24h |
| Cross-product inconsistency | Ecosystem Guardian (19) | DRB (03) | CEO | 24h |
| Gate failure (test) | Testing (13) | QRB | Release Manager | 24h |
| Gate failure (perf) | Performance (10) | QRB | ARB if architectural | 24h |
| Gate failure (a11y) | Accessibility (11) | DRB | QRB | 24h |
| Security finding | Security (16) | ERB if P0 | CEO | P0: 1h · P1: 24h |
| Deploy failure | DevOps (15) | Release Manager (17) | ERB if prod | 2h |
| Missing docs | Documentation (14) | Release Manager | — | 24h |
| Ownership dispute | ARB (02) | CEO (00) | — | 24h |

---

## ERB Activation (P0 Only)

| Step | Owner | Time |
|------|-------|------|
| Declare incident | Release Manager | T+0 |
| Assign single fix agent | ARB | T+15m |
| Security review | Security | T+30m |
| Fix + abbreviated gate | Domain + Testing | T+4h |
| Deploy + monitor | DevOps | T+4h |
| Post-mortem scheduled | Documentation | T+48h |

---

## De-Escalation Criteria

Resume normal milestone flow when:

1. Root cause documented
2. Applicable gate passes
3. QRB or ERB sign-off recorded
4. Rollback plan no longer active (if was activated)

---

## Human Stakeholder Notify

| Priority | Notify |
|----------|--------|
| P0 | CEO + Release Manager + Security |
| P1 | Product Manager + Release Manager |
| P2 | Product Manager |
| P3 | Backlog only |

---

*BAEO v1.1 — Agents escalate; boards decide; CEO resolves L4+ conflicts.*
