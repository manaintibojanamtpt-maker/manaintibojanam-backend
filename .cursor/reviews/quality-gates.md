# Quality Gates

## Purpose

Every milestone and release must pass these gates before Release Manager sign-off.

## Universal Gates (All Products)

| Gate | Command / Check | Owner | Blocks Release |
|------|-----------------|-------|----------------|
| TypeScript | `tsc --noEmit` or build | Implementation | Yes |
| ESLint | `npm run lint` | Implementation | Yes |
| Unit tests | `npm run test` | Testing | Yes |
| No secrets | Manual / git diff | Security | Yes |
| Agent boundary | PR review | ARB | Yes |

## OrderBhojan Gates

| Gate | Command | Owner | Notes |
|------|---------|-------|-------|
| Build | `npm run build` | DevOps | Production bundle |
| Milestone gate | `npm run gate:m<N>` | Release Manager | Includes regression |
| M0 regression | inside gate scripts | Testing | Foundation |
| M1 auth regression | inside gate scripts | Authentication | |
| M1.5 shell regression | `gate:m15` chain | OrderBhojan UI | |
| M1.6 premium regression | `gate:m16` chain | Experience Evolution | |
| Bundle size | `performance-smoke.mjs` | Performance | ≤ 1500 KB JS |
| React dedupe | vite.config.ts review | Performance | No invalid hook calls |

## UI / UX Gates

| Gate | Check | Owner |
|------|-------|-------|
| BDS compliance | No custom primitives | DRB |
| Responsive | 375px, 768px, 1024px | DRB |
| Dark mode | Both themes functional | DRB |
| Visual review | DESIGN-REVIEW.md approved | DRB |
| Accessibility | WCAG AA checklist | Accessibility |
| Reduced motion | `prefers-reduced-motion` | Motion + Accessibility |

## Architecture Gates

| Gate | Check | Owner |
|------|-------|-------|
| Scope match | Milestone template | Product Manager |
| Files Owned | PR diff review | ARB |
| No BhojanOS drift | No root `src/` changes | ARB |
| API boundary | UI not changing OpenAPI | ARB |
| ADR | Present if structural | ARB |

## Security Gates (When Applicable)

| Gate | Check | Owner |
|------|-------|-------|
| npm audit | No critical open | Security |
| Auth review | Login/guard flows | Security |
| Firestore rules | Least privilege | Firebase + Security |
| MSW disabled | Production build | Marketplace API |

## Documentation Gates

| Gate | Artifact | Owner |
|------|----------|-------|
| Migration | MIGRATION-NOTES.md | Documentation |
| Acceptance | ACCEPTANCE-CHECKLIST.md | Documentation |
| Architecture | ARCHITECTURE-REPORT.md | Documentation |
| Release notes | RELEASE-NOTES.md | Documentation |
| Rollback | ROLLBACK-PLAN.md (if risky) | Documentation |

## BDS Gates

| Gate | Command | Owner |
|------|---------|-------|
| BDS gate | `npm run gate:bds` | Design System |
| Version frozen | v1.0 unless ADR | Design System |

## Gate Execution Order

```
lint → test → build → performance-smoke → gate:m<N> → manual reviews
```

## Failure Handling

| Failure | Action |
|---------|--------|
| Lint/test | Implementation agent fixes |
| Bundle size | Performance agent consult |
| A11y | Accessibility + OrderBhojan UI |
| Architecture | ARB blocks merge |
| Missing docs | Documentation agent — Release Manager blocks |

## Regression Policy

New milestone gates **must** invoke prior milestone gates:

- `gate:m16` → includes m15, m1, m0
- Never remove regression without ARB + Release Manager approval

## Sign-Off Matrix

| Gate Category | Sign-Off Agent |
|---------------|----------------|
| Automated | Release Manager (on CI green) |
| Visual | DRB |
| Architecture | ARB |
| Security | Security |
| Documentation | Documentation |
| Final release | Release Manager |

---

*Enforced by Release Manager. See [definition-of-done.md](definition-of-done.md).*
