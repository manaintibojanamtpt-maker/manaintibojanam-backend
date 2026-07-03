# Menu Platform Governance v1.0

**Status:** Frozen — M7 PR-14  
**Date:** 2026-06-27  
**Governance:** ADR-011 · ADR-023 (proposed) · FEB-001

---

## 1. Ownership

| Role | Responsibility |
|------|----------------|
| **Platform Architect** | ADR approval, freeze decisions |
| **Menu SDK Owner** | Contract stability, PR review |
| **Domain Owner** | Catalog/pricing/validation rules |
| **SRE / Ops** | Rollout, observability, rollback |
| **ARB** | Production activation approval |

---

## 2. Change control

### Frozen (require ADR + ARB)

- `MenuSDK` public contract (7 methods)
- `MenuRepository` read port
- `MenuFacade` presentation surface
- DTO shapes in `src/sdk/menu/dto/`
- Feature flag names and defaults
- Version constants (after PR-15 promotion)

### Additive only (PR review)

- New telemetry events
- New standalone infrastructure modules
- Documentation updates
- Test additions

### Prohibited without explicit ADR

- Wiring adapter/rollout into `createMenuSDK()`
- Changing flag defaults to ON
- Modifying frozen platforms (M1–M6)
- Firestore migration
- Production routing changes
- Breaking DTO changes

---

## 3. Version policy

| Version | Meaning |
|---------|---------|
| `0.x.x` | Pre-release / foundation |
| `1.0.0` | First certified freeze (recommended PR-15) |
| `1.x.x` | Additive patches post-freeze |
| `2.0.0` | Breaking contract change |

**Recommended:** `MENU_SDK_VERSION = "1.0.0"`, `MENU_SDK_FROZEN = true` (PR-15).

---

## 4. Feature flag governance

All 9 menu flags:

1. Default **OFF** in all environments until ARB approval
2. Staging enable follows documented sequence
3. Production enable requires PR-13 certification `READY` or `CONDITIONAL`
4. Any flag ON in production requires rollback plan (L1 documented)

---

## 5. Certification governance

| Decision | Authority |
|----------|-----------|
| Documentation freeze | ARB (ADR-023) |
| Version promotion | ARB → PR-15 |
| Staging soak | Platform team |
| Production activation | ARB + explicit approval |
| Emergency rollback | SRE (L1–L4) |

PR-13 certification packages always include:
- `legacyAuthoritative: true`
- `productionActivationProhibited: true` (until explicit override)

---

## 6. Review cadence

| Review | Frequency |
|--------|-----------|
| Test suite health | Every PR |
| Parity reports | During staging soak |
| Certification re-evaluation | Before each rollout stage |
| Architecture compliance | Quarterly or on major PR |
| ADR review | On contract change proposal |

---

## 7. Escalation path

1. **L1 issue:** Disable flag → SRE
2. **Contract concern:** Platform Architect → ADR
3. **Production incident:** L4 emergency → ARB post-mortem
4. **Breaking change request:** ADR → ARB → major version

---

## 8. Related documents

- [MENU-PLATFORM-CERTIFICATION.md](./MENU-PLATFORM-CERTIFICATION.md)
- [MENU-QUALITY-GATES.md](./MENU-QUALITY-GATES.md)
- [MENU-RISK-ASSESSMENT.md](./MENU-RISK-ASSESSMENT.md)
- [docs/adr/ADR-023-menu-platform-v1-freeze.md](../../adr/ADR-023-menu-platform-v1-freeze.md)
