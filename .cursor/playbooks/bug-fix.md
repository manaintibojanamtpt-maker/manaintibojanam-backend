# Playbook — Bug Fix

## When to Use

Defect in shipped code — not a new feature milestone.

## Severity

| Level | Response | Approval |
|-------|----------|----------|
| P0 — production down / data loss | Hotfix playbook | Security + Release Manager |
| P1 — major feature broken | Bug fix, expedited PR | Release Manager |
| P2 — minor UI/logic issue | Normal PR | Domain agent review |
| P3 — cosmetic | Batch with next milestone | Product Manager |

## Steps

### 1. Triage (Product Manager + Domain Agent)

- Reproduce bug
- Identify owning agent by file boundary
- Confirm not a scope change disguised as bug fix

### 2. Fix (Domain Agent)

- Minimal diff — fix root cause only
- Add regression test
- Stay within **Files Owned**

### 3. Verify

```bash
npm run lint && npm run test && npm run build
npm run gate:m<latest>   # full regression
```

### 4. PR

Title: `[bugfix] Short description`

Include:

- Root cause
- Fix summary
- Regression test added

### 5. Release

- Patch version bump if customer-facing: `0.3.6-m16.1` or semver patch per Release Manager
- Release notes entry required for P0/P1

## Escalation

- Auth/security bug → Security agent review mandatory
- Cross-product bug → ARB assigns agent
- Cannot reproduce → Documentation agent updates known issues

## Do Not

- Refactor surrounding code
- Expand scope to "while we're here"
- Skip regression gate for OrderBhojan
