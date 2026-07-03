# Order Branch Persistence

**Version:** M5 PR-9 — order branch metadata persistence  
**Flag:** `FF_BRANCH_ORDER_PERSISTENCE_ENABLED` (default **OFF**)

---

## Architecture

```
CheckoutBranchContext (in-memory snapshot from PR-8)
        ↓
OrderBranchPersistence.resolveOrderBranchPersistence()
        ↓
OrderBranchMapper + OrderBranchValidation
        ↓
Enriched order payload (branchId + assignment metadata)
        ↓
Order creation / Firestore write (caller)
```

**No BranchSDK calls. No reassignment. No rescoring.**

---

## Persisted Fields

When flag ON and assignment present:

| Field | Source |
|-------|--------|
| `branchId` | Checkout assignment summary |
| `branchAssignmentId` | `assignmentId` |
| `branchAssignmentReason` | Assignment reason |
| `branchName` | Denormalized display |
| `branchAssignmentAlgorithmVersion` | Domain algorithm version |
| `branchAssignmentPolicyVersion` | Assignment policy version |
| `branchAssignmentGeneratedAt` | Context `resolvedAt` |

Legacy checkout (`context.legacy`): `branchId = tenantId` only.

Flag OFF: order payload unchanged.

---

## Module Layout

| File | Purpose |
|------|---------|
| `OrderBranchPersistence.ts` | Orchestration + flag gate |
| `OrderBranchMapper.ts` | Snapshot → order fields |
| `OrderBranchValidation.ts` | Pre-write validation |
| `OrderBranchTelemetry.ts` | Persistence telemetry |

---

## Usage

```typescript
import { resolveOrderBranchPersistence } from '@/lib/orders/OrderBranchPersistence';
import { getCheckoutBranchSessionSnapshot } from '@/lib/checkout/CheckoutBranchFacade';

const session = getCheckoutBranchSessionSnapshot();
const result = resolveOrderBranchPersistence(orderData, {
  tenantId,
  checkoutContext: session.context,
});

if (result.ok && !('skipped' in result && result.skipped)) {
  await createOrder(result.enrichedOrder);
}
```

---

## Constraints

- Consumes `CheckoutBranchContextSnapshot` only
- No BranchSDK, Discovery, Search, or assignment engine changes
- No Checkout module changes
- No payment changes

---

*See [`docs/m5/PR-9-ORDER-BRANCH-PERSISTENCE-REPORT.md`](../../../docs/m5/PR-9-ORDER-BRANCH-PERSISTENCE-REPORT.md)*
