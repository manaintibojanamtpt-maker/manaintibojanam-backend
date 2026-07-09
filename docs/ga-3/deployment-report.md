# GA-3 Production Billing Hotfix — Deployment Report

**Date:** 2026-07-03  
**Release commit:** `d593f27`  
**Previous production:** `fcfa783` (GA-2 / bhojanos-v1.0.0)  
**Environment:** bhojanos-prod (Legacy Production Architecture)

---

## Phase 1 — Final Quality Gate

| Check | Result |
|-------|--------|
| `npm run gate:ga2` | **PASS** |

Gate included build verification, GA-2 readiness scripts, and server bundle.

---

## Phase 2 — Production Deployment

| Step | Result |
|------|--------|
| Commit | `d593f27` — GA-3: Production billing synchronization hotfix |
| `git push origin main` | **SUCCESS** (`fcfa783..d593f27`) |
| Render (API) | **LIVE** — build `d593f27` |
| Vercel (Frontend) | **LIVE** — build `d593f27ec8c1` |

---

## Phase 3 — Firestore Rules

| Check | Action |
|-------|--------|
| `firestore.rules` diff vs GA-2 | **No changes** |
| Deploy | **SKIPPED** (per deployment plan) |

---

## Post-Deployment Verification

### Health & Version

| Endpoint | Result | Evidence |
|----------|--------|----------|
| `GET /api/health` (Render) | **200 OK** | `status: ok`, `env: production`, `platform.build: d593f27`, Firestore `bhojanos-prod` |
| `GET /version.json` (Vercel) | **200 OK** | `build: d593f27ec8c1`, `builtAt: 2026-07-03T13:31:56.622Z` |

### Route Smoke Tests

| Route | Status |
|-------|--------|
| `https://www.bhojanos.com/owner/login` | Reachable (200) |
| `https://www.bhojanos.com/help` | Reachable (200) |
| Storefront `/k/{slug}` | Requires tenant slug — manual verify per onboarded restaurant |
| Guest tracking `/order/{orderId}` | Requires valid order — manual verify on next order |

---

## Billing Validation Evidence

Automated regression (pre-deploy, re-validated at gate):

```
npm run test:unit  → 58/58 PASS (includes GA-3 billing scenarios)
npm run test:sdk   → 1326/1326 PASS
```

| Scenario | Expected | Test coverage |
|----------|----------|---------------|
| GST=0, Packaging=0, no address | Item total only; no tax line; delivery pending | `resolveCheckoutDeliveryFee` pending=true; taxesConfigured=false |
| Address inside radius, Base ₹20 | Delivery ₹20 | `computeDeliveryFee` + `resolveCheckoutDeliveryFee` |
| Owner config overrides legacy global | GST/pack/delivery from Firestore | `prefers owner storefront config over legacy global fees for mana-inti` |
| Dynamic bill labels | GST / Packaging / combined | `formatTaxAndChargesLabel` |
| Legacy tenant without config | Global fallback only | `falls back to legacy global fees only when storefront config is missing` |

### Manual production checklist (restaurant tenant)

Perform on live onboarded tenant storefront:

- [ ] Scenario 1: No address → Grand Total = Item Total; delivery shows “Calculated after address selection”
- [ ] Scenario 2: Address selected → Delivery matches owner Base Fee (e.g. ₹20)
- [ ] Scenario 3: Owner changes GST 0→5% → Checkout updates without page reload (Firestore snapshot)
- [ ] Scenario 4: Owner changes Packaging 0→10 → Bill summary label and amount update
- [ ] Scenario 5: Owner changes Base Fee 20→40 → Delivery recalculates on next address selection

---

## Architecture Compliance

| Constraint | Status |
|------------|--------|
| Legacy path: React → Legacy API → Legacy SDKs → Firestore | ✓ Preserved |
| M1–M8 frozen platform | ✓ Not modified |
| SDK / DTO / repository changes | ✓ None |
| Firestore schema changes | ✓ None |
| Feature flags / projection | ✓ All OFF (unchanged) |
| New features | ✓ None |

---

## Rollback Readiness

| Item | Detail |
|------|--------|
| Rollback commit | `git revert d593f27` then `git push origin main` |
| Firestore rules rollback | Not required (no rules deployed) |
| Database rollback | Not required (client-side billing logic only) |
| Prior stable tag | `bhojanos-v1.0.0` @ `fcfa783` |

---

## Production Monitoring (First 24 Hours)

Monitor:

- Render logs: `manaintibojanam-backend.onrender.com`
- Vercel deployment dashboard for `bhojanos.com`
- Firestore console: tenant `pricingConfig` / `deliveryConfig` updates
- Order creation totals vs owner settings
- Checkout errors in browser console
- Guest order tracking `/order/:orderId`

---

## Definition of Done

| Criterion | Status |
|-----------|--------|
| Production deploy successful | ✓ |
| Render + Vercel on GA-3 commit | ✓ |
| Health endpoints green | ✓ |
| Billing hotfix code live | ✓ |
| Legacy architecture preserved | ✓ |
| No platform regressions (1326 SDK tests) | ✓ |
| Firestore rules unchanged / not redeployed | ✓ |
| Rollback plan documented | ✓ |
| Ready for restaurant onboarding | ✓ (pending manual billing spot-check on live tenant) |

---

## Files Deployed

- `src/lib/tenantCheckoutConfig.ts`
- `src/lib/deliveryFee.ts`
- `src/hooks/useCheckoutState.ts`
- `src/lib/useDeliveryState.ts`
- `src/pages/Checkout.tsx`
- `src/lib/__tests__/tenantCheckoutConfig.test.ts`
- `docs/ga-3/billing-hotfix-report.md`

**STOP — No further platform changes in this release.**
