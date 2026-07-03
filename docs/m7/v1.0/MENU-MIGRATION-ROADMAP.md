# Menu Migration Roadmap v1.0

**Status:** Frozen — M7 PR-14  
**Date:** 2026-06-27  
**Current state:** Legacy authoritative · All flags OFF

---

## 1. Migration phases

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
(v1.0       (Metadata    (Staging     (Production  (Firestore
 freeze)     promotion)    soak)       rollout)     migration)
  NOW         PR-15        Post-ARB    Post-soak    Future ADR
```

---

## 2. Phase 0 — v1.0 Documentation Freeze (COMPLETE)

**PR:** M7 PR-14  
**Status:** ✅ Complete

- Full documentation pack
- ADR-023 proposed
- CONDITIONAL GO certification
- No runtime changes

---

## 3. Phase 1 — Metadata Promotion

**PR:** M7 PR-15 (BLOCKED — await ARB)  
**Prerequisites:** ARB approval of ADR-023

| Action | Detail |
|--------|--------|
| Promote `MENU_SDK_VERSION` | `0.1.0-foundation` → `1.0.0` |
| Set `MENU_SDK_FROZEN` | `false` → `true` |
| Create git tag | `menu-platform-v1.0` |
| Update README badges | Version + freeze status |

**No behaviour changes.**

---

## 4. Phase 2 — Staging Soak

**Prerequisites:** Phase 1 complete

| Step | Action |
|------|--------|
| 1 | Enable flags in staging (see enable sequence) |
| 2 | Run projection refresh for test tenants |
| 3 | Execute parity validation — target > 99.9% match |
| 4 | Run 72-hour soak — health score > 0.95 |
| 5 | Generate PR-13 certification package |
| 6 | ARB review of soak evidence |

---

## 5. Phase 3 — Production Rollout

**Prerequisites:** Phase 2 certification `READY` or `CONDITIONAL`

| Stage | Rollout % | Flags |
|-------|-----------|-------|
| 0 | 0% | All OFF (current) |
| 1 | 1% | Adapter + rollout ON |
| 2 | 5% | Increase percentage |
| 3 | 25% | Monitor parity |
| 4 | 50% | Operational validation |
| 5 | 100% | Full projection reads |

Each stage requires:
- PR-13 certification re-evaluation
- L1 rollback verified
- Observability dashboards active

**Requires MenuSDK → adapter wiring PR (not in v1.0 scope).**

---

## 6. Phase 4 — Firestore Migration (Future)

**Prerequisites:** Phase 3 stable for 30 days  
**Requires:** New ADR

| Concern | Approach |
|---------|----------|
| Data model | Firestore collections for menu entities |
| Dual-write | Legacy + Firestore during transition |
| Read switch | Adapter routes to Firestore projection |
| Rollback | L2 adapter rollback to legacy |

**Not scoped in M7 v1.0.**

---

## 7. Phase 5 — Full Item Projection (Future)

Current projection (PR-7) covers **catalog metadata only**.

Full item projection requires:
- Extended projection schema
- Parity rules for item-level fields
- Performance assessment for large menus
- ADR for schema expansion

---

## 8. Timeline (indicative)

| Phase | Target | Gate |
|-------|--------|------|
| Phase 0 | 2026-06-27 | PR-14 complete |
| Phase 1 | Post-ARB | ADR-023 approved |
| Phase 2 | +2 weeks | Staging soak pass |
| Phase 3 | +4 weeks | Certification READY |
| Phase 4 | TBD | Firestore ADR |
| Phase 5 | TBD | Item projection ADR |

---

## 9. Rollback at each phase

| Phase | Rollback |
|-------|----------|
| Phase 0 | N/A — no changes |
| Phase 1 | Revert version constants |
| Phase 2 | L1 — disable all flags |
| Phase 3 | L1 + L2 — adapter rollback |
| Phase 4 | L2 + L4 — legacy restoration |

See [MENU-ROLLBACK.md](./MENU-ROLLBACK.md).

---

**STOP.** Phase 1 (PR-15) blocked until ARB approval.
