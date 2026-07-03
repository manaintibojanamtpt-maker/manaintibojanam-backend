/**
 * MenuSDK error messages (M7 PR-1).
 */

import type { SdkErrorCode } from '../../core/errors';

export type MenuErrorCode = SdkErrorCode;

export const MENU_ERROR_MESSAGES = {
  NOT_CONFIGURED: 'MenuSDK adapter is not configured',
  INVALID_QUERY: 'Menu query is missing required fields',
  ITEM_NOT_FOUND: 'Menu item was not found',
  CATEGORY_NOT_FOUND: 'Menu category was not found',
  COMBO_NOT_FOUND: 'Combo was not found',
  MODIFIER_GROUP_NOT_FOUND: 'Modifier group was not found',
  REPOSITORY_UNAVAILABLE: 'Menu repository is unavailable',
  VALIDATION_FAILED: 'Menu validation failed',
} as const;

export interface MenuSdkErrorDetails {
  readonly menuCode?: MenuErrorCode;
  readonly itemId?: string;
  readonly categoryId?: string;
  readonly branchId?: string;
  readonly provider?: string;
}
