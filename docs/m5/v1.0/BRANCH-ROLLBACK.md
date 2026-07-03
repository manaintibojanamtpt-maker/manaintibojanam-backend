# Branch Platform — Emergency Rollback v1.0

**Status:** Frozen — M5 PR-15  
**Date:** 2026-06-26  
**Severity levels:** L1 (instant) · L2 (partial) · L3 (deploy)

---

## 1. Rollback decision tree

```
Branch incident detected
        │
        ├── Checkout assignment failure? ──► L1: FF_BRANCH_CHECKOUT_ENABLED=false
        │
        ├── Wrong branch assigned? ──► L1: FF_BRANCH_ASSIGNMENT_ENABLED=false
        │
        ├── Repository latency/errors? ──► L1: FF_BRANCH_REPOSITORY_ENABLED=false
        │
        ├── Operations panel errors? ──► L2: FF_BRANCH_OPERATIONS_SDK_ENABLED=false
        │
        ├── Owner UI issue? ──► L1: FF_BRANCH_OWNER_ENABLED=false
        │
        ├── Order schema concern? ──► L1: FF_BRANCH_ORDER_PERSISTENCE_ENABLED=false
        │
        ├── Discovery candidate regression? ──► L2: FF_BRANCH_DISCOVERY_ENABLED=false
        │
        └── Adapter bug? ──► L3: redeploy prior build OR master flag OFF
```

---

## 2. L1 — Feature flag rollback (no deploy)

**Time to effect:** Immediate (page reload / env redeploy)

### Production

Set environment variables:

```env
VITE_FF_BRANCH_ENABLED=false
VITE_FF_BRANCH_REPOSITORY_ENABLED=false
VITE_FF_BRANCH_ASSIGNMENT_ENABLED=false
VITE_FF_BRANCH_DISCOVERY_ENABLED=false
VITE_FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED=false
VITE_FF_BRANCH_OPERATIONS_SDK_ENABLED=false
VITE_FF_BRANCH_CHECKOUT_ENABLED=false
VITE_FF_BRANCH_ORDER_PERSISTENCE_ENABLED=false
VITE_FF_BRANCH_OWNER_ENABLED=false
```

### Preview / development

```javascript
[
  'FF_BRANCH_ENABLED',
  'FF_BRANCH_REPOSITORY_ENABLED',
  'FF_BRANCH_ASSIGNMENT_ENABLED',
  'FF_BRANCH_DISCOVERY_ENABLED',
  'FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED',
  'FF_BRANCH_OPERATIONS_SDK_ENABLED',
  'FF_BRANCH_CHECKOUT_ENABLED',
  'FF_BRANCH_ORDER_PERSISTENCE_ENABLED',
  'FF_BRANCH_OWNER_ENABLED',
].forEach((flag) => localStorage.setItem(flag, 'false'));
// reload
```

Or use module helpers: `setBranchFlagOverride`, `setOwnerBranchFlagOverride` (dev/preview only).

### Expected behaviour after L1 (master OFF)

| Component | State |
|-----------|-------|
| `createBranchSDK()` | `StubBranchAdapter` — all `NOT_CONFIGURED` |
| Checkout | Legacy tenant-only path |
| Order persistence | Skipped — no branch fields added |
| Owner branch page | Disabled state; nav hidden |
| Discovery | Tenant-as-branch fallback |
| Marketplace / Search | **Unaffected** |

---

## 3. L2 — Partial rollback

| Disable | Effect |
|---------|--------|
| `FF_BRANCH_CHECKOUT_ENABLED` only | Checkout legacy; SDK may still serve owner reads |
| `FF_BRANCH_ASSIGNMENT_ENABLED` only | `findBestBranch` → `NOT_CONFIGURED`; reads work |
| `FF_BRANCH_ORDER_PERSISTENCE_ENABLED` only | Orders unchanged; assignment may still run |
| `FF_BRANCH_OWNER_ENABLED` only | Owner UI disabled; checkout unaffected |
| `FF_BRANCH_DISCOVERY_ENABLED` only | Single candidate per tenant |
| `FF_BRANCH_OPERATIONS_SDK_ENABLED` only | Operational panels empty/error |
| `FF_BRANCH_REPOSITORY_ENABLED` only | All repository reads → `UNAVAILABLE` |

---

## 4. L3 — Code rollback

1. Redeploy hosting artifact from prior release tag
2. Or revert M5 branch module commits (last resort)
3. No data migration rollback required — v1.0 is read-only for branch collections

**Note:** If `FF_BRANCH_ORDER_PERSISTENCE_ENABLED` was ON in production, orders with `branchId` fields remain valid; disabling flag stops new writes only.

---

## 5. Rollback verification checklist

After rollback:

- [ ] Checkout completes on legacy path
- [ ] Orders create without branch fields (persistence OFF)
- [ ] Owner portal loads without branch nav
- [ ] Discovery marketplace browse unchanged
- [ ] `npm run test:sdk` green on deployed artifact
- [ ] No BranchSDK errors in console on customer storefront

---

## 6. Per-PR rollback references

| PR | Module | Rollback |
|----|--------|----------|
| PR-4 | `createBranchSDK` | `FF_BRANCH_ENABLED` OFF |
| PR-5 | `BranchFacade` | `FF_BRANCH_ENABLED` OFF |
| PR-6 | Discovery candidates | `FF_BRANCH_DISCOVERY_ENABLED` OFF |
| PR-7 | Assignment engine | `FF_BRANCH_ASSIGNMENT_ENABLED` OFF |
| PR-8 | Checkout | `FF_BRANCH_CHECKOUT_ENABLED` OFF |
| PR-9 | Order persistence | `FF_BRANCH_ORDER_PERSISTENCE_ENABLED` OFF |
| PR-10–12 | Operations | Operations flags OFF |
| PR-13–14 | Owner | `FF_BRANCH_OWNER_ENABLED` OFF |

---

## References

- [BRANCH-COMPATIBILITY-MATRIX.md](./BRANCH-COMPATIBILITY-MATRIX.md)
- M5 PR-1…PR-14 rollback sections
