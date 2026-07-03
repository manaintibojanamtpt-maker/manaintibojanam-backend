/**
 * M7 PR-5 — Menu presentation facade.
 * Presentation MUST use this module — not MenuSDK, MenuRepository, or domain directly.
 */

import { createMenuSDK } from '../../sdk/menu/factory/createMenuSDK';
import type { MenuSDK } from '../../sdk/menu/contracts/MenuSDK';
import {
  MENU_SDK_FEATURE_FLAG_DEFAULTS,
  MENU_SDK_FEATURE_FLAG_ENV_KEYS,
  type MenuSdkFeatureFlag,
} from '../../sdk/menu/featureFlags/featureFlags';
import { isSdkSuccess } from '../../sdk/core/resultHelpers';
import type {
  Combo,
  Menu,
  MenuCategory,
  MenuItem,
  MenuSearchResult,
  MenuValidationResult,
} from '../../sdk/menu/dto';
import {
  buildComboQuery,
  buildMenuCategoryQuery,
  buildMenuItemQuery,
  buildMenuQuery,
  buildMenuSearchQuery,
  buildMenuValidationInput,
  type MenuComboFacadeQuery,
  type MenuFacadeOutcome,
  type MenuFacadeQuery,
  type MenuFacadeRequest,
  type MenuItemFacadeQuery,
  type MenuSearchFacadeQuery,
  type MenuSessionSnapshot,
} from './MenuContext';
import {
  menuFeatureDisabledError,
  menuInvalidQueryError,
  normalizeMenuError,
} from './MenuErrorMapper';
import {
  getLastMenuRequest,
  getMenuRetryCount,
  getMenuSessionSnapshot,
  markMenuDisabled,
  markMenuEmpty,
  markMenuError,
  markMenuLoading,
  markMenuRetry,
  markMenuSuccess,
  resetMenuSession,
  subscribeMenuSession,
} from './MenuSession';
import { createMenuFacadeTelemetryEmitter, type MenuFacadeTelemetryHook } from './MenuTelemetry';

export interface MenuFacadeDeps {
  readonly sdk?: MenuSDK;
  readonly isEnabled?: () => boolean;
  readonly onTelemetry?: MenuFacadeTelemetryHook;
}

const DEFAULT_MAX_RETRIES = 3;

const createAttemptId = (): string =>
  `menu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readMenuFlag = (flag: MenuSdkFeatureFlag): boolean => {
  const envKey = MENU_SDK_FEATURE_FLAG_ENV_KEYS[flag];
  const envValue =
    typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[envKey] : undefined;
  if (envValue === 'true') return true;
  if (envValue === 'false') return false;
  return MENU_SDK_FEATURE_FLAG_DEFAULTS.flags[flag];
};

export const isMenuEnabled = (): boolean => readMenuFlag('FF_MENU_ENABLED');

export const createMenuFacadeDeps = (
  overrides: MenuFacadeDeps = {}
): Required<Omit<MenuFacadeDeps, 'onTelemetry'>> & Pick<MenuFacadeDeps, 'onTelemetry'> => ({
  sdk:
    overrides.sdk ??
    createMenuSDK({
      featureFlags: readMenuFlag,
    }),
  isEnabled: overrides.isEnabled ?? isMenuEnabled,
  onTelemetry: overrides.onTelemetry,
});

export class MenuFacade {
  private readonly deps: ReturnType<typeof createMenuFacadeDeps>;

  constructor(deps: MenuFacadeDeps = {}) {
    this.deps = createMenuFacadeDeps(deps);
  }

  private ensureEnabled(method: string, tenantId?: string): boolean {
    if (this.deps.isEnabled()) {
      return true;
    }
    const telemetry = createMenuFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    markMenuDisabled();
    telemetry.failure('NOT_CONFIGURED', tenantId);
    return false;
  }

  private handleFailure<T>(
    method: string,
    error: import('../../sdk/core/errors').SdkError,
    tenantId?: string
  ): MenuFacadeOutcome<T> {
    const presentationError = normalizeMenuError(error);
    markMenuError(presentationError);
    createMenuFacadeTelemetryEmitter(this.deps.onTelemetry, method).failure(
      presentationError.code,
      tenantId
    );
    return { ok: false, error: presentationError };
  }

  async getMenu(query: MenuFacadeQuery): Promise<MenuFacadeOutcome<Menu>> {
    const method = 'getMenu';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: menuFeatureDisabledError() };
    }

    const telemetry = createMenuFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    const request: MenuFacadeRequest = { operation: 'getMenu', query };
    markMenuLoading('getMenu', request, createAttemptId());

    const sdkResult = await this.deps.sdk.getMenu(buildMenuQuery(query));
    if (!isSdkSuccess(sdkResult)) {
      return this.handleFailure(method, sdkResult.error, query.tenantId);
    }

    if (sdkResult.value.items.length === 0 && sdkResult.value.categories.length === 0) {
      markMenuEmpty();
      telemetry.success(query.tenantId, 'empty');
      return { ok: true, value: sdkResult.value };
    }

    markMenuSuccess();
    telemetry.success(query.tenantId, 'success');
    return { ok: true, value: sdkResult.value };
  }

  async getMenuItem(query: MenuItemFacadeQuery): Promise<MenuFacadeOutcome<MenuItem>> {
    const method = 'getMenuItem';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: menuFeatureDisabledError() };
    }

    const telemetry = createMenuFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    markMenuLoading('getMenuItem', { operation: 'getMenuItem', query }, createAttemptId());

    const sdkResult = await this.deps.sdk.getMenuItem(buildMenuItemQuery(query));
    if (!isSdkSuccess(sdkResult)) {
      return this.handleFailure(method, sdkResult.error, query.tenantId);
    }

    markMenuSuccess();
    telemetry.success(query.tenantId, 'success');
    return { ok: true, value: sdkResult.value };
  }

  async listCategories(query: MenuFacadeQuery): Promise<MenuFacadeOutcome<MenuCategory[]>> {
    const method = 'listCategories';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: menuFeatureDisabledError() };
    }

    const telemetry = createMenuFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    markMenuLoading('listCategories', { operation: 'listCategories', query }, createAttemptId());

    const sdkResult = await this.deps.sdk.listCategories(buildMenuCategoryQuery(query));
    if (!isSdkSuccess(sdkResult)) {
      return this.handleFailure(method, sdkResult.error, query.tenantId);
    }

    if (sdkResult.value.length === 0) {
      markMenuEmpty();
      telemetry.success(query.tenantId, 'empty');
      return { ok: true, value: sdkResult.value };
    }

    markMenuSuccess();
    telemetry.success(query.tenantId, 'success');
    return { ok: true, value: sdkResult.value };
  }

  async searchMenu(query: MenuSearchFacadeQuery): Promise<MenuFacadeOutcome<MenuSearchResult>> {
    const method = 'searchMenu';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: menuFeatureDisabledError() };
    }

    if (!query.text?.trim()) {
      const error = menuInvalidQueryError('Search text is required');
      markMenuError(error);
      return { ok: false, error };
    }

    const telemetry = createMenuFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    markMenuLoading('searchMenu', { operation: 'searchMenu', query }, createAttemptId());

    const sdkResult = await this.deps.sdk.searchMenu(buildMenuSearchQuery(query));
    if (!isSdkSuccess(sdkResult)) {
      return this.handleFailure(method, sdkResult.error, query.tenantId);
    }

    if (sdkResult.value.totalHits === 0) {
      markMenuEmpty();
      telemetry.success(query.tenantId, 'empty');
      return { ok: true, value: sdkResult.value };
    }

    markMenuSuccess();
    telemetry.success(query.tenantId, 'success');
    return { ok: true, value: sdkResult.value };
  }

  async getCombo(query: MenuComboFacadeQuery): Promise<MenuFacadeOutcome<Combo>> {
    const method = 'getCombo';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: menuFeatureDisabledError() };
    }

    const telemetry = createMenuFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    markMenuLoading('getCombo', { operation: 'getCombo', query }, createAttemptId());

    const sdkResult = await this.deps.sdk.getCombo(buildComboQuery(query));
    if (!isSdkSuccess(sdkResult)) {
      return this.handleFailure(method, sdkResult.error, query.tenantId);
    }

    markMenuSuccess();
    telemetry.success(query.tenantId, 'success');
    return { ok: true, value: sdkResult.value };
  }

  validateMenu(query: MenuFacadeQuery): MenuFacadeOutcome<MenuValidationResult> {
    const method = 'validateMenu';
    if (!this.ensureEnabled(method, query.tenantId)) {
      return { ok: false, error: menuFeatureDisabledError() };
    }

    const telemetry = createMenuFacadeTelemetryEmitter(this.deps.onTelemetry, method);
    telemetry.request(query.tenantId);
    markMenuLoading('validateMenu', { operation: 'validateMenu', query }, createAttemptId());

    const sdkResult = this.deps.sdk.validateMenu(buildMenuValidationInput(query));
    if (!isSdkSuccess(sdkResult)) {
      return this.handleFailure(method, sdkResult.error, query.tenantId);
    }

    markMenuSuccess();
    telemetry.success(query.tenantId, 'success');
    return { ok: true, value: sdkResult.value };
  }

  async retry(): Promise<MenuFacadeOutcome<unknown>> {
    const lastRequest = getLastMenuRequest();
    if (!lastRequest) {
      const error = menuInvalidQueryError('No prior menu request to retry');
      markMenuError(error);
      return { ok: false, error };
    }

    if (getMenuRetryCount() >= DEFAULT_MAX_RETRIES) {
      const error = menuInvalidQueryError('Maximum retry attempts reached. Please try again later.');
      markMenuError(error);
      return { ok: false, error };
    }

    markMenuRetry();
    createMenuFacadeTelemetryEmitter(this.deps.onTelemetry, 'retry').retry(
      lastRequest.query.tenantId
    );

    switch (lastRequest.operation) {
      case 'getMenu':
        return this.getMenu(lastRequest.query);
      case 'getMenuItem':
        return this.getMenuItem(lastRequest.query);
      case 'listCategories':
        return this.listCategories(lastRequest.query);
      case 'searchMenu':
        return this.searchMenu(lastRequest.query);
      case 'getCombo':
        return this.getCombo(lastRequest.query);
      case 'validateMenu':
        return this.validateMenu(lastRequest.query);
      default:
        return { ok: false, error: menuInvalidQueryError('Unsupported retry operation') };
    }
  }

  resetSession(): void {
    resetMenuSession();
    createMenuFacadeTelemetryEmitter(this.deps.onTelemetry, 'resetSession').reset();
  }

  subscribeSession(listener: (snapshot: MenuSessionSnapshot) => void): () => void {
    return subscribeMenuSession(listener);
  }

  getSessionSnapshot(): MenuSessionSnapshot {
    return getMenuSessionSnapshot();
  }
}

export {
  getMenuSessionSnapshot,
  subscribeMenuSession,
  resetMenuSession,
  normalizeMenuError,
  menuFeatureDisabledError,
};

export type {
  MenuFacadeQuery,
  MenuItemFacadeQuery,
  MenuSearchFacadeQuery,
  MenuComboFacadeQuery,
  MenuFacadeOutcome,
  MenuSessionSnapshot,
};
