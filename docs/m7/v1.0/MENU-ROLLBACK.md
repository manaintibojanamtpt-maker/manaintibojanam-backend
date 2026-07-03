# Menu Rollback Procedures v1.0

**Status:** Frozen — M7 PR-14  
**Date:** 2026-06-27  
**Default state:** All flags OFF — legacy authoritative

---

## 1. Rollback overview

| Level | Scope | Time to recover | Trigger |
|-------|-------|-----------------|---------|
| **L1** | Feature flag rollback | < 1 min | Any menu flag ON causes issues |
| **L2** | Adapter rollback | < 5 min | Projection reads incorrect |
| **L3** | Deployment rollback | < 15 min | Code regression |
| **L4** | Emergency recovery | < 1 hour | Data corruption / cascade failure |

---

## 2. L1 — Feature flag rollback

**Fastest recovery.** Disable the offending flag(s). No redeployment required.

### Core flags

| Flag | Disable effect |
|------|----------------|
| `FF_MENU_ENABLED` | All MenuSDK methods → `NOT_CONFIGURED` |
| `FF_MENU_SEARCH_ENABLED` | Search disabled; core reads unaffected |
| `FF_MENU_PROJECTION_ENABLED` | Projection evidence stops |
| `FF_MENU_PROJECTION_PARITY_ENABLED` | Parity checks stop |
| `FF_MENU_PROJECTION_SOAK_ENABLED` | Soak monitoring stops |
| `FF_MENU_OPERATIONAL_VALIDATION_ENABLED` | Operational checks stop |

### Infrastructure flags

| Flag | Disable effect |
|------|----------------|
| `FF_MENU_PROJECTION_ADAPTER_ENABLED` | Adapter routing disabled → legacy only |
| `FF_MENU_PROJECTION_ROLLOUT_ENABLED` | Rollout policy disabled → stage 0 |
| `FF_MENU_PROJECTION_CERTIFICATION_ENABLED` | Certification evaluation stops |

### Emergency L1 sequence (all menu flags OFF)

1. Set all 9 menu flags to `false`
2. Verify `createMenuSDK()` returns stub / legacy behaviour
3. Confirm no projection telemetry emitted
4. Run smoke: `getMenu` via legacy path

**Recovery time:** < 1 minute (config change only).

---

## 3. L2 — Adapter rollback

When adapter is enabled and projection reads are incorrect:

1. **L2a:** Disable `FF_MENU_PROJECTION_ADAPTER_ENABLED` → all reads route to legacy
2. **L2b:** If rollout was active, disable `FF_MENU_PROJECTION_ROLLOUT_ENABLED`
3. Verify adapter telemetry shows `menu_adapter_route_legacy` only
4. Run parity check to confirm legacy data integrity

**Adapter default:** legacy only. Adapter OFF is the safe state.

---

## 4. L3 — Deployment rollback

When a code regression affects menu behaviour:

1. Execute L1 (all flags OFF) immediately
2. Roll back deployment to last known-good release
3. Verify test suite: `npm run test:sdk` → 1033/1033
4. Re-enable flags one at a time in staging (see compatibility matrix enable sequence)
5. Do NOT re-enable in production without PR-13 certification `READY`

---

## 5. L4 — Emergency recovery

For data corruption, cascade failures, or unknown state:

1. **Immediate:** L1 — all flags OFF
2. **Isolate:** Stop projection refresh jobs
3. **Assess:** Check parity reports and operational drift evidence
4. **Restore:** Replay from last known-good checkpoint (projection) or legacy source of truth
5. **Validate:** Full test suite + manual smoke on legacy path
6. **Post-mortem:** ADR if architectural change required

**Authoritative source:** Legacy persistence is always authoritative in v1.0. Projection is shadow-only until explicit production activation approval.

---

## 6. Rollback safety guarantees

| Guarantee | Evidence |
|-----------|----------|
| Flags default OFF | Foundation tests |
| Legacy always available | Adapter fallback tests |
| No MenuSDK wiring to adapter | No integration wiring in `createMenuSDK()` |
| Certification blocks production | `productionActivationProhibited: true` |
| Frozen platforms untouched | M1–M6 not modified |

---

## 7. Post-rollback verification checklist

- [ ] All 9 menu flags confirmed OFF
- [ ] MenuSDK returns expected legacy/stub behaviour
- [ ] No projection telemetry in production logs
- [ ] Smoke test: `getMenu`, `getMenuItem`, `listCategories`
- [ ] Incident documented
- [ ] ARB notified if production was affected

---

**Production default:** L1 rollback is a no-op (flags already OFF). Rollback procedures validated in staging during enable sequence.
