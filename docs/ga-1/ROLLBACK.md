# GA-1 Rollback Procedures

**Program:** Legacy Production Deployment  
**Default state:** Legacy Firestore authoritative · All projection flags OFF

---

## Rollback Overview

| Level | Scope | Recovery time | Trigger |
|-------|-------|---------------|---------|
| **L1** | Revert deployment | < 15 min | Bad release, projection flag accident |
| **L2** | Restore previous frontend | < 30 min | UI regression |
| **L3** | Restore previous API | < 30 min | API regression |
| **L4** | Restore Firestore backup | < 2 hours | Data corruption |

---

## L1 — Revert Deployment

Fastest recovery for code or configuration regressions.

### Steps

1. **Disable any accidentally enabled projection flags** in Vercel Production env
2. **Revert git commit:**
   ```bash
   git revert <bad-commit-sha>
   git push origin main
   ```
3. Wait for Vercel + Render auto-redeploy
4. Verify:
   ```bash
   npm run verify:ga1-flags
   curl -s https://manaintibojanam-backend.onrender.com/api/health
   ```
5. Confirm manual flows (order placement, menu load)

**Recovery time:** < 15 minutes

---

## L2 — Restore Previous Frontend

When L1 revert is insufficient or Vercel deploy is the issue.

1. Open Vercel dashboard → Deployments
2. Select last known-good production deployment
3. Click **Promote to Production**
4. Verify `https://www.bhojanos.com/version.json` build SHA
5. Run smoke checklist from [QUALITY-GATES.md](./QUALITY-GATES.md)

**Recovery time:** < 30 minutes

---

## L3 — Restore Previous API

When API regression affects orders, auth, or payments.

1. Open Render dashboard → `bhojanos-prod-api`
2. Roll back to previous deploy OR revert git and push
3. Verify health endpoint:
   ```bash
   curl -s https://manaintibojanam-backend.onrender.com/api/health
   ```
4. Test guest token endpoint, order creation, Razorpay webhook

**Recovery time:** < 30 minutes

---

## L4 — Restore Firestore Backup

Emergency only — data corruption or catastrophic rules failure.

1. Execute **L1 + L2 + L3** immediately (stop writes)
2. Export current state for forensics (if possible)
3. Restore from daily Firebase backup (Firebase Console → Import/Export)
4. Redeploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules --project bhojanos-prod
   ```
5. Full post-deploy verification matrix
6. Incident post-mortem required

**Recovery time:** < 2 hours

---

## Projection Flag Emergency

If any projection flag is ON in production:

1. Set all `VITE_FF_*_PROJECTION_*` to `false` or remove from Vercel
2. Redeploy frontend
3. Run `npm run verify:ga1-flags`
4. Confirm legacy reads in application logs

Projection infrastructure is **not wired** into production SDK paths when flags are OFF — disabling flags returns to legacy-only behaviour.

---

## Rollback Verification

After any rollback:

```bash
npm run test:smoke
curl -s https://manaintibojanam-backend.onrender.com/api/health
curl -s https://www.bhojanos.com/version.json
```

Expected: **1326 / 1326** tests pass locally; production health OK.

---

**STOP.** Projection activation rollback is L1 flag disable only — no worker teardown required (workers not deployed).
