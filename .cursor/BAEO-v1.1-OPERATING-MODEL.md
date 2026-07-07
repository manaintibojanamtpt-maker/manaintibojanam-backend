# BAEO v1.1 — Operational Framework

**Version:** 1.1.0  
**Status:** ACTIVE  
**Effective:** 2026-06-26  
**Supersedes:** BAEO v1.0 (documentation-only phase)

---

## Purpose

Convert BAEO from static documentation into an **executable operating model**. Every future milestone is executed by **AI teams** (departments + agents), not a single general assistant.

## Operating Principles

1. **Every agent owns something** — one file, one owner.
2. **No shared ownership** — consult, do not co-own.
3. **No duplicate ownership** — Ecosystem Guardian audits cross-product only.
4. **One file → one owner → one review board.**
5. **Activate only required agents** — never all 20 at once.

---

## Department Structure

### Executive Board

| Agent | Role | Mission |
|-------|------|---------|
| 00 CEO | Strategy | Vision, roadmap, milestone GO/STOP |
| 01 Product Manager | Planning | Milestones, acceptance criteria, prioritization |
| 02 Architecture Review Board (ARB) | Architecture | Boundaries, ADRs, folder structure |
| 03 Design Review Board (DRB) | UX/UI | BDS compliance, brand, accessibility intent |

**Never implement code.**

### Product Engineering

| Agent | Domain |
|-------|--------|
| 04 Design System | `packages/design-system/` |
| 05 OrderBhojan UI | OrderBhojan screens, layouts, experience CSS |
| 06 Authentication | Firebase Auth, protected routes, profile bootstrap |
| 07 Location Platform | GPS, maps, addresses, delivery zones (dormant until M2) |
| 08 Marketplace API | OpenAPI, MSW, DTOs, TanStack Query client |
| 09 Firebase | Firestore, rules, indexes, storage, functions |
| 18 Experience Evolution | Mana Inti → BDS → OrderBhojan visual lineage |
| 19 Ecosystem Guardian | Cross-product consistency (review-only) |

**Build features within ownership boundaries.**

### Quality Engineering

| Agent | Domain |
|-------|--------|
| 13 Testing | Unit, integration, gate scripts, Playwright |
| 10 Performance | Lighthouse, bundle size, lazy loading |
| 11 Accessibility | WCAG AA, keyboard, screen readers |
| 16 Security | OWASP, secrets, auth hardening |

**Review before release. Never own feature implementation.**

Quality Review Board (QRB) = collective sign-off from agents 10, 11, 13, 16.

### Platform Engineering

| Agent | Domain |
|-------|--------|
| 15 DevOps | GitHub Actions, CI/CD, deploy configs |
| 14 Documentation | ADRs, reports, release notes, guides |
| 17 Release Manager | Versioning, gates, tags, rollback orchestration |
| 12 Motion | Animations, transitions (implementation support for UI milestones) |

**Deployment, versioning, reports, release trains.**

---

## Milestone Execution Pipeline

```
Executive Board (CEO → PM → ARB → DRB if UI)
        ↓
Implementation Team (domain agents only — see activation recipes)
        ↓
Quality Engineering (Testing → Performance → Accessibility → Security)
        ↓
Documentation → Release Manager → GitHub
        ↓
STOP — await next milestone approval
```

Full workflow: [workflows/milestone-workflow.md](workflows/milestone-workflow.md)

---

## Implementation Team Activation Recipes

### UI Milestone (e.g., M1.5, M1.6, future discovery UI)

```
DRB → Experience Evolution → Design System (consult)
  → OrderBhojan UI → Motion → Accessibility
  → Performance → Testing → Documentation → Release Manager
```

Optional consult: Ecosystem Guardian (cross-product visual audit)

### Backend Milestone (e.g., Marketplace API, Firebase rules)

```
ARB → Marketplace API + Firebase (as scoped)
  → Testing → Security → Documentation → Release Manager
```

### Auth Milestone

```
ARB → Authentication → Firebase (rules review)
  → Security → Testing → Documentation → Release Manager
```

### BDS Milestone

```
DRB → ARB → Design System
  → Testing → Accessibility → Performance → Documentation → Release Manager
```

### Hotfix

```
ERB (Emergency Review Board) → Domain agent → Security
  → Testing → Release Manager → DevOps
```

See [playbooks/hotfix.md](playbooks/hotfix.md) and [checklists/hotfix-checklist.md](checklists/hotfix-checklist.md).

---

## Review Boards

| Board | ID | Scope | Doc |
|-------|-----|-------|-----|
| Architecture Review Board | ARB | Structure, APIs, dependencies | [docs/review-boards.md](../docs/review-boards.md) |
| Design Review Board | DRB | UX, UI, BDS, brand | [docs/review-boards.md](../docs/review-boards.md) |
| Quality Review Board | QRB | Tests, perf, a11y, security | [docs/review-boards.md](../docs/review-boards.md) |
| Emergency Review Board | ERB | P0 hotfix approval | [docs/review-boards.md](../docs/review-boards.md) |

---

## Governance Artifacts (v1.1)

| Artifact | Location |
|----------|----------|
| Ownership matrix | [docs/ownership-matrix.md](../docs/ownership-matrix.md) |
| Milestone quality matrix | [docs/milestone-quality-matrix.md](../docs/milestone-quality-matrix.md) |
| Escalation matrix | [docs/escalation-matrix.md](../docs/escalation-matrix.md) |
| RACI matrix | [docs/raci-matrix.md](../docs/raci-matrix.md) |
| Decision matrix | [docs/decision-matrix.md](../docs/decision-matrix.md) |

---

## Project Governance — Required Milestone Deliverables

Every milestone must produce:

| Deliverable | Owner | Reviewer |
|-------------|-------|----------|
| Architecture Review | ARB | CEO (if cross-product) |
| Design Review | DRB | Experience Evolution (UI) |
| QA Review | Testing | QRB |
| Performance Review | Performance | QRB |
| Accessibility Review | Accessibility | QRB |
| Release Review | Release Manager | CEO (major releases) |

---

## Success Metrics (Per Milestone Report)

Release Manager collects in milestone closeout:

| Metric | Source Agent |
|--------|--------------|
| Build | DevOps / Testing |
| Tests (pass/fail count) | Testing |
| Coverage (if tracked) | Testing |
| Performance (Lighthouse, bundle KB) | Performance |
| Accessibility (WCAG checklist) | Accessibility |
| Visual consistency | DRB + Experience Evolution |
| Bundle size delta | Performance |
| Design consistency / BDS compliance | Ecosystem Guardian |
| Cross-product consistency | Ecosystem Guardian |

Template: [templates/milestone-closeout-report.md](templates/milestone-closeout-report.md)

---

## Agent Activation Protocol

Future Cursor prompts **must activate agents explicitly**, not ask one AI to do everything.

### Prompt Template

```
BAEO ACTIVE — Milestone M___

Executive: CEO (scope confirm) → Product Manager (acceptance criteria)
Review: ARB [+ DRB if UI]
Implementation: [list agents from activation recipe]
Quality: Testing → Performance → Accessibility → [Security if auth/data]
Platform: Documentation → Release Manager

Follow agent files in .cursor/agents/
Checklists: .cursor/checklists/
STOP after gate pass.
```

### Rules

1. Load only agents listed in the activation recipe.
2. Each agent step produces its **Outputs** (see agent file).
3. Release Manager is the only agent that declares milestone COMPLETE.
4. Ecosystem Guardian runs on UI milestones before DRB final sign-off.

---

## Activation Status

**BAEO v1.1 is ACTIVE.**

- v1.0 infrastructure preserved — not regenerated.
- Application code unchanged by this activation milestone.
- Next work must use department/agent activation, not monolithic implementation.

---

*Executive AI Operating Board — Bhojan AI Engineering Organization*
