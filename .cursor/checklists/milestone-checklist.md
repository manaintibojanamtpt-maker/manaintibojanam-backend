# Milestone Checklist

**BAEO v1.1** — Copy per milestone · Owner: Product Manager → Release Manager

---

## Phase 0 — Executive Intake

- [ ] CEO milestone GO recorded
- [ ] [Milestone template](../templates/milestone-template.md) filled → `orderbhojan/docs/m<N>/MILESTONE.md`
- [ ] Acceptance criteria defined
- [ ] STOP condition documented
- [ ] Activation recipe selected (UI / Backend / Auth / BDS)
- [ ] Agents to activate listed (not all 20)

## Phase 1 — Review Boards

- [ ] ARB architecture review GO ([architecture-review](../workflows/architecture-review.md))
- [ ] ADR filed if required
- [ ] DRB design review GO — *UI milestones only* ([design-review](../workflows/design-review.md))
- [ ] Experience Evolution brief — *premium UI milestones*
- [ ] Ecosystem Guardian pre-review — *UI milestones*

## Phase 2 — Implementation

- [ ] Only activation-recipe agents invoked
- [ ] Changes within [ownership-matrix](../../docs/ownership-matrix.md)
- [ ] Feature flags OFF by default
- [ ] No BhojanOS changes (unless CEO waiver)
- [ ] No custom BDS primitives in apps

## Phase 3 — Quality (QRB)

- [ ] `npm run lint` PASS
- [ ] `npm run test` PASS
- [ ] `npm run build` PASS
- [ ] `npm run gate:m<N>` PASS (includes regression)
- [ ] Performance smoke PASS
- [ ] Accessibility checklist PASS
- [ ] Security sign-off — *auth/data milestones*
- [ ] Ecosystem Guardian scorecard — *UI milestones*

## Phase 4 — Documentation

- [ ] MIGRATION-NOTES.md
- [ ] ACCEPTANCE-CHECKLIST.md
- [ ] RELEASE-NOTES.md
- [ ] ARCHITECTURE-REPORT.md — *if structural*
- [ ] DESIGN-REVIEW.md — *if UI*
- [ ] ROLLBACK-PLAN.md — *if risky*
- [ ] [Milestone closeout report](../templates/milestone-closeout-report.md)

## Phase 5 — Release

- [ ] PR merged ([pull-request-workflow](../workflows/pull-request-workflow.md))
- [ ] Version bumped in `package.json`
- [ ] Git tag documented
- [ ] Staging verified
- [ ] Release Manager sign-off
- [ ] **STOP** — next milestone blocked pending approval

## Sign-Off

| Role | Agent | Date | GO |
|------|-------|------|-----|
| CEO | 00 | | |
| PM | 01 | | |
| ARB | 02 | | |
| DRB | 03 | | |
| QRB | 17 convenes | | |
| Release Manager | 17 | | |
