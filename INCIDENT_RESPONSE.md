# BhojanOS Incident Response

**Version:** 1.0  
**Related:** [PRODUCTION_OPERATIONS.md](./PRODUCTION_OPERATIONS.md) · [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md)

---

## Unified Incident Platform

All production incidents converge on a single Firestore collection:

| Property | Value |
|----------|-------|
| Collection | `system_incidents` |
| Schema version | `1.0` |
| Repository | `backend-lib/observability/IncidentRepository.ts` |
| Write API | `IncidentRepository.writeIncident()` |

Legacy parallel stores (`client_errors`, Winston-only logs, empty top-level type collections) are being retired. New writes go through the repository.

---

## Incident Types

Defined in `backend-lib/observability/incidentTypes.ts`:

| Type | Typical severity | Source |
|------|------------------|--------|
| `system_errors` | error | Client / server crashes |
| `api_errors` | error | API 5xx, handler failures |
| `firestore_errors` | error | Quota, permission, index errors |
| `payment_incidents` | critical | Razorpay / payment gate |
| `security_events` | critical | Auth anomalies |
| `merchant_blockers` | critical | Owner onboarding blockers |
| `performance_metrics` | info | Latency / perf signals |
| `onboarding_events` | info | Tenant onboarding |
| `WEBHOOK_RECEIVED` | info | Inbound webhooks |

Statuses: `DETECTED` → `RUNNING` → `VERIFIED` → `RESOLVED` (or `ESCALATED`).

---

## AutoPilot Fix

**Problem (pre-Phase 1):** AutoPilot queried empty legacy collection names (`system_errors`, `api_errors`, etc.) as top-level Firestore collections. Incidents were written to `system_incidents` but never counted.

**Fix:** AutoPilot and ops stats now use the same query path:

```typescript
const autopilotTypes = getAutopilotIncidentTypes();
const stats = await getIncidentRepository()?.countIncidentsByTypesSince(autopilotTypes, since);
```

- `getAutopilotIncidentTypes()` filters noise types (`WEBHOOK_RECEIVED`, `performance_metrics`, `onboarding_events`)
- Counts are grouped by `type` field **within** `system_incidents`
- Hourly cron: `runHourlyAutoPilotAggregator` in `server.ts`
- Founder email sent when score drops below thresholds

Verify fix:

```bash
npm run test:unit -- backend-lib/observability/__tests__/incidentRepository.test.ts
npm run test:unit -- backend-lib/observability/__tests__/opsRoutesMigration.test.ts
```

---

## Client Error Pipeline

`POST /api/client-errors` → `backend-lib/observability/clientErrorPipeline.ts`:

1. Validates payload (message, route, stack, tenant, build)
2. Dedupes by hash within a 5-minute window
3. Rate limits per IP / tenant
4. Writes via `IncidentRepository.writeIncident({ type: 'system_errors', ... })`
5. Mirrors selected types to legacy `client_errors` for backward compatibility

Tests: `backend-lib/observability/__tests__/clientErrorPipeline.test.ts`

---

## Ops Read APIs

Founder / superadmin dashboards read incidents without direct Firestore access:

| Endpoint | Use |
|----------|-----|
| `GET /api/ops/incidents` | Paginated incident list with filters |
| `GET /api/ops/incidents/stats` | Type counts (same as AutoPilot) |
| `GET /api/ops/health-summary` | Open count, 1h/24h stats, hourly trend |

Client: `src/lib/opsHealthApi.ts`

---

## Response Playbook

### 1. Detect

| Signal | Action |
|--------|--------|
| Founder AutoPilot email | Review hourly score and type breakdown |
| `/api/health` `firestore.backedOff: true` | Quota exhaustion — reduce polling, check Render logs |
| Uptime ping failure | Render service down or cold start timeout |
| Owner reports | Cross-check `/api/ops/incidents?tenantId=...` |

### 2. Triage

```bash
# Public health
curl -s https://manaintibojanam-backend.onrender.com/api/health | jq .

# Authenticated ops summary (superadmin token required)
curl -H "Authorization: Bearer $TOKEN" \
  https://manaintibojanam-backend.onrender.com/api/ops/health-summary | jq .
```

Classify by `type` and `severity`. Critical: `payment_incidents`, `security_events`, `merchant_blockers`.

### 3. Mitigate

| Scenario | Mitigation |
|----------|------------|
| Firestore quota | Wait for backoff; disable non-essential crons; consolidate owner polling |
| Payment webhook failures | Check Razorpay dashboard; inspect `payment_incidents` payloads |
| Deploy regression | Rollback Render to previous commit; verify `platform.build` in health |
| Client error spike | Filter by `route` in ops incidents; check recent frontend deploy |

### 4. Resolve

1. Fix root cause and deploy
2. Confirm incident rate drops in `/api/ops/incidents/stats`
3. Update incident status to `RESOLVED` (manual Firestore or future ops write API)
4. Document in post-incident notes

---

## Escalation

| Level | Trigger | Contact |
|-------|---------|---------|
| L1 | Single tenant, non-payment | Owner support flow |
| L2 | Multi-tenant API degradation | Founder email + Render logs |
| L3 | Payment / security / data loss | Immediate founder alert + rollback |

See `docs/escalation-matrix.md` for full RACI.

---

## Testing & Verification

```bash
npm run test:unit   # includes incidentRepository, clientErrorPipeline, opsRoutesMigration
node scripts/smoke-ops-health.mjs
```

After deploy, confirm AutoPilot `incidentSource: "system_incidents"` in `platform_health_reports` documents.

---

*Maintainers: update when adding incident types, changing AutoPilot thresholds, or adding ops write paths.*
