# Definition of Done

## Purpose

A milestone is **DONE** only when all criteria below are satisfied. Release Manager enforces this before tag and deploy.

## Milestone Definition of Done

### 1. Scope

- [ ] All acceptance criteria in milestone template checked
- [ ] No out-of-scope work included (or CEO-approved scope expansion documented)
- [ ] STOP condition documented and communicated

### 2. Code Quality

- [ ] TypeScript compiles with no errors
- [ ] ESLint passes with no new warnings (or waived in writing)
- [ ] Code stays within agent **Files Owned** boundaries
- [ ] No commented-out dead code
- [ ] No secrets in diff

### 3. Testing

- [ ] Unit tests pass
- [ ] New behavior covered by tests where applicable
- [ ] Milestone gate script passes: `npm run gate:m<N>`
- [ ] Prior milestone regression gates pass (embedded in gate script)

### 4. UI / UX (if UI milestone)

- [ ] BDS components only — no custom primitives
- [ ] Mobile-first responsive verified
- [ ] Dark mode verified
- [ ] DRB design review approved
- [ ] Empty, loading, and error states implemented per design review

### 5. Performance

- [ ] Production build succeeds
- [ ] Bundle size within budget (Performance agent)
- [ ] No known CLS regressions from this milestone

### 6. Accessibility

- [ ] WCAG AA checklist completed
- [ ] Keyboard navigation works on new flows
- [ ] Reduced motion respected for animations

### 7. Security (if auth/data milestone)

- [ ] Security agent sign-off
- [ ] Firestore rules reviewed (if changed)
- [ ] npm audit critical findings resolved or waived

### 8. Architecture

- [ ] ARB architecture review GO
- [ ] ADR filed if required
- [ ] No unauthorized BhojanOS modifications
- [ ] API/UI separation maintained

### 9. Documentation

- [ ] MIGRATION-NOTES.md
- [ ] ACCEPTANCE-CHECKLIST.md
- [ ] RELEASE-NOTES.md
- [ ] ARCHITECTURE-REPORT.md (structural milestones)
- [ ] DESIGN-REVIEW.md (UI milestones)
- [ ] ROLLBACK-PLAN.md (risky milestones)

### 10. Release

- [ ] Version bumped in `package.json`
- [ ] PR merged following [pull-request-workflow.md](../workflows/pull-request-workflow.md)
- [ ] Git tag documented
- [ ] Staging verified (if deploy applicable)
- [ ] Release Manager final GO

## Bug Fix Definition of Done

- [ ] Bug reproduced and root cause documented
- [ ] Minimal fix applied
- [ ] Regression test added
- [ ] Full latest gate passes
- [ ] PR reviewed by owning agent

## Hotfix Definition of Done

- [ ] Incident declared by Release Manager
- [ ] Security review (if applicable)
- [ ] Deployed and monitored
- [ ] Post-mortem scheduled within 48 hours
- [ ] Backported to main

## BAEO Infrastructure Definition of Done

- [ ] No application code modified (unless explicitly scoped)
- [ ] Agent docs contain all required sections
- [ ] Workflows reference correct paths
- [ ] CEO approval for organization changes

## Not Done Until

> **Explicit approval for the next milestone is received.**

Completed milestone status = `COMPLETE — STOPPED — AWAITING APPROVAL`

## Quick Reference — OrderBhojan M1.6 Example

```
M1.6 Premium Experience — DONE when:

✓ gate:m16 pass (includes m15, m1, m0)
✓ 47+ unit tests pass
✓ Bundle ≤ 1500 KB
✓ experience-premium.css + BDS tokens
✓ docs/m16/ pack complete
✓ Version 0.3.6-m16
✓ Release Manager sign-off
✓ STOP — no M2 until approved
```

---

*Owned by Release Manager. Gates detail: [quality-gates.md](quality-gates.md).*
