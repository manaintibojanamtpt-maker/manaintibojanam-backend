/**
 * M8 PR-5 — SDK error → presentation error mapping.
 */

import type { SdkError } from '../../sdk/core/errors';
import type { PricingPresentationError, PricingPresentationErrorCode } from './PricingContext';

const toPresentationCode = (code: string): PricingPresentationErrorCode => {
  if (code === 'NOT_FOUND') return 'NOT_FOUND';
  if (code === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (code === 'VALIDATION') return 'VALIDATION';
  if (code === 'NOT_CONFIGURED') return 'NOT_CONFIGURED';
  return 'UNKNOWN';
};

export const normalizePricingError = (error: SdkError): PricingPresentationError => {
  const code = toPresentationCode(error.code);
  const retryable = code === 'UNAVAILABLE' || code === 'UNKNOWN';

  const userMessage = (() => {
    switch (code) {
      case 'NOT_CONFIGURED':
        return 'Pricing is not available yet.';
      case 'VALIDATION':
        return error.message || 'Please check your pricing request and try again.';
      case 'NOT_FOUND':
        return 'The requested price was not found.';
      case 'UNAVAILABLE':
        return 'Pricing is temporarily unavailable. Please try again.';
      default:
        return error.message || 'Could not load pricing.';
    }
  })();

  return {
    code,
    message: error.message,
    userMessage,
    retryable,
  };
};

export const pricingFeatureDisabledError = (): PricingPresentationError => ({
  code: 'NOT_CONFIGURED',
  message: 'FF_PRICING_ENABLED is off',
  userMessage: 'Pricing is not enabled.',
  retryable: false,
  featureDisabled: true,
});

export const pricingInvalidQueryError = (message: string): PricingPresentationError => ({
  code: 'VALIDATION',
  message,
  userMessage: message,
  retryable: false,
});

export const pricingOperationNotConfiguredError = (operation: string): PricingPresentationError => ({
  code: 'NOT_CONFIGURED',
  message: `${operation} is not configured on PricingSDK`,
  userMessage: 'Pricing is not available yet.',
  retryable: false,
});
