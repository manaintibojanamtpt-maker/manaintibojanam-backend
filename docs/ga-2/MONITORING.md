# GA-2 Production Monitoring

**Architecture:** Legacy path only. No projection worker telemetry.

---

## Existing Instrumentation

| Layer | Mechanism | Location |
|-------|-----------|----------|
| API health | `GET /api/health` | `server.ts` |
| Server logs | Winston JSON | Render dashboard |
| Client errors | `TelemetryService` + `client_errors` collection | `src/core/reliability/` |
| Incidents | `POST /api/monitoring/log` → `system_incidents` | `server.ts` |
| Admin view | `/admin/system-health` | `SystemHealth.tsx` |
| AutoPilot | Hourly/daily crons (standard tier) | `server.ts` |
| Payment failures | Razorpay webhook + order status | `server.ts` |
| Auth failures | Firebase + API 401 responses | Express middleware |

---

## Recommended Production Configuration

| Setting | Value |
|---------|-------|
| `VITE_PLATFORM_TIER` | `standard` (enables extended telemetry on Vercel prod) |
| Render log retention | Maximum available |
| UptimeRobot / similar | Monitor `https://manaintibojanam-backend.onrender.com/api/health` |
| Firebase Console alerts | Auth anomalies, quota warnings |

---

## Dashboards to Watch

### API (Render)

- 5xx error rate
- Response time p95
- Memory / CPU spikes during dinner rush

### Firestore (Firebase Console)

- Read/write ops per day
- Rule evaluation errors
- Index missing errors (add to `firestore.indexes.json`)

### Owner-facing signals

- `DashboardProductionMetrics` — today's revenue, pending orders
- `/owner/notifications` — urgent attention items

---

## Alert Thresholds (suggested)

| Signal | Warning | Critical |
|--------|---------|----------|
| API health | Non-200 for 2 min | Non-200 for 10 min |
| Order placement 5xx | > 1% of attempts | > 5% |
| Payment webhook failures | Any sustained | > 3 in 15 min |
| Firestore permission-denied spike | > 10/min | > 50/min |

---

## Incident Response

1. Check `/api/health` and Render logs
2. Review `system_incidents` in Firestore
3. If data issue: see [BACKUP-AND-RESTORE.md](./BACKUP-AND-RESTORE.md)
4. Rollback: `docs/ga-1/ROLLBACK.md` (L1–L4)

---

## Explicitly NOT monitored (dormant)

- Projection lag / parity / soak workers
- Adapter routing fallback rates
- Rollout stage promotions
- Event platform outbox depth

These remain OFF per GA-1/GA-2 architecture constraint.
