# BAEO Ownership Matrix

**Version:** 1.1.0  
**Rule:** One folder → one owner agent → one reviewer → one approval board  
**Maintained by:** Architecture Review Board · Audited by Ecosystem Guardian

---

## Legend

| Column | Meaning |
|--------|---------|
| **Owner Agent** | Sole implementer — only this agent modifies files |
| **Reviewer** | Reviews PRs; does not implement |
| **Approval Board** | Final gate before merge/release |

---

## Repository Root

| Folder / File | Owner Agent | Reviewer | Approval Board |
|---------------|-------------|----------|----------------|
| `.cursor/` | Documentation (14) | CEO (00) | CEO |
| `.cursor/agents/` | Documentation (14) | CEO (00) | CEO |
| `.cursor/workflows/` | Documentation (14) | ARB (02) | ARB |
| `.cursor/checklists/` | Release Manager (17) | Documentation (14) | Release Manager |
| `.github/workflows/` | DevOps (15) | Release Manager (17) | DevOps + Release Manager |
| `docs/adr/` | ARB (02) | CEO (00) | ARB |
| `docs/baeo/` | Documentation (14) | CEO (00) | CEO |
| `docs/ecosystem/` | Ecosystem Guardian (19) | DRB (03) | DRB |
| `docs/experience/` | Experience Evolution (18) | DRB (03) | DRB |
| `docs/orderbhojan/` | Documentation (14) | Marketplace API (08) | ARB |
| `docs/m1/` … `docs/m8/` (BhojanOS backend) | Documentation (14) | ARB (02) | ARB |
| `docs/ownership-matrix.md` | ARB (02) | Ecosystem Guardian (19) | ARB |
| `server.ts` | ARB (02) — BhojanOS backend | Security (16) | ARB + CEO waiver |
| `public/` (root) | ARB (02) — BhojanOS | DevOps (15) | ARB |

---

## BhojanOS (Root Application)

| Folder / File | Owner Agent | Reviewer | Approval Board |
|---------------|-------------|----------|----------------|
| `src/` (entire BhojanOS storefront) | ARB (02) — change control | DRB (03) for UI | CEO waiver required |
| `src/pages/` | ARB (02) | DRB (03) | CEO |
| `src/components/` | ARB (02) | DRB (03) | CEO |
| `src/hooks/` | ARB (02) | Security (16) if auth | ARB |
| `src/firebase.ts` | Firebase (09) — BhojanOS scope | Security (16) | ARB |
| `src/config/` | ARB (02) | Security (16) | ARB |

**Policy:** OrderBhojan milestones must not modify BhojanOS paths without CEO waiver.

---

## OrderBhojan (`orderbhojan/`)

| Folder / File | Owner Agent | Reviewer | Approval Board |
|---------------|-------------|----------|----------------|
| `orderbhojan/src/app/` | OrderBhojan UI (05) | DRB (03) | DRB |
| `orderbhojan/src/app/routes/` | OrderBhojan UI (05) | ARB (02) | ARB |
| `orderbhojan/src/shared/layouts/` | OrderBhojan UI (05) | DRB (03) | DRB |
| `orderbhojan/src/shared/providers/` | Authentication (06) — AuthProvider; UI (05) — others | ARB (02) | ARB |
| `orderbhojan/src/features/experience/` | OrderBhojan UI (05) | Experience Evolution (18) | DRB |
| `orderbhojan/src/features/experience/hooks/` (visual) | Motion (12) | Performance (10) | DRB |
| `orderbhojan/src/styles/experience-*.css` | OrderBhojan UI (05) + Motion (12) sections | DRB (03) | DRB |
| `orderbhojan/src/styles/globals.css` | OrderBhojan UI (05) | DRB (03) | DRB |
| `orderbhojan/src/features/auth/` | Authentication (06) | Security (16) | ARB + Security |
| `orderbhojan/src/features/location/` | Location Platform (07) | ARB (02) | ARB |
| `orderbhojan/src/features/discovery/` | OrderBhojan UI (05) — UI; Marketplace API (08) — data | ARB (02) | ARB |
| `orderbhojan/src/features/search/` | OrderBhojan UI (05) | DRB (03) | DRB |
| `orderbhojan/src/features/menu/` | OrderBhojan UI (05) | DRB (03) | DRB |
| `orderbhojan/src/features/cart/` | OrderBhojan UI (05) | ARB (02) | ARB |
| `orderbhojan/src/features/checkout/` | OrderBhojan UI (05) | Security (16) | ARB |
| `orderbhojan/src/features/orders/` | OrderBhojan UI (05) | ARB (02) | ARB |
| `orderbhojan/src/features/tracking/` | OrderBhojan UI (05) | ARB (02) | ARB |
| `orderbhojan/src/marketplace-api/` | Marketplace API (08) | ARB (02) | ARB |
| `orderbhojan/openapi/` | Marketplace API (08) | ARB (02) | ARB |
| `orderbhojan/src/firebase/` | Firebase (09) | Security (16) | Firebase + Security |
| `orderbhojan/firestore.rules` | Firebase (09) + Authentication (06) customer sections | Security (16) | Security |
| `orderbhojan/src/config/` | ARB (02) assigns per milestone | Security (16) | ARB |
| `orderbhojan/src/featureFlags/` | Product Manager (01) defines; ARB (02) implements | Release Manager (17) | ARB |
| `orderbhojan/tests/` | Testing (13) | Domain agent for context | QRB |
| `orderbhojan/scripts/gate-*.mjs` | Testing (13) | Release Manager (17) | Release Manager |
| `orderbhojan/scripts/performance-smoke.mjs` | Performance (10) | Release Manager (17) | QRB |
| `orderbhojan/scripts/validate-openapi.mjs` | Marketplace API (08) | Testing (13) | ARB |
| `orderbhojan/docs/` | Documentation (14) | Product Manager (01) | Release Manager |
| `orderbhojan/docs/m*/` | Documentation (14) + milestone domain agent | Release Manager (17) | Release Manager |
| `orderbhojan/.env.example` | DevOps (15) structure; Firebase (09) keys | Security (16) | Security |
| `orderbhojan/vite.config.ts` | Performance (10) — dedupe; DevOps (15) — build | ARB (02) | ARB |
| `orderbhojan/package.json` | Release Manager (17) — version | Testing (13) — scripts | Release Manager |

---

## Design System (`packages/design-system/`)

| Folder / File | Owner Agent | Reviewer | Approval Board |
|---------------|-------------|----------|----------------|
| `packages/design-system/src/` | Design System (04) | DRB (03) | DRB |
| `packages/design-system/src/components/` | Design System (04) | Accessibility (11) | DRB |
| `packages/design-system/src/tokens/` | Design System (04) | Experience Evolution (18) | DRB |
| `packages/design-system/src/providers/` | Design System (04) | Performance (10) | DRB |
| `packages/design-system/tests/` | Testing (13) + Design System (04) | Accessibility (11) | QRB |
| `packages/design-system/docs/` | Documentation (14) | Design System (04) | DRB |
| `packages/design-system/docs/adr/` | Design System (04) + ARB (02) | DRB (03) | ARB |

---

## Future Products (Reserved)

| Product | Owner (at kickoff) | Reviewer | Approval Board |
|---------|-------------------|----------|----------------|
| Delivery Partner App | TBD — ARB assigns | Ecosystem Guardian (19) | CEO + ARB |
| BhojanOS Admin | TBD — ARB assigns | DRB (03) | CEO + ARB |
| Kitchen Display System | TBD — ARB assigns | DRB (03) | ARB |
| Analytics Platform | TBD — ARB assigns | Security (16) | ARB |
| Android / iOS | TBD — ARB assigns | Ecosystem Guardian (19) | DRB + ARB |
| AI Copilot | TBD — ARB assigns | Security (16) | CEO + ARB |

Ecosystem Guardian maintains [ecosystem/CROSS-PRODUCT-AUDIT-template.md](ecosystem/CROSS-PRODUCT-AUDIT-template.md) at kickoff.

---

## Conflict Resolution

1. Two agents claim same path → **ARB decides** single owner within 24h.
2. Agent needs file outside ownership → **ARB waiver** documented in PR.
3. Cross-product impact → **CEO** approval required.

---

*BAEO v1.1 — Updated on activation. Do not assign shared ownership.*
