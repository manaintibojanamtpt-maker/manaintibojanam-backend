/**
 * M5 PR-8 — Checkout branch error mapping.
 */

import type { BranchPresentationError } from '../branch/types';
import { normalizeBranchError } from '../branch/BranchErrorMapper';

export interface CheckoutBranchPresentationError extends BranchPresentationError {
  readonly assignmentRejected?: boolean;
  readonly noEligibleBranch?: boolean;
  readonly checkoutDisabled?: boolean;
}

export function normalizeCheckoutBranchError(
  error: BranchPresentationError
): CheckoutBranchPresentationError {
  const noEligible =
    error.code === 'VALIDATION' &&
    (error.message.toLowerCase().includes('eligible') ||
      error.message.includes('SCORE_BELOW'));

  const userMessage = (() => {
    if (noEligible) {
      return 'No branch can fulfill this order right now. Try a different address or items.';
    }
    if (error.code === 'NOT_CONFIGURED') {
      return 'Branch assignment is not available for checkout yet.';
    }
    return error.userMessage;
  })();

  return {
    ...error,
    userMessage,
    assignmentRejected: noEligible || error.code === 'NOT_CONFIGURED',
    noEligibleBranch: noEligible,
  };
}

export function mapBranchFacadeErrorToCheckout(
  error: BranchPresentationError
): CheckoutBranchPresentationError {
  return normalizeCheckoutBranchError(error);
}

export function checkoutBranchDisabledError(): CheckoutBranchPresentationError {
  return {
    code: 'NOT_CONFIGURED',
    message: 'FF_BRANCH_CHECKOUT_ENABLED is off',
    userMessage: 'Checkout uses the legacy path without branch assignment.',
    retryable: false,
    checkoutDisabled: true,
  };
}

export function checkoutInvalidQueryError(message: string): CheckoutBranchPresentationError {
  return {
    code: 'VALIDATION',
    message,
    userMessage: message,
    retryable: false,
  };
}

export function mapSdkErrorToCheckout(error: Parameters<typeof normalizeBranchError>[0]) {
  return normalizeCheckoutBranchError(normalizeBranchError(error));
}
