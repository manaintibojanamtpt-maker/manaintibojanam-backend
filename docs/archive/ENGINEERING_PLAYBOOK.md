# BhojanOS Engineering Playbook

**Version:** 1.0  
**Status:** ACTIVE  
**Owner:** Chief Architect  
**Effective:** 2026-07-10  
**Audience:** Engineers, reviewers, AI coding agents, future contributors

This is the definitive engineering handbook for the BhojanOS platform. It describes **how engineering operates after the design-system migration** — not the migration itself.

**Companion documents (authoritative; do not duplicate here):**

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE_FREEZE_v1.md](./ARCHITECTURE_FREEZE_v1.md) | Constitutional architecture rules |
| [MIGRATION_GOVERNANCE.md](./MIGRATION_GOVERNANCE.md) | Migration release gates and deliverables |
| [docs/design-system-migration/EXCEPTIONS.md](./docs/design-system-migration/EXCEPTIONS.md) | CI-approved governance exceptions |
| [docs/design-system-migration/RELEASE_READINESS_DASHBOARD.md](./docs/design-system-migration/RELEASE_READINESS_DASHBOARD.md) | Live migration progress |

**Automated enforcement:**

- `npm run validate:architecture` → `scripts/design-system/validate-architecture.mjs`
- `npm run validate:design-system` → `scripts/validate-design-system.mjs`

---

## 1. Engineering philosophy

| Principle | Meaning |
|-----------|---------|
| **Single design system** | One presentation source: `src/design-system`. Founder Store is the visual reference. |
| **Business logic isolation** | Data, rules, and side effects live in applications — never in the design system. |
| **Presentation first** | Shared UI is designed and built in the design system before app wiring. |
| **Architecture before features** | RFC and review precede implementation of shared surfaces. |
| **Quality before speed** | Release gates are mandatory; shortcuts become permanent debt. |
| **Incremental delivery** | Ship thin vertical slices with shims and rollback paths. |
| **Safe rollback** | Every milestone documents how to revert without data loss. |
| **Documentation first** | Mapping and reports precede or accompany code — not afterthoughts. |
| **Automation first** | Validators and CI enforce what prose cannot guarantee. |

---

## 2. Repository ownership

BhojanOS is a monorepo. Logical ownership maps to current paths below. A future `src/apps/*` layout may consolidate apps; ownership rules remain the same.

### `src/design-system/`

| | |
|-|-|
| **Purpose** | Unified presentation: components, tokens, motion, layouts, states |
| **Allowed** | Presentational React components, CSS tokens, view models, adapter exports |
| **Forbidden** | Firestore, hooks, React Query, API clients, routing, business rules |
| **Owner** | Design System / Platform team + Chief Architect review for breaking changes |

### `src/` (Founder Store application)

| | |
|-|-|
| **Purpose** | Founder-facing storefront, SDK orchestration, owner/admin pages co-located today |
| **Allowed** | Pages, hooks, services, domain logic, thin DS consumption, marketing |
| **Forbidden** | New shared buttons/cards/skeletons that duplicate `src/design-system` |
| **Owner** | Founder Store team |

Key sub-areas: `src/pages/`, `src/components/` (legacy — migrate to DS), `src/sdk/`, `src/domain/`, `src/lib/`, `src/hooks/`

### `orderbhojan/`

| | |
|-|-|
| **Purpose** | Customer marketplace application (OrderBhojan) |
| **Allowed** | `features/` (business logic), `presentation/` (DS adapters), routes, MSW mocks |
| **Forbidden** | Duplicate UI primitives; direct Firestore in presentation layer |
| **Owner** | Marketplace experience team |

### Owner surfaces (`src/pages/owner/`, `src/components/owner/`)

| | |
|-|-|
| **Purpose** | Restaurant owner portal UI and workflows |
| **Allowed** | Owner-specific business logic and pages consuming DS |
| **Forbidden** | Forked design tokens or parallel component libraries |
| **Owner** | Owner portal team |

### Admin surfaces (`src/components/admin/`, admin pages)

| | |
|-|-|
| **Purpose** | Internal operations and tenant management |
| **Allowed** | Admin workflows, reporting, DS-backed UI |
| **Forbidden** | Standalone admin design system |
| **Owner** | Platform / ops team |

### Marketing (`src/pages/marketing/`, `src/components/marketing/`)

| | |
|-|-|
| **Purpose** | Public marketing and enterprise landing content |
| **Allowed** | Marketing copy, DS components, static assets |
| **Forbidden** | One-off typography/spacing systems |
| **Owner** | Growth / marketing engineering |

### `packages/design-system/` (BDS — legacy)

| | |
|-|-|
| **Purpose** | Legacy `@bhojan/design-system` — retirement in Phase 7 |
| **Allowed** | Bug fixes for unmigrated surfaces only |
| **Forbidden** | New features; new OrderBhojan presentation imports |
| **Owner** | Platform team (deprecation track) |

### `packages/marketplace-contracts/`

| | |
|-|-|
| **Purpose** | Shared DTOs and API contracts across apps |
| **Allowed** | Versioned schemas, types, contract tests |
| **Forbidden** | UI, presentation, app-specific logic |
| **Owner** | Platform / API team |

### `backend-lib/`, `server.ts`

| | |
|-|-|
| **Purpose** | Server-side marketplace APIs, projections, auth |
| **Allowed** | Express routes, Firebase admin, domain services |
| **Forbidden** | React components, client-side hooks |
| **Owner** | Backend platform team |

### `scripts/`

| | |
|-|-|
| **Purpose** | Validators, gates, seed scripts, CI helpers |
| **Allowed** | `validate-*.mjs`, gate scripts, deployment automation |
| **Forbidden** | Application business logic |
| **Owner** | Platform / DevOps |

### `docs/`

| | |
|-|-|
| **Purpose** | ADRs, migration reports, scorecards, runbooks |
| **Allowed** | Markdown, baselines, governance, onboarding |
| **Forbidden** | Secrets, credentials |
| **Owner** | All teams (docs required per milestone) |

### Tests (`**/__tests__/`, `orderbhojan/tests/`, `scripts/security/`)

| | |
|-|-|
| **Purpose** | Unit, integration, architecture, and gate tests |
| **Allowed** | Behavior tests, contract tests, static structure tests |
| **Forbidden** | Tests that duplicate validators without adding signal |
| **Owner** | Feature team + platform for gate tests |

---

## 3. Design system ownership

### Who may change the design system

| Action | Required approval |
|--------|-------------------|
| **Create** component | RFC + Chief Architect (shared) / DS lead (app-specific adapter) |
| **Modify** (non-breaking) | PR + design system reviewer + validators PASS |
| **Modify** (breaking) | RFC + Chief Architect + consumer impact assessment |
| **Deprecate** | Migration plan + shim period documented |
| **Delete** | Phase 7 cleanup only — all consumers migrated |
| **Rename / move** | Same as breaking change; update barrels and consumers |

### Applications may never own

Buttons · Cards · Layouts · Typography · Navigation · Skeletons · Glass · Motion · Tokens

These belong **exclusively** to `src/design-system`.

Applications may own **presentation adapters** (`orderbhojan/src/presentation/`) that map DTOs to DS view models — not alternate UI libraries.

Import pattern:

```
@bhojan/storefront-design-system/<module>/<Component>
```

See [ARCHITECTURE_FREEZE_v1.md](./ARCHITECTURE_FREEZE_v1.md) §3 for import rules.

---

## 4. Business logic ownership

The following are **application-owned** and must **never** appear in `src/design-system`:

| Domain | Typical location |
|--------|------------------|
| Firestore / repositories | `src/lib/`, `backend-lib/`, `features/*/infrastructure/` |
| React Query | `features/*/hooks/`, app providers |
| Hooks (data & behavior) | `src/hooks/`, `orderbhojan/src/features/**/hooks/` |
| Services | `src/services/`, `features/*/application/` |
| API clients | `marketplace-api/`, `src/lib/*Api.ts` |
| Routing | `AppRouter`, route pages |
| Authentication | Auth providers, guards, token handling |
| Marketplace / restaurant / checkout engines | `features/*/engine/`, `src/domain/` |
| Tracking, recommendation, pricing, inventory | `src/sdk/`, `src/domain/` |
| Analytics & telemetry | `orderbhojan/src/telemetry/`, observability libs |
| Realtime | Socket providers, subscription hooks |
| Feature flags | `featureFlags/` |

The design system accepts **view models and callbacks** only.

---

## 5. Component lifecycle

Every **shared** component follows:

```
Idea
  ↓
RFC (problem, API, consumers, a11y, performance)
  ↓
Architecture review
  ↓
Prototype (Founder Store reference or Figma)
  ↓
Accessibility review
  ↓
Performance review (bundle, render cost)
  ↓
Implementation in src/design-system
  ↓
Testing (unit + visual + a11y spot-check)
  ↓
Documentation (barrel export, migration note if replacing legacy)
  ↓
Release (semver / milestone gate)
  ↓
Maintenance
  ↓
Deprecation (announce + shim)
  ↓
Removal (Phase 7+ after all consumers migrated)
```

App-local components that do **not** duplicate DS capability may skip RFC but still require PR review.

---

## 6. Pull request checklist

Every PR touching UI or shared architecture must verify:

- [ ] Uses `src/design-system` (no duplicate UI)
- [ ] No hardcoded colors / spacing / radius / shadows / typography where tokens exist
- [ ] No business logic moved into `src/design-system`
- [ ] `npm run build` passes (relevant app)
- [ ] `npm run lint` passes (no new errors; debt documented)
- [ ] Typecheck passes
- [ ] `npm run validate:architecture` passes
- [ ] `npm run validate:design-system` passes
- [ ] Accessibility reviewed (keyboard, ARIA, contrast, reduced motion)
- [ ] Performance reviewed if bundle or hot path changed
- [ ] Rollback documented if milestone-level change
- [ ] [Release dashboard](./docs/design-system-migration/RELEASE_READINESS_DASHBOARD.md) updated if milestone complete
- [ ] Scorecard updated if milestone complete (`docs/design-system-migration/scorecards/`)

Full gate definitions: [MIGRATION_GOVERNANCE.md](./MIGRATION_GOVERNANCE.md) § Release gates.

---

## 7. Code review checklist

Reviewers evaluate:

| Area | Questions |
|------|-----------|
| **Architecture** | Correct layer? DS import paths? No logic leak? |
| **Maintainability** | Clear naming? Minimal scope? Matches conventions? |
| **Accessibility** | Roles, labels, focus, touch targets, motion |
| **Performance** | Bundle impact? Lazy loading? Unnecessary re-renders? |
| **Testing** | Gate tests updated? Critical paths covered? |
| **API stability** | Breaking DS or contract changes documented? |
| **Design consistency** | Matches Founder Store patterns? |
| **Documentation** | Mapping/report updated for migrations? |
| **Rollback** | Shim or revert path exists? |
| **Technical debt** | New debt recorded in area `TECHNICAL_DEBT.md`? |

Reject PRs that violate [ARCHITECTURE_FREEZE_v1.md](./ARCHITECTURE_FREEZE_v1.md) or introduce unapproved exceptions.

---

## 8. RFC process

**No new shared presentation component** may enter `src/design-system` without:

1. **RFC** — markdown in `docs/adr/` or `docs/design-system-migration/` describing problem, API, alternatives
2. **Review** — architecture + design system owners
3. **Prototype** — visual reference (Founder Store or approved mock)
4. **Approval** — Chief Architect for cross-app components
5. **Implementation** — in `src/design-system` only
6. **Validation** — validators + tests PASS
7. **Documentation** — export via barrel, update `COMPONENT_INDEX.md` if applicable
8. **Release** — included in milestone or semver note

RFC template minimum: title, motivation, proposed API, consumers, a11y notes, rollback, timeline.

---

## 9. Release process

```
Development
  ↓
Architecture review (if shared UI or cross-cutting)
  ↓
Feature complete (all gates PASS)
  ↓
Regression (visual, a11y, performance, unit)
  ↓
Release candidate (branch/tag, changelog)
  ↓
Production approval (Chief Architect for migration milestones)
  ↓
Production deploy
  ↓
Monitoring (errors, performance, analytics)
  ↓
Post-release review (scorecard, dashboard, debt)
```

OrderBhojan milestone gates: `orderbhojan/scripts/gate-px2.mjs` (and successors).

---

## 10. Incident process

```
Production issue detected
  ↓
Detection (monitoring, user report, CI)
  ↓
Rollback if user-facing (prefer shim revert over hotfix UI fork)
  ↓
Incident report (timeline, impact, owner)
  ↓
Root cause analysis
  ↓
Architecture review (was governance bypassed?)
  ↓
Regression test (prevent recurrence)
  ↓
Prevent recurrence (validator rule, doc update, exception expiry)
```

UI incidents must not introduce **duplicate components** as permanent fixes. Fix in DS or revert presentation adapter.

---

## 11. Technical debt

### Recording

- **Migration debt:** area `docs/design-system-migration/phase6/*/TECHNICAL_DEBT.md`
- **Product debt:** team backlog with link to code/shim
- **Pre-existing lint/build debt:** documented in scorecards; must not grow

### Prioritization

1. Blocks rollback or release gates  
2. Security or data integrity  
3. User-visible correctness  
4. Developer velocity (duplicate UI, missing tokens)  
5. Cleanup (Phase 7)

### Retirement

Debt is retired when: migrated to DS, shim removed, validator green, scorecard updated. Deletion of legacy assets only after [MIGRATION_GOVERNANCE.md](./MIGRATION_GOVERNANCE.md) rollback policy conditions met.

---

## 12. Exception process

When a governance rule **cannot** be followed, do **not** bypass CI silently.

**Authoritative registry:** [docs/design-system-migration/EXCEPTIONS.md](./docs/design-system-migration/EXCEPTIONS.md)

Each exception requires:

| Field | Description |
|-------|-------------|
| Business justification | Why the product needs this temporary deviation |
| Technical justification | Why DS/tokens cannot satisfy yet |
| Risk assessment | Blast radius if wrong |
| Rollback plan | How to revert |
| Expiration date | Exceptions are time-boxed |
| Chief Architect approval | Recorded in EXCEPTIONS.md |
| CI validation | Listed in machine JSON registry; `validate-design-system.mjs` waives only listed items |

Expired exceptions **fail CI** until renewed or remediated.

---

## 13. Design system evolution

| Event | Process |
|-------|---------|
| **New component** | RFC → implement in `src/design-system` → barrel export → consumer adapters |
| **Evolve existing** | Non-breaking: PR + review. Breaking: RFC + migration note |
| **Deprecate** | Mark in code + `TECHNICAL_DEBT.md`; provide shim |
| **Remove shim** | Phase 7; all imports migrated; gates PASS |
| **Token changes** | Update `src/design-system/tokens/`; visual regression on Founder + OrderBhojan |
| **Major version** | Architecture freeze bump (`ARCHITECTURE_FREEZE_v2.md`); coordinated release |

BDS (`packages/design-system/`) retirement tracked in release dashboard — no new consumers.

---

## 14. Quality standards

Minimum standards for merged work:

| Standard | Target |
|----------|--------|
| **Accessibility** | WCAG 2.1 AA intent; keyboard navigable; screen reader labels on interactive controls |
| **Performance (Lighthouse)** | ≥ 90 performance on migrated surfaces (spot-check) |
| **Bundle size** | No > 1% main-chunk gzip increase without approval |
| **Architecture score** | `validate-architecture.mjs` PASS |
| **Design system compliance** | `validate-design-system.mjs` PASS |
| **Type safety** | `tsc --noEmit` PASS |
| **Test coverage** | Gate tests PASS; critical domain logic unit tested |
| **Documentation** | Milestone deliverables complete when applicable |

Milestone minimum score: **95%** on scorecards ([MIGRATION_GOVERNANCE.md](./MIGRATION_GOVERNANCE.md)).

---

## 15. CI/CD quality gates

| Gate | Command / artifact |
|------|---------------------|
| Build | `npm run build` (root / `orderbhojan`) |
| Lint | `npm run lint` |
| Typecheck | Included in build or explicit `tsc --noEmit` |
| Architecture | `npm run validate:architecture` |
| Design system | `npm run validate:design-system` |
| Visual regression | Baselines in `docs/design-system-migration/baselines/` |
| Accessibility | `ACCESSIBILITY_REPORT.md` per milestone |
| Performance | `*_PERFORMANCE_REPORT.md` per milestone |
| Release dashboard | `npm run validate:release-dashboard` |
| Scorecards | `docs/design-system-migration/scorecards/*.md` |
| Exception validation | Automatic via `EXCEPTIONS.md` registry |

**CI must fail** on validator violations unless covered by an active, non-expired exception.

Wired in `orderbhojan/scripts/gate-px2.mjs` for OrderBhojan releases.

---

## 16. AI development guidelines

AI coding agents (Cursor, Cloud Agents, etc.) **must**:

| Rule | Detail |
|------|--------|
| Use `src/design-system` | Import via `@bhojan/storefront-design-system/...` |
| Never duplicate UI | No new cards/buttons/skeletons in app folders |
| Never move business logic | No Firestore/hooks/engines into DS |
| Never bypass validators | Fix root cause or request exception via EXCEPTIONS.md |
| Always update documentation | Mapping, reports, debt for milestone work |
| Always generate rollback plans | For presentation migrations |
| Always update scorecards | When completing a milestone |
| Always update release dashboard | `npm run validate:release-dashboard` |
| Always preserve architecture | Read ARCHITECTURE_FREEZE + this playbook first |
| Stop at milestone boundaries | Do not begin next scope without Chief Architect approval |

Agents should read [MIGRATION_GOVERNANCE.md](./MIGRATION_GOVERNANCE.md) Definition of Done before declaring a milestone complete.

---

## 17. Project roadmap

Current status: see [Release Readiness Dashboard](./docs/design-system-migration/RELEASE_READINESS_DASHBOARD.md).

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 6 — Shell | OrderBhojan app shell | ✅ Complete |
| Phase 6 — Discovery | Home, listing, search, UX states | ✅ Complete |
| Phase 6 — Restaurant | Shell, menu, customization, UX states | ✅ Complete |
| Phase 6 — Checkout | Cart, checkout presentation | ⏳ Not started |
| Phase 6 — Orders | Order history, detail | ⏳ Not started |
| Phase 6 — Tracking | Live order tracking | ⏳ Not started |
| Phase 6 — Profile | Customer profile, auth UI | ⏳ Not started |
| Phase 6 — Authentication | Auth flows polish | ⏳ Not started |
| Phase 7 — Cleanup | Remove shims, BDS, orphaned CSS | ⏳ Blocked on Phase 6 |
| BDS retirement | `packages/design-system/` | ⏳ Phase 7 |
| Legacy cleanup | `src/components/` duplicates | ⏳ Phase 7 |
| Production rollout | Full OB production-ready | ⏳ After checkout/orders/tracking |

Do not start a new row until prior milestone passes all release gates and receives Chief Architect approval.

---

## 18. Architecture principles (summary)

| Pillar | Document |
|--------|----------|
| **Architecture freeze** | [ARCHITECTURE_FREEZE_v1.md](./ARCHITECTURE_FREEZE_v1.md) — single DS, logic isolation, import rules |
| **Migration governance** | [MIGRATION_GOVERNANCE.md](./MIGRATION_GOVERNANCE.md) — gates, deliverables, definition of done |
| **Exception policy** | [EXCEPTIONS.md](./docs/design-system-migration/EXCEPTIONS.md) — time-boxed CI waivers |
| **Engineering standards** | This playbook — day-to-day engineering workflow |
| **Release gates** | Build, lint, typecheck, validators, visual, a11y, performance |
| **Quality gates** | Scorecards ≥ 95%; dashboard updated per milestone |
| **Definition of done** | [MIGRATION_GOVERNANCE.md](./MIGRATION_GOVERNANCE.md) — complete checklist before next milestone |

---

## Amendment

Changes to this playbook require Chief Architect approval and a version bump (`ENGINEERING_PLAYBOOK.md` header).

---

*BhojanOS — one design system, application-owned logic, architecture-first delivery.*
