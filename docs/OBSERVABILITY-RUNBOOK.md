# Observability Runbook

**Related:** [PRODUCTION_OPERATIONS.md](../PRODUCTION_OPERATIONS.md) · [INCIDENT_RESPONSE.md](../INCIDENT_RESPONSE.md)

This runbook covers automated production checks and external schedulers that must be configured manually.

---

## GitHub Actions — Production Health Monitor

Workflow: `.github/workflows/prod-health-monitor.yml`

| Setting | Value |
|---------|-------|
| Schedule | Every **15 minutes** (`*/15 * * * *`) |
| Manual run | Actions → **Production Health Monitor** → **Run workflow** |

### Checks each run

1. `node scripts/smoke-ops-health.mjs` — `/api/health`, static URLs (`orderbhojan.web.app`, `www.bhojanos.com`), ops route wiring probe
2. `node scripts/release-gate.mjs` — discovery + search against production API
3. `node scripts/verify-tsconfig-baseurl.mjs` — CI guard for tsconfig `paths` + `baseUrl`

### On scheduled failure

- Workflow shows **failed** (red) in GitHub Actions
- Opens (or comments on) a GitHub issue labeled `prod-health-monitor` + `ops`

### Local repro

```bash
API_URL=https://manaintibojanam-backend.onrender.com node scripts/smoke-ops-health.mjs
RELEASE_API_BASE=https://manaintibojanam-backend.onrender.com node scripts/release-gate.mjs
node scripts/verify-tsconfig-baseurl.mjs
```

---

## Render — Required environment variables

Set in **Render Dashboard → bhojanos-prod-api → Environment** (never commit secrets to git).

| Variable | Recommended prod value | Purpose |
|----------|------------------------|---------|
| `PLATFORM_TIER` | `standard` | Enables AutoPilot hourly cron, extended server telemetry (default prod is `free` when unset) |
| `CRON_SECRET` | Long random string | Bearer token for `POST /api/cron/*` routes |
| `RESEND_API_KEY` | From Resend dashboard | Founder alert emails |
| `EMAIL_FROM` | Verified sender | Email From header |

`render.yaml` documents placeholders only — add secrets via the Render UI or Secret Files.

Verify after deploy:

```bash
curl -s https://manaintibojanam-backend.onrender.com/api/health | jq '.platform.tier'
# Expect "standard" when PLATFORM_TIER is set correctly
```

---

## cron-job.org — External HTTP crons

Render free tier sleeps without traffic. Use [cron-job.org](https://cron-job.org) (or UptimeRobot) to **wake** the API and trigger secured cron endpoints.

### 1. Keep API warm + health ping (optional but recommended)

| Field | Value |
|-------|-------|
| URL | `https://manaintibojanam-backend.onrender.com/api/health` |
| Method | GET |
| Schedule | Every **10–14 minutes** |
| Timeout | 30s |

### 2. Founder alerts / AutoPilot aggregator

| Field | Value |
|-------|-------|
| URL | `https://manaintibojanam-backend.onrender.com/api/cron/founder-alerts` |
| Method | POST |
| Schedule | Hourly (`0 * * * *`) or as needed |
| Headers | `Authorization: Bearer <CRON_SECRET>` |
| Body | `{}` (empty JSON) |

Requires `CRON_SECRET` on Render. Without it, the route accepts unauthenticated calls (boot warning only — **set the secret in prod**).

### 3. Expire unpaid payments

| Field | Value |
|-------|-------|
| URL | `https://manaintibojanam-backend.onrender.com/api/cron/expire-unpaid-payments` |
| Method | POST |
| Schedule | Every **15–30 minutes** |
| Headers | `Authorization: Bearer <CRON_SECRET>` |
| Body | `{}` |

### Verification

```bash
# Replace YOUR_CRON_SECRET with Render env value
curl -s -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://manaintibojanam-backend.onrender.com/api/cron/founder-alerts
```

Expect HTTP 200 with a JSON body (not 401/403).

---

## UptimeRobot (manual setup)

Configure monitors (not in repo):

| Monitor | URL | Interval |
|---------|-----|----------|
| API health | `https://manaintibojanam-backend.onrender.com/api/health` | 5 min |
| OrderBhojan | `https://orderbhojan.web.app` | 5 min |
| BhojanOS | `https://www.bhojanos.com` | 5 min |

Alert contacts: founder email + Slack if available.

---

## tsconfig CI guard

```bash
npm run verify:tsconfig-baseurl
```

Fails when any `tsconfig*.json` defines `compilerOptions.paths` without `compilerOptions.baseUrl`. Wired into `ga1-production-verify` CI and the scheduled health monitor.

---

*Update this runbook when adding cron routes, changing prod URLs, or adjusting monitor schedules.*
