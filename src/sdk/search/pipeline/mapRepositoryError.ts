/**
 * SearchSDK — repository error normalization (M4 PR-5).
 */

import type { SdkError } from '../../core/errors';
import type { SdkFailure } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';
import { SEARCH_ERROR_MESSAGES } from '../errors/searchErrors';

export function mapRepositoryError(error: SdkError): SdkFailure {
  if (error.code === 'NOT_CONFIGURED') {
    return sdkFail(
      sdkError('UNAVAILABLE', SEARCH_ERROR_MESSAGES.REPOSITORY_UNAVAILABLE, {
        searchCode: 'REPOSITORY_UNAVAILABLE',
        cause: error.code,
        provider: error.details?.provider,
      })
    );
  }

  return sdkFail(error);
}
