/**
 * M5 PR-13 — Owner branch presentation error mapping.
 */

import type { BranchPresentationError } from '../branch/types';
import { normalizeBranchError } from '../branch/BranchErrorMapper';
import type { OwnerBranchPresentationError } from './types';

export function normalizeOwnerBranchError(
  error: BranchPresentationError
): OwnerBranchPresentationError {
  const userMessage = (() => {
    if (error.code === 'NOT_CONFIGURED') {
      return 'Branch management is not available yet.';
    }
    if (error.code === 'UNAVAILABLE') {
      return 'Branch data is temporarily unavailable. Please try again.';
    }
    return error.userMessage;
  })();

  return {
    ...error,
    userMessage,
  };
}

export function mapBranchFacadeErrorToOwner(
  error: BranchPresentationError
): OwnerBranchPresentationError {
  return normalizeOwnerBranchError(error);
}

export function ownerBranchFeatureDisabledError(): OwnerBranchPresentationError {
  return {
    code: 'NOT_CONFIGURED',
    message: 'FF_BRANCH_OWNER_ENABLED is off',
    userMessage: 'Owner branch management is not enabled.',
    retryable: false,
    featureDisabled: true,
  };
}

export function ownerBranchInvalidQueryError(message: string): OwnerBranchPresentationError {
  return {
    code: 'VALIDATION',
    message,
    userMessage: message,
    retryable: false,
  };
}

export function mapBranchErrorToOwner(error: Parameters<typeof normalizeBranchError>[0]) {
  return normalizeOwnerBranchError(normalizeBranchError(error));
}
