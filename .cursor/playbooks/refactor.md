# Playbook — Refactor

## When to Use

Improve structure, readability, or performance **without changing user-visible behavior**.

## Approval Required

- **ARB** — always (folder moves, renames, dependency changes)
- **Product Manager** — confirm not scope creep
- **Testing** — confirm regression coverage before/after

## Not a Refactor

These require **new-feature** playbook:

- New user-facing capability
- API contract change
- New Firebase collection
- BDS component addition

## Steps

### 1. Proposal

Document in ADR or short architecture note:

- Motivation
- Files affected
- Risk assessment
- Rollback plan

### 2. Baseline

```bash
npm run test && npm run gate:m<latest>
```

All green before touching code.

### 3. Execute

- Small commits within single PR
- No behavior change — verify with existing tests
- Update imports if files move
- Stay within agent boundaries or get ARB waiver

### 4. Verify

- All existing tests pass unchanged (unless test improvement)
- Gate pass
- No bundle size regression > 5% without Performance approval

### 5. Document

- Update architecture docs if structure changed
- MIGRATION-NOTES if import paths affect other agents

## Forbidden During Refactor

- Mixing feature work
- Modifying BhojanOS + OrderBhojan in same PR
- Disabling tests to make green

## Success Criteria

- Same acceptance criteria as before refactor
- Improved maintainability metric (document qualitatively)
- Zero P1/P2 bugs introduced within 7 days
