# BhojanOS Architecture Freeze v1

**Version:** 1.0  
**Effective:** 2026-07-10  
**Status:** CONSTITUTION — governs all BhojanOS products

This document is the long-term governance model for BhojanOS. It applies to **Founder Store**, **OrderBhojan**, **Owner Portal**, **Admin Portal**, **Rider App**, and all future products sharing the unified platform.

---

## 1. Design Rules

### 1.1 Single presentation source

`src/design-system` is the **only** source of shared presentation components, tokens, motion, typography, and layout primitives.

- Applications **must not** create duplicate UI components that replicate design-system capability.
- Applications **must not** fork Founder visual patterns into local `components/` folders except thin **presentation adapters** that wire app business data to design-system view models (see OrderBhojan `presentation/` layer).
- Founder Store is the **visual source of truth** for marketplace presentation.

### 1.2 Application-owned presentation adapters

Each app may maintain a `presentation/` directory (or equivalent) that:

- Maps app DTOs to design-system view models
- Wires app stores (favorites, feature flags) into DS component slots
- Contains **zero** business logic, API calls, or Firestore access

Adapters are presentation-only glue. They are not a second design system.

### 1.3 No duplicate CSS

- Shared visual rules live in `src/design-system/tokens/` and `src/design-system/styles/`.
- App-specific CSS is permitted only for layout integration (safe areas, route shells) until Phase 7 cleanup removes orphaned rules.
- New features **must not** introduce parallel token systems (no new `--ob-brand-*` without DS token equivalent).

### 1.4 Tokens over literals

All new presentation code **must** use design-system tokens for:

- Color (including dark-mode pairs)
- Spacing and radius
- Typography scale
- Shadows and glass effects
- Motion duration and easing

Hardcoded hex values are prohibited in app presentation layers except in migration shims scheduled for removal.

---

## 2. Business Rules

### 2.1 Logic stays in applications

Business logic remains inside each application:

- Firestore reads/writes (via repositories)
- React Query hooks and cache policies
- Domain engines (discovery, search, restaurant, menu, cart, checkout)
- Feature flags, analytics, telemetry
- Authentication and authorization
- DTOs and validation schemas

### 2.2 Design system purity

The design system **must never** contain:

- Firestore imports or Firebase SDK usage
- API clients or HTTP fetch logic
- React Query hooks or cache keys
- Repository implementations
- Business rules (pricing, inventory, offers, ranking)
- App-specific routing assumptions (except documented adapter exports)

Design-system components accept **view models and callbacks** only.

### 2.3 Cross-app contracts

Shared marketplace contracts live in `packages/marketplace-contracts`. DTO changes require contract version bumps and coordinated migration — not silent design-system edits.

---

## 3. Import Rules

### 3.1 Allowed import paths (applications)

Applications import presentation from:

```
@bhojan/storefront-design-system/<module>/<Component>
```

Examples:

- `@bhojan/storefront-design-system/primitives/GlassCard`
- `@bhojan/storefront-design-system/marketplace/MarketplaceKitchenCard`
- `@bhojan/storefront-design-system/skeleton/SkeletonSystem`

The package alias resolves to `src/design-system/` in the monorepo.

### 3.2 Prohibited imports

| Pattern | Reason |
|---------|--------|
| `src/design-system/**/internal/**` | Internal implementation detail |
| `../../components/Foo` from DS | Component leak (validated in CI) |
| Full barrel `@bhojan/storefront-design-system` in OrderBhojan `tsc` path | Pulls Founder app internals; use adapter subpaths |
| BDS `@bhojan/design-system` in new presentation code | Legacy; migrate to Founder DS |
| Deep relative imports into `src/design-system/` from apps | Use alias only |

### 3.3 Barrel exports

Each design-system subdomain maintains an `index.ts` barrel. New components **must** be exported through the appropriate barrel for discoverability.

---

## 4. Contribution Rules

Every pull request that touches shared UI **must** satisfy:

| Requirement | Verification |
|-------------|--------------|
| Builds successfully | `npm run build` |
| Lint clean (or documented pre-existing debt) | `npm run lint` |
| TypeScript clean | `npm run typecheck` |
| Architecture validation | `node scripts/design-system/validate-architecture.mjs` |
| Design system compliance | `node scripts/validate-design-system.mjs` |
| Approved exceptions registry | `docs/design-system-migration/EXCEPTIONS.md` |
| No duplicate UI components | Manual review + duplicate detection CI |
| No duplicate CSS for migrated surfaces | Review + Phase 7 tracking |
| No hardcoded colors/spacing in new code | Lint / review |
| No circular dependencies | CI dependency graph |
| Uses design-system tokens | Review |
| Migration documentation | Required if shared UI changes affect consumers |

### 4.1 Migration documentation

When changing a shared design-system component, include:

- Component mapping table (old → new)
- Visual regression notes
- Rollback plan
- Consumer app impact (Founder, OrderBhojan, Owner, Admin)

Store migration docs under `docs/design-system-migration/`.

### 4.2 Shim policy

During phased migration, legacy component files may remain as **thin re-exports** of presentation adapters for rollback. Shims:

- Must not contain business logic
- Must be listed in `TECHNICAL_DEBT.md`
- Must be removed in Phase 7 cleanup after validation gate

---

## 5. CI Quality Gates

The following checks **must** pass before merge to protected branches:

### 5.1 Required (automated today)

```bash
npm run build
npm run lint
npm run typecheck
node scripts/design-system/validate-architecture.mjs
node scripts/validate-design-system.mjs
```

Architecture validation enforces:

- No `src/components` leaks inside `src/design-system`
- No deep imports bypassing public DS paths
- Required barrel files present

### 5.2 Required (target state — enable as tooling lands)

| Gate | Purpose |
|------|---------|
| Duplicate component detection | Flag new `*Card`, `*Hero`, `*Skeleton` outside DS |
| Circular dependency detection | Prevent adapter ↔ feature cycles |
| Bundle size regression | Block > 5% gzip increase without approval |
| Visual regression | Compare baselines in `docs/design-system-migration/baselines/` |
| Accessibility audit | Lighthouse a11y ≥ 95 on migrated surfaces |

### 5.3 Milestone gates (OrderBhojan Phase 6)

Each migration milestone requires:

- Component mapping document **before** implementation
- Build + architecture PASS
- Migration report + rollback plan
- STOP after milestone — await Chief Architect approval

---

## 6. Product scope reference

| Product | Presentation | Business logic |
|---------|----------------|----------------|
| Founder Store | `src/design-system` | `src/pages/`, hooks, SDK |
| OrderBhojan | `presentation/` adapters → DS | `orderbhojan/src/features/` |
| Owner Portal | DS (target) | Owner features |
| Admin Portal | DS (target) | Admin features |
| Rider App | DS (target) | Rider features |

---

## 7. Amendment process

Changes to this constitution require:

1. Chief Architect approval
2. Version bump (`ARCHITECTURE_FREEZE_v2.md`)
3. Migration impact assessment across all products
4. Update to `validate-architecture.mjs` if new rules are enforceable

---

## 8. Phase 6 completion status (reference)

| Agent | Scope | Status |
|-------|-------|--------|
| Agent 1 | OrderBhojan shell | ✅ PASS |
| Agent 2 | Discovery (2A–2D) | ✅ COMPLETE |
| Agent 3 | Restaurant + Menu (3A–3D) | ✅ COMPLETE |

This freeze document remains effective through Phase 7 cleanup and beyond.
