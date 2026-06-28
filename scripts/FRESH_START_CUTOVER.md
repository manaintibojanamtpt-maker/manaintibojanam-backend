# BhojanOS Fresh Start — bhojanos-prod Cutover Runbook

**Strategy:** Blue-green on free tier. Build `bhojanos-prod` in parallel. **Do not change** live Vercel/Render env until verification passes. Cutover in one window with rollback ready.

**Goal:** `bhojanos.com` stays reachable. No env downgrade during prep. Rollback to `bhojanos2` in &lt;15 minutes if needed.

---

## Who is affected

| Phase | bhojanos.com visitors | Owners / kitchens | Orders & data |
|--------|----------------------|-------------------|---------------|
| **Prep (days 1–2)** | No change | No change | No change |
| **Cutover (15 min window)** | Site stays up (Vercel). Possible **brief API errors** during Render redeploy (~1–3 min) | Same | Same until cutover completes |
| **After cutover (Path A)** | Site works on **new** Firebase | **Must register/login again** | **Not migrated** — fresh DB |
| **Rollback** | Back to old Firebase config | Old accounts work again **if bhojanos2 quota allows** | Old data returns |

Path A = **fresh database**. This is not a silent data migration. Plan owner re-onboarding.

---

## Architecture after cutover

```
bhojanos.com (Vercel) ──► bhojanos-prod (Firestore/Auth/Storage)
                      └──► Render API ──► bhojanos-prod

bhojanos2 ──► archived, no traffic (rollback copy only)
```

---

## Phase 0 — Snapshot current prod (15 min, no downtime)

Save these somewhere safe (password manager / Render notes). **Do not delete.**

### Render (`manaintibojanam-backend`)

Copy all env vars, especially:

- `FIREBASE_PROJECT_ID` / `GOOGLE_CLOUD_PROJECT`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_SERVICE_ACCOUNT` (or key reference)
- `EMAIL_*`, `RAZORPAY_*`, `CRON_SECRET`
- `PLATFORM_TIER`, `WORKER_INTERVAL_MS`

### Vercel (Production)

Copy all `VITE_*` Firebase vars and `VITE_API_URL`.

### Rollback trigger

If after cutover: login broken, payments fail, or `/api/health` shows wrong project → **Phase 5 Rollback**.

---

## Phase 1 — Create bhojanos-prod (parallel, no prod impact)

1. Firebase Console → **Add project** → `bhojanos-prod` (Spark).
2. Enable **Authentication** (Email/Password; Google if used).
3. Create **Firestore** (production mode, location: same as before if possible e.g. `asia-south1`).
4. Enable **Storage**.
5. Add **Web app** → note full `firebaseConfig`.
6. **Service account** → Generate key → save as `bhojanos-prod-sa.json` (never commit).

### Deploy rules to NEW project only

```bash
# Add to .firebaserc: "bhojanos-prod": "bhojanos-prod"
firebase use bhojanos-prod
firebase deploy --only firestore:rules,storage,firestore:indexes
```

Live site still uses `bhojanos2`. No user impact.

---

## Phase 2 — Seed minimum prod data (parallel)

In **bhojanos-prod** Firestore (Console or script):

1. `adminSettings/global` — copy structure from old project or use defaults (gst, fees, workflow).
2. Super admin: create user in **Authentication**, then set custom claim `admin: true` (Firebase Admin or existing admin script).
3. Optional: one test tenant for smoke test **before** cutover (slug e.g. `demo-kitchen`).

Do **not** point Vercel or Render at prod yet.

---

## Phase 3 — Staging verification (parallel)

### Option A — Local against bhojanos-prod

`.env.local`:

```env
VITE_FIREBASE_PROJECT_ID=bhojanos-prod
VITE_FIREBASE_AUTH_DOMAIN=bhojanos-prod.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=bhojanos-prod.firebasestorage.app
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_API_URL=http://localhost:5000
```

Run `npm run dev` with Render-equivalent backend env pointing to `bhojanos-prod`.

### Option B — Render preview (if available)

Temporary env group on Render **without** changing production service — or deploy a one-off manual test only if you accept a separate URL.

### Checklist before cutover

- [ ] Owner register + login
- [ ] Create tenant / storefront slug
- [ ] Place test order (or Razorpay test mode)
- [ ] KYC upload to Storage
- [ ] Super admin login
- [ ] `GET /api/health` → `projectId: bhojanos-prod`, `tier: free`, `backedOff: false`

---

## Phase 4 — Cutover (target: low traffic, ~15 min)

**Order matters.** Vercel keeps serving the previous deployment until the new one is ready (no frontend downtime).

| Step | Action | Downtime risk |
|------|--------|---------------|
| 1 | Pick window (e.g. 3:00–3:30 AM IST) | — |
| 2 | **Render:** Set env to `bhojanos-prod` (see below). **Clear cache & deploy** | API **1–3 min** blip |
| 3 | Wait for Live. Call `/api/health` until `bhojanos-prod` + `backedOff: false` | — |
| 4 | **Vercel:** Update Production env to `bhojanos-prod` `VITE_*`. **Redeploy** | **None** (old deploy serves until new is live) |
| 5 | Smoke test `https://bhojanos.com` + owner login + one API call | — |
| 6 | Confirm UptimeRobot still pings `/api/health` | — |

### Render env (production)

```env
PLATFORM_TIER=free
FIREBASE_PROJECT_ID=bhojanos-prod
GOOGLE_CLOUD_PROJECT=bhojanos-prod
FIREBASE_STORAGE_BUCKET=bhojanos-prod.firebasestorage.app
FIREBASE_SERVICE_ACCOUNT={paste new JSON}
WORKER_INTERVAL_MS=600000
FIRESTORE_QUOTA_BACKOFF_MS=900000
CRON_STARTUP_DELAY_MS=120000
TENANT_CACHE_MS=600000
# keep EMAIL_*, RAZORPAY_*, FOUNDER_EMAIL unchanged
```

### Vercel env (production)

```env
VITE_PLATFORM_TIER=free
VITE_APP_ENV=production
VITE_API_URL=https://manaintibojanam-backend.onrender.com
VITE_FIREBASE_PROJECT_ID=bhojanos-prod
VITE_FIREBASE_AUTH_DOMAIN=bhojanos-prod.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=bhojanos-prod.firebasestorage.app
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Mitigation during Render blip

- UptimeRobot will wake Render; users retry after ~30s.
- Frontend on Vercel still loads; only API calls fail briefly.
- Post status if you have live kitchens: “Back in 2 minutes.”

---

## Phase 5 — Rollback (&lt;15 min)

If cutover fails, **do not delete bhojanos2**.

1. **Render:** Restore Phase 0 env snapshot (`bhojanos2`). Clear cache & deploy.
2. **Vercel:** Restore Phase 0 `VITE_*`. Redeploy.
3. Verify `/api/health` → `bhojanos2`.
4. **Note:** Rollback only works if `bhojanos2` quota has recovered. If still `Quota exceeded`, rollback restores config but DB may be read-only until reset.

Keep `bhojanos-prod` for a later retry.

---

## Phase 6 — Post-cutover (Day 1)

- [ ] Re-create founder super-admin claim on new Auth
- [ ] Re-onboard real kitchens (Path A)
- [ ] Gmail App Password on Render if not set → test founder email
- [ ] Remove/disable Firebase Hosting deploys for this app (Vercel only)
- [ ] Stop pointing any domain at old Firebase Hosting sites
- [ ] Optional: export tenant emails from old project when quota resets (reference only)

---

## What we do NOT do (avoids accidental outage)

- ❌ Change Vercel/Render prod env during Phase 1–3
- ❌ Delete `bhojanos2` project
- ❌ Migrate `system_heartbeats`, `cron_health`, monitoring junk
- ❌ Run heavy scripts against prod during cutover window
- ❌ Deploy frontend to Firebase Hosting + Vercel simultaneously

---

## Success criteria

- `https://bhojanos.com` loads
- `/api/health` → `bhojanos-prod`, `backedOff: false`, `tier: free`
- New owner can register and open dashboard
- No recurring `Quota exceeded` in Render logs for 24h
- Rollback snapshot saved and tested (env paste only)

---

## Timeline summary

| Day | Work | Live site |
|-----|------|-----------|
| 1 | Phase 0–1: snapshot + create bhojanos-prod + deploy rules | Unchanged |
| 2 | Phase 2–3: seed admin + smoke test locally | Unchanged |
| 3 | Phase 4: 15 min cutover window | Brief API blip only |
| 4+ | Phase 6: re-onboard kitchens | Stable on new quota |
