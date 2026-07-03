/**
 * MenuSDK — query validation (M7 PR-1).
 */

import type { SdkResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import { MENU_ERROR_MESSAGES } from '../errors/menuErrors';
import type {
  MenuCategoryQuery,
  MenuItemQuery,
  MenuQuery,
  MenuSearchQuery,
  MenuValidationInput,
} from '../dto';

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const validateMenuQuery = (query: MenuQuery): SdkResult<MenuQuery> => {
  if (!isNonEmptyString(String(query.tenantId))) {
    return sdkFail(
      sdkError('VALIDATION', MENU_ERROR_MESSAGES.INVALID_QUERY, { field: 'tenantId' })
    );
  }
  return sdkOk(query);
};

export const validateMenuItemQuery = (query: MenuItemQuery): SdkResult<MenuItemQuery> => {
  const tenant = validateMenuQuery({ tenantId: query.tenantId });
  if (!tenant.ok) return tenant;
  if (!isNonEmptyString(String(query.itemId))) {
    return sdkFail(
      sdkError('VALIDATION', MENU_ERROR_MESSAGES.INVALID_QUERY, { field: 'itemId' })
    );
  }
  return sdkOk(query);
};

export const validateMenuCategoryQuery = (
  query: MenuCategoryQuery
): SdkResult<MenuCategoryQuery> => validateMenuQuery(query);

export const validateMenuSearchQuery = (query: MenuSearchQuery): SdkResult<MenuSearchQuery> => {
  const tenant = validateMenuQuery({ tenantId: query.tenantId });
  if (!tenant.ok) return tenant;
  if (!isNonEmptyString(query.text)) {
    return sdkFail(
      sdkError('VALIDATION', MENU_ERROR_MESSAGES.INVALID_QUERY, { field: 'text' })
    );
  }
  return sdkOk(query);
};

export const validateMenuValidationInput = (
  input: MenuValidationInput
): SdkResult<MenuValidationInput> => validateMenuQuery({ tenantId: input.tenantId });
