# GA-1 — Legacy Production Deployment Runbook

**Program:** BhojanOS SaaS  
**Milestone:** GA-1 — Production Deployment (Legacy Read Path)  
**Date:** 2026-07-03  
**Status:** Active

---

## 1. Executive Summary

First production deployment of BhojanOS using the **stable legacy architecture only**. Real cloud kitchens and restaurants onboard via existing Firestore-backed SDKs. All projection, adapter, rollout, and certification infrastructure remains **dormant**.

**Production stack (unchanged):**

| Layer | Service |
|-------|---------|
| Frontend | Vercel → `www.bhojanos.com` |
| API | Render → `manaintibojanam-backend.onrender.com` |
| Database | Firebase `bhojanos-prod` (Firestore + Auth + Storage) |
| Payments | Razorpay (existing integration) |

---

## 2. Architecture

```
Customer
    ↓
React Frontend (Vercel)
    ↓
API (Render / Express)
    ↓
Legacy SDKs (Order · Menu · Pricing · Location · Branch · Reference · Discovery)
    ↓
Legacy Firestore Repositories
    ↓
Firestore (bhojanos-prod)
```

**Explicitly excluded from production path:**

- Projection workers
- Read adapters
- Rollout engines
- Certification engines
- Event platform runtime
- Outbox / replay workers
- Kubernetes / Terraform / Helm / LaunchDarkly

---

## 3. Production Principle

| Rule | Value |
|------|-------|
| Authoritative read path | **Legacy Firestore repositories only** |
| Projection infrastructure | **Dormant** (code present, flags OFF) |
| SDK public APIs | **Unchanged** |
| Database schema | **No migration** — current production schema |
| Future upgrade path | **Preserved** — projection can activate later via flags |

---

## 4. Pre-Deploy Checklist

### 4.1 Repository

```bash
git checkout main
git pull origin main
```

- [ ] All GA-1 documentation committed
- [ ] No projection flags set in Vercel Production env
- [ ] No projection flags set in Render env

### 4.2 Automated gate

```bash
npm run gate:ga1
```

Expected: 1326 SDK tests pass, `build:web` + `build:server` succeed, projection flags verified OFF.

### 4.3 Environment (Vercel Production)

| Variable | Required value |
|----------|----------------|
| `VITE_APP_ENV` | `production` |
| `VITE_API_URL` | `https://manaintibojanam-backend.onrender.com` |
| `VITE_FIREBASE_PROJECT_ID` | `bhojanos-prod` |
| `VITE_PLATFORM_TIER` | `free` |

**Do not set** any `VITE_FF_*_PROJECTION_*` or event platform flags to `true`. See [PRODUCTION-FLAG-MANIFEST.md](./PRODUCTION-FLAG-MANIFEST.md).

### 4.4 Environment (Render `bhojanos-prod-api`)

| Variable | Required |
|----------|----------|
| `FIREBASE_PROJECT_ID` | `bhojanos-prod` |
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment |
| `ORDER_GUEST_TOKEN_SECRET` | Guest order tracking (≥32 chars) |
| `CRON_SECRET` | Cron authentication |
| `STOREFRONT_BASE_URL` | `https://bhojanos.com` |

---

## 5. Deploy Sequence

| Step | Action | Service |
|------|--------|---------|
| 1 | `npm run gate:ga1` | Local verification |
| 2 | `git push origin main` | Render API auto-deploy |
| 3 | Vercel production auto-deploy | Frontend |
| 4 | `firebase deploy --only firestore:rules --project bhojanos-prod` | Security rules (off-peak) |
| 5 | Optional: `cd functions && npm run deploy` | Cloud Functions (if used) |

### Firestore rules

```bash
firebase deploy --only firestore:rules --project bhojanos-prod
```

Monitor Firebase console for `permission-denied` spikes for 24h.

---

## 6. Post-Deploy Verification

```bash
# API health
curl -s https://manaintibojanam-backend.onrender.com/api/health | jq .

# Frontend build parity
curl -s https://www.bhojanos.com/version.json | jq .

# Auth enforcement (expect 401 without token)
curl -s -o /dev/null -w "%{http_code}" \
  https://manaintibojanam-backend.onrender.com/api/orders/user/test-user
```

### Manual flows

| Flow | Pass |
|------|------|
| Customer browses menu | ☐ |
| Customer places order (COD) | ☐ |
| Customer places order (Razorpay) | ☐ |
| Owner manages kitchen | ☐ |
| Owner manages menu | ☐ |
| Owner manages pricing | ☐ |
| Order notifications | ☐ |
| Guest order tracking | ☐ |

---

## 7. Infrastructure Deployed

| Component | Status |
|-----------|--------|
| React frontend | Vercel |
| Express API | Render |
| Firebase Authentication | `bhojanos-prod` |
| Firestore | `bhojanos-prod` |
| Cloud Storage | `bhojanos-prod` |
| Cloud Functions | Optional (existing) |
| HTTPS / CORS | Vercel + Render |
| Secrets | Render + Vercel env (not in git) |
| Monitoring | Cloud Logging + UptimeRobot/cron health ping |
| Daily backups | Firebase export (configure in console) |

---

## 8. Security

- Firebase Authentication enabled
- Firestore security rules deployed
- HTTPS enforced
- Secrets in platform env (not Secret Manager for legacy prod)
- Rate limiting on API (existing middleware)
- Audit logging via Cloud Logging

---

## 9. Observability

| Signal | Source |
|--------|--------|
| Request logs | Render + Cloud Logging |
| API latency | `/api/health` + Render metrics |
| Firestore latency | Health endpoint Firestore probe |
| Auth failures | API logs |
| Payment failures | Razorpay webhook logs |
| Order failures | API + Firestore |
| Uptime | UptimeRobot → `GET /api/health` |

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Application availability | 99.9% |
| Firestore healthy | Yes |
| Authentication working | Yes |
| Orders successful | Yes |
| Menus loading | Yes |
| Pricing loading | Yes |
| Zero projection incidents | Yes |

---

## 11. Out of Scope (GA-1)

- Projection activation
- Adapter wiring
- Rollout stages
- Certification activation
- Event platform enablement
- Kubernetes / Terraform migration
- Staging soak implementation

---

## 12. References

- [M0 Deployment Runbook](../release-notes/M0-DEPLOYMENT.md)
- [PRODUCTION-FLAG-MANIFEST.md](./PRODUCTION-FLAG-MANIFEST.md)
- [ROLLBACK.md](./ROLLBACK.md)
- [QUALITY-GATES.md](./QUALITY-GATES.md)
- `scripts/flags/ga1-production-flags.json`

---

**STOP.** Legacy production only. Projection activation deferred until customer validation and ARB approval.
