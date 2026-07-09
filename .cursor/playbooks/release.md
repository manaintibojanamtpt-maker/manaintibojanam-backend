# Playbook — Release

## When to Use

Milestone complete — all implementation and reviews done.

## Owner

Release Manager (primary); DevOps (deploy execution).

## Pre-Flight

- [ ] All [quality-gates.md](../reviews/quality-gates.md) pass
- [ ] [definition-of-done.md](../reviews/definition-of-done.md) satisfied
- [ ] Documentation pack complete
- [ ] Security sign-off (if applicable)
- [ ] DRB + ARB approvals on record

## Steps

### 1. Final Gate Run

```bash
cd orderbhojan
npm run gate:m<N>
```

Capture output in PR or release ticket.

### 2. Version Bump

Update `package.json` version to `{semver}-{milestone}`.

### 3. Release Notes

Fill [templates/release-notes.md](../templates/release-notes.md).

### 4. PR Merge

Follow [pull-request-workflow.md](../workflows/pull-request-workflow.md).

### 5. Tag

Document tag name for human operator:

```
orderbhojan-v0.3.6-m16
```

### 6. Deploy Staging → Production

Per [workflows/release-process.md](../workflows/release-process.md).

### 7. Verify Production

- Smoke test critical paths
- Auth flow (guest + login)
- No console errors on home

### 8. Announce STOP

Update milestone doc status: **COMPLETE — AWAITING NEXT APPROVAL**

## Rollback Trigger

- Error rate spike
- Auth broken
- Bundle fails to load

Activate ROLLBACK-PLAN.md → redeploy previous tag.

## Checklist Copy-Paste

```
Release: M____ v________

[ ] gate:m<N> PASS
[ ] lint PASS
[ ] test PASS
[ ] build PASS
[ ] bundle size PASS
[ ] a11y checklist PASS
[ ] dark mode PASS
[ ] responsive PASS
[ ] docs pack complete
[ ] security sign-off
[ ] PR merged
[ ] tag created
[ ] staging verified
[ ] prod deployed (if applicable)
[ ] STOP communicated
```
