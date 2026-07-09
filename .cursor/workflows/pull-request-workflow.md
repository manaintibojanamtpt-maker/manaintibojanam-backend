# Pull Request Workflow

## Purpose

Standardize how BAEO agents submit, review, and merge changes without crossing ownership boundaries.

## Before Opening a PR

1. Confirm milestone scope with Product Manager.
2. Verify all changes stay within agent **Files Owned**.
3. Run applicable quality gate locally.
4. Produce required documentation artifacts.

## PR Title Format

```
[milestone-id] Short description

Examples:
[M1.6] Premium experience visual layer
[M1] Customer authentication with Firebase
[BAEO] Establish release manager agent
```

## PR Description Template

```markdown
## Milestone
M1.6 — Premium Experience

## Agent
OrderBhojan UI + Experience Evolution (visual only)

## Summary
- What changed (2–4 bullets)

## Files Owned (verified)
- orderbhojan/src/features/experience/**
- orderbhojan/src/styles/experience-premium.css

## Quality Gates
- [ ] npm run gate:m16 — PASS
- [ ] TypeScript — PASS
- [ ] ESLint — PASS
- [ ] Tests — PASS (47 unit)
- [ ] Accessibility — PASS
- [ ] Performance — PASS (bundle ≤ limit)
- [ ] Dark mode — PASS
- [ ] Responsive — PASS

## Documentation
- [ ] MIGRATION-NOTES.md
- [ ] ACCEPTANCE-CHECKLIST.md
- [ ] Architecture report (if structural)

## STOP Condition
Do not start M2 until DRB/ARB approval.

## Reviewers (by domain)
- ARB — if folder/API boundaries changed
- DRB — if UI/UX changed
- Testing — if gates changed
- Release Manager — always for milestone PRs
```

## Review Routing

| Change Type | Required Reviewers |
|-------------|-------------------|
| UI / UX | DRB, Accessibility, OrderBhojan UI |
| API / OpenAPI | ARB, Marketplace API |
| Auth / Firebase | ARB, Authentication, Firebase, Security |
| BDS | DRB, Design System |
| CI / deploy | DevOps, Release Manager |
| Docs only | Documentation, Product Manager |

## Review Checklist (Reviewer)

- [ ] Scope matches milestone template
- [ ] No files outside **Files Owned** modified
- [ ] No BhojanOS changes (unless explicitly scoped)
- [ ] BDS used — no custom primitives
- [ ] Feature flags default OFF
- [ ] Tests cover new behavior
- [ ] Docs updated
- [ ] No secrets committed

## Merge Policy

1. All required reviewers approve (or waive via CEO for doc-only BAEO changes).
2. CI green.
3. Release Manager confirms gate pass on branch.
4. Squash merge preferred for milestone PRs.
5. Release Manager tags version post-merge (milestone releases).

## Post-Merge

1. Documentation agent verifies docs on main.
2. DevOps deploys to staging (if applicable).
3. Release Manager publishes release notes.
4. **STOP** — next milestone awaits approval.

## Hotfix Exception

See [playbooks/hotfix.md](../playbooks/hotfix.md) — abbreviated review with Security + Release Manager mandatory sign-off.
