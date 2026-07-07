# BhojanOS Deployment Guide

**Version:** 1.0  
**Stack:** Vercel (frontend) + Render (API) + Firebase (Firestore)  
**Related:** [PRODUCTION_OPERATIONS.md](./PRODUCTION_OPERATIONS.md) · [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md)

---

## Architecture at Deploy Time

```
Git push
   │
   ├── Vercel (auto) ──► www.bhojanos.com  (static + SPA)
   │
   └── Render (auto) ──► manaintibojanam-backend.onrender.com  (Express API)
                              │
                              ▼
                        Firebase bhojanos-prod
```

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node 20+ | Matches Render runtime |
| Firebase project | `bhojanos-prod` with service account JSON on Render |
| Vercel project | Connected to repo root |
| Render web service | Defined in `render.yaml` |
| Razorpay keys | Render env vars for payment routes |

---

## Frontend — Vercel

### Build settings

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Build command | `npm run build:web` |
| Output directory | `dist` |
| Install command | `npm ci` |

`build:web` runs:

1. `scripts/verify-vercel-firebase-env.mjs` — warns on missing `VITE_FIREBASE_*` (bootstrap fallback exists)
2. `scripts/write-version-json.mjs` — writes `dist/version.json` with build hash
3. `vite build`

### Environment variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Render API base (e.g. `https://manaintibojanam-backend.onrender.com`) |
| `VITE_FIREBASE_*` | Optional — runtime bootstrap via `/api/client-config` if missing |
| `VITE_PLATFORM_TIER` | `standard` for extended client telemetry in prod |

### Firebase config bootstrap

If Vercel build lacks Firebase env, `index.html` snippet loads config from:

- `GET /api/client-config`
- `GET /api/health?webClient=1`

See `scripts/firebase-config-bootstrap-snippet.mjs`.

### Deploy

```bash
# Manual (if not using Git integration)
npm run build:web
# Vercel CLI or dashboard upload of dist/
```

Production URL: `https://www.bhojanos.com`

---

## API — Render

### Service definition

`render.yaml`:

```yaml
services:
  - type: web
    name: bhojanos-prod-api
    runtime: node
    buildCommand: npm ci && npm run build
    startCommand: node dist/server.cjs
```

### Build pipeline

```bash
npm ci
npm run build    # vite build + esbuild server.ts → dist/server.cjs
```

Production server bundle: `scripts/build-server.mjs` (preferred path after build fix).

Start:

```bash
node dist/server.cjs
```

### Environment variables (Render)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NODE_ENV` | Yes | `production` |
| `GOOGLE_APPLICATION_CREDENTIALS` or JSON inline | Yes | Firebase Admin |
| `FIREBASE_PROJECT_ID` | Yes | `bhojanos-prod` |
| `RENDER_GIT_COMMIT` | Auto | Exposed as `platform.build` in health |
| `EMAIL_USER` / `EMAIL_PASS` | For alerts | AutoPilot founder email |
| `FOUNDER_EMAIL` | Optional | Alert recipient |
| Razorpay keys | For payments | Webhook verification |

Memory: `NODE_OPTIONS=--max-old-space-size=4096` (see `render.yaml`).

### Deploy verification

```bash
curl -s https://manaintibojanam-backend.onrender.com/api/health | jq .
```

Expect:

- `status: "ok"`
- `firestore.projectId: "bhojanos-prod"`
- `platform.build` matching deployed commit prefix

```bash
node scripts/smoke-ops-health.mjs
```

---

## Firebase (Firestore Rules & Indexes)

Deploy rules and indexes separately (not on every app deploy):

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Hosting (legacy path):

```bash
npm run deploy   # vite build + firebase deploy --only hosting
```

Primary production hosting is Vercel; Firebase hosting may serve redirects or legacy assets.

---

## Quality Gates

Before production promote:

```bash
npm run lint
npm run test:unit
npm run build
npm run test:smoke          # preprod-smoke-test.ts
node scripts/smoke-ops-health.mjs
npm run gate:ga1              # optional legacy flag gate
```

---

## Version Parity

After deploy, confirm frontend and API builds align:

| Check | Location |
|-------|----------|
| API build | `/api/health` → `platform.build` |
| Web build | `https://www.bhojanos.com/version.json` |

Prefix should match git commit SHA.

---

## Rollback

### Render (API)

1. Open Render dashboard → `bhojanos-prod-api`
2. Deploy previous successful build / manual deploy from known-good commit
3. Verify `/api/health` build hash

### Vercel (Frontend)

1. Vercel dashboard → Deployments → Promote previous deployment
2. Hard-refresh or wait for CDN propagation

Full procedure: `docs/ga-1/ROLLBACK.md`

---

## Staging

Staging values and tenant seed scripts: `scripts/staging/`, `helm/values/staging.yaml` (future k8s path — not production today).

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| 502 on API | Render logs; cold start; `node dist/server.cjs` exists |
| Wrong Firestore project | `/api/health` `firestore.projectId` |
| Login broken on Vercel | `VITE_API_URL`, Firebase bootstrap snippet |
| AutoPilot silent | `platform.tier` — free tier disables crons |
| Quota errors | `firestore.backedOff`, consolidate owner polling |

---

## Related Runbooks

- `docs/ga-1/GA-1-LEGACY-PRODUCTION-DEPLOYMENT.md` — GA-1 legacy path
- `docs/ga-2/MONITORING.md` — post-deploy monitoring
- `scripts/FRESH_START_CUTOVER.md` — project cutover
- `scripts/pre-cutover-checklist.sh` — automated health check

---

*Maintainers: update when changing build commands, hosts, or env var requirements.*
