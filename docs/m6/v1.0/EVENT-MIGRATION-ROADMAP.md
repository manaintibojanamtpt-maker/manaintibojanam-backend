# Event Migration Roadmap v1.0

**Status:** Frozen — M6 PR-14  
**Date:** 2026-06-27  
**Current state:** Legacy authoritative · All flags OFF

---

## 1. Migration phases

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
(v1.0       (Metadata    (Staging     (Production  (Firestore
 doc+meta)   promotion)   soak)       rollout)     migration)
  PR-4.5      PR-14 ✅     NEXT        Post-soak    Future ADR
```

---

## 2. Phase 0 — Governance (COMPLETE)

**PR:** M6 PR-4.5  
- `docs/m6/v1/` enterprise contract pack
- ADR-019 through ADR-022

---

## 3. Phase 1 — Metadata Promotion (COMPLETE)

**PR:** M6 PR-14 ✅  
- `EVENT_SDK_VERSION = 1.0.0`
- `EVENT_SDK_FROZEN = true`
- ADR-024 accepted
- Full v1.0 documentation pack

---

## 4. Phase 2 — Staging Soak (NEXT)

**Prerequisites:** Phase 1 complete ✅

| Step | Action |
|------|--------|
| 1 | Enable flags in staging (see compatibility matrix) |
| 2 | Run order projection refresh for test tenants |
| 3 | Parity validation — target > 99.9% |
| 4 | 72-hour soak — health score > 0.95 |
| 5 | PR-13 certification package |
| 6 | ARB review of soak evidence |

---

## 5. Phase 3 — Production Rollout

**Prerequisites:** Phase 2 certification `READY` or `CONDITIONAL`

Staged rollout via PR-12 policy (0% → 1% → 5% → 25% → 50% → 100%).

Requires OrderSDK → adapter wiring ADR (separate from PR-14).

---

## 6. Phase 4 — Firestore Migration (Future)

Requires separate ADR. Not in v1.0 scope.

---

**STOP.** Phase 2 (staging soak) is the recommended next operational milestone.
