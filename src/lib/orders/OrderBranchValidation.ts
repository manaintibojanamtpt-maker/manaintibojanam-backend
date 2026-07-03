/**
 * M5 PR-9 — Order branch persistence validation.
 * Validates checkout assignment snapshot before order write. No BranchSDK calls.
 */

import type { CheckoutBranchContextSnapshot } from '../checkout/CheckoutBranchContext';

export interface OrderBranchValidationError {
  readonly code: 'VALIDATION' | 'MISSING_ASSIGNMENT' | 'TENANT_MISMATCH';
  readonly message: string;
  readonly field?: string;
}

export interface OrderBranchValidationInput {
  readonly tenantId: string;
  readonly checkoutContext: CheckoutBranchContextSnapshot;
  readonly requireAssignment?: boolean;
}

export function validateOrderBranchPersistenceInput(
  input: OrderBranchValidationInput
): OrderBranchValidationError | null {
  if (!String(input.tenantId).trim()) {
    return {
      code: 'VALIDATION',
      message: 'tenantId is required for order branch persistence',
      field: 'tenantId',
    };
  }

  const { checkoutContext } = input;

  if (checkoutContext.legacy) {
    return null;
  }

  if (!checkoutContext.assignment || !checkoutContext.summary) {
    if (input.requireAssignment !== false) {
      return {
        code: 'MISSING_ASSIGNMENT',
        message: 'Branch assignment is required before order persistence',
        field: 'checkoutContext.assignment',
      };
    }
    return null;
  }

  if (String(checkoutContext.summary.tenantId) !== String(input.tenantId)) {
    return {
      code: 'TENANT_MISMATCH',
      message: 'Checkout branch assignment tenantId does not match order tenantId',
      field: 'tenantId',
    };
  }

  if (String(checkoutContext.summary.branchId).trim().length === 0) {
    return {
      code: 'VALIDATION',
      message: 'branchId is required on checkout assignment summary',
      field: 'branchId',
    };
  }

  if (String(checkoutContext.summary.assignmentId).trim().length === 0) {
    return {
      code: 'VALIDATION',
      message: 'assignmentId is required on checkout assignment summary',
      field: 'assignmentId',
    };
  }

  return null;
}

export function validateLegacyCheckoutContext(
  checkoutContext: CheckoutBranchContextSnapshot
): OrderBranchValidationError | null {
  if (!checkoutContext.legacy && !checkoutContext.assignment) {
    return {
      code: 'MISSING_ASSIGNMENT',
      message: 'Non-legacy checkout requires branch assignment before order persistence',
    };
  }

  return null;
}
