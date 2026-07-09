# Milestone Template

> Copy to `orderbhojan/docs/m<N>/MILESTONE.md` (or product-specific docs path).

---

## Milestone ID

`M___` (e.g., M2 Location)

## Title

Short descriptive title

## Status

`DRAFT | ARB REVIEW | DRB REVIEW | IN PROGRESS | GATE REVIEW | COMPLETE | STOPPED`

## Version Target

`0._._-m__` in `orderbhojan/package.json`

## Gate Command

`npm run gate:m__`

## Owner Agents

| Role | Agent |
|------|-------|
| Product | Product Manager |
| Architecture | ARB |
| Design | DRB |
| Implementation | _______________ |
| Testing | Testing |
| Release | Release Manager |

## Problem Statement

What user or business problem does this milestone solve?

## Scope

### In Scope

- 
- 
- 

### Out of Scope

- 
- 
- 

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| M1 Auth | Complete | Required |
| BDS v1.0 | Complete | Required |
| | | |

## Acceptance Criteria

- [ ] Criterion 1 — measurable
- [ ] Criterion 2 — measurable
- [ ] Criterion 3 — measurable

## Files Expected to Change

| Path | Agent | Change Type |
|------|-------|-------------|
| | | |

## API / Backend Impact

- [ ] None (UI-only)
- [ ] OpenAPI change — Marketplace API agent
- [ ] Firebase rules — Firebase agent
- [ ] BhojanOS backend — CEO approval required

## UX / Design Notes

- BDS components:
- Mobile-first considerations:
- Dark mode:
- Mock data vs live API:

## Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| | OFF | |

## Quality Gates

- [ ] TypeScript
- [ ] ESLint
- [ ] Unit tests
- [ ] Milestone gate script
- [ ] Accessibility
- [ ] Performance / bundle
- [ ] Responsive
- [ ] Dark mode
- [ ] Visual review (DRB)
- [ ] Architecture review (ARB)
- [ ] Documentation

## Documentation Deliverables

- [ ] MIGRATION-NOTES.md
- [ ] ACCEPTANCE-CHECKLIST.md
- [ ] ARCHITECTURE-REPORT.md
- [ ] RELEASE-NOTES.md
- [ ] ROLLBACK-PLAN.md (if risky)

## STOP Condition

> After gate pass and release, do not start __________ until __________ approval.

## Risks

| Risk | Mitigation |
|------|------------|
| | |

## Sign-Off

| Role | Name/Agent | Date | GO/NO-GO |
|------|------------|------|----------|
| CEO | | | |
| Product Manager | | | |
| ARB | | | |
| DRB | | | |
| Release Manager | | | |

---

*Template: `.cursor/templates/milestone-template.md`*
