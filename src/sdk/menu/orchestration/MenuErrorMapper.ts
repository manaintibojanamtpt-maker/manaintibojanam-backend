/**
 * MenuSDK — error mapping between domain, repository, and SDK (M7 PR-4).
 */

import type { SdkFailure, SdkResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';
import type { MenuDomainError } from '../../../domain/menu/shared/MenuDomainResult';
import { MENU_ERROR_MESSAGES } from '../errors/menuErrors';

export const mapDomainErrorToSdk = (error: MenuDomainError): SdkFailure =>
  sdkFail(
    sdkError('VALIDATION', error.message, {
      menuCode: error.code,
      field: error.field,
    })
  );

export const mapRepositoryResultToSdk = <T>(result: SdkResult<T>): SdkResult<T> => {
  if (result.ok) {
    return result;
  }

  return sdkFail(
    sdkError(result.error.code, result.error.message, {
      ...result.error.details,
      menuCode: result.error.details?.menuCode ?? result.error.code,
      provider: result.error.details?.provider ?? 'MenuRepository',
    })
  );
};

export const repositoryUnavailable = (method: string): SdkFailure =>
  sdkFail(
    sdkError('UNAVAILABLE', MENU_ERROR_MESSAGES.REPOSITORY_UNAVAILABLE, {
      menuCode: 'REPOSITORY_UNAVAILABLE',
      method,
    })
  );

export const menuNotFound = (entity: string, id: string): SdkFailure =>
  sdkFail(
    sdkError('NOT_FOUND', `${entity} not found`, {
      menuCode: 'NOT_FOUND',
      entity,
      id,
    })
  );
