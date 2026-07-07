# BhojanOS Production Operations

**Version:** 1.0  
**Related:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) · [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) · [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md)

---

## Production Stack

| Component | Provider | URL / Resource |
|-----------|----------|----------------|
| Frontend | Vercel | `https://www.bhojanos.com` |
| API | Render | `https://manaintibojanam-backend.onrender.com` |
| Database | Firebase | Firestore `bhojanos-prod` |
| Auth | Firebase Auth | Same project |
| Payments | Razorpay | Webhook → `/api/razorpay/webhook` |

---

## Health & Monitoring

### Public health check

```bash
curl -s https://manaintibojanam-backend.onrender.com/api/health | jq .
```

Expected fields:

| Field | Meaning |
|-------|---------|
| `status` | `"ok"` when API is live |
| `firestore.backedOff` | `true` during quota circuit breaker |
| `firestore.projectId` | Must be `bhojanos-prod` in production |
| `platform.build` | Render git commit prefix (`RENDER_GIT_COMMIT`) |
| `platform.tier` | `free` or `standard` — controls extended crons/telemetry |

Optional: `?webClient=1` returns Firebase web SDK config for Vercel bootstrap.

### Smoke script

```bash
node scripts/smoke-ops-health.mjs
# or
API_URL=https://manaintibojanam-backend.onrender.com node scripts/smoke-ops-health.mjs
```

Validates `/api/health` and probes `/api/ops/*` route wiring.

### Uptime monitoring

Configure an external pinger (UptimeRobot, cron-job.org) to `GET /api/health` every 10–14 minutes. Render free tier sleeps without traffic.

---

## Ops APIs (Superadmin)

All ops routes require Firebase superadmin auth (`Authorization: Bearer <id-token>`).

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/ops/incidents` | List incidents from `system_incidents` |
| `GET` | `/api/ops/incidents/stats` | Counts by type since timestamp (AutoPilot source) |
| `GET` | `/api/ops/health-summary` | Dashboard aggregate: health, open incidents, deploy, trend |

Query examples:

```
GET /api/ops/incidents?limit=50&type=system_errors&status=DETECTED
GET /api/ops/incidents/stats?since=2026-07-07T00:00:00.000Z
GET /api/ops/health-summary
```

Client library: `src/lib/opsHealthApi.ts` (`loadOpsDashboardSnapshot`).

Implementation: `backend-lib/observability/registerOpsRoutes.ts`.

---

## Logging & Telemetry

| Signal | Destination | Entry point |
|--------|-------------|-------------|
| Server logs | Render dashboard (Winston JSON) | `server.ts` |
| Client errors | `system_incidents` (+ legacy `client_errors` mirror) | `POST /api/client-errors` → `clientErrorPipeline.ts` |
| Monitoring events | `system_incidents` | `POST /api/monitoring/log` → `IncidentRepository.writeIncident` |
| AutoPilot reports | `platform_health_reports` + founder email | Hourly cron in `server.ts` |

---

## Background Jobs (Render Crons)

Registered in `server.ts` via `node-cron`:

| Job | Schedule | Notes |
|-----|----------|-------|
| Hourly AutoPilot Aggregator | `0 * * * *` | Disabled on free tier |
| Outbox / payment expiry / founder alerts | Various | See `server.ts` cron block |

Free tier (`platform.tier: free`) disables AutoPilot and extended telemetry to protect Firestore quota.

---

## Firestore Quota Protection

Server-side circuit breaker in `server.ts`:

- Detects quota / `resource_exhausted` errors
- Sets `firestore.backedOff: true` in `/api/health`
- Skips non-critical Firestore writes during backoff

Monitor `firestore.backedOff` in health checks and Render logs.

---

## Dashboards

| Surface | Route | Data source |
|---------|-------|-------------|
| Founder ops | `/admin/system-health` (extending to `/ops`) | `opsHealthApi` → `/api/ops/*` |
| Owner metrics | `/owner/dashboard` | Owner API polling |
| Render | Render dashboard | 5xx, latency, memory |
| Firebase Console | Firestore metrics | Read/write ops, rule errors |

---

## Pre-Deploy Checklist

1. `npm run lint && npm run test:unit`
2. `npm run build:server` (production bundle)
3. `node scripts/smoke-ops-health.mjs` against staging or prod after deploy
4. Confirm `/api/health` → `platform.build` matches deployed commit
5. Verify UptimeRobot ping still active

See also: `docs/ga-2/MONITORING.md`, `scripts/pre-cutover-checklist.sh`.

---

## Rollback

1. Redeploy previous Render commit from dashboard
2. Verify `/api/health` build hash and `firestore.projectId`
3. Check open incidents via `/api/ops/health-summary`
4. See `docs/ga-1/ROLLBACK.md` for full procedure

---

*Maintainers: update when adding ops routes, crons, or changing monitoring collections.*
