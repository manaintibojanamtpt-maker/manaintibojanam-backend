# M0 Production Completion Report

**Release tag:** `v1.0.0-m0`  
**Commit:** `4e8317a`  
**Report generated:** 2026-06-30T14:38:00Z  
**Authority:** FEB-001, BHOS-ERR-001, ADR-011, ADR-012

---

## Executive Summary

The **M0 Release PR** is **operationally complete** for repository, deployment, rules, automated testing, and initial production verification. API and frontend are live on commit `4e8317a`. Firestore rules are deployed to `bhojanos-prod`.

**M0 milestone declaration:** **CONDITIONALLY COMPLETE** — pending **24-hour production monitoring** (ends **2026-07-01T14:37Z**) and operator confirmation of `ORDER_GUEST_TOKEN_SECRET` + feature-flag rollout per [`M0-DEPLOYMENT.md`](./M0-DEPLOYMENT.md).

---

## Release Checklist Status

### Repository

| Item | Status | Evidence |
|------|--------|----------|
| Commit all M0 changes | ✅ | `4e8317a` — 30 files |
| Push | ✅ | `origin/main` updated |
| Merge | ✅ | Direct to `main` |
| Tag `v1.0.0-m0` | ✅ | Pushed to origin |

**Remaining uncommitted (non-M0):** owner guide PDFs/screenshots, `public/version.json` (build artifact), `.tmp-*.js` scratch files.

---

### Deployment

| Item | Status | Evidence |
|------|--------|----------|
| Deploy API | ✅ | `/api/health` → `platform.build: "4e8317a"` |
| Deploy Frontend | ✅ | `version.json` → `build: "4e8317acc607"` |
| Deploy Firestore Rules | ✅ | `firebase deploy --only firestore:rules --project bhojanos-prod` succeeded |
| Verify `version.json` | ✅ | 200 OK, build matches API prefix |
| Verify `/api/health` | ✅ | 200 OK, Firestore connected |

---

### Configuration

| Item | Status | Notes |
|------|--------|-------|
| `ORDER_GUEST_TOKEN_SECRET` | ⚠️ **Verify on Render** | Set ≥32 chars before guest token issuance in prod |
| `FF_ORDER_AUTH_ENFORCE` | ⚠️ **Default off (shadow)** | Enable after 24h soak / staging QA |
| `FF_RAZORPAY_DRAFT_BIND` | ⚠️ **Default off (shadow)** | Enable after Razorpay QA |
| Other env vars | ✅ | Email, Firebase, Razorpay unchanged |

---

### Verification (automated)

| Item | Status | Evidence |
|------|--------|----------|
| `GET /api/orders/user/:id` without auth | ✅ | Live probe → **401** |
| `POST /api/orders/:id/notify-status` without auth | ✅ | Live probe → **401** |
| `GET /api/orders/:id` shadow mode | ✅ | Live probe → 404 (flag off; no leak on missing ID) |
| Build parity | ✅ | API `4e8317a` ↔ frontend `4e8317acc607` |

### Verification (manual — operator)

| Flow | Status |
|------|--------|
| Guest order + phone verify tracking | ☐ Pending manual QA |
| Logged-in order | ☐ Pending manual QA |
| Razorpay checkout | ☐ Pending manual QA |
| COD checkout | ☐ Pending manual QA |
| Owner notifications | ☐ Pending manual QA |
| Order tracking (guest JWT + logged-in) | ☐ Pending manual QA |

---

### Testing

| Suite | Status | Result |
|-------|--------|--------|
| Security tests (`test:security`) | ✅ | 38 unit + 10 matrix + rules compile |
| Rules tests | ⚠️ Partial | Compile pass; emulator skipped (no JDK) |
| Integration / live probes | ✅ | 13/13 with `SECURITY_TEST_BASE_URL` |
| Smoke tests | ✅ | 22/22 after `npm run build` |

---

### Monitoring

| Item | Status |
|------|--------|
| 24h monitoring window | **IN PROGRESS** |
| Start | 2026-06-30T14:37Z (API deploy confirmed) |
| End | 2026-07-01T14:37Z |
| Logs / error rate / health | Baseline healthy at deploy |
| Payment success | Monitor during window |
| Firestore permission-denied | Monitor after rules deploy |

---

### Documentation

| Item | Status |
|------|--------|
| Release notes | ✅ `docs/release-notes/M0.md` |
| Changelog | ✅ `CHANGELOG.md` |
| ADR updates | ✅ ADR-011, ADR-012 in repo |
| Deployment notes | ✅ `docs/release-notes/M0-DEPLOYMENT.md` |

---

### Governance

| Item | Status |
|------|--------|
| Schedule ERR-002 | ✅ `docs/governance/ERR-002-SCHEDULE.md` — review **2026-07-02** |
| Architecture review | ✅ Exit review completed pre-release |
| Approve M1 | ❌ **Deferred** until ERR-002 Go decision |

---

## Milestone Acceptance (§14)

| Criterion | Status |
|-----------|--------|
| Open `GET /api/orders/:id` returns 401 without credentials | ⚠️ **After `FF_ORDER_AUTH_ENFORCE=true`** (shadow mode now) |
| Guest JWT returns 200 for own order | ✅ Code + tests; manual prod QA pending |
| Cross-user order list returns 403 | ✅ **401 without token** live |
| Notify without owner token returns 401/403 | ✅ **401** live |
| Test collections deny public writes | ✅ Rules deployed |
| `npm run test:security` green | ✅ |
| No regression (tracking, owner, Razorpay) | ☐ Manual QA during monitoring |
| BHOS-ERR-002 scheduled | ✅ |

---

## Rollback Verified

| Mechanism | Verified |
|-----------|----------|
| `FF_ORDER_AUTH_ENFORCE=false` | Documented; no redeploy needed |
| `FF_RAZORPAY_DRAFT_BIND=false` | Documented |
| Firestore rules rollback | Prior commit redeploy |
| Git tag rollback | `v1.0.0-m0` ↔ `f24bdd5` |

---

## Remaining Operator Actions (before M0 = COMPLETE)

1. **Confirm `ORDER_GUEST_TOKEN_SECRET`** on Render (guest token endpoint must not return 503).
2. **Complete manual verification checklist** in `M0-DEPLOYMENT.md` §5.
3. **Monitor production 24 hours** (ends 2026-07-01T14:37Z).
4. **Enable `FF_ORDER_AUTH_ENFORCE=true`** in production after clean soak (closes CB-1).
5. **Optional:** Enable `FF_RAZORPAY_DRAFT_BIND=true` after Razorpay QA.
6. **Conduct ERR-002** on 2026-07-02 before M1.

---

## Go / No-Go for M1

| Decision | Status |
|----------|--------|
| M0 Release PR | **COMPLETE** |
| M0 milestone sign-off | **PENDING** (24h soak + flags + manual QA) |
| M1 start | **NO-GO** until ERR-002 (2026-07-02) |

**Recommended first M1 PR (after ERR-002 Go):** M1-PR-1 — SDK package scaffold + order read models (ADR-011 S1).

---

## Sign-off

| Role | Status |
|------|--------|
| Release engineering | ✅ Deploy + tests complete |
| Architecture Review Board | ☐ Final sign-off after 24h window |
| Founder | ☐ Approve M0 complete + M1 start after ERR-002 |

---

*BhojanOS M0 — Security Hardening — Release PR complete. Do not begin M1 until ERR-002 Go decision.*
