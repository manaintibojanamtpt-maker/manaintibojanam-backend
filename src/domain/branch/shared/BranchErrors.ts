/**
 * Branch domain — error codes and messages (M5 PR-2).
 */

export const BRANCH_DOMAIN_ERROR_CODES = {
  INVALID_QUERY: 'INVALID_QUERY',
  INVALID_WEIGHTS: 'INVALID_WEIGHTS',
  NO_ELIGIBLE_BRANCH: 'NO_ELIGIBLE_BRANCH',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
} as const;

export type BranchDomainErrorCode =
  (typeof BRANCH_DOMAIN_ERROR_CODES)[keyof typeof BRANCH_DOMAIN_ERROR_CODES];

export const BRANCH_DOMAIN_ERROR_MESSAGES = {
  INVALID_QUERY: 'Branch selection query is invalid',
  INVALID_WEIGHTS: 'Branch score weights must sum to 1.0',
  NO_ELIGIBLE_BRANCH: 'No eligible branch found for this brand',
  VALIDATION_FAILED: 'Branch validation failed',
  MISSING_TENANT: 'tenantId is required',
  MISSING_CUSTOMER_POINT: 'customerPoint is required',
  INVALID_ORDER_TYPE: 'orderType must be delivery or pickup',
  OUT_OF_RADIUS: 'Customer is outside the branch delivery radius',
  BRANCH_CLOSED: 'Branch is not open',
  BRANCH_BUSY: 'Branch is not accepting orders',
  BRANCH_SUSPENDED: 'Branch is suspended',
  INVENTORY_SHORT: 'Branch cannot fulfill all cart items',
} as const;

export interface BranchDomainError {
  readonly code: BranchDomainErrorCode;
  readonly message: string;
  readonly field?: string;
}

export interface BranchDomainOutcome<T> {
  readonly ok: true;
  readonly value: T;
}

export interface BranchDomainFailure {
  readonly ok: false;
  readonly error: BranchDomainError;
}

export type BranchDomainResult<T> = BranchDomainOutcome<T> | BranchDomainFailure;

export const branchDomainOk = <T>(value: T): BranchDomainOutcome<T> => ({ ok: true, value });

export const branchDomainFail = (
  code: BranchDomainErrorCode,
  message: string,
  field?: string
): BranchDomainFailure => ({
  ok: false,
  error: { code, message, field },
});
