# BhojanOS Migration Governance

**Version:** 1.0  
**Status:** ACTIVE  
**Owner:** Chief Architect  
**Related:** [ARCHITECTURE_FREEZE_v1.md](./ARCHITECTURE_FREEZE_v1.md) · [EXCEPTIONS.md](./docs/design-system-migration/EXCEPTIONS.md)

**Applies to:**

- Founder Store
- OrderBhojan
- Owner Portal
- Admin Portal
- Future BhojanOS Applications

---

## Purpose

This document defines the mandatory engineering governance for the BhojanOS Unified Design System migration.

Its purpose is to guarantee that:

- only one Design System exists
- business logic remains isolated
- UI consistency is preserved
- regressions are prevented
- migrations remain reversible
- production stability is maintained

This document is mandatory for every migration milestone.

---

## Architecture principles

### Single design system

The only source of presentation components is `src/design-system`.

Applications may never create their own design system.

Founder Store is the visual source of truth.

### Business logic isolation

Business logic belongs inside applications.

The following must **never** move into `src/design-system`:

- Firestore
- Repositories
- Hooks
- React Query
- Services
- API Clients
- Authentication
- Routing
- Marketplace Engine
- Pricing Engine
- Recommendation Engine
- Inventory Engine
- Analytics
- Telemetry
- Realtime

### Design system responsibilities

The design system owns only:

- Presentation, components, tokens, typography, spacing
- Layouts, cards, buttons, skeletons, glass, motion
- Responsive layout, accessibility, animations
- Empty states, loading states, error states

---

## Release gates

Every migration milestone **must pass all gates**. A milestone is **not complete** until every gate passes.

| Gate | Requirement | Command |
|------|-------------|---------|
| Build | PASS | `npm run build` |
| Lint | PASS — no new errors; document pre-existing debt | `npm run lint` |
| Type safety | PASS | `npm run typecheck` (or `tsc --noEmit` in orderbhojan build) |
| Architecture | PASS | `npm run validate:architecture` |
| Design system | PASS | `npm run validate:design-system` |
| Visual regression | PASS — desktop, tablet, mobile; Founder Store comparison | Manual + baselines |
| Accessibility | PASS — keyboard, ARIA, screen readers, focus, contrast, reduced motion, touch targets | Static + spot-check |
| Performance | PASS — bundle size, render time, CLS, animation, memory, tree-shaking, lazy loading | Performance report |

---

## Required deliverables

Every milestone must include:

| Deliverable | Pattern |
|-------------|---------|
| Component mapping | `<Component>_COMPONENT_MAPPING.md` |
| Migration report | `<Component>_MIGRATION_REPORT.md` or `_PRESENTATION_REPORT.md` |
| Visual regression | `<Component>_VISUAL_REGRESSION.md` |
| Performance | `<Component>_PERFORMANCE_REPORT.md` |
| Accessibility | `ACCESSIBILITY_REPORT.md` |
| Rollback plan | `ROLLBACK_PLAN.md` |
| Technical debt | `TECHNICAL_DEBT.md` |
| Scorecard | `docs/design-system-migration/scorecards/` |
| Release dashboard | `docs/design-system-migration/RELEASE_READINESS_DASHBOARD.md` |

Store migration docs under `docs/design-system-migration/phase6/<area>/`.

Regenerate dashboard: `npm run validate:release-dashboard`

---

## Rollback policy

The following **may not be deleted** until **all** conditions are true:

- Legacy components
- BDS components
- Compatibility shims
- Experience CSS
- Duplicate UI, old layouts, old cards, old buttons

**Conditions:**

1. Entire feature migration completed
2. All release gates passed
3. Rollback verified
4. Chief Architect approval granted
5. Production validation complete

Only then may Phase 7 cleanup begin.

Shims during migration must:

- Re-export presentation adapters only
- Contain zero business logic
- Be listed in `TECHNICAL_DEBT.md`

---

## Exception process

When a governance rule **genuinely cannot be followed**, engineers must **not** bypass CI silently.

Every exception must be recorded in [docs/design-system-migration/EXCEPTIONS.md](./docs/design-system-migration/EXCEPTIONS.md) and include:

1. **Exception ID** (e.g. `EX-001`)
2. **Business justification**
3. **Technical justification**
4. **Risk assessment**
5. **Rollback plan**
6. **Expected expiration date**
7. **Chief Architect approval** (date + name/role)
8. **Violation type** (matches CI prefix, e.g. `HARDCODED_COLOR`, `BDS_IN_PRESENTATION`)
9. **Scope** (file path or glob)

**Rules:**

- Temporary workarounds without an exception record are **prohibited**.
- Expired exceptions **fail CI** until renewed or remediated.
- CI allows violations **only** when an active, non-expired exception is explicitly listed in `EXCEPTIONS.md` (machine registry block).
- Removing an exception requires remediation, not deletion of the audit trail — mark status `resolved`.

---

## CI enforcement

CI **must fail** if any of the following occur (unless covered by an approved exception):

| Violation | Validator |
|-----------|-----------|
| New presentation components outside `src/design-system` | `validate-design-system.mjs` |
| Legacy BDS presentation imported into new presentation code | `validate-design-system.mjs` |
| Duplicate presentation components detected | `validate-design-system.mjs` |
| Deep imports bypassing public design-system exports | `validate-architecture.mjs`, `validate-design-system.mjs` |
| Hardcoded colors, spacing, radius, shadows, typography, motion when tokens exist | `validate-design-system.mjs` |
| Architecture validation failure | `validate-architecture.mjs` |
| Design system validation failure | `validate-design-system.mjs` |
| Circular dependency involving `src/design-system` | `validate-design-system.mjs` |
| Broken public API exports | `validate-architecture.mjs` |

**Import examples:**

- BAD: `src/design-system/buttons/Button` (deep internal path)
- GOOD: `@bhojan/storefront-design-system/primitives/SoftButton`

Wired in `orderbhojan/scripts/gate-px2.mjs` after production build.

---

## Repository rules

- Every presentation component must import from `src/design-system` (via `@bhojan/storefront-design-system/<module>/<Component>`).
- Never import from `src/components` unless using an approved compatibility shim or exception.
- Business logic remains inside application folders only.
- Applications may never own buttons, cards, typography, layouts, navigation, skeletons, glass, tokens, or animations — these belong only to `src/design-system`.

---

## Migration workflow

Every feature follows:

```
Audit
  ↓
Component Mapping
  ↓
Presentation Migration
  ↓
Validation (all release gates)
  ↓
Documentation
  ↓
Rollback Verification
  ↓
Chief Architect Review
  ↓
Approval
  ↓
Next Milestone
```

No milestone may skip steps.

---

## Technical debt policy

- Pre-existing issues must be recorded in `TECHNICAL_DEBT.md`.
- New issues that block user-visible correctness or rollback **must block approval**.
- Existing debt may continue only if documented, risk-assessed, does not impact migration integrity, and rollback exists.

---

## Compatibility layer policy

Compatibility re-exports are temporary. They exist only to enable incremental migration. Removal occurs only during **Phase 7 cleanup** after feature approval.

---

## Release dashboard

Every completed milestone updates `docs/design-system-migration/RELEASE_READINESS_DASHBOARD.md`.

Dashboard tracks: overall progress, completed/remaining features, architecture score, design system compliance, accessibility, performance, visual regression, rollback readiness, production readiness, technical debt, legacy components, experience CSS, BDS components remaining.

---

## Quality score

Every milestone is scored across: architecture, presentation, accessibility, performance, documentation, rollback, testing, compliance, production readiness.

**Minimum passing score: 95%**

---

## Definition of done

A migration milestone is **complete** only if:

- Build, lint, and typecheck pass
- Architecture and design system validation pass
- Visual regression approved
- Accessibility approved
- Performance approved
- Documentation complete
- Rollback verified
- Release dashboard updated
- Scorecard updated
- Chief Architect approval received

Only then may the next milestone begin.

---

## Phase 6 status (reference)

| Agent | Scope | Status |
|-------|-------|--------|
| Agent 1 | OrderBhojan shell | PASS |
| Agent 2 | Discovery (2A–2D) | COMPLETE |
| Agent 3 | Restaurant (3A–3D) | COMPLETE |
| Agent 4+ | Checkout, Orders, … | Not started |

---

## Governance authority

This document is the governing standard for all BhojanOS UI migration work.

Any pull request violating this document must be rejected.

Any new application within BhojanOS must comply with this governance.

There shall be only **one** BhojanOS Design System.

Founder Store remains the visual source of truth.

Business logic remains application-owned.

Architecture consistency takes priority over development speed.

---

## Amendment

Changes require Chief Architect approval and a version bump of this document.
