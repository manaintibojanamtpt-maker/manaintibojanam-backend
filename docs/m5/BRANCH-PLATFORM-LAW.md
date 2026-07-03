# Branch Platform — Architectural Law (Permanent)

**Status:** Immutable — ADR-015  
**Date:** 2026-06-26

These rules govern all BhojanOS platforms. Changes require Architecture Review Board approval.

---

## Law

1. **A Tenant represents a Brand.**  
   One customer-facing storefront (`/k/{brandSlug}`). Customers discover and interact with brands — not branch slugs.

2. **A Branch represents a Fulfillment Unit.**  
   A physical or logical kitchen that prepares and fulfills orders for a brand.

3. **Customers interact with Brands.**  
   Presentation, Marketplace, and Search surfaces expose brand identity. Branch names appear only when override or transparency is required.

4. **Only BranchSDK may choose fulfillment branches.**  
   No other module, SDK, facade, UI component, or server route may implement branch selection, scoring, or assignment logic.

5. **No other platform may perform branch selection.**  
   Discovery ranks restaurants. Search finds brands. Location computes distance. Checkout orchestrates payment. **None** of these may select the fulfilling branch.

---

## Enforcement

| Platform | May | Must NOT |
|----------|-----|----------|
| **BranchSDK** | Select, score, assign, validate branches | Rank cross-tenant restaurants |
| **Discovery** | Rank brands; emit branch candidates as data | Score branches; assign branches |
| **Search** | Find brands (`tenantId`) | Select fulfilling branch |
| **Checkout** | Call BranchFacade → BranchSDK | Implement selection logic |
| **Orders** | Store `branchId` on order | Compute which branch |
| **Owner UI** | Configure branches | Auto-select for customers |

---

## References

- [ADR-015](../adr/ADR-015-branch-platform-architecture.md)
- [MULTI-BRANCH-INTELLIGENCE-PLATFORM.md](./MULTI-BRANCH-INTELLIGENCE-PLATFORM.md)
- `src/sdk/branch/core/platformLaw.ts`
