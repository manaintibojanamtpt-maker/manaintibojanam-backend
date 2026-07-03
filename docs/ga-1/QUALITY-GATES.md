# GA-1 Quality Gates

**Program:** Legacy Production Deployment  
**Date:** 2026-07-03

---

## Pre-Deploy Gates

| # | Gate | Command | Expected |
|---|------|---------|----------|
| G1 | Projection flags OFF | `npm run verify:ga1-flags` | 28 flags OFF/unset |
| G2 | Unit tests | `npm run test:unit` | All pass |
| G3 | SDK tests | `npm run test:sdk` | 1326 / 1326 |
| G4 | API security | `npm run test:api-security` | All pass |
| G5 | Firestore rules | `npm run test:rules` | All pass |
| G6 | Frontend build (Vercel) | `npm run build:web` | Success |
| G7 | API build (Render) | `npm run build:server` | Success |
| G8 | Smoke tests | `npm run test:smoke` | Pass |
| G9 | Firebase project guard | `npm run build:web` | Blocks `bhojanos2` on Vercel prod |

**Combined gate:** `npm run gate:ga1`

---

## Post-Deploy Gates

| # | Gate | Verification | Expected |
|---|------|--------------|----------|
| P1 | API health | `curl /api/health` | `status: ok`, Firestore connected |
| P2 | Build parity | `version.json` vs health `build` | Matching prefix |
| P3 | Frontend loads | `https://www.bhojanos.com` | 200 OK |
| P4 | Auth enforcement | Unauthenticated API calls | 401 |
| P5 | Tenant isolation | Cross-tenant read attempt | `permission-denied` |
| P6 | Menu loading | Owner + customer menu pages | Data loads |
| P7 | Pricing loading | Price display on menu/checkout | Values shown |
| P8 | Order placement | COD + Razorpay test | Order created |
| P9 | Owner dashboard | Kitchen management | Functional |
| P10 | Notifications | Status change → customer notify | Delivered |
| P11 | Payment flow | Razorpay webhook | Order promoted |
| P12 | No projection telemetry | Logs review | No adapter/rollout events |

---

## Functional Verification Matrix

| Capability | Legacy path | Projection |
|------------|-------------|------------|
| Browse menus | Firestore `menus` | ❌ Not used |
| Place orders | Firestore `orders` | ❌ Not used |
| Manage kitchens | Owner API + Firestore | ❌ Not used |
| Manage pricing | Legacy pricing docs | ❌ Not used |
| Manage inventory | Current implementation | ❌ Not used |
| Payments | Razorpay | ❌ Not used |
| Notifications | FCM + API | ❌ Not used |

---

## Regression Protection

| Risk | Gate |
|------|------|
| Projection accidentally enabled | `verify:ga1-flags` |
| SDK contract drift | 1326 SDK tests |
| Firestore rules regression | `test:rules` |
| API auth regression | `test:api-security` |
| Build failure | `build:web` + `build:server` |

---

## Success Criteria

- [ ] All pre-deploy gates pass
- [ ] All post-deploy gates pass
- [ ] Zero production incidents in 24h window
- [ ] Legacy path confirmed in logs

---

**STOP.** Do not enable projection gates until ARB approval.
