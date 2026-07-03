/**
 * BranchSDK — permanent platform law (ADR-015).
 * @see docs/m5/BRANCH-PLATFORM-LAW.md
 */

export const BRANCH_PLATFORM_LAW = {
  tenantRepresents: 'brand',
  branchRepresents: 'fulfillment_unit',
  customerInteractsWith: 'brand',
  branchSelectionOwner: 'BranchSDK',
} as const;

export const BRANCH_PLATFORM_LAW_STATEMENTS = [
  'A Tenant represents a Brand.',
  'A Branch represents a Fulfillment Unit.',
  'Customers interact with Brands.',
  'Only BranchSDK may choose fulfillment branches.',
  'No other platform may perform branch selection.',
] as const;
