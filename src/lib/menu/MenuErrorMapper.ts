/**
 * M7 PR-5 — SDK error → presentation error mapping.
 */

import type { SdkError } from '../../sdk/core/errors';
import type { MenuPresentationError, MenuPresentationErrorCode } from './MenuContext';

const toPresentationCode = (code: string): MenuPresentationErrorCode => {
  if (code === 'NOT_FOUND') return 'NOT_FOUND';
  if (code === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (code === 'VALIDATION') return 'VALIDATION';
  if (code === 'NOT_CONFIGURED') return 'NOT_CONFIGURED';
  return 'UNKNOWN';
};

export const normalizeMenuError = (error: SdkError): MenuPresentationError => {
  const code = toPresentationCode(error.code);
  const retryable = code === 'UNAVAILABLE' || code === 'UNKNOWN';

  const userMessage = (() => {
    switch (code) {
      case 'NOT_CONFIGURED':
        return 'Menu is not available yet.';
      case 'VALIDATION':
        return error.message || 'Please check your menu request and try again.';
      case 'NOT_FOUND':
        return 'The requested menu item was not found.';
      case 'UNAVAILABLE':
        return 'Menu is temporarily unavailable. Please try again.';
      default:
        return error.message || 'Could not load the menu.';
    }
  })();

  return {
    code,
    message: error.message,
    userMessage,
    retryable,
  };
};

export const menuFeatureDisabledError = (): MenuPresentationError => ({
  code: 'NOT_CONFIGURED',
  message: 'FF_MENU_ENABLED is off',
  userMessage: 'Menu is not enabled.',
  retryable: false,
  featureDisabled: true,
});

export const menuInvalidQueryError = (message: string): MenuPresentationError => ({
  code: 'VALIDATION',
  message,
  userMessage: message,
  retryable: false,
});
