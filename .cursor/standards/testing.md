# Testing Standards

## Philosophy

Tests prove milestone acceptance criteria — not 100% coverage for its own sake.

## Test Pyramid

| Layer | Tool | Owner |
|-------|------|-------|
| Unit | Vitest | Testing agent |
| Component | Vitest + RTL | Testing agent |
| Integration | Vitest + MSW | Testing + Marketplace API |
| E2E | Playwright (when enabled) | Testing agent |
| Visual regression | Playwright screenshots (future) | Testing agent |
| Gate scripts | Node `.mjs` scripts | Testing + Release Manager |

## File Location

```
orderbhojan/tests/           # Cross-feature tests, gate validations
orderbhojan/src/**/*.test.ts # Colocated unit tests (if used)
```

## Naming

```typescript
describe('M1.6 premium experience', () => {
  it('loads experience-premium.css with bds tokens', () => { ... });
});
```

Prefix milestone tests with milestone ID for traceability.

## Gate Scripts

Each milestone may add `scripts/gate-m<N>.mjs`:

- Runs lint, test, build checks
- Validates version string
- Checks required files exist
- Invokes prior milestone gates for regression

Example: `gate:m16` runs m16 + m15 + m1 + m0 checks.

## MSW

- Handlers match OpenAPI schemas
- Disabled in production builds
- Mock data realistic but clearly labeled in docs

## What to Test

| Must Test | Optional |
|-----------|----------|
| Acceptance criteria paths | Edge cases with low risk |
| Auth guards | Pixel-perfect CSS |
| Gate invariants (version, files) | Third-party SDK internals |
| Error mapping | |

## CI

- All tests run on PR via GitHub Actions (DevOps agent)
- Failing test blocks merge

## Coverage

- No hard coverage % gate yet — focus on milestone-critical paths
- Testing agent reports gaps in milestone docs

## Commands

```bash
cd orderbhojan
npm run test          # unit tests
npm run gate:m16      # full milestone gate
```

## Related

- Agent: [agents/13-testing.md](../agents/13-testing.md)
- [reviews/quality-gates.md](../reviews/quality-gates.md)
