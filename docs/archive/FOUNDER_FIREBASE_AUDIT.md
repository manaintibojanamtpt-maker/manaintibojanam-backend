# Founder Firebase Deployment Audit

**Audit date:** 2026-07-09  
**Scope:** Read-only investigation of the undocumented “Founder Firebase” hosting target identified in deploy-status review  
**Auditor role:** Senior engineer — trace from code and live endpoints; no deploy, build, or push performed

---

## Executive summary (plain language)

**“Founder Firebase” is not a separate application.** It is the **same BhojanOS React SPA** (`src/` → Vite → `dist/`) as `www.bhojanos.com`, deployed manually to **Firebase Hosting** under the legacy GCP project **`mana-inti-bojanam-pune-492610`**, hosting site **`mana-inti-bojanam-pune-492610`**, at:

| URL | Role |
|-----|------|
| **https://mana-inti-bojanam-pune-492610.web.app** | Canonical founder customer storefront (documented in backend + Render) |
| **https://mana-inti-bojanam-pune-492610.firebaseapp.com** | Alternate Firebase default domain (same site) |

It exists to serve **Mana Inti Bojanam** — the founder’s own kitchen (`tenantId` / `slug`: **`mana-inti`**) — at **root paths** (`/`, `/menu`, `/checkout`) with **Mana Inti branding**, instead of the multi-tenant path used on Vercel (`/k/mana-inti/...`).

It is **customer-facing** (public ordering), not an admin-only tool. Owner, admin, and super-admin routes exist in the same bundle but are not the purpose of this host.

**Live state (verified 2026-07-09):** This target is **stale** relative to Vercel. It serves bundle `main-xLz_bsJk.js`, has **no real `/version.json`** (SPA rewrite returns `index.html`), and lacks the version/bootstrap scripts present on current Vercel builds. Vercel production is at commit **`04818e5`** (`main-CUdcEbtj.js`).

---

## 1. Where this target is defined in the codebase

### 1.1 Firebase hosting configuration

**`firebase.json`** defines **two** hosting entries, both serving **`public: "dist"`** (the root BhojanOS Vite build):

| `target` | Purpose in repo |
|----------|-----------------|
| **`storefront`** | Founder / legacy single-tenant storefront |
| **`saas`** | Legacy BhojanOS SaaS hosting (superseded by Vercel) |

Both use identical rewrites (`**` → `/index.html`) and security headers.

**`.firebaserc`** maps targets to Firebase projects and site IDs:

```json
"mana-inti-bojanam-pune-492610": {
  "hosting": {
    "storefront": ["mana-inti-bojanam-pune-492610"],
    "saas": ["bhojanos"]
  }
},
"bhojanos-prod": {
  "hosting": {
    "saas": ["bhojanos-prod"]
  }
}
```

**Important:** `mana-inti-bojanam-pune-492610` appears under **`targets`** but **not** under **`projects`**. The CLI default project is **`bhojanos2`**. A naive `firebase deploy --only hosting` (see `package.json` `deploy` script) does **not** document the required `--project mana-inti-bojanam-pune-492610` or `hosting:storefront` selector.

### 1.2 Source application

| Question | Answer | Evidence |
|----------|--------|----------|
| Same app as BhojanOS (Vercel)? | **Yes** | `firebase.json` → `dist/`; same `src/App.tsx`, `src/pages/Checkout.tsx`, etc. |
| Same app as OrderBhojan? | **No** | OrderBhojan is `orderbhojan/` with its own `firebase.json` → `orderbhojan/dist/` |
| Third separate app? | **No** | Single monorepo SPA with host-based branding |

**Build commands:**

| Command | Used by | Writes `version.json`? |
|---------|---------|------------------------|
| `npm run build:web` | Vercel (`vercel.json`) | **Yes** — `scripts/write-version-json.mjs` |
| `npm run build` | `npm run deploy`, Render API build | **No** — Vite only |
| `npm run deploy` | Documented manual Firebase path | **No** — runs `build`, not `build:web` |

### 1.3 URLs wired into production backend

The Render API is explicitly configured to link non-marketplace customers back to this host:

| Location | Value |
|----------|-------|
| `render.yaml` | `FOUNDER_STOREFRONT_URL=https://mana-inti-bojanam-pune-492610.web.app` |
| `backend-lib/shared/customerOrderLinks.ts` | Default storefront for `tenantSlug === 'mana-inti'` |
| `server.ts` | Uses same env vars for order links / notifications |

Equivalent on Vercel for other tenants: `https://www.bhojanos.com/k/{slug}` (`customerOrderLinks.ts`, `EnvironmentConfig.getStorefrontUrl`).

---

## 2. Purpose and audience

### 2.1 Customer-facing founder storefront

**Audience:** End customers ordering from the founder kitchen (Mana Inti Bojanam, Pune).

**Not** an internal-only or founder-admin tool. Admin/owner capabilities live in the same SPA but are accessed via `/owner/*`, `/admin/*`, `/super-admin/*` — the same as on Vercel.

### 2.2 How this host differs from Vercel BhojanOS

| Aspect | Founder Firebase | Vercel `www.bhojanos.com` |
|--------|------------------|---------------------------|
| Primary role | Founder kitchen **direct storefront** | BhojanOS **platform** (marketing, owner portal, all tenant storefronts) |
| Founder kitchen URL shape | `/`, `/menu`, `/checkout` (no `/k/mana-inti` prefix) | `/k/mana-inti/...` or marketing at `/` → `marketing.html` |
| Document title / PWA | `index.html` sets **“Mana Inti Bojanam”** when hostname does not include `bhojanos` | **“BhojanOS”** branding + `manifest-bhojanos.json` |
| Marketing pages | Same routes exist in bundle but not Vercel-style `marketing.html` rewrite | `/onboard`, `/pricing`, etc. served from `marketing.html` |
| API proxy | Calls Render API directly (`EnvironmentConfig.getApiUrl()`) | `/api/*` proxied to Render via `vercel.json` |
| Firebase client bootstrap | **Skipped** — `firebase-config-bootstrap-snippet.mjs` only runs when hostname contains `bhojanos` | Loads `bhojanos-prod` from `/api/client-config` if `VITE_FIREBASE_*` missing |
| Root `/` behavior | `StorefrontRootRoute` → `<Home />` (not BhojanOS onboarding) | `/` → `marketing.html` (onboard landing) |

`EnvironmentConfig.isBhojanOSRoot()` treats `*.firebaseapp.com` as BhojanOS root but **not** `*.web.app`, so `mana-inti-bojanam-pune-492610.web.app` follows the **legacy storefront** code path.

### 2.3 How this host differs from OrderBhojan

| Aspect | Founder Firebase | OrderBhojan (`orderbhojan.web.app`) |
|--------|------------------|-------------------------------------|
| App | Root `src/` BhojanOS SPA | `orderbhojan/src/` marketplace PWA |
| Data model | Legacy tenant storefront + direct Firestore reads | Marketplace API (`/api/marketplace/*`) + limited Firestore for profiles/addresses |
| Checkout UX | `src/pages/Checkout.tsx`, `AutoLocationForm` | Separate `orderbhojan/src/features/checkout/` |
| Order tracking links | `/order/{id}` on storefront URL | `/orders/{id}/track` on OrderBhojan URL |
| Firebase project (hosting) | `mana-inti-bojanam-pune-492610` | `orderbhojan` |

### 2.4 Auth gating

**No hosting-level restriction** (no IP allowlists, no Firebase Hosting auth middleware) found in `firebase.json`.

**Application-level:**

| Mechanism | Applies to founder storefront? |
|-----------|-------------------------------|
| Public menu / checkout | **Yes** — intended open access |
| `/orders`, `/account` | `ProtectedRoute` — requires customer login |
| `/owner/*` | `OwnerRoute` — requires owner auth (not founder-host-specific) |
| `/admin`, `/super-admin` | Role-gated (`admin` / `superadmin`) |
| Founder email checks | **Server-side** (`FOUNDER_EMAIL`, `src/config/founder.ts`) and **Firestore rules** — for **platform/owner privileges**, not for blocking public storefront |
| Default API tenant | `server.ts` defaults missing tenant to `mana-inti` — affects API behavior, not hosting access |

**Conclusion:** Customer-facing and public; not an internal admin deployment.

### 2.5 Code paths checked for “founder-only” storefront gating

- `firebase.json` / `.firebaserc` — no access restrictions
- `src/App.tsx` routes — same SPA for all hosts
- `src/config/founder.ts`, `server.ts` `FOUNDER_*` — owner/platform identity, not storefront lockdown
- `index.html` hostname script — branding only
- GitHub Actions workflows — no founder-host deploy or gate

---

## 3. Deploy process

### 3.1 CI/CD

| Pipeline | Deploys founder Firebase? |
|----------|---------------------------|
| Vercel (Git push) | **No** — deploys `www.bhojanos.com` only |
| Render (`render.yaml`) | **No** — API only |
| `.github/workflows/orderbhojan-ci.yml` | **No** — build/test gate only; comment in `ARCHITECTURE_AUDIT.md` confirms no auto-deploy |
| `.github/workflows/ga1-production-verify.yml`, `ga2-stabilization-verify.yml` | **No** — verification only |
| IaC staging workflows | **No** — GKE spine, not this hosting |

**Deploy is manual** via Firebase CLI, same class as OrderBhojan Firebase hosting.

### 3.2 Documented manual commands

| Source | Command |
|--------|---------|
| `package.json` | `npm run deploy` → `npm run build && firebase deploy --only hosting` |
| `DEPLOYMENT_GUIDE.md` | “Hosting (legacy path)” — same script; notes Vercel is primary |
| `IMPLEMENTATION_GUIDE.md` | `firebase deploy --only hosting` (generic) |

**Gaps in the documented deploy path:**

1. **`build` vs `build:web`** — deploy script skips `write-version-json.mjs` → explains missing `/version.json` on Firebase.
2. **Default Firebase project** — `.firebaserc` default is `bhojanos2`; founder site requires **`--project mana-inti-bojanam-pune-492610`** (not aliased in `projects`).
3. **Target selection** — `firebase.json` has two targets; precise deploy is likely  
   `firebase deploy --only hosting:storefront --project mana-inti-bojanam-pune-492610`  
   after `npm run build:web` (or equivalent).
4. **`.env.example` line 17** explicitly warns: *“DO NOT: deploy same SPA to Vercel + Firebase Hosting (doubles Firestore reads)”* — architectural tension with keeping this target live.

### 3.3 `version.json` status

| Target | `/version.json` behavior |
|--------|--------------------------|
| Vercel | Real JSON, e.g. `{"build":"04818e53e55a",...}`; cache-bust bootstrap in `index.html` |
| Founder Firebase | **Absent** — request returns **`index.html`** (HTTP 200 via SPA rewrite) |
| OrderBhojan Firebase | Separate app; not audited in depth here |

**Assessment:** Missing `version.json` on founder Firebase is an **oversight**, not intentional. The Vercel pipeline always runs `write-version-json.mjs`; the Firebase `deploy` script does not. The live site also predates current `APP_VERSION_BOOTSTRAP` / `FIREBASE_CONFIG_BOOTSTRAP` injections in `index.html`.

### 3.4 Live drift verification (2026-07-09)

| Endpoint | Main bundle | Build traceability |
|----------|-------------|-------------------|
| `https://www.bhojanos.com/` | `main-CUdcEbtj.js` | `version.json` → `04818e5` |
| `https://mana-inti-bojanam-pune-492610.web.app/` | `main-xLz_bsJk.js` | No `version.json`; older HTML (manifest `v=3`, no bootstrap scripts) |
| `https://bhojanos.web.app/` | `main-xLz_bsJk.js` | Same stale artifact — **`saas`** target in same Firebase project |

Render API health: `platform.build` = **`04818e5`**, `firestore.projectId` = **`bhojanos-prod`**.

---

## 4. Data plane and drift risk

### 4.1 Shared code with BhojanOS / OrderBhojan

| Shared with | Risk if founder Firebase not redeployed |
|-------------|----------------------------------------|
| **BhojanOS (Vercel)** | **High** — identical `src/` tree: checkout, store hours, invoice gating, address UX, etc. all drift |
| **OrderBhojan** | **Low direct UI drift** — separate codebase; indirect risk via shared API/backend behavior |

Customers receiving WhatsApp/email tracking links for **non-marketplace** `mana-inti` orders are sent to **`FOUNDER_STOREFRONT_URL`** (this host), so they hit the **stale** UI while Vercel users get current behavior.

### 4.2 Firebase / Firestore project

| Layer | Project used today (production) | Notes |
|-------|----------------------------------|-------|
| Render API (Admin SDK) | **`bhojanos-prod`** | Verified via `/api/health` |
| Vercel BhojanOS client | **`bhojanos-prod`** | Via `VITE_FIREBASE_*` or `/api/client-config` bootstrap |
| Founder Firebase client | **Likely misconfigured without build-time env** | No `bhojanos` hostname → bootstrap skipped; without `VITE_FIREBASE_*` at build, `firebaseClientConfig.ts` falls back to **`DEV_FIREBASE` (`bhojanos2`)** in non-bhojanos production builds |
| Firebase **Hosting** project | **`mana-inti-bojanam-pune-492610`** | Hosting only; legacy GCP project name from original “Mana Inti” deployment |
| OrderBhojan | **`orderbhojan`** | Separate Auth/Firestore for marketplace customers |

**Legacy docs** (`PUSH_NOTIFICATIONS_SETUP.md`, `PROD_AUDIT_TEMPLATE.md`) still reference `mana-inti-bojanam-pune-492610` as the data project; **current** `render.yaml` / `.env.example` / live health indicate **data has moved to `bhojanos-prod`**. The hosting project name is a historical artifact.

### 4.3 Tenant resolution caveat (current code)

On founder Firebase, paths omit `/k/mana-inti`. `TenantContext` only resolves tenant from `/k/{slug}` or `/owner` paths; at `/` it sets `loading=false` without assigning `mana-inti`. `Home.tsx` requires `activeTenantId` before loading menu (`if (tenantLoading || !activeTenantId) return`).

`useStoreBranding` treats empty slug + empty/`mana-inti` id as default storefront, but **menu fetch may not run** without tenant id. This may indicate **further drift** between intended founder-root behavior and current tenant resolution — worth validating on a fresh deploy, not guessable from hosting config alone.

---

## 5. Related legacy target (same project)

The **`saas`** target in project `mana-inti-bojanam-pune-492610` maps to site **`bhojanos`** → **https://bhojanos.web.app**.

Live check: **same stale bundle** as founder storefront (`main-xLz_bsJk.js`). This appears to be an **abandoned pre-Vercel BhojanOS host**, not a third application.

---

## 6. Recommendation

### 6.1 Do not leave as-is

Given:

- Backend still emits customer links to `FOUNDER_STOREFRONT_URL`
- Live bundle is behind Vercel by multiple commits
- No `version.json` or automated deploy
- `.env.example` discourages dual Vercel + Firebase SPA hosting
- Possible wrong Firestore client project on founder host without explicit `VITE_FIREBASE_*` at build time

**Manual/occasional deploy is not fine** if this URL remains in production notification flows.

### 6.2 Preferred options (in order)

| Option | Action | When to choose |
|--------|--------|----------------|
| **A. Redirect / retire hosting** | Point `mana-inti-bojanam-pune-492610.web.app` → `https://www.bhojanos.com/k/mana-inti` (Firebase redirect or DNS); update `FOUNDER_STOREFRONT_URL` / `customerOrderLinks.ts` defaults; deprecate `hosting:storefront` | **Recommended** — single customer surface, matches platform model, reduces Firestore double-read risk |
| **B. Add to regular deploy + version tracking** | Post-Vercel deploy job or manual runbook: `npm run build:web && firebase deploy --only hosting:storefront --project mana-inti-bojanam-pune-492610` with `VITE_FIREBASE_*=bhojanos-prod`; verify `/version.json` | Only if founder **must** keep root-path URLs (printed QR codes, old marketing) |
| **C. Keep manual, remove from link generation** | Stop sending new users to Firebase URL; leave site up unmaintained until traffic zero | Short-term bridge only |

### 6.3 Minimum if retaining (Option B)

1. Change `package.json` `deploy` to use `build:web` and document exact project/target flags.
2. Add `mana-inti-bojanam-pune-492610` to `.firebaserc` `projects` alias.
3. Include founder Firebase in deploy runbook parity checks (compare `/version.json` or bundle hash to Vercel).
4. Fix tenant default resolution for root-path founder host if menu load is broken on current `main`.

---

## 7. What could not be determined from code alone

| Unknown | What was checked | What would confirm |
|---------|------------------|-------------------|
| Exact git commit of live `main-xLz_bsJk.js` | Live HTTP fetch, `DEPLOY_STATUS.md` | Firebase Console → Hosting release history |
| Last manual deploy date / operator | No deploy logs in repo | Firebase Console, local shell history |
| Whether custom domain (e.g. `manaintibojanam.com`) points here | Not referenced in `firebase.json` | DNS + Firebase custom domains |
| Live Firestore project used by stale bundle in browser | Client config is build-time / fallback logic | Browser devtools → Firebase init network tab |
| Whether founder QR / print materials require root URL | No asset inventory in repo | Business/ops input |

---

## 8. Files reviewed

| File | Relevance |
|------|-----------|
| `firebase.json`, `.firebaserc` | Hosting targets and project mapping |
| `package.json`, `vercel.json` | Build and deploy scripts |
| `scripts/write-version-json.mjs`, `scripts/firebase-config-bootstrap-snippet.mjs` | Version tracking and Firebase bootstrap |
| `render.yaml`, `backend-lib/shared/customerOrderLinks.ts` | Production URL wiring |
| `DEPLOYMENT_GUIDE.md`, `ARCHITECTURE_AUDIT.md`, `DEPLOY_STATUS.md`, `.env.example` | Documented deploy intent |
| `src/App.tsx`, `src/config/environment.ts`, `index.html` | Host-based routing and branding |
| `src/config/founder.ts`, `src/hooks/useStoreBranding.ts`, `src/context/TenantContext.tsx` | Founder tenant and storefront behavior |
| `src/config/firebaseClientConfig.ts`, `src/lib/runtimeFirebaseConfig.ts` | Client Firebase project selection |
| `.github/workflows/*` | CI — no auto-deploy found |
| `orderbhojan/firebase.json`, `.github/workflows/orderbhojan-ci.yml` | Contrast with OrderBhojan deploy model |
| Live: `mana-inti-bojanam-pune-492610.web.app`, `www.bhojanos.com`, `bhojanos.web.app`, Render `/api/health` | Drift and version parity |

---

## 9. One-sentence identity

**Founder Firebase = the legacy Firebase Hosting copy of the BhojanOS SPA used as the public Mana Inti (`mana-inti`) customer storefront at root URLs, still linked from production order notifications, manually deployed and currently stale relative to Vercel.**
