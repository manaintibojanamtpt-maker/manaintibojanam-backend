# Self-Healing & Incident Response Audit

**Audit date:** 2026-07-09  
**Scope:** `f:/Manaintibojanam_final2` (read-only trace; no code changes)  
**Production context:** Render API (`manaintibojanam-backend.onrender.com`), Vercel frontend, Firebase `bhojanos-prod`, default `PLATFORM_TIER=free` in production

---

## Executive Summary

This codebase has **multiple overlapping “reliability” systems**, but they are **not a unified self-healing platform**. Most server-side automation is **detect → log → alert** (founder email), not **detect → fix**. Several recovery paths are **explicitly disabled or never wired** in production.

**Single most likely root cause** why incident response / AutoPilot appears dead in production:

> **`initializeMonitoringJobs()` is invoked before Firebase Admin initializes `_db`, so it returns immediately and never registers any `node-cron` jobs** — including the Hourly AutoPilot Aggregator, heartbeat, payment expiry, and tenant notification crons.

Evidence: `server.ts:5292-5293` (`if (!_db) return;`), `server.ts:5387` (`initializeMonitoringJobs()`), `server.ts:5389` (`startServer()` sets `_db` at `4971` asynchronously).

**Secondary production suppressors (confirmed in code):**

1. **Free tier default** — `isFreeTierPlatform()` returns `true` when `NODE_ENV=production` and `PLATFORM_TIER` is unset (`server.ts:382-386`). AutoPilot and tenant report crons are inside `if (!freeTier)` (`server.ts:5331-5378`).
2. **Auto Workflow worker commented out** at boot (`server.ts:5057-5058`).
3. **Founder alert delivery** depends on Resend/SMTP; boot warns if email not configured (`server.ts:5062-5068`) — **needs verification** on Render env.

---

## System Map (Intended vs Actual)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CLIENT (browser)                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  window errors ──► monitoring.ts logIncident ──► POST /api/monitoring/log│
│  SelfHealingUtils ──► SW unregister + cache purge + location.reload()    │
│  FirestoreRetryPolicy ──► backoff / circuit open (reads only)            │
│  TelemetryService.logCritical ──► client_errors (SKIPPED on free tier) │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ SERVER (Render / server.ts)                                              │
├─────────────────────────────────────────────────────────────────────────┤
│  POST /api/client-errors ──► clientErrorPipeline ──► system_incidents   │
│  POST /api/monitoring/log ──► IncidentRepository.writeIncident          │
│  Firestore quota breaker ──► skip writes + cron skip during backoff     │
│                                                                          │
│  node-cron jobs (AutoPilot, heartbeat, expiry, tenant reports)          │
│       ▲                                                                  │
│       └── NOT REGISTERED: initializeMonitoringJobs() exits when !_db   │
│                                                                          │
│  startOutboxWorker() ──► processOutboxBatch (RUNS on boot)              │
│  startAutoWorkflow() ──► COMMENTED OUT at boot                          │
│                                                                          │
│  Manual/external cron HTTP: POST /api/cron/founder-alerts, etc.         │
│       └── Works IF external caller configured (needs verification)      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ ACT (mostly alert, rarely auto-fix)                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  AutoPilot: score + founder email (no automated remediation)             │
│  Outbox worker: retry failed EMAIL/WHATSAPP/FCM (notification recovery) │
│  expireUnpaidPayments: mark stale drafts/orders EXPIRED (cron or HTTP)   │
│  Auto Workflow: advance order status (DISABLED)                          │
│  Client SelfHealingUtils: hard browser reload (UX recovery only)         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 1 — Files Involved

| File | Role |
|------|------|
| `server.ts` | Central hub: quota circuit breaker, IncidentRepository, monitoring endpoints, outbox worker, Auto Workflow, AutoPilot crons, boot sequence |
| `backend-lib/observability/IncidentRepository.ts` | Single write path to `system_incidents`; AutoPilot type counts; mirrors some types to `client_errors` |
| `backend-lib/observability/clientErrorPipeline.ts` | Validates/dedupes `POST /api/client-errors`; writes `system_errors` incidents |
| `backend-lib/observability/incidentTypes.ts` | Incident type taxonomy, `system_incidents` collection name |
| `backend-lib/observability/registerOpsRoutes.ts` | Read APIs for founder ops (`/api/ops/incidents`, stats, health-summary) |
| `src/lib/monitoring.ts` | BhojanOS client: captures errors/API failures → `POST /api/monitoring/log`; offline queue in localStorage |
| `src/core/reliability/SelfHealingUtils.ts` | Client “hard recovery”: unregister SW, purge caches, selective localStorage clear, reload |
| `src/core/reliability/GlobalErrorBoundary.tsx` | Triggers SelfHealingUtils on chunk load errors |
| `src/core/reliability/TelemetryService.ts` | In-memory ring buffer + optional Firestore `client_errors` writes (skipped on free tier) |
| `src/lib/firestoreRetryPolicy.ts` | Client Firestore read retry + circuit breaker (protective, not incident-driven) |
| `src/lib/clearFirebaseProjectCache.ts` | Firebase IDB purge; uses SelfHealingUtils on project mismatch |
| `src/config/platformTier.ts` | Client `VITE_PLATFORM_TIER`; prod defaults **free** → limits extended telemetry |
| `orderbhojan/src/telemetry/clientErrorSink.ts` | OrderBhojan errors → `POST /api/client-errors` |
| `storeBrain.ts` | Skips menu refresh during quota backoff |
| `INCIDENT_RESPONSE.md` | Runbook: detect/triage/mitigate (mostly manual) |
| `PRODUCTION_OPERATIONS.md` | Documents crons, health checks, free-tier behavior |

**Documentation-only (no runtime code):** `docs/staging/ops-execution/INCIDENT-RESPONSE-GUIDE.md`, `docs/ga-2/MONITORING.md`

**Not found:** No server module named `healer`, `watchdog`, `autofix`, or `incidentResponse` class. “Self-healing” is split across client reload logic + notification outbox retries + docs.

---

## STEP 2 — Triggers (Intended vs Wired)

### A. Server `node-cron` jobs (`initializeMonitoringJobs`)

| Job | Schedule | Intended trigger | Wired? |
|-----|----------|------------------|--------|
| Heartbeat → `system_meta/heartbeat` | `*/30` or `*/15` min | `node-cron` after 120s delay | **NOT WIRED UP** — see root cause |
| Expire unpaid payments | `*/15` or `*/10` min | `node-cron` | **NOT WIRED UP** |
| Hourly AutoPilot Aggregator | `0 * * * *` | `node-cron` | **NOT WIRED UP** (+ disabled on free tier anyway) |
| Daily founder digest | `0 8 * * *` | `node-cron` | **NOT WIRED UP** (+ free tier) |
| Tenant morning/evening/weekly/monthly reports | Various | `node-cron` | **NOT WIRED UP** (+ free tier) |
| Tenant critical alert scan | `*/15 * * * *` | `node-cron` | **NOT WIRED UP** (+ free tier) |

**Registration code:** `server.ts:5292-5385`  
**Call site:** `server.ts:5387` — runs at module load, **before** `startServer()` initializes `_db`.

**Deferred start:** Even if `_db` were set, crons wait `CRON_STARTUP_DELAY_MS` (default 120s) — `server.ts:5382-5384`.

### B. `setInterval` workers (boot callback)

| Worker | Interval | Trigger | Wired? |
|--------|----------|---------|--------|
| Outbox worker | `WORKER_INTERVAL_MS` (10 min free / 5 min std) | `app.listen` callback `startOutboxWorker()` | **WORKING** — `server.ts:5059-5060` |
| Auto Workflow | 30s | `startAutoWorkflow()` | **SILENTLY DISABLED** — commented `server.ts:5057-5058` |

### C. HTTP cron endpoints (external scheduler)

| Endpoint | Purpose | Auth | Wired in repo? |
|----------|---------|------|----------------|
| `POST /api/cron/founder-alerts` | Runs `runHourlyAutoPilotAggregator` or daily digest | Bearer `CRON_SECRET` if set | **Endpoint exists**; external cron **needs verification** (`docs/DUE_DILIGENCE.md:116` mentions cron-job.org) |
| `POST /api/cron/process-workers` | Outbox + prep alerts | Same | Endpoint exists; not in `render.yaml` |
| `POST /api/cron/process-outbox` | Outbox only | Same | Endpoint exists |
| `POST /api/cron/expire-unpaid-payments` | Payment expiry | Same | Endpoint exists |
| `POST /api/cron/tenant-notifications` | Tenant notification worker | Same | Endpoint exists |

**Auth behavior:** If `CRON_SECRET` is **unset**, auth check is skipped (`server.ts:4744` pattern: `if (process.env.CRON_SECRET && ...)`). Warns at boot (`server.ts:359-361`).

### D. Client-initiated incident intake

| Path | Trigger | Wired? |
|------|---------|--------|
| `initializeMonitoring()` | `src/appBootstrap.tsx:17` dynamic import on BhojanOS boot | **WORKING** (basic error handlers always on) |
| `logIncident()` | Global error / unhandledrejection / fetch wrapper (extended tier) | **PARTIAL** — basic errors on all tiers; API/perf monitoring only if `enableClientTelemetry()` (`monitoring.ts:149-153`) |
| OrderBhojan `clientErrorSink` | `TelemetryProvider` mount | **WORKING** if analytics events fire |
| `TelemetryService.initializeGlobalHandlers()` | `App.tsx:339` | **WORKING** but `logCritical` skips Firestore on free tier (`TelemetryService.ts:104-106`) |

### E. Error handlers (server)

| Path | Trigger | Action |
|------|---------|--------|
| Express global error handler | Unhandled route errors | Log + 500 JSON only — **no incident write** (`server.ts:1478-1482`) |
| `client-errors` catch | Pipeline failure | Returns `{ status: "logged" }` even on failure — **silent success appearance** (`server.ts:1414-1417`) |

---

## STEP 3 — Is It Actually Running?

### Boot sequence (production)

From `server.ts:5048-5075` (listen callback):

| Log line | Meaning | Status |
|----------|---------|--------|
| `tier=free` (when `PLATFORM_TIER` unset in prod) | Free tier active | **SILENTLY DISABLES** AutoPilot crons even if registered |
| `✅ Auto Workflow worker bypassed` | `startAutoWorkflow()` not called | **SILENTLY DISABLED** |
| `✅ Outbox worker initialized` | `startOutboxWorker()` ran | **WORKING** |
| `⚠️ Email NOT configured` | No Resend/SMTP | AutoPilot emails **will not deliver** |
| No log for “Registering background cron jobs” | `initializeMonitoringJobs` returned early | **Crons never scheduled** |

`initializeMonitoringJobs` only logs when `_db` is truthy (`server.ts:5297`). If crons never register, you will **not** see `"Registering background cron jobs"` or `"Cron jobs deferred after deploy"` in production logs.

### Env vars that gate behavior

| Variable | Effect if unset (production) | Evidence |
|----------|------------------------------|----------|
| `PLATFORM_TIER` | Defaults to **free** | `server.ts:382-386`, `.env.example:24` |
| `CRON_SECRET` | Cron HTTP endpoints **unauthenticated**; boot warning | `server.ts:359-361`, `4744` |
| `RESEND_API_KEY` / `EMAIL_*` | Founder alerts skipped/failed | `server.ts:5062-5068`, `sendFounderAlert` |
| `WORKER_INTERVAL_MS` | 10 min outbox interval on free tier | `server.ts:4932-4937` |
| `CRON_STARTUP_DELAY_MS` | 120s delay before crons (if ever registered) | `server.ts:5382` |
| `FIRESTORE_QUOTA_BACKOFF_MS` | 15 min write pause after quota errors | `server.ts:111-112` |

`render.yaml` does **not** set `PLATFORM_TIER`, `CRON_SECRET`, or email keys — only URL vars (`render.yaml:7-17`).

---

## STEP 4 — Detect / Act Matrix

### 1. AutoPilot (server-side “incident response”)

```
DETECT: count system_incidents by type (last 1h) + heartbeat staleness + email failure logs
        → runHourlyAutoPilotAggregator (server.ts:5179-5244)
DECIDE: health score < 80 OR threshold breaches
ACT:    sendFounderAlert(email) + write platform_health_reports
        NO automated fix (status stays DETECTED in Firestore)
```

| Condition | Detection | Action | Real fix? |
|-----------|-----------|--------|-----------|
| `system_errors` spike | `countIncidentsByTypesSince` | Email + health report | **Alert only** |
| Missing heartbeat 15m | `system_meta/heartbeat` timestamp | CRITICAL email | **Alert only** |
| Payment/security/blocker counts | Type counts | Lowers score, may email | **Alert only** |
| Score &lt; 80 | Composite formula `server.ts:5221-5223` | `sendFounderAlert` | **Alert only** |

**Status:** **NOT WIRED UP** (cron never registers) + **SILENTLY DISABLED** on free tier + **NEEDS VERIFICATION** (email delivery on Render).

Manual bypass: `POST /api/cron/founder-alerts` (`server.ts:4819-4836`) — works without node-cron if external scheduler calls it.

### 2. Client monitoring pipeline

```
DETECT: window error / unhandledrejection / failed fetch (tier-dependent)
        → monitoring.ts logIncident (server.ts path via HTTP)
DECIDE: 10s throttle (non-critical types); noise filter
ACT:    POST /api/monitoring/log → IncidentRepository → system_incidents
        NO server-side remediation
```

| Issue type | Detect | Act | Real fix? |
|------------|--------|-----|-----------|
| JS runtime error | `monitoring.ts:131-138` | Incident write | **Log only** |
| API 4xx/5xx | fetch wrapper (standard tier only) | `api_errors` incident | **Log only** |
| Firestore client errors | `FirestoreMonitoringService` wrappers | `firestore_errors` incident | **Log only** |
| Payment blockers | `Checkout.tsx` logIncident calls | `merchant_blockers` | **Log only** |

**Status:** **WORKING** for intake (if API reachable), subject to quota backoff skip (`server.ts:1430-1431`). Extended API/perf monitoring **SILENTLY DISABLED** on client free tier.

### 3. Client error pipeline (`/api/client-errors`)

```
DETECT: OrderBhojan telemetry sink or direct POST
DECIDE: dedupe hash (5 min), rate limits
ACT:    write system_errors to system_incidents
```

**Status:** **WORKING** when called; failures return `status: "logged"` even on exception (`server.ts:1414-1417`) — **silent failure appearance**.

### 4. Notification outbox worker (closest to “self-healing”)

```
DETECT: notification_outbox status RETRY_PENDING, nextRetryAt <= now
DECIDE: retry vs DEAD_LETTER based on attempt count / error class
ACT:    resend EMAIL/WHATSAPP/FCM; exponential backoff; FCM token cleanup
```

**Status:** **WORKING** on boot (`server.ts:5059`). Free tier: outbox only, no prep alerts (`server.ts:4945-4948`). Prep alerts **SILENTLY DISABLED** on free tier.

### 5. Payment expiry (`expireUnpaidPayments`)

```
DETECT: pending_payment drafts / unpaid orders past TTL
ACT:    status → expired, payment audit write
```

**Status:** **NOT WIRED UP** via node-cron (root cause). Callable via `POST /api/cron/expire-unpaid-payments` — **needs verification** if external cron configured.

### 6. Auto Workflow (order status automation)

```
DETECT: orders PENDING/PREPARING/READY + elapsed time + adminSettings.workflow.autoMode
ACT:    update order status PENDING→PREPARING→READY
```

**Status:** **SILENTLY DISABLED** — `startAutoWorkflow()` commented at boot (`server.ts:5057-5058`). Function exists (`server.ts:2401-2433`) but never started.

### 7. Client SelfHealingUtils

```
DETECT: chunk load error (GlobalErrorBoundary) or manual reload
DECIDE: sessionStorage circuit breaker (max 3 reloads/min)
ACT:    purge SW, caches, Firebase IDB; reload page
```

**Status:** **WORKING** in browser only. Not server incident response. Does not fix backend/data issues.

### 8. Firestore quota circuit breaker (server + client)

```
DETECT: Firestore resource_exhausted / quota errors
ACT:    pause non-critical writes 15m; skip crons; skip incident writes
```

**Status:** **WORKING** as protective throttle. **Not healing** — deliberately stops automation during quota events (`server.ts:111-125`, `IncidentRepository.ts:98-99`).

### 9. Ops read APIs (not automation)

`GET /api/ops/incidents`, `/stats`, `/health-summary` — founder dashboard reads. **No auto-remediation.**

**Status:** **WORKING** when superadmin auth + `_db` available.

---

## STEP 5 — Silent Failures

| Location | Behavior | Visibility |
|----------|----------|------------|
| `initializeMonitoringJobs` early return | No crons, no error log | **Silent** — only missing expected log lines |
| `server.ts:1414-1417` | Client error pipeline catch returns `status: "logged"` | **Misleading success** |
| `IncidentRepository.writeIncident` skip | Returns `skipped: firestore_quota_backoff` | API returns 202/skipped — easy to miss |
| `TelemetryService.logCritical` free tier | Returns without Firestore write | `console.error` only — no aggregation |
| `monitoring.ts` fetch to `/api/monitoring/log` | `.catch` → localStorage queue | `console.warn` only |
| Outbox worker outer catch | `console.error` for non-quota errors | Render logs if monitored |
| Auto Workflow inner catch | `console.error("Auto Workflow Error")` | N/A — worker not started |
| `withCronHealth` cron_health writes | Skipped on free tier | No cron health audit trail on free tier |
| WhatsApp `sendWhatsAppNotification` | Mock mode when tokens missing | **needs verification** — may log mock only |

Winston logger goes to **Console** only (`server.ts:97-99`) — visibility depends on Render log retention/monitoring.

---

## Per-Component Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| `initializeMonitoringJobs` / node-cron | **NOT WIRED UP** | Called before `_db` init (`5293`, `5387`) |
| Hourly AutoPilot | **NOT WIRED UP** + **SILENTLY DISABLED** (free tier) | Would alert only, not fix |
| External HTTP crons | **NEEDS VERIFICATION** | Endpoints exist; not in `render.yaml` |
| Outbox worker | **WORKING** | Notification retry only |
| Auto Workflow | **SILENTLY DISABLED** | Commented at boot |
| Client `monitoring.ts` intake | **WORKING** (basic) | Extended features off on free tier |
| `SelfHealingUtils` | **WORKING** (client UX) | Browser reload, not platform healing |
| `IncidentRepository` | **WORKING** when `_db` up | Skips during quota backoff |
| Firestore quota breaker | **WORKING** | Stops automation under stress |
| Founder email alerts | **NEEDS VERIFICATION** | Depends on Resend/SMTP env on Render |
| Ops dashboards | **WORKING** | Read-only; manual response |

---

## Root Cause Analysis (Ranked)

### 1. **Cron registration never happens** (confirmed)

```5292:5293:server.ts
const initializeMonitoringJobs = () => {
  if (!_db) return;
```

```5387:5389:server.ts
initializeMonitoringJobs();

startServer();
```

`_db` is assigned inside `startServer()` at line 4971, **after** `initializeMonitoringJobs()` returns. No second call to `initializeMonitoringJobs` exists in the codebase.

**Impact:** No heartbeat, no AutoPilot hourly run, no payment expiry cron, no tenant notification crons — unless external HTTP cron endpoints are hit manually.

### 2. **Production defaults to free tier** (confirmed)

AutoPilot and tenant crons are inside `if (!freeTier)` (`server.ts:5331-5378`). Even if cron registration were fixed, AutoPilot would still be skipped unless `PLATFORM_TIER=standard` on Render.

### 3. **Auto Workflow explicitly bypassed** (confirmed)

`server.ts:5057-5058` — the only automated **order state** “healing” is not started.

### 4. **System is alert-oriented, not fix-oriented** (confirmed)

`INCIDENT_RESPONSE.md` mitigation steps are manual (rollback, wait for backoff, etc.). No code path transitions incidents to `RESOLVED` automatically or executes remediation playbooks.

### 5. **Email delivery for alerts** (needs verification)

Boot explicitly warns when email is not configured. Without `RESEND_API_KEY` or valid SMTP, `sendFounderAlert` logs `Founder alert not delivered` (`server.ts:5103-5108`) — AutoPilot may run (via HTTP cron) but founders see nothing.

---

## Plain-Language: What “Working” Would Look Like vs Today

| Expectation | Reality in code today |
|-------------|----------------------|
| Hourly health emails | Cron that sends them **never registers**; free tier blocks it anyway |
| Automatic incident fixes | **Does not exist** — incidents are stored and optionally emailed |
| Auto-advance order kitchen workflow | **Turned off** at boot |
| Failed notification retry | **Works** via outbox worker every ~10 min on free tier |
| Client fixes itself after errors | **Page reload + cache clear** only |
| Payment session cleanup | Logic exists but **cron not registered** |

---

## Recommended Verification Steps (no code changes)

1. **Render logs** after deploy: search for `Registering background cron jobs` — if absent, confirms cron bug.
2. **`GET /api/health`**: check `platform.tier` (likely `free`) and `firestore.backedOff`.
3. **Firestore** `system_incidents`: confirm client errors are landing (intake may work even when AutoPilot does not).
4. **Firestore** `platform_health_reports`: if empty, AutoPilot aggregator has not run.
5. **Render env**: `PLATFORM_TIER`, `RESEND_API_KEY` / `EMAIL_*`, `CRON_SECRET`, external cron hitting `/api/cron/founder-alerts`.
6. Run `node scripts/smoke-ops-health.mjs` with superadmin token (local script; documents ops API contract).

---

## Other Flags / Patterns (not fixed per instructions)

| Pattern | Location | Note |
|---------|----------|------|
| Opt-in env flags | Various `VITE_FF_*` | Client features off unless `'true'` |
| `FF_MARKETPLACE_GEOINDEX` | `marketplaceGeoIndexPolicy.ts:3` | Secure-by-default (`!== 'false'`) |
| IaC staging workers | `helm/`, `terraform/` | Not production path today |

---

*End of audit. No code was modified.*
