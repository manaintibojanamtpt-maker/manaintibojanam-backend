# Branch Compatibility Matrix v1.0

**Status:** Frozen — M5 PR-15  
**Date:** 2026-06-26

---

## 1. Supported clients

| Client | Integration path | v1.0 support | Notes |
|--------|------------------|--------------|-------|
| **Checkout (customer)** | `CheckoutBranchFacade` → `BranchFacade` → `BranchSDK` | ✅ Full | PR-8; legacy path when flag OFF |
| **Order persistence** | `OrderBranchPersistence` ← checkout snapshot | ✅ Full | PR-9; no SDK calls |
| **Owner branch UI** | `OwnerBranchManagement` → `OwnerBranchFacade` | ✅ Full | PR-14; read-only |
| **Discovery pipeline** | `BranchCandidateResolver` (additive read) | ✅ Compatible | PR-6; tenant-as-branch when OFF |
| **Server / SSR** | `createBranchSDK()` with injected ports | ✅ Supported | No UI in SDK core |
| **Node unit tests** | Mock `BranchSDK` + facade deps | ✅ Supported | 204 branch-focused tests |
| **Future npm package** | `BranchSDK` contract + DTOs | ✅ Ready | Version constant post-ARB |
| **Search platform** | No branch integration | ✅ Unchanged | Search never selects branches |
| **Marketplace browse** | Discovery-only | ✅ Compatible | Branch flags OFF |

---

## 2. Platform dependency matrix

| Dependency | Required for | If unavailable |
|------------|--------------|----------------|
| `FF_BRANCH_ENABLED` | Any BranchSDK method | `StubBranchAdapter` → `NOT_CONFIGURED` |
| `FF_BRANCH_REPOSITORY_ENABLED` | Live branch reads | `UNAVAILABLE` / stub repository |
| `FF_BRANCH_ASSIGNMENT_ENABLED` | `findBestBranch` | `NOT_CONFIGURED` on assignment |
| `FF_BRANCH_CHECKOUT_ENABLED` | Checkout assignment | Legacy checkout (tenant-only) |
| `FF_BRANCH_ORDER_PERSISTENCE_ENABLED` | Order `branchId` fields | Order schema unchanged |
| `FF_BRANCH_OPERATIONS_SDK_ENABLED` | Operational availability | `NOT_CONFIGURED` |
| `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` | Operations reads | `REPOSITORY_UNAVAILABLE` |
| `FF_BRANCH_DISCOVERY_ENABLED` | Multi-branch discovery candidates | `branchId === tenantId` fallback |
| `FF_BRANCH_OWNER_ENABLED` | Owner branch page + nav | Disabled state; nav hidden |
| LocationSDK | Distance in eligibility/ETA | Validation degrades gracefully |
| Firebase Firestore read | Repository adapters | Stub when flags OFF |

---

## 3. Feature flag combinations

### Core SDK

| `FF_BRANCH` | `FF_REPO` | `FF_ASSIGN` | Behaviour |
|-------------|-----------|-------------|-----------|
| OFF | * | * | Stub SDK — no branch intelligence |
| ON | OFF | * | SDK validates; repository unavailable |
| ON | ON | OFF | Reads work; assignment `NOT_CONFIGURED` |
| ON | ON | ON | Full SDK v1.0 |

### Checkout path

| `FF_CHECKOUT` | `FF_BRANCH` | `FF_ASSIGN` | Behaviour |
|---------------|-------------|-------------|-----------|
| OFF | * | * | Legacy checkout |
| ON | OFF | * | Checkout disabled / NOT_CONFIGURED |
| ON | ON | OFF | Checkout enabled; assignment fails |
| ON | ON | ON | Full checkout assignment |

### Operations path

| `FF_OPS_SDK` | `FF_OPS_REPO` | Behaviour |
|--------------|---------------|-----------|
| OFF | * | Operations stub |
| ON | OFF | SDK validates; repository unavailable |
| ON | ON | Full operational availability |

**Production default:** all OFF.

---

## 4. Recommended staging enable order

1. `FF_BRANCH_ENABLED`
2. `FF_BRANCH_REPOSITORY_ENABLED` (after Firestore ADR-017)
3. `FF_BRANCH_ASSIGNMENT_ENABLED`
4. `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED`
5. `FF_BRANCH_OPERATIONS_SDK_ENABLED`
6. `FF_BRANCH_DISCOVERY_ENABLED`
7. `FF_BRANCH_CHECKOUT_ENABLED`
8. `FF_BRANCH_ORDER_PERSISTENCE_ENABLED`
9. `FF_BRANCH_OWNER_ENABLED`

Enable one flag at a time during soak; verify rollback at each step.

---

## 5. Browser compatibility

| Capability | Minimum | Used by |
|------------|---------|---------|
| ES2020 modules | Vite build target | All |
| `localStorage` | Dev/preview only | Flag overrides |
| Geolocation API | Optional | Customer point for ETA/validation |
| ARIA roles | Modern browsers | Owner branch UI (PR-14) |

---

## 6. Backward compatibility guarantees (v1.0)

| Guarantee | Status |
|-----------|--------|
| Legacy `branchId === tenantId` when flags OFF | ✅ |
| No changes to DiscoverySDK contract | ✅ |
| No changes to SearchSDK contract | ✅ |
| No changes to Order / Reference / Location SDKs | ✅ |
| Single storefront URL `/k/{slug}` | ✅ |
| StubBranchAdapter for emergency rollback | ✅ |
| Checkout works without branch assignment | ✅ |

---

## 7. Breaking change policy

Post-v1.0 freeze (ADR-016):

- Additive DTO fields: minor version bump + changelog
- Method signature changes: major version + ADR
- Repository port changes: ADR + migration plan
- Firestore schema writes: ADR-017 or successor

---

## References

- [BRANCH-PUBLIC-API-v1.md](./BRANCH-PUBLIC-API-v1.md)
- [BRANCH-ROLLBACK.md](./BRANCH-ROLLBACK.md)
