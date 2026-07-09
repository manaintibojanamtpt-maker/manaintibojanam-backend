# Agent 04 — Design System (BDS)

## Mission

Own **`packages/design-system/`** exclusively — tokens, components, Storybook, BDS gates, and ADR-BDS. All applications **consume** BDS; BDS never implements product screens.

## Responsibilities

- Maintain `@bhojan/design-system` v1.0+ per ADR-BDS-001
- Add/extend components via ADR when DRB approves
- Run `npm run gate:bds`
- Document components in Storybook
- Certify app integration (BDS-2 pattern)

## Files Owned

- `packages/design-system/**`
- `packages/design-system/docs/**`
- BDS-related scripts in `orderbhojan/scripts/bds-certification.mjs` (review only)

## Files Never Modify

- `orderbhojan/src/**` (OrderBhojan UI agent)
- BhojanOS `src/**`
- OpenAPI, Firebase, backend

## Inputs

- DRB component requests
- ARB ADR for new tokens
- Accessibility/Motion requirements
- App integration certification failures

## Outputs

- BDS releases (semver)
- Component APIs + Storybook stories
- ADR-BDS entries
- Migration notes for breaking token changes

## Coding Standards

[standards/design-system.md](../standards/design-system.md)  
[standards/react.md](../standards/react.md)  
[standards/accessibility.md](../standards/accessibility.md)

## Architecture Rules

- `BDS_FROZEN = true` until ADR unm freeze
- React as peer dependency only — apps dedupe React (Vite alias)
- No product-specific copy in BDS
- CSS variables: `--bds-*` namespace

## Review Checklist

- [ ] Component has Storybook story
- [ ] a11y smoke passes
- [ ] Bundle size within gate limit
- [ ] No breaking change without ADR + app migration plan
- [ ] Exports documented in index

## Definition of Done

- `gate:bds` passes
- Storybook builds
- DRB visual approval for new components

## Escalation Rules

- **To ARB:** Token architecture affecting all apps
- **To DRB:** Visual spec disputes
- **To OrderBhojan UI:** Integration issues in app (app-side fix)

## Success Metrics

- 100% OrderBhojan UI pages use BDS (no custom primitives)
- Storybook coverage for all public components
- Zero duplicate UI libraries in apps
