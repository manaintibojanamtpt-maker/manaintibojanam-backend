/**
 * M5 PR-5 — SDK error → presentation error mapping.
 */

import type { SdkError } from '../../sdk/core/errors';
import type { BranchPresentationError } from './types';

export function normalizeBranchError(error: SdkError): BranchPresentationError {
  const retryable =
    error.code === 'UNAVAILABLE' ||
    error.code === 'RATE_LIMITED' ||
    Boolean(error.details?.retryable);

  const userMessage = (() => {
    switch (error.code) {
      case 'NOT_CONFIGURED':
        return 'Branch services are not available yet.';
      case 'VALIDATION':
        return error.message || 'Please check your branch request and location.';
      case 'FORBIDDEN':
        return 'Branch access is not permitted for this request.';
      case 'NOT_FOUND':
        return 'The requested branch could not be found.';
      case 'RATE_LIMITED':
        return 'Too many branch requests. Please try again shortly.';
      case 'UNAVAILABLE':
        return 'Branch services are temporarily unavailable. Please try again.';
      default:
        return error.message || 'Could not complete the branch request.';
    }
  })();

  return {
    code: error.code,
    message: error.message,
    userMessage,
    retryable,
  };
}

export function branchFeatureDisabledError(): BranchPresentationError {
  return {
    code: 'NOT_CONFIGURED',
    message: 'FF_BRANCH_ENABLED is off',
    userMessage: 'Branch services are not enabled.',
    retryable: false,
    featureDisabled: true,
  };
}

export function branchInvalidQueryError(message: string): BranchPresentationError {
  return {
    code: 'VALIDATION',
    message,
    userMessage: message,
    retryable: false,
  };
}
