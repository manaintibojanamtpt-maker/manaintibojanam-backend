# BAEO Review Boards

**Version:** 1.1.0  
**Purpose:** Formal review authority — boards approve; agents implement or audit.

---

## Board Summary

| Board | ID | Chair Agent | Scope | Never |
|-------|-----|-------------|-------|-------|
| Architecture Review Board | **ARB** | 02 Architecture Review Board | Structure, APIs, dependencies, ADRs, ownership | Modify UI |
| Design Review Board | **DRB** | 03 Design Review Board | UX, UI, typography, spacing, dark mode, brand | Change backend |
| Quality Review Board | **QRB** | 17 Release Manager (convenes) | Tests, performance, accessibility, security gates | Build features |
| Emergency Review Board | **ERB** | 17 Release Manager + 16 Security | P0 hotfix scope and deploy | Expand hotfix scope |

Workflow references: [.cursor/workflows/](../.cursor/workflows/)

---

## ARB — Architecture Review Board

### Mission

Protect system integrity, module boundaries, and long-term maintainability.

### Reviews

- Folder structure and ownership compliance
- API contract changes (OpenAPI, Firebase schema)
- Dependency additions and bundle impact
- ADR approval and supersession
- Cross-product integration points
- BhojanOS modification requests

### Process

See [.cursor/workflows/architecture-review.md](../.cursor/workflows/architecture-review.md)

### Outputs

- GO / NO-GO / GO WITH CONDITIONS
- [Architecture report](../.cursor/templates/architecture-report.md)
- ADR when structural

### Members (Agent Roles)

| Role | Agent |
|------|-------|
| Chair | 02 ARB |
| Consult | 08 Marketplace API, 09 Firebase, 19 Ecosystem Guardian |
| Escalation | 00 CEO |

---

## DRB — Design Review Board

### Mission

Ensure food-first, mobile-first, BDS-compliant experiences aligned with Mana Inti Bojanam lineage.

### Reviews

- UX flows and wireframe intent
- BDS component usage (no custom primitives)
- Responsive and dark mode plans
- Motion intent (handoff to Motion agent)
- Brand warmth and visual hierarchy
- Accessibility intent (handoff to Accessibility agent)

### Process

See [.cursor/workflows/design-review.md](../.cursor/workflows/design-review.md)

### Outputs

- GO / NO-GO / GO WITH CONDITIONS
- [Design review](../.cursor/templates/design-review.md)
- BDS gap list for Design System agent

### Members (Agent Roles)

| Role | Agent |
|------|-------|
| Chair | 03 DRB |
| Consult | 18 Experience Evolution, 19 Ecosystem Guardian, 04 Design System |
| Escalation | 00 CEO |

---

## QRB — Quality Review Board

### Mission

Collective quality gate — no release without QRB sign-off.

### Reviews

| Domain | Lead Agent | Exit Doc |
|--------|------------|----------|
| Testing | 13 Testing | Test report, gate pass log |
| Performance | 10 Performance | PERFORMANCE-REPORT.md |
| Accessibility | 11 Accessibility | ACCESSIBILITY-REPORT.md |
| Security | 16 Security | SECURITY sign-off (auth/data milestones) |

### Process

1. Testing agent runs automated gates.
2. Performance + Accessibility run smokes in parallel.
3. Security reviews if milestone touches auth, Firebase, payments, or dependencies.
4. Release Manager (chair) consolidates QRB checklist.
5. Block release on any failed mandatory gate.

### Outputs

- QRB consolidated sign-off in milestone ACCEPTANCE-CHECKLIST.md
- Reference [milestone-quality-matrix.md](milestone-quality-matrix.md)

### Members (Agent Roles)

| Role | Agent |
|------|-------|
| Chair | 17 Release Manager |
| Members | 13 Testing, 10 Performance, 11 Accessibility, 16 Security |
| Escalation | 02 ARB (if architectural blocker), 00 CEO (P0) |

---

## ERB — Emergency Review Board

### Mission

Fast-track **P0 production incidents** with minimal scope and mandatory security oversight.

### Triggers

- Production down or data integrity risk
- Auth bypass or secret exposure
- Payment flow broken (future)
- Critical security CVE in production dependency

### Process

1. Release Manager declares ERB session.
2. Security agent mandatory for auth/data/API hotfixes.
3. Single domain agent assigned — no parallel fixes.
4. Abbreviated gate: lint, test, latest regression gate.
5. Deploy with rollback plan active.
6. Post-mortem within 48h (Documentation agent).

See [.cursor/playbooks/hotfix.md](../.cursor/playbooks/hotfix.md)

### Outputs

- ERB GO/NO-GO (time-boxed: target < 4h to deploy)
- Incident log
- Post-mortem scheduled

### Members (Agent Roles)

| Role | Agent |
|------|-------|
| Chair | 17 Release Manager |
| Required | 16 Security |
| Implementer | One domain agent (ARB assigns) |
| Deploy | 15 DevOps |
| Escalation | 00 CEO (customer comms) |

---

## Board Interaction Matrix

| Milestone Type | ARB | DRB | QRB | ERB |
|----------------|-----|-----|-----|-----|
| UI feature | Required | Required | Required | — |
| Backend API | Required | — | Required | — |
| Auth / Firebase | Required | Optional | Required + Security | — |
| BDS extension | Required | Required | Required | — |
| Docs-only BAEO | Optional | — | — | — |
| P0 hotfix | Consult | — | Abbreviated | **Required** |

---

## Sign-Off Storage

Board approvals recorded in:

- Milestone `MILESTONE.md` sign-off table ([template](../.cursor/templates/milestone-template.md))
- PR description checklist ([pull-request-workflow](../.cursor/workflows/pull-request-workflow.md))
- `orderbhojan/docs/m<N>/ACCEPTANCE-CHECKLIST.md`

---

*BAEO v1.1 — Review boards do not implement; they approve or block.*
