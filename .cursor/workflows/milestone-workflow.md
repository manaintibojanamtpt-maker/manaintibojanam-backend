# Milestone Workflow

## Overview

Every Bhojan milestone follows the same pipeline. No implementation begins without CEO + Product Manager scope approval.

```
CEO
 ↓
Product Manager (milestone spec + acceptance criteria)
 ↓
Architecture Review Board (scope, boundaries, ADR if needed)
 ↓
Design Review Board (UX intent, BDS compliance)
 ↓
Implementation Agent (domain-specific, ONE milestone)
 ↓
Testing (unit + gate scripts)
 ↓
Performance Review
 ↓
Accessibility Review
 ↓
Documentation (migration, architecture, acceptance)
 ↓
Release Manager (quality gates, version, tag)
 ↓
GitHub (PR merge / deploy)
 ↓
STOP — await approval for next milestone
```

## Phase 0 — Intake (CEO + Product Manager)

| Step | Owner | Artifact |
|------|-------|----------|
| 0.1 | CEO | Milestone priority GO/NO-GO |
| 0.2 | Product Manager | [milestone-template.md](../templates/milestone-template.md) filled |
| 0.3 | Product Manager | Acceptance criteria + STOP condition defined |

**Exit criteria:** Milestone ID assigned (e.g., M2), scope bounded, dependencies listed.

## Phase 1 — Architecture Review

| Step | Owner | Artifact |
|------|-------|----------|
| 1.1 | ARB | Scope vs ownership matrix |
| 1.2 | ARB | ADR if structural change ([adr-template.md](../templates/adr-template.md)) |
| 1.3 | ARB | [architecture-report.md](../templates/architecture-report.md) draft |

**Blockers:** Cross-product impact without CEO waiver; UI agent changing API; BhojanOS modification without approval.

See [architecture-review.md](architecture-review.md).

## Phase 2 — Design Review

| Step | Owner | Artifact |
|------|-------|----------|
| 2.1 | DRB | UX intent sign-off |
| 2.2 | Experience Evolution | Visual brief (if premium UX milestone) |
| 2.3 | DRB | [design-review.md](../templates/design-review.md) |

**Blockers:** Custom UI primitives outside BDS; brand inconsistency; missing dark mode plan.

See [design-review.md](design-review.md).

## Phase 3 — Implementation

| Step | Owner | Rules |
|------|-------|-------|
| 3.1 | Domain agent | Modify **Files Owned** only |
| 3.2 | Domain agent | Feature flags OFF by default |
| 3.3 | Domain agent | No drive-by refactors |

**Primary agents by domain:**

| Domain | Agent |
|--------|-------|
| Screens / layout | OrderBhojan UI |
| Auth | Authentication |
| Location | Location Platform |
| API client | Marketplace API |
| Firebase | Firebase |
| BDS | Design System |
| Motion | Motion |

## Phase 4 — Quality Reviews (Parallel OK)

| Review | Agent | Required Output |
|--------|-------|-----------------|
| Testing | Testing | Tests + gate script pass |
| Performance | Performance | Lighthouse/smoke pass |
| Accessibility | Accessibility | WCAG AA checklist |
| Security | Security | Sign-off for auth/data changes |

## Phase 5 — Documentation

| Step | Owner | Artifact |
|------|-------|----------|
| 5.1 | Documentation | MIGRATION-NOTES.md |
| 5.2 | Documentation | ACCEPTANCE-CHECKLIST.md |
| 5.3 | Documentation | ROLLBACK-PLAN.md (if risky) |

## Phase 6 — Release

| Step | Owner | Artifact |
|------|-------|----------|
| 6.1 | Release Manager | All [quality-gates.md](../reviews/quality-gates.md) pass |
| 6.2 | Release Manager | Version bump + [release-notes.md](../templates/release-notes.md) |
| 6.3 | DevOps | CI green, deploy to staging |
| 6.4 | Release Manager | STOP communicated |

See [release-process.md](release-process.md).

## Milestone Naming

| Pattern | Example |
|---------|---------|
| Major | M0, M1, M2 |
| Sub-milestone | M1.5, M1.6 |
| Version tag | `0.3.6-m16` in `orderbhojan/package.json` |
| Gate script | `gate:m16` |

## STOP Condition (Mandatory)

After Release Manager signs off:

1. Do **not** start the next milestone.
2. Document completion in milestone folder.
3. Await CEO + DRB/ARB approval for next scope.

## Escalation During Milestone

| Issue | Escalate To |
|-------|-------------|
| Scope creep | Product Manager → CEO |
| Architecture violation | ARB |
| UX regression | DRB |
| Gate failure | Release Manager → owning agent |
| Security finding | Security → Release Manager (block release) |
