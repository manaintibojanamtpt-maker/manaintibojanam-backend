# Deploy Status Report

**Generated:** 2026-07-09 (read-only audit)  
**Repo:** `f:/Manaintibojanam_final2`  
**Current branch:** `main` @ `128db5c` (in sync with `origin/main`)

---

## Plain-language summary

**Right now, production has:**

- **Render API** (`manaintibojanam-backend.onrender.com`) running build **`128db5c`** — confirmed via live `/api/health` (`platform.build: "128db5c"`). This includes the cron init-order fix, secure-by-default auth flag logic, marketplace checkout `userId` binding, IST business hours, and post-delivery invoice gating.
- **Vercel BhojanOS** (`www.bhojanos.com`) serving build **`128db5c`** — confirmed via live `/version.json`.
- **OrderBhojan Firebase Hosting** (`orderbhojan.web.app`) serving the **`128db5c`** frontend bundle (`index-Fg1U4pjh.js`) — confirmed via live HTML asset hash matching the manual deploy from this session.

**Production does NOT yet have (or cannot confirm):**

- **Founder Firebase storefront** (`mana-inti-bojanam-pune-492610.web.app`) on the same build as Vercel — live HTML references `main-xLz_bsJk.js` and has no `/version.json`; **NEEDS MANUAL VERIFICATION** whether a separate Firebase deploy was run after `128db5c`.
- **Effective runtime enforcement** of `FF_ORDER_AUTH_ENFORCE` / `FF_RAZORPAY_DRAFT_BIND` if Render env vars explicitly set them to `false` — code defaults to enforced when unset, but **NEEDS MANUAL VERIFICATION** on Render dashboard env.
- **Confirmation that node-cron jobs are actually registering** after the init-order fix — code is deployed, but **NEEDS MANUAL VERIFICATION** in Render logs (`Registering background cron jobs: [...]` ~2 min after boot).
- **Most ARCHITECTURE_AUDIT / SELF_HEALING_AUDIT findings** (hardcoded keys, Auto Workflow, free-tier AutoPilot, Porter/Rapido stubs, full founder checkout parity on OrderBhojan, etc.) — see “Not started” table below.

**Local workspace:** Clean except one uncommitted Firebase deploy cache file (artifact only, not source).

---

## STEP 1 — Local working directory

### Git status

| State | Path | Summary |
|-------|------|---------|
| **Modified (unstaged)** | `orderbhojan/.firebase/hosting.ZGlzdA.cache` | Firebase CLI deploy manifest updated after manual `firebase deploy` to `orderbhojan` project. Asset hashes now reflect `index-Fg1U4pjh.js`, `index-B3mT3biw.css`, etc. No application source changes. |
| **Staged** | — | None |
| **Untracked** | — | None (`.sync-work/`, `tmp-pune-discovery.json`, `scripts/.smoke-ops-health-report.json` are gitignored) |

No other modified, staged, or untracked application files.

---

## STEP 2 — Branch vs production branch

### Production branch mapping (from config)

| Service | Deploy source | Config reference |
|---------|---------------|------------------|
| **Render API** | Git `main` (typical Render GitHub integration; branch not pinned in `render.yaml`) | `render.yaml` — service `bhojanos-prod-api`, build `npm ci && npm run build`, start `node dist/server.cjs` |
| **Vercel BhojanOS** | Git `main` (GitHub-linked; auto-deploy assumed) | `vercel.json` — `buildCommand: npm run build:web`, `outputDirectory: dist` |
| **OrderBhojan Firebase** | **Manual** — no CI auto-deploy | `.github/workflows/orderbhojan-ci.yml` runs `gate:prod` only; `ARCHITECTURE_AUDIT.md` §5.2 |
| **Founder Firebase storefront** | **Manual** — separate hosting target | `.firebaserc` target `mana-inti-bojanam-pune-492610` / `storefront` |

### Current branch

- **Branch:** `main`
- **HEAD:** `128db5c8b7cf849c5b44c89a716a36a04bc2c7e1`
- **`origin/main`:** same commit — **nothing committed locally that is not pushed**
- **Commits ahead of `origin/main`:** 0
- **Other local branches with unpushed work:** none observed

### Commits on `main` not in older production (since `524e44f`)

These are all **merged and pushed** to `origin/main`. Deploy status per service is in the master table below.

| Commit | Message | Files touched (summary) |
|--------|---------|-------------------------|
| `cb0a4d6` | fix(server,security): register crons after Firestore init and harden checkout auth | `server.ts`, `backend-lib/orderAccess.ts`, `backend-lib/marketplace/marketplaceRoutes.ts`, tests, OrderBhojan cart/toast fixes |
| `f4e8ea5` | docs(ops): add architecture audits and discovery bootstrap in CI | `ARCHITECTURE_AUDIT.md`, `SELF_HEALING_AUDIT.md`, IaC workflow, bootstrap scripts, version/cache |
| `9f19e86` | chore(platform): add BAEO agent tooling, IaC scaffolds, and ops scripts | `.cursor/*`, `terraform/`, `helm/`, `k8s/`, `infra/`, ops scripts |
| `128db5c` | fix(marketplace): IST store hours, post-delivery invoice, and checkout address wizard | `tenantProjectionHelpers.ts`, `projectMarketplaceOrders.ts`, OrderBhojan location/checkout/tracking, owner store status, `.gitignore` |

---

## STEP 3 — Merged/pushed but deploy state

### Confirmed live (from external probes)

| Target | Evidence | Build / commit |
|--------|----------|----------------|
| **Render API** | `GET https://manaintibojanam-backend.onrender.com/api/health` → `"build":"128db5c"`, `"env":"production"`, `"platform":{"tier":"free"}` | **`128db5c` LIVE** |
| **Vercel** | `GET https://www.bhojanos.com/version.json` → `"build":"128db5c8b7cf"` | **`128db5c` LIVE** |
| **OrderBhojan Firebase** | `GET https://orderbhojan.web.app/` → script `index-Fg1U4pjh.js` (matches `128db5c` local build output) | **`128db5c` LIVE** (manual deploy this session) |

### Needs manual verification

| Target | Why |
|--------|-----|
| **Founder Firebase** (`mana-inti-bojanam-pune-492610.web.app`) | No `version.json`; bundle `main-xLz_bsJk.js` — cannot match to `128db5c` without Firebase console or `firebase hosting:channel:list` / deploy history |
| **Separate `orderbhojan` GitHub repo** | Monorepo `orderbhojan/` is deployed to Firebase from monorepo; standalone repo sync (`scripts/sync-orderbhojan-repo.mjs`) may lag — **NEEDS MANUAL VERIFICATION** |
| **Render cron registration** | Init-order fix is in deployed code; confirm logs show deferred cron registration after cold start |
| **Render env `FF_*` flags** | If set to `false`, they override secure-by-default code — check Render → Environment |

### Auto-deploy notes

| Service | Auto-deploy? |
|---------|----------------|
| Render API | **Likely yes** — health endpoint already on `128db5c` shortly after push |
| Vercel | **Likely yes** — `version.json` on `128db5c` |
| OrderBhojan Firebase | **No** — CI does not deploy; last deploy was manual CLI |
| Founder Firebase | **No** — manual `firebase deploy` with hosting target |

---

## STEP 4 — Session fixes (explicit status)

| Change | Status | Branch | Commit | File(s) |
|--------|--------|--------|--------|---------|
| `FF_ORDER_AUTH_ENFORCE` secure-by-default (`isEnforcedUnlessExplicitlyDisabled`) | **LIVE IN PROD** (code); **NEEDS MANUAL VERIFICATION** if Render env sets `FF_ORDER_AUTH_ENFORCE=false` | `main` | `cb0a4d6` | `backend-lib/orderAccess.ts` |
| `FF_RAZORPAY_DRAFT_BIND` secure-by-default | **LIVE IN PROD** (code); **NEEDS MANUAL VERIFICATION** if Render env sets `FF_RAZORPAY_DRAFT_BIND=false` | `main` | `cb0a4d6` | `backend-lib/orderAccess.ts` |
| Marketplace checkout server-side `userId` (strip body, bind from Firebase token) | **LIVE IN PROD** | `main` | `cb0a4d6` | `backend-lib/marketplace/marketplaceRoutes.ts` |
| `initializeMonitoringJobs()` after `_db` init | **LIVE IN PROD** | `main` | `cb0a4d6` | `server.ts` |
| Redundant silent `if (!_db) return` removed; warn-log guard only | **LIVE IN PROD** | `main` | `cb0a4d6` | `server.ts` |
| IST / `Asia/Kolkata` store hours (CLOSED-while-open fix) | **LIVE IN PROD** | `main` | `128db5c` | `backend-lib/marketplace/tenantProjectionHelpers.ts`, `src/lib/tenantStoreOperations.ts` |
| Digital invoice only after `DELIVERED` | **LIVE IN PROD** (API + OrderBhojan UI) | `main` | `128db5c` | `projectMarketplaceOrders.ts`, `TrackingPage.tsx` |
| OrderBhojan delivery location wizard (founder-style address flow) | **LIVE IN PROD** (OrderBhojan Firebase only) | `main` | `128db5c` | `DeliveryLocationWizard.tsx`, checkout/location files |
| Owner store status shows effective accepting-orders | **LIVE IN PROD** (Vercel owner app) | `main` | `128db5c` | `StoreLiveControl.tsx` |

---

## Master status table

| Change | Status | Branch | Commit | File(s) |
|--------|--------|--------|--------|---------|
| Cron init after Firestore (`initializeMonitoringJobs`) | LIVE IN PROD | main | cb0a4d6 | server.ts |
| Cron warn guard (no duplicate silent return) | LIVE IN PROD | main | cb0a4d6 | server.ts |
| FF_ORDER_AUTH_ENFORCE secure-by-default | LIVE IN PROD* | main | cb0a4d6 | backend-lib/orderAccess.ts |
| FF_RAZORPAY_DRAFT_BIND secure-by-default | LIVE IN PROD* | main | cb0a4d6 | backend-lib/orderAccess.ts |
| Marketplace checkout userId from token | LIVE IN PROD | main | cb0a4d6 | marketplaceRoutes.ts |
| IST business hours for open/closed badge | LIVE IN PROD | main | 128db5c | tenantProjectionHelpers.ts |
| Invoice gated to DELIVERED | LIVE IN PROD | main | 128db5c | projectMarketplaceOrders.ts, TrackingPage.tsx |
| DeliveryLocationWizard + checkout address UX | LIVE IN PROD | main | 128db5c | orderbhojan location/checkout |
| Architecture & self-healing audit docs | LIVE IN PROD (docs only) | main | f4e8ea5 | ARCHITECTURE_AUDIT.md, SELF_HEALING_AUDIT.md |
| BAEO agents, Terraform/Helm/K8s scaffolds | LIVE IN PROD (repo only; not deployed infra) | main | 9f19e86 | terraform/, helm/, k8s/, .cursor/ |
| Firebase hosting cache (OrderBhojan) | LOCAL ONLY | — | — | orderbhojan/.firebase/hosting.ZGlzdA.cache |
| Hardcoded Razorpay / Firebase dev keys | NOT STARTED | — | — | src/pages/Checkout.tsx, firebaseClientConfig.ts |
| `adminSettings/global` vs `tenants.storeOperations` split (mana-inti) | NOT STARTED | — | — | AdminPanel.tsx vs marketplace |
| `startAutoWorkflow()` still commented out | NOT STARTED | — | — | server.ts:5058 |
| AutoPilot / tenant crons (free tier gated off) | NOT STARTED | — | — | server.ts `isFreeTierPlatform()` |
| Full founder checkout parity on OrderBhojan (slots, pickup, coupons) | NOT STARTED | — | — | orderbhojan vs src/pages/Checkout.tsx |
| Porter / Rapido courier API integration | NOT STARTED | — | — | courierAdapters.ts |
| Guest tracking last-4 phone hardening | NOT STARTED | — | — | marketplace guest tracking |
| World-readable Firestore tenant/menu rules | NOT STARTED | — | — | firestore.rules |
| `env-debug` endpoint in production | NOT STARTED | — | — | server.ts |
| Payment keys removed from committed source | NOT STARTED | — | — | per ARCHITECTURE_AUDIT §6.1 |
| BUG_AUDIT.md | NOT STARTED (file absent) | — | — | — |

\*Effective enforcement depends on Render env not explicitly disabling flags.

---

## STEP 5 — Audit findings with no code fix

Cross-reference: `ARCHITECTURE_AUDIT.md`, `SELF_HEALING_AUDIT.md`. No `BUG_AUDIT.md` in repo.

| Audit finding | Document | Code change? |
|---------------|----------|--------------|
| Order read auth off by default | ARCHITECTURE §6.1 #1 | **Fixed in code** (`cb0a4d6`) — audit text outdated; verify Render env |
| Public checkout without caller binding | ARCHITECTURE §6.1 #2 | **Fixed** (`cb0a4d6`) — audit text outdated |
| Guest tracking weak verification | ARCHITECTURE §6.1 #3 | **NOT STARTED** |
| World-readable tenants/menu | ARCHITECTURE §6.1 #4 | **NOT STARTED** |
| Hardcoded Razorpay + Firebase keys | ARCHITECTURE §6.1 #5 | **NOT STARTED** |
| Admin password in repo | ARCHITECTURE §6.1 #6 | **NOT STARTED** |
| Default tenant `mana-inti` footgun | ARCHITECTURE §6.1 #7 | **NOT STARTED** |
| Biometric weak salt default | ARCHITECTURE §6.1 #8 | **NOT STARTED** |
| `env-debug` in production | ARCHITECTURE §6.1 #9 | **NOT STARTED** |
| Client writes to unruled collections | ARCHITECTURE §6.1 #10 | **NOT STARTED** |
| Porter / Rapido TODO stubs | ARCHITECTURE §6.2 | **NOT STARTED** |
| `initializeMonitoringJobs` before `_db` | SELF_HEALING root cause | **Fixed** (`cb0a4d6`) — audit text outdated |
| Free tier disables AutoPilot crons | SELF_HEALING §secondary | **NOT STARTED** (by design unless `PLATFORM_TIER=standard`) |
| Auto Workflow commented at boot | SELF_HEALING §secondary | **NOT STARTED** |
| Cron jobs actually running post-fix | SELF_HEALING verification | **NEEDS MANUAL VERIFICATION** (logs) |
| Telemetry Firestore skip on free tier | SELF_HEALING | **NOT STARTED** |
| OrderBhojan CI without auto-deploy | ARCHITECTURE §5.2 | **NOT STARTED** (still manual Firebase) |
| Full premium checkout inheritance (founder → OB) | User request / ARCHITECTURE §6.3 | **Partial** — wizard only (`128db5c`); slots/pickup/coupons **NOT STARTED** |

---

## Recommended manual checks (no code changes)

1. **Render dashboard** → latest deploy commit = `128db5c`; env vars `FF_ORDER_AUTH_ENFORCE`, `FF_RAZORPAY_DRAFT_BIND`, `PLATFORM_TIER`.
2. **Render logs** after deploy → `Cron jobs deferred after deploy` then `Registering background cron jobs: [Heartbeat (...), Expire Unpaid Payments (...)]`.
3. **Firebase console** → `orderbhojan` hosting release time; `mana-inti-bojanam-pune-492610` release vs Vercel `128db5c`.
4. **Live smoke:** `orderbhojan.web.app/restaurant/mana-inti` open badge during IST hours; place order → no invoice until DELIVERED; checkout wizard for address.

---

*This report was generated read-only. No commits, pushes, merges, or deploys were performed as part of this document.*
