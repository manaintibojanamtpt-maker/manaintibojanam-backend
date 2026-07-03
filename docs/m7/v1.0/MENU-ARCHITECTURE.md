# Menu Platform Architecture v1.0

**Status:** Frozen — M7 PR-14  
**Date:** 2026-06-27

---

## 1. Architecture overview

The Menu & Catalog Platform follows the BhojanOS layered SDK pattern with strangler-fig migration for projection reads.

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation                          │
│                   MenuFacade (PR-5)                      │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    MenuSDK (PR-1, PR-4)                  │
│              createMenuSDK() → Orchestrator              │
│         7 methods · flags · stub when disabled           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              MenuRepository (PR-2)                       │
│           Provider-neutral read port                     │
│              LEGACY AUTHORITATIVE                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         Standalone Infrastructure (NOT wired)            │
│                                                          │
│  PR-6  Projection Foundation                             │
│  PR-7  Shadow Catalog Projection                         │
│  PR-8  Parity Validation                                 │
│  PR-9  Soak Certification                              │
│  PR-10 Operational Validation                            │
│  PR-11 Read Adapter (legacy ↔ projection)              │
│  PR-12 Staged Rollout Policy                             │
│  PR-13 Switch Certification                              │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Layer responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Domain** | `src/domain/menu/` | Pure business rules — catalog, pricing, validation, projection, parity, soak, operations, adapter, rollout, certification |
| **SDK** | `src/sdk/menu/` | Contracts, DTOs, orchestration, infrastructure factories, telemetry |
| **Presentation** | `src/lib/menu/` | `MenuFacade` — maps UI operations to SDK |
| **Repository** | `src/sdk/menu/repository/` | Read port abstraction |

---

## 3. Domain modules

| Module | PR | Purpose |
|--------|-----|---------|
| `catalog/` | PR-1 | Menu, items, categories, combos |
| `pricing/` | PR-1 | Price rules |
| `validation/` | PR-1 | Menu validation |
| `projection/` | PR-6 | Checkpoint, snapshot rules |
| `parity/` | PR-8 | Comparison rules |
| `soak/` | PR-9 | Health thresholds |
| `operations/` | PR-10 | Lag, drift, replay rules |
| `adapter/` | PR-11 | Routing decisions |
| `rollout/` | PR-12 | Stage policy |
| `certification/` | PR-13 | GO/NO-GO decisions |

---

## 4. SDK modules

| Module | PR | Wired to MenuSDK? |
|--------|-----|-------------------|
| `contracts/` | PR-1 | ✅ Public API |
| `dto/` | PR-1 | ✅ Public API |
| `orchestration/` | PR-4 | ✅ Default path |
| `repository/` | PR-2 | ✅ Injected port |
| `featureFlags/` | PR-1 | ✅ Gating |
| `projection/` | PR-6 | ❌ Standalone |
| `shadow/` | PR-7 | ❌ Standalone |
| `parity/` | PR-8 | ❌ Standalone |
| `soak/` | PR-9 | ❌ Standalone |
| `operations/` | PR-10 | ❌ Standalone |
| `adapter/` | PR-11 | ❌ Standalone |
| `rollout/` | PR-12 | ❌ Standalone |
| `certification/` | PR-13 | ❌ Standalone |

---

## 5. Feature flag architecture

```
FF_MENU_ENABLED ─────────────► MenuSDK gate
  ├── FF_MENU_SEARCH_ENABLED ──► searchMenu gate
  ├── FF_MENU_PROJECTION_ENABLED ► projection evidence
  │     ├── FF_MENU_PROJECTION_PARITY_ENABLED
  │     ├── FF_MENU_PROJECTION_SOAK_ENABLED
  │     └── FF_MENU_OPERATIONAL_VALIDATION_ENABLED
  ├── FF_MENU_PROJECTION_ADAPTER_ENABLED ► adapter (standalone)
  ├── FF_MENU_PROJECTION_ROLLOUT_ENABLED ► rollout (standalone)
  └── FF_MENU_PROJECTION_CERTIFICATION_ENABLED ► certification
```

All default **OFF**. No flag changes MenuSDK routing in v1.0.

---

## 6. Data flow — current (v1.0)

```
Request → MenuFacade → MenuSDK → Legacy Repository → Response
```

When `FF_MENU_ENABLED` OFF:

```
Request → MenuFacade → MenuSDK → StubMenuAdapter → NOT_CONFIGURED
```

---

## 7. Data flow — future (post-activation)

```
Request → MenuFacade → MenuSDK → Adapter → Legacy | Projection
                                              ↓
                                    Parity (shadow validation)
                                    Rollout (percentage routing)
                                    Certification (GO/NO-GO)
```

Requires explicit ARB approval and MenuSDK wiring PR.

---

## 8. Architecture compliance

| Principle | Status |
|-----------|--------|
| Provider neutrality | ✅ Repository port abstraction |
| Strangler pattern | ✅ Shadow projection + adapter |
| Feature flag gating | ✅ All flags OFF |
| Legacy authoritative | ✅ Enforced in certification |
| No cross-platform coupling | ✅ M1–M6 untouched |
| Presentation isolation | ✅ MenuFacade only |
| Domain purity | ✅ No I/O in domain |
| Additive evolution | ✅ PR-1 through PR-14 |

---

## 9. Frozen platform boundaries

Menu Platform does NOT modify:

- DiscoverySDK, SearchSDK, BranchSDK, OrderSDK
- LocationSDK, ReferenceSDK
- Event Platform, Projection Runtime

Menu references item IDs compatible with Order platform but does not integrate SDK-to-SDK.

---

## 10. Related ADRs

- ADR-011 — Platform layering
- ADR-023 — Menu platform v1.0 freeze (proposed)
