# Menu Compatibility Matrix v1.0

**Status:** Frozen — M7 PR-14  
**Date:** 2026-06-27

---

## 1. Supported clients

| Client | Integration path | v1.0 support | Notes |
|--------|------------------|--------------|-------|
| **Presentation (future)** | `MenuFacade` → `MenuSDK` | ✅ Full | PR-5; legacy when flag OFF |
| **Server / SSR** | `createMenuSDK()` with injected ports | ✅ Supported | No UI in SDK core |
| **Unit tests** | Mock `MenuSDK` + facade deps | ✅ Supported | 253 menu-focused tests |
| **Discovery platform** | No menu integration | ✅ Unchanged | Frozen M3 |
| **Search platform** | No menu integration | ✅ Unchanged | Frozen M4 |
| **Branch platform** | No menu integration | ✅ Unchanged | Frozen M5 |
| **Order platform** | Item references only | ✅ Compatible | Order stores item IDs |

---

## 2. Platform dependency matrix

| Dependency | Required for | If unavailable |
|------------|--------------|----------------|
| `FF_MENU_ENABLED` | Any MenuSDK method | `StubMenuAdapter` → `NOT_CONFIGURED` |
| `FF_MENU_SEARCH_ENABLED` | `searchMenu` | Search returns `NOT_CONFIGURED` |
| Legacy persistence port | Live menu reads | Stub / unavailable |
| Projection flags (PR-6+) | Shadow evidence only | Evidence modules skip |
| Adapter flag (PR-11) | Adapter routing | Legacy only (default) |
| Rollout flag (PR-12) | Rollout policy | Stage 0 / legacy |
| Certification flag (PR-13) | Switch certification | `NOT_READY` |

**Production default:** all OFF. Legacy authoritative.

---

## 3. Feature flag combinations

### Core MenuSDK

| `FF_MENU` | `FF_SEARCH` | Behaviour |
|-----------|-------------|-----------|
| OFF | * | Stub SDK — no menu reads |
| ON | OFF | Core reads; search `NOT_CONFIGURED` |
| ON | ON | Full SDK reads + search |

### Projection evidence chain (standalone — not MenuSDK routing)

| Projection | Parity | Soak | Operational | Behaviour |
|------------|--------|------|-------------|-----------|
| OFF | * | * | * | No projection evidence |
| ON | OFF | * | * | Foundation only |
| ON | ON | OFF | * | Parity validation |
| ON | ON | ON | OFF | Soak certification |
| ON | ON | ON | ON | Full operational evidence |

### Adapter / rollout / certification (standalone)

| Adapter | Rollout | Certification | Behaviour |
|---------|---------|---------------|-----------|
| OFF | * | * | Legacy only; no adapter routing |
| ON | OFF | * | Adapter gates; stage 0 |
| ON | ON | OFF | Staged rollout policy |
| ON | ON | ON | Full switch certification |

**None of these flags change MenuSDK default routing in v1.0.**

---

## 4. SDK version compatibility

| Version | Status | Notes |
|---------|--------|-------|
| `0.1.0-foundation` | Current runtime | Pre-freeze scaffold |
| `1.0.0` | Recommended (PR-15) | Post-ARB metadata promotion |
| `< 1.0.0` | Pre-release | Internal development only |

### Backward compatibility

- DTO shapes stable since PR-1
- `createMenuSDK()` signature unchanged since PR-1
- All new modules (PR-6–PR-13) are additive
- No breaking changes to frozen platforms (M1–M6)

### Forward compatibility

- Projection read model is catalog-metadata only (PR-7)
- Full item projection deferred to future major version
- Firestore migration deferred to future ADR

---

## 5. Migration prerequisites

Before any production enablement:

1. ARB approval of ADR-023
2. PR-15 version constant promotion
3. 72-hour staging soak with flags ON (staging only)
4. PR-13 switch certification `READY` or `CONDITIONAL`
5. Explicit production activation approval (separate from v1.0 freeze)

---

## 6. Recommended staging enable sequence

1. `FF_MENU_ENABLED` — core SDK reads
2. `FF_MENU_SEARCH_ENABLED` — search (if needed)
3. `FF_MENU_PROJECTION_ENABLED` — projection foundation
4. `FF_MENU_PROJECTION_PARITY_ENABLED` — parity validation
5. `FF_MENU_PROJECTION_SOAK_ENABLED` — soak certification
6. `FF_MENU_OPERATIONAL_VALIDATION_ENABLED` — operational evidence
7. `FF_MENU_PROJECTION_ADAPTER_ENABLED` — adapter (staging only)
8. `FF_MENU_PROJECTION_ROLLOUT_ENABLED` — rollout policy (staging only)
9. `FF_MENU_PROJECTION_CERTIFICATION_ENABLED` — switch certification

**Production enable sequence:** identical order with ARB sign-off at each gate. Default remains all OFF.

---

## 7. Frozen platform matrix

| Platform | Modified by M7 | Status |
|----------|----------------|--------|
| DiscoverySDK | No | Frozen |
| SearchSDK | No | Frozen |
| BranchSDK | No | Frozen |
| OrderSDK | No | Frozen |
| LocationSDK | No | Frozen |
| ReferenceSDK | No | Frozen |
| Event Platform | No | Frozen |
