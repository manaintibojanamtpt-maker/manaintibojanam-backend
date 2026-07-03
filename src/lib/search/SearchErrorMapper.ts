/**
 * M4 PR-4 — SDK error → presentation error mapping.
 */

import type { SdkError } from '../../sdk/core/errors';
import type { SearchPresentationError } from './types';

export function normalizeSearchError(error: SdkError): SearchPresentationError {
  const retryable =
    error.code === 'UNAVAILABLE' ||
    error.code === 'RATE_LIMITED' ||
    Boolean(error.details?.retryable);

  const userMessage = (() => {
    switch (error.code) {
      case 'NOT_CONFIGURED':
        return 'Restaurant search is not available yet.';
      case 'VALIDATION':
        return error.message || 'Please enter a valid search query and location.';
      case 'FORBIDDEN':
        return 'Search is not permitted for this request.';
      case 'NOT_FOUND':
        return 'No restaurants matched your search.';
      case 'RATE_LIMITED':
        return 'Too many search requests. Please try again shortly.';
      case 'UNAVAILABLE':
        return 'Search is temporarily unavailable. Please try again.';
      default:
        return error.message || 'Could not complete your search.';
    }
  })();

  return {
    code: error.code,
    message: error.message,
    userMessage,
    retryable,
  };
}

export function searchFeatureDisabledError(): SearchPresentationError {
  return {
    code: 'NOT_CONFIGURED',
    message: 'FF_SEARCH_ENABLED is off',
    userMessage: 'Restaurant search is not enabled.',
    retryable: false,
    featureDisabled: true,
  };
}

export function searchInvalidQueryError(message: string): SearchPresentationError {
  return {
    code: 'VALIDATION',
    message,
    userMessage: message,
    retryable: false,
  };
}

export function searchAutocompleteDisabledError(): SearchPresentationError {
  return {
    code: 'NOT_CONFIGURED',
    message: 'FF_SEARCH_AUTOCOMPLETE_ENABLED is off',
    userMessage: 'Autocomplete is not enabled.',
    retryable: false,
    featureDisabled: true,
  };
}

export function searchSuggestionsDisabledError(): SearchPresentationError {
  return {
    code: 'NOT_CONFIGURED',
    message: 'FF_SEARCH_SUGGESTIONS_ENABLED is off',
    userMessage: 'Search suggestions are not enabled.',
    retryable: false,
    featureDisabled: true,
  };
}
