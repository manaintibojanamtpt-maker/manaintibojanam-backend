# Firebase Hosting Architecture Audit (2026-07-11)

## Current state (before correction)

| Item | Value |
|------|--------|
| **Firebase backend project** | `bhojanos-prod` (Firestore, Auth, Storage, Functions) |
| **Default hosting site (wrong deploy)** | `bhojanos-prod` → https://bhojanos-prod.web.app |
| **OrderBhojan hosting project** | Separate Firebase project `orderbhojan` (hosting shell only) |
| **OrderBhojan hosting site** | `orderbhojan` → https://orderbhojan.web.app |
| **Founder storefront (legacy)** | `mana-inti-bojanam-pune-492610` project / `storefront` target |
| **Root deploy command** | `npm run deploy` → `firebase deploy --only hosting` (default project `bhojanos2`, ambiguous targets) |
| **OrderBhojan deploy (RC3 mistake)** | `firebase deploy --only hosting --project bhojanos-prod` from `orderbhojan/` |
| **Production URL after RC3** | https://bhojanos-prod.web.app (incorrect for marketplace) |
| **Intended marketplace URL** | https://orderbhojan.web.app → https://orderbhojan.com |
| **CI/CD** | GitHub Actions run gates only; no automated Firebase deploy |
| **Vercel** | Root BhojanOS SPA (`vercel.json`) — marketing + multi-tenant storefront |
| **Environment (OrderBhojan)** | `VITE_FIREBASE_*` → `bhojanos-prod` (backend unchanged) |

### Problems

1. OrderBhojan was deployed to the **default** `bhojanos-prod` hosting site instead of **orderbhojan.web.app**.
2. Root `firebase.json` used legacy targets `storefront` / `saas` mapped to old GCP projects.
3. `.firebaserc` default project was `bhojanos2`; founder targets pointed at `mana-inti-bojanam-pune-492610`.
4. `orderbhojan/firebase.json` was a standalone config with no hosting target — easy to deploy to the wrong project.
5. No per-app deploy scripts (`deploy:orderbhojan`, etc.).

### Firebase global site ID constraint

Firebase Hosting **site IDs are globally unique** and cannot be moved between projects.

- `orderbhojan` → reserved by Firebase project **`orderbhojan`** (cannot create on `bhojanos-prod`).
- `owner`, `admin` → globally reserved (not available on `bhojanos-prod`).

**Architecture decision:** Keep **one backend** (`bhojanos-prod`) for all apps. Use **hosting-only** Firebase project `orderbhojan` for https://orderbhojan.web.app. All other frontends deploy as additional sites on `bhojanos-prod`.

---

## Corrected architecture

```
Firebase backend (shared)
  bhojanos-prod
    ├── Firestore
    ├── Authentication
    ├── Storage
    ├── Cloud Functions
    └── Analytics

Hosting (frontends only)
  orderbhojan (Firebase project: orderbhojan)
    └── site orderbhojan → https://orderbhojan.web.app
        └── build: orderbhojan/dist
        └── custom domain: orderbhojan.com (Firebase Console)

  bhojanos-prod (Firebase project: bhojanos-prod)
    ├── site manaintibojanam → https://manaintibojanam.web.app
    │     └── build: dist/ (founder storefront SPA)
    ├── site bhojanos-owner → https://bhojanos-owner.web.app
    │     └── build: dist/ (owner portal routes)
    └── site bhojanos-admin → https://bhojanos-admin.web.app
          └── build: dist/ (admin portal routes)
```

Legacy default site `bhojanos-prod.web.app` is **not** used for new marketplace deploys.

---

## Deploy commands

Run from repository root unless noted.

| Script | Command | URL |
|--------|---------|-----|
| `npm run deploy:orderbhojan` | Build `orderbhojan/` + `firebase deploy --only hosting:orderbhojan --project orderbhojan` | https://orderbhojan.web.app |
| `npm run deploy:founder` | `npm run build:web` + `hosting:manaintibojanam` on `bhojanos-prod` | https://manaintibojanam.web.app |
| `npm run deploy:owner` | `npm run build:web` + `hosting:owner` on `bhojanos-prod` | https://bhojanos-owner.web.app |
| `npm run deploy:admin` | `npm run build:web` + `hosting:admin` on `bhojanos-prod` | https://bhojanos-admin.web.app |
| `npm run deploy:all` | All of the above | — |

From `orderbhojan/`: `npm run deploy` (builds + deploys to orderbhojan.web.app).

---

## Files changed

- `.firebaserc` — default `bhojanos-prod`; targets for all hosting sites
- `firebase.json` — four hosting targets (composed via `scripts/firebase/compose-firebase-hosting.mjs`)
- `package.json` — deploy scripts
- `orderbhojan/package.json` — `deploy` script
- `orderbhojan/firebase.json` — pointer to root config

---

## Follow-up (Firebase Console)

1. Add **custom domain** `orderbhojan.com` on project **orderbhojan** → site **orderbhojan**.
2. Add **authorized domains** (see `AUTHORIZED-DOMAINS.md`).
3. Optionally add custom domains for `owner` / `admin` on `bhojanos-owner` / `bhojanos-admin` sites.
4. Do **not** delete `bhojanos-prod.web.app` until traffic is confirmed on orderbhojan.web.app.
