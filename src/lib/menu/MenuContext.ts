/**
 * M7 PR-5 — Menu presentation context and types.
 */

import type { TenantId } from '../../sdk/core/types';
import type {
  ComboQuery,
  MenuCategoryQuery,
  MenuItemQuery,
  MenuQuery,
  MenuSearchQuery,
  MenuValidationInput,
} from '../../sdk/menu/dto';
import type { ComboId, MenuCategoryId, MenuItemId } from '../../sdk/menu/types/branded';

export type MenuSessionStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
  | 'disabled'
  | 'retry'
  | 'cancelled';

export type MenuFacadeOperation =
  | 'getMenu'
  | 'getMenuItem'
  | 'listCategories'
  | 'searchMenu'
  | 'getCombo'
  | 'validateMenu';

export interface MenuFacadeQuery {
  readonly tenantId: string;
  readonly branchId?: string;
  readonly includeInactive?: boolean;
}

export interface MenuItemFacadeQuery extends MenuFacadeQuery {
  readonly itemId: string;
}

export interface MenuSearchFacadeQuery extends MenuFacadeQuery {
  readonly text: string;
  readonly categoryId?: string;
  readonly limit?: number;
}

export interface MenuComboFacadeQuery extends MenuFacadeQuery {
  readonly comboId: string;
}

export type MenuFacadeRequest =
  | { readonly operation: 'getMenu'; readonly query: MenuFacadeQuery }
  | { readonly operation: 'getMenuItem'; readonly query: MenuItemFacadeQuery }
  | { readonly operation: 'listCategories'; readonly query: MenuFacadeQuery }
  | { readonly operation: 'searchMenu'; readonly query: MenuSearchFacadeQuery }
  | { readonly operation: 'getCombo'; readonly query: MenuComboFacadeQuery }
  | { readonly operation: 'validateMenu'; readonly query: MenuFacadeQuery };

export type MenuPresentationErrorCode =
  | 'NOT_FOUND'
  | 'UNAVAILABLE'
  | 'VALIDATION'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN';

export interface MenuPresentationError {
  readonly code: MenuPresentationErrorCode;
  readonly message: string;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly featureDisabled?: boolean;
}

export interface MenuFacadeSuccess<T> {
  readonly ok: true;
  readonly value: T;
}

export interface MenuFacadeFailure {
  readonly ok: false;
  readonly error: MenuPresentationError;
}

export type MenuFacadeOutcome<T> = MenuFacadeSuccess<T> | MenuFacadeFailure;

export interface MenuSessionSnapshot {
  readonly status: MenuSessionStatus;
  readonly lastOperation: MenuFacadeOperation | null;
  readonly lastRequest: MenuFacadeRequest | null;
  readonly lastError: MenuPresentationError | null;
  readonly retryCount: number;
  readonly lastAttemptAt: number | null;
  readonly telemetryId: string | null;
}

export const EMPTY_MENU_SESSION: MenuSessionSnapshot = {
  status: 'idle',
  lastOperation: null,
  lastRequest: null,
  lastError: null,
  retryCount: 0,
  lastAttemptAt: null,
  telemetryId: null,
};

const toTenantId = (tenantId: string): TenantId => tenantId as TenantId;

export const buildMenuQuery = (query: MenuFacadeQuery): MenuQuery => ({
  tenantId: toTenantId(query.tenantId),
  branchId: query.branchId,
  includeInactive: query.includeInactive,
});

export const buildMenuItemQuery = (query: MenuItemFacadeQuery): MenuItemQuery => ({
  tenantId: toTenantId(query.tenantId),
  itemId: query.itemId as MenuItemId,
  branchId: query.branchId,
});

export const buildMenuCategoryQuery = (query: MenuFacadeQuery): MenuCategoryQuery => ({
  tenantId: toTenantId(query.tenantId),
  branchId: query.branchId,
});

export const buildMenuSearchQuery = (query: MenuSearchFacadeQuery): MenuSearchQuery => ({
  tenantId: toTenantId(query.tenantId),
  text: query.text,
  branchId: query.branchId,
  categoryId: query.categoryId as MenuCategoryId | undefined,
  limit: query.limit,
});

export const buildComboQuery = (query: MenuComboFacadeQuery): ComboQuery => ({
  tenantId: toTenantId(query.tenantId),
  comboId: query.comboId as ComboId,
  branchId: query.branchId,
});

export const buildMenuValidationInput = (query: MenuFacadeQuery): MenuValidationInput => ({
  tenantId: toTenantId(query.tenantId),
  branchId: query.branchId,
});
