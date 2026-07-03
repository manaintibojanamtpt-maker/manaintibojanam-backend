# Event Rollback Procedures v1.0

**Status:** Frozen — M6 PR-14  
**Date:** 2026-06-27  
**Default state:** All flags OFF — legacy authoritative for Order reads

---

## 1. Rollback overview

| Level | Scope | Time to recover | Trigger |
|-------|-------|-----------------|---------|
| **L1** | Feature flag rollback | < 1 min | Any event flag ON causes issues |
| **L2** | Adapter rollback | < 5 min | Projection reads incorrect |
| **L3** | Deployment rollback | < 15 min | Code regression |
| **L4** | Emergency recovery | < 1 hour | Data corruption / cascade failure |

---

## 2. L1 — Feature flag rollback

Disable offending flag(s). No redeployment required.

### Core flags

| Flag | Disable effect |
|------|----------------|
| `FF_EVENT_PLATFORM_ENABLED` | All EventSDK methods stubbed |
| `FF_EVENT_OUTBOX_ENABLED` | Outbox path disabled |
| `FF_EVENT_REPLAY_ENABLED` | Replay disabled |
| `FF_EVENT_SHADOW_PUBLISHING_ENABLED` | Shadow publish stops |
| `FF_EVENT_PROJECTION_ENABLED` | Projection worker stops |
| `FF_ORDER_SHADOW_EVENTS_ENABLED` | Business events stop |
| `FF_EVENT_PROJECTION_RUNTIME_ENABLED` | Runtime stops |
| `FF_ORDER_READ_PROJECTION_ENABLED` | Order projection stops |
| `FF_ORDER_PROJECTION_PARITY_ENABLED` | Parity checks stop |
| `FF_ORDER_PROJECTION_SOAK_ENABLED` | Soak monitoring stops |
| `FF_EVENT_OPERATIONAL_VALIDATION_ENABLED` | Operational checks stop |

### Infrastructure flags

| Flag | Disable effect |
|------|----------------|
| `FF_ORDER_PROJECTION_ADAPTER_ENABLED` | Adapter disabled → legacy only |
| `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` | Rollout disabled → stage 0 |
| `FF_ORDER_PROJECTION_CERTIFICATION_ENABLED` | Certification stops |

**Emergency L1:** Set all 14 flags to `false`. Verify legacy Order reads.

---

## 3. L2 — Adapter rollback

1. Disable `FF_ORDER_PROJECTION_ADAPTER_ENABLED`
2. Disable `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` if active
3. Verify adapter telemetry shows legacy routing only
4. Run parity check on legacy data integrity

---

## 4. L3 — Deployment rollback

1. Execute L1 immediately
2. Roll back deployment to last known-good release
3. Verify: `npm run test:sdk` → 1033/1033
4. Re-enable flags one at a time in staging only

---

## 5. L4 — Emergency recovery

1. L1 — all flags OFF
2. Stop projection refresh jobs
3. Assess parity and operational drift evidence
4. Replay from last known-good checkpoint or restore legacy source
5. Full test suite + manual smoke on legacy Order path
6. Post-mortem ADR if architectural change required

**Authoritative source:** Legacy persistence for Order reads in v1.0.

---

## 6. Metadata rollback (PR-14 only)

No runtime rollback required. To revert metadata promotion:

```bash
git revert <PR-14-commit-sha>
# Restore EVENT_SDK_VERSION = '0.10.0-operational-validation'
# Restore EVENT_SDK_FROZEN = false
git tag -d event-platform-v1.0
```

---

## 7. Post-rollback verification

- [ ] All 14 flags confirmed OFF
- [ ] OrderSDK returns legacy behaviour
- [ ] No projection telemetry in production
- [ ] Smoke: order read via legacy path
- [ ] ARB notified if production affected

---

**Production default:** L1 rollback is a no-op (flags already OFF).
