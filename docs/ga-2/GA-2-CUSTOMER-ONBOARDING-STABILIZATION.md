# GA-2 — Customer Onboarding & Production Stabilization

**Program:** BhojanOS SaaS  
**Milestone:** GA-2  
**Date:** 2026-07-03  
**Prerequisite:** GA-1 legacy production deployment complete

---

## 1. Executive Summary

GA-2 converts BhojanOS from an engineering-complete platform into a **production SaaS** serving real cloud kitchens. Focus is customer success, operational stability, observability, and revenue — **not** new platform development.

Projection, adapter, rollout, and certification infrastructure remains **dormant**.

---

## 2. Architecture (unchanged from GA-1)

```
Customer Storefront → React (Vercel) → API (Render) → Legacy SDKs → Firestore (bhojanos-prod)
```

---

## 3. GA-2 Deliverables

| Priority | Deliverable | Implementation |
|----------|-------------|----------------|
| P1 | Owner onboarding | Existing 7-step wizard + KYC bank/GST/PAN + setup guide hours step |
| P2 | Production dashboard | `DashboardProductionMetrics` — revenue, pending, top items, recent orders |
| P3 | Customer experience | Guest `/order/:orderId` tracking without auth |
| P4 | Monitoring | Runbook in `MONITORING.md`; existing Winston + TelemetryService + `/api/health` |
| P5 | Analytics | `ownerOrderAnalytics.ts` + Firestore `analytics/overview` |
| P6 | Support | `/help` Help Center + WhatsApp/email + owner feedback |
| P7 | Security | GA-1 rules tests + tenant isolation (unchanged legacy path) |
| P8 | Performance | Documented in QUALITY-GATES; no projection overhead |
| P9 | Backups | `scripts/backup/firestore-export-prod.sh` |
| P10 | Business readiness | Pricing, terms, privacy, refund pages (existing) + footer fixes |

---

## 4. Pre-Stabilization Gate

```bash
npm run gate:ga2
```

Expected: GA-1 flags OFF, 1326+ SDK tests pass, `build:web` + `build:server` succeed.

---

## 5. First Customer Onboarding Sequence

1. Owner registers at `/owner/register`
2. Complete `/owner/setup` wizard (kitchen, address, delivery, payments, menu, publish)
3. Optional: `/owner/kyc` — business identity, bank details, documents
4. Configure hours & tax in `/owner/settings`
5. Share storefront URL — first customer order
6. Verify owner dashboard metrics update in real time
7. Customer tracks order at `/order/:orderId` (guest, no login)

See [ONBOARDING-CHECKLIST.md](./ONBOARDING-CHECKLIST.md) for full verification matrix.

---

## 6. Operational Cadence

| Cadence | Action |
|---------|--------|
| Daily | Review `/admin/system-health`, API logs on Render |
| Daily | Firestore export via `firestore-export-prod.sh` |
| Weekly | Restore drill (staging import from backup) |
| Per incident | `POST /api/monitoring/log` + `docs/staging/ops-execution/INCIDENT-RESPONSE-GUIDE.md` |

---

## 7. Success Metrics

| Metric | Target |
|--------|--------|
| First production customer onboarded | ✓ |
| First live order completed | ✓ |
| Uptime | 99.9% |
| API latency (p95) | < 300ms |
| Tenant isolation issues | 0 |
| Daily backups verified | ✓ |
| Projection flags | All OFF |

---

## 8. Definition of Done

- [ ] First production customer onboarded
- [ ] First production restaurant live
- [ ] First production order completed
- [x] Monitoring runbook documented
- [x] Analytics dashboard widgets operational
- [x] Backup script for prod
- [x] Guest order tracking enabled
- [x] Help center live at `/help`
- [ ] 7-day production stability window

---

**STOP.** Do not begin projection activation, adapter wiring, or new platform development until sustained production usage and ARB approval.
