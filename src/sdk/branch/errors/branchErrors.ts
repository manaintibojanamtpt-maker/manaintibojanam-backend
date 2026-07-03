/**
 * BranchSDK — error message constants (M5 PR-1 foundation).
 */

export const BRANCH_ERROR_MESSAGES = {
  NOT_CONFIGURED: 'BranchSDK method is not configured',
  REPOSITORY_UNAVAILABLE: 'Branch repository is not available',
  ASSIGNMENT_UNAVAILABLE: 'Branch assignment store is not available',
  VALIDATION_FAILED: 'Branch validation failed',
  NO_ELIGIBLE_BRANCH: 'No eligible branch found for this brand',
  INVALID_QUERY: 'Invalid branch query',
} as const;
