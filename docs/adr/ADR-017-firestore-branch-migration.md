# ADR-017: Firestore Branch Collection Migration

**Status:** Proposed — pending Architecture Review Board  
**Date:** 2026-06-26  
**Deciders:** Architecture Review Board  
**Supersedes:** N/A  
**Related:** ADR-015 (Branch Platform Architecture), ADR-016 (Branch Platform v1 Freeze), [FIRESTORE-BRANCH-DESIGN.md](../m5/FIRESTORE-BRANCH-DESIGN.md)

---

## Context

Branch Intelligence Platform v1.0 (ADR-016) is **certified** with all `FF_BRANCH_*` flags default **OFF**. The BranchRepository and BranchOperationsRepository adapters are implemented but require live Firestore branch collections before `FF_BRANCH_REPOSITORY_ENABLED` and `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` can be safely enabled in production.

Production today uses the legacy model: `branchId === tenantId` (single kitchen per tenant). Multi-branch documents are **designed** in `docs/m5/FIRESTORE-BRANCH-DESIGN.md` but **not migrated**.

ADR-015 reserved Firestore migration as a separate governance step. This ADR authorizes the migration plan — **not** the migration execution itself.

---

## Decision

1. **Authorize** Firestore schema and collection layout per [FIRESTORE-BRANCH-DESIGN.md](../m5/FIRESTORE-BRANCH-DESIGN.md).

2. **Migration scope (when approved for execution):**
   - Create `branches/{branchId}` subcollections under tenants
   - Backfill `primaryBranchId` on tenant documents
   - Backfill existing orders: `branchId = tenantId` where missing
   - Deploy security rules for branch read paths
   - Enable `FF_BRANCH_REPOSITORY_ENABLED` in staging first

3. **Out of scope until separate ADR or PR series:**
   - Branch write APIs (create/edit/delete)
   - Owner branch configuration UI writes
   - GeoIndex bulk reindex automation

4. **Enable order (staging → production):**
   1. ADR-017 accepted
   2. Migration scripts executed in staging
   3. 72-hour staging soak with repository flags ON
   4. Production migration window
   5. `FF_BRANCH_REPOSITORY_ENABLED` ON (production)
   6. Remaining branch flags per [BRANCH-COMPATIBILITY-MATRIX.md](../m5/v1.0/BRANCH-COMPATIBILITY-MATRIX.md)

5. **Rollback:** Set repository flags OFF; legacy `branchId === tenantId` path remains valid. No destructive rollback of migrated documents required for L1 flag rollback.

---

## Consequences

### Positive

- Unblocks live BranchRepository reads in production
- Enables assignment engine with real multi-branch data
- Operations SDK can read operational snapshots

### Negative / risks

- Data migration complexity and backfill validation
- Security rules must be reviewed before production reads
- Dual schema period during gradual rollout

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Enable repository flag without migration | Reads fail or return empty |
| Inline migration in v1 freeze (ADR-016) | Scope creep; certification is docs-only |
| Branch slug URLs | Violates ADR-015 single-storefront invariant |

---

## References

- `docs/m5/FIRESTORE-BRANCH-DESIGN.md`
- `docs/m5/v1.0/BRANCH-ROLLBACK.md`
- `src/sdk/branch/repository/`
- ADR-016 acceptance: 2026-06-26

---

## Approval

| Role | Name | Date | Decision |
|------|------|------|----------|
| Architecture Review Board | _pending_ | | |
| Founder | _pending_ | | |
