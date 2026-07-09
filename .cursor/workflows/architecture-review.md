# Architecture Review Workflow

## Owner

Architecture Review Board (ARB)

## When Required

- Every milestone before implementation
- Any change to folder structure, API boundaries, or dependencies
- New product kickoff
- Cross-product integration
- ADR creation or supersession

## Review Process

### 1. Intake

**Inputs:**

- Product Manager milestone template
- Proposed file changes list
- Dependency graph (if new packages)

### 2. Boundary Check

ARB verifies each file against agent ownership:

| Question | Pass Criteria |
|----------|---------------|
| Does UI agent touch OpenAPI? | NO |
| Does OrderBhojan read BhojanOS Firestore? | NO |
| Does change require BDS fork? | NO — ADR to extend BDS |
| Does BhojanOS root `src/` change? | CEO approval required |

### 3. Structure Review

- Feature-first folder layout (`features/<domain>/`)
- Shared code in `lib/`, `hooks/`, `components/` only when cross-feature
- Config in `config/` — not hardcoded in components
- Tests colocated or in `tests/` per product convention

### 4. API Contract Review

For Marketplace API milestones:

- OpenAPI is source of truth
- MSW handlers match OpenAPI
- DTOs generated or hand-maintained consistently
- TanStack Query keys documented
- Error mapping centralized

### 5. ADR Decision

| Trigger | Action |
|---------|--------|
| New dependency | ADR if > bundle budget impact |
| New Firebase project/collection | ADR required |
| Breaking API change | ADR + migration plan |
| New product module | ADR required |

Use [templates/adr-template.md](../templates/adr-template.md).

### 6. Sign-Off

**Outputs:**

- [architecture-report.md](../templates/architecture-report.md)
- GO / NO-GO / GO WITH CONDITIONS
- Assigned implementation agent(s)

## Architecture Rules (Non-Negotiable)

1. **BhojanOS is source of truth** for restaurant operations.
2. **OrderBhojan** uses Marketplace API + `orderbhojan` Firebase — not BhojanOS client Firestore.
3. **BDS v1.0 frozen** — extend via Design System agent + ADR.
4. **One milestone, one domain focus.**
5. **Feature flags OFF by default.**

## Block Conditions

ARB blocks implementation when:

- Ownership boundary violated
- Missing ADR for structural change
- Circular dependency introduced
- Shared state without documented pattern
- Backend changed from UI-only milestone

## Escalation

- Cross-product conflict → CEO
- Security architecture → Security agent consult
- Performance budget exceeded → Performance agent consult

## Checklist

- [ ] Milestone scope fits single domain agent
- [ ] Files Owned matrix documented
- [ ] No BhojanOS modification (or CEO waiver)
- [ ] API/UI separation maintained
- [ ] ADR filed if required
- [ ] Rollback approach identified
- [ ] Implementation agent assigned
