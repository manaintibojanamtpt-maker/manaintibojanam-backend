# M0 Release — Deployment Runbook

**Release tag:** `v1.0.0-m0`  
**Target production:** `bhojanos-prod` (Firestore), Render API, Vercel frontend

---

## 1. Repository

```bash
git checkout main
git pull origin main
git tag -l "v1.0.0-m0"
```

- [ ] All M0 files committed
- [ ] Pushed to `origin/main`
- [ ] Tag `v1.0.0-m0` created and pushed

---

## 2. Deploy order

Execute in this sequence:

| Step | Command / action | Service |
|------|------------------|---------|
| 1 | Push to `main` (auto) | Render API |
| 2 | Vercel production deploy (auto on push) | `www.bhojanos.com` |
| 3 | `firebase deploy --only firestore:rules --project bhojanos-prod` | Firestore |

### Firestore rules deploy

```bash
firebase deploy --only firestore:rules --project bhojanos-prod
```

Deploy off-peak. Monitor Firebase console for `permission-denied` spikes for 24h.

---

## 3. Environment variables (Render → `bhojanos-prod-api`)

| Key | Staging value | Production value | Notes |
|-----|---------------|------------------|-------|
| `ORDER_GUEST_TOKEN_SECRET` | Set (≥32 chars) | Same or separate secret | Required before guest token works |
| `FF_ORDER_AUTH_ENFORCE` | `true` | `false` → `true` after 48h staging soak | Kill switch |
| `FF_RAZORPAY_DRAFT_BIND` | `false` | `false` → `true` after Razorpay QA | Kill switch |

**Staging note:** If no dedicated Render staging service exists, use shadow mode in production (`FF_ORDER_AUTH_ENFORCE=false`) until manual guest/Razorpay QA passes, then enable enforce.

### Verify secret configured

```bash
curl -s -X POST "https://manaintibojanam-backend.onrender.com/api/orders/TEST/guest-view-token" \
  -H "Content-Type: application/json" \
  -d '{"phoneLast4":"0000"}'
```

- `503` + "not configured" → secret missing
- `404` → secret OK (order not found is expected)

---

## 4. Post-deploy verification

```bash
# Health
curl -s https://manaintibojanam-backend.onrender.com/api/health

# Frontend build
curl -s https://www.bhojanos.com/version.json

# User orders auth (must be 401 without token after deploy)
curl -s -o /dev/null -w "%{http_code}" \
  https://manaintibojanam-backend.onrender.com/api/orders/user/test-user

# Notify auth (must be 401 without token)
curl -s -o /dev/null -w "%{http_code}" -X POST \
  https://manaintibojanam-backend.onrender.com/api/orders/test/notify-status \
  -H "Content-Type: application/json" -d '{"status":"PLACED"}'
```

Build parity: `/api/health` `platform.build` prefix should match `version.json` `build` prefix.

---

## 5. Manual verification checklist

| Flow | Steps | Pass |
|------|-------|------|
| Guest order (COD) | Checkout → track with phone verify | ☐ |
| Logged-in order | Place order → Firestore/API track | ☐ |
| Razorpay | Online checkout → verify promotion | ☐ |
| COD | Cash order → owner accept | ☐ |
| Notifications | Owner status change → customer notify | ☐ |
| Order tracking | Guest JWT + logged-in listener | ☐ |

---

## 6. Automated tests (pre/post deploy)

```bash
npm run test:security
npm run test:smoke
```

Optional live probes:

```bash
SECURITY_TEST_BASE_URL=https://manaintibojanam-backend.onrender.com npm run test:api-security
```

---

## 7. 24-hour monitoring window

**Start:** Record UTC timestamp at production deploy completion.

Monitor:

- Render logs: `order_access_would_block`, `razorpay_draft_bind_would_block`, 401/403 rate
- Firebase: Firestore `permission-denied`
- Payment success rate (Razorpay verify + COD)
- `/api/health` uptime

**End:** After 24h with no P0/P1 incidents, enable `FF_ORDER_AUTH_ENFORCE=true` in production if still in shadow mode.

---

## 8. Rollback

1. `FF_ORDER_AUTH_ENFORCE=false` + `FF_RAZORPAY_DRAFT_BIND=false`
2. Redeploy previous git tag on Render/Vercel if code regression
3. `firebase deploy --only firestore:rules` from previous commit if rules regression
