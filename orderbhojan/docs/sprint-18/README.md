# Sprint 18 — Owner Storefront Synchronization

**Theme:** Contract v1 integration via MSW  
**Status:** Complete (integration checkpoint certified)  
**Scope:** No Home/Restaurant/Food redesign. No checkout/orders/payments.

---

## Department Reports

### Platform Engineering

**Tasks completed**
- Frozen v1 contract types package (`@bhojan/marketplace-contracts`)
- Storefront Firestore projection types (`src/domain/storefront/menu-item-projection.ts`)
- Extended owner menu API payload normalization (labels, offer, variants, addon groups)

**Files changed**
- `packages/marketplace-contracts/**`
- `src/domain/storefront/menu-item-projection.ts`
- `server.ts` — `normalizeMenuItemPayload` + helpers

**Tests**
- Covered indirectly via Sprint 18 contract round-trip tests

**Blockers**
- None

**Next task**
- PX6.1B Firestore schema migration + security rules

---

### Owner Experience

**Tasks completed**
- Owner API accepts storefront fields aligned with PX6.1A domain (labels, offer.displayText, variants, addons)

**Files changed**
- `server.ts` — menu item create/update payload

**Tests**
- Manual API contract validation (automated Firestore path deferred to 6.1B)

**Blockers**
- Owner dashboard UI editors for labels/variants not in Sprint 18 scope

**Next task**
- PX6.1C Owner menu editor fields for labels and offer copy

---

### Marketplace API

**Tasks completed**
- Legacy mock → FoodMenuDTO v1 mappers
- MSW menu handler returns v1 envelope when `schemaVersion=1.0`
- `foodMenuContractV1` client method

**Files changed**
- `orderbhojan/src/marketplace-api/mappers/v1/**`
- `orderbhojan/src/marketplace-api/mocks/handlers.ts`
- `orderbhojan/src/marketplace-api/mocks/foodExperienceMockLogic.ts`
- `orderbhojan/src/marketplace-api/index.ts`

**Tests**
- `tests/sprint18-contract-v1.test.ts`

**Blockers**
- None (MSW integration layer active)

**Next task**
- PX6.1D Firestore-backed projection replacing MSW

---

### OrderBhojan

**Tasks completed**
- `FF_OB_CONTRACT_V1` feature flag (default OFF)
- Contract menu load path in `foodExperienceLayer`
- DTO → legacy adapter for existing PX6 UI (no layout changes)
- Renderer uses `ownerOfferDisplayText` and `ownerLabels` — no `formatOfferLabel` math when contract-sourced

**Files changed**
- `orderbhojan/src/features/food/**`
- `orderbhojan/src/types/marketplace-food.ts`
- `orderbhojan/src/featureFlags/flags.ts`

**Tests**
- Contract presentation + adapter tests

**Blockers**
- None

**Next task**
- Enable `VITE_FF_OB_CONTRACT_V1=true` in staging after QA sign-off

---

### Quality

**Tasks completed**
- Contract v1 unit tests
- Feature flag default OFF verified

**Files changed**
- `orderbhojan/tests/sprint18-contract-v1.test.ts`
- `orderbhojan/tests/featureFlags.test.ts`

**Tests**
- 4 new contract tests + existing gate suite

**Blockers**
- None

**Next task**
- Visual regression with contract flag ON

---

### DevOps

**Tasks completed**
- `FF_OB_CONTRACT_V1` in `.env.example`
- `prebuild` builds marketplace-contracts package

**Files changed**
- `orderbhojan/.env.example`
- `orderbhojan/package.json`

**Blockers**
- None

**Next task**
- CI gate script `gate:s18` (optional)

---

### Documentation

**Tasks completed**
- Sprint 18 completion report (this document)

**Blockers**
- None

**Next task**
- PX6.1B migration runbook

---

## Integration Checkpoints

| Checkpoint | Status |
|---|---|
| 1 Platform + Owner schema compatibility | PASS |
| 2 Platform + Marketplace DTO validation | PASS |
| 3 Marketplace + OrderBhojan rendering | PASS (adapter; UI unchanged) |
| 4 QA regression | PASS (unit) |
| 5 Release certification | PASS (Sprint 18 scope) |

---

## Local verification

```bash
cd packages/marketplace-contracts && npm run build
cd orderbhojan && npm install && npm run test:unit

# Contract menu path
VITE_FF_OB_MENU=true VITE_FF_OB_RESTAURANT=true VITE_FF_OB_CONTRACT_V1=true npm run dev -- --port 5180
```

---

## Stop conditions honored

- Checkout, payments, orders, tracking — not started
- Home, Restaurant, Food Experience layouts — not redesigned
- Domain (PX6.1A) and contracts (PX6.1A.5) — not modified

**Awaiting next Sprint Planning session.**
