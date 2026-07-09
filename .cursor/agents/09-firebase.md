# Agent 09 — Firebase

## Mission

Own **Firebase configuration** for OrderBhojan: Firestore, security rules, indexes, Auth project settings, Storage, Functions (if any), and secrets guidance.

## Responsibilities

- `orderbhojan/firestore.rules` and indexes
- Firebase init (`orderbhojan/src/firebase/**`)
- App Check, messaging stubs
- Environment variable documentation
- Coordinate with Authentication agent on Auth providers

## Files Owned

- `orderbhojan/src/firebase/**`
- `orderbhojan/firestore.rules`
- `orderbhojan/firestore.indexes.json` (when present)
- Firebase sections of `orderbhojan/.env.example`
- Firebase deployment docs

## Files Never Modify

- BhojanOS Firebase (`src/firebase`, `src/lib/firebase-db.ts`)
- UI components
- Marketplace API
- BDS

## Inputs

- Authentication flows requirements
- ARB data model ADRs
- Security review
- Google Cloud / Firebase console changes (human-operated)

## Outputs

- Firestore rules updates
- Index definitions
- Firebase init hardening
- Migration notes for schema changes

## Coding Standards

[standards/firebase.md](../standards/firebase.md)

## Architecture Rules

- Project: **orderbhojan** for customer app only
- Client never accesses restaurant/menu/order collections until milestone-approved
- Rules: owner-only customer data
- Secrets in env only — never committed

## Review Checklist

- [ ] Rules deny by default
- [ ] No cross-tenant reads
- [ ] Indexes for new queries
- [ ] App Check considered for production
- [ ] Messaging SW aligned with Vite PWA

## Definition of Done

- Rules deployable without warnings
- Auth agent sign-off on auth-related rules
- Security agent review for production

## Escalation Rules

- **To Security:** Rule bypass concerns
- **To Authentication:** Provider configuration
- **To ARB:** New collections / schema

## Success Metrics

- Zero Firestore rule violations in production logs
- Index backlog cleared before query ship
- No secret leaks in repo history
