/**
 * MenuSDK — orchestration layer (M7 PR-4).
 */

import type { MenuCatalog as DomainMenuCatalog } from '../../../domain/menu/catalog/MenuCatalog';
import { MenuDomainValidator } from '../../../domain/menu/validation/MenuDomainValidator';
import { CategoryValidator } from '../../../domain/menu/validation/CategoryValidator';
import { ItemValidator } from '../../../domain/menu/validation/ItemValidator';
import { ComboValidator } from '../../../domain/menu/validation/ComboValidator';
import { isSdkSuccess, sdkOk } from '../../core/resultHelpers';
import type { SdkAsyncResult, SdkFailure, SdkResult } from '../../core/result';
import type {
  Combo,
  ComboQuery,
  Menu,
  MenuCategory,
  MenuCategoryQuery,
  MenuItem,
  MenuItemQuery,
  MenuQuery,
  MenuSearchQuery,
  MenuSearchResult,
  MenuValidationInput,
  MenuValidationResult,
  ModifierGroup,
  ModifierGroupQuery,
} from '../dto';
import type { MenuRepository } from '../repository/MenuRepository';
import type { MenuSearchProvider } from '../repository/MenuSearchProvider';
import { menuNotConfiguredAsync } from '../adapters/notConfigured';
import {
  validateMenuCategoryQuery,
  validateMenuItemQuery,
  validateMenuQuery,
  validateMenuSearchQuery,
  validateMenuValidationInput,
} from '../validation/validateMenuQuery';
import {
  mapComboDtoToDomain,
  mapDomainValidationToMenuValidationResult,
  mapMenuDtoToDomainCatalog,
  mapMenuItemDtoToDomain,
} from './MenuDomainMapper';
import {
  mapDomainErrorToSdk,
  mapRepositoryResultToSdk,
  menuNotFound,
  repositoryUnavailable,
} from './MenuErrorMapper';
import {
  createMenuPipelineTimer,
  createMenuTelemetryEmitter,
  type MenuTelemetryHook,
} from './MenuTelemetry';

export interface MenuSdkOrchestratorDeps {
  readonly repository: MenuRepository;
  readonly repositoryEnabled: boolean;
  readonly searchProvider?: MenuSearchProvider;
  readonly onTelemetry?: MenuTelemetryHook;
  readonly syncCatalogResolver?: (
    input: MenuValidationInput
  ) => DomainMenuCatalog | undefined;
}

const ensureRepositoryEnabled = (
  deps: MenuSdkOrchestratorDeps,
  method: string
): SdkResult<true> | null => {
  if (!deps.repositoryEnabled) {
    return repositoryUnavailable(method);
  }
  return null;
};

const failDomainValidation = (
  result: ReturnType<typeof MenuDomainValidator.validate>
): SdkFailure | null => {
  if (result.valid) return null;
  return mapDomainErrorToSdk(
    result.errors[0] ?? { code: 'VALIDATION_FAILED', message: 'Validation failed' }
  );
};

export const orchestrateGetMenu = async (
  deps: MenuSdkOrchestratorDeps,
  query: MenuQuery
): SdkAsyncResult<Menu> => {
  const telemetry = createMenuTelemetryEmitter(deps.onTelemetry, 'getMenu');
  telemetry.request({ tenantId: String(query.tenantId) });

  const validationTimer = createMenuPipelineTimer();
  const validated = validateMenuQuery(query);
  const validationMs = validationTimer();
  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { tenantId: String(query.tenantId) });
    return validated;
  }
  telemetry.validationCompleted({ validationMs });

  const disabled = ensureRepositoryEnabled(deps, 'getMenu');
  if (disabled) {
    telemetry.failure(disabled.error.code, { tenantId: String(query.tenantId) });
    return disabled;
  }

  telemetry.repositoryRead({ tenantId: String(query.tenantId) });
  const repositoryTimer = createMenuPipelineTimer();
  const menuResult = mapRepositoryResultToSdk(await deps.repository.getMenu(validated.value));
  const repositoryMs = repositoryTimer();
  if (!isSdkSuccess(menuResult)) {
    telemetry.failure(menuResult.error.code, { tenantId: String(query.tenantId) });
    return menuResult;
  }

  const domainTimer = createMenuPipelineTimer();
  const domainCatalog = mapMenuDtoToDomainCatalog(menuResult.value);
  const domainValidation = MenuDomainValidator.validate(domainCatalog);
  const domainMs = domainTimer();
  telemetry.validationCompleted({ domainMs });

  const domainFailure = failDomainValidation(domainValidation);
  if (domainFailure) {
    telemetry.failure(domainFailure.error.code, { tenantId: String(query.tenantId) });
    return domainFailure;
  }

  telemetry.success({ validationMs, repositoryMs, domainMs }, { tenantId: String(query.tenantId) });
  return sdkOk(menuResult.value);
};

export const orchestrateGetMenuItem = async (
  deps: MenuSdkOrchestratorDeps,
  query: MenuItemQuery
): SdkAsyncResult<MenuItem> => {
  const telemetry = createMenuTelemetryEmitter(deps.onTelemetry, 'getMenuItem');
  telemetry.request({ tenantId: String(query.tenantId), itemId: String(query.itemId) });

  const validated = validateMenuItemQuery(query);
  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { tenantId: String(query.tenantId) });
    return validated;
  }

  const disabled = ensureRepositoryEnabled(deps, 'getMenuItem');
  if (disabled) {
    telemetry.failure(disabled.error.code, { tenantId: String(query.tenantId) });
    return disabled;
  }

  telemetry.repositoryRead({ tenantId: String(query.tenantId) });
  const itemResult = mapRepositoryResultToSdk(await deps.repository.getMenuItem(validated.value));
  if (!isSdkSuccess(itemResult)) {
    telemetry.failure(itemResult.error.code, { tenantId: String(query.tenantId) });
    return itemResult;
  }

  const domainValidation = ItemValidator.validate(mapMenuItemDtoToDomain(itemResult.value));
  const domainFailure = failDomainValidation(domainValidation);
  if (domainFailure) {
    telemetry.failure(domainFailure.error.code, { tenantId: String(query.tenantId) });
    return domainFailure;
  }

  telemetry.success(undefined, { tenantId: String(query.tenantId) });
  return sdkOk(itemResult.value);
};

export const orchestrateListCategories = async (
  deps: MenuSdkOrchestratorDeps,
  query: MenuCategoryQuery
): SdkAsyncResult<MenuCategory[]> => {
  const telemetry = createMenuTelemetryEmitter(deps.onTelemetry, 'listCategories');
  telemetry.request({ tenantId: String(query.tenantId) });

  const validated = validateMenuCategoryQuery(query);
  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { tenantId: String(query.tenantId) });
    return validated;
  }

  const disabled = ensureRepositoryEnabled(deps, 'listCategories');
  if (disabled) {
    telemetry.failure(disabled.error.code, { tenantId: String(query.tenantId) });
    return disabled;
  }

  telemetry.repositoryRead({ tenantId: String(query.tenantId) });
  const categoriesResult = mapRepositoryResultToSdk(
    await deps.repository.listCategories(validated.value)
  );
  if (!isSdkSuccess(categoriesResult)) {
    telemetry.failure(categoriesResult.error.code, { tenantId: String(query.tenantId) });
    return categoriesResult;
  }

  for (const category of categoriesResult.value) {
    const domainValidation = CategoryValidator.validate({
      categoryId: String(category.categoryId),
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      itemIds: [...category.itemIds],
      active: category.active,
    });
    const domainFailure = failDomainValidation(domainValidation);
    if (domainFailure) {
      telemetry.failure(domainFailure.error.code, { tenantId: String(query.tenantId) });
      return domainFailure;
    }
  }

  telemetry.success(undefined, { tenantId: String(query.tenantId) });
  return sdkOk(categoriesResult.value);
};

export const orchestrateSearchMenu = async (
  deps: MenuSdkOrchestratorDeps,
  query: MenuSearchQuery
): SdkAsyncResult<MenuSearchResult> => {
  const telemetry = createMenuTelemetryEmitter(deps.onTelemetry, 'searchMenu');
  telemetry.request({ tenantId: String(query.tenantId) });

  const validated = validateMenuSearchQuery(query);
  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { tenantId: String(query.tenantId) });
    return validated;
  }

  if (!deps.searchProvider) {
    return menuNotConfiguredAsync('searchMenu', 'MenuSearchProvider');
  }

  telemetry.repositoryRead({ tenantId: String(query.tenantId) });
  const searchResult = mapRepositoryResultToSdk(
    await deps.searchProvider.searchMenu(validated.value)
  );
  if (!isSdkSuccess(searchResult)) {
    telemetry.failure(searchResult.error.code, { tenantId: String(query.tenantId) });
    return searchResult;
  }

  telemetry.success(undefined, { tenantId: String(query.tenantId) });
  return sdkOk(searchResult.value);
};

export const orchestrateGetModifierGroups = async (
  _deps: MenuSdkOrchestratorDeps,
  _query: ModifierGroupQuery
): SdkAsyncResult<ModifierGroup[]> => {
  return menuNotConfiguredAsync('getModifierGroups', 'MenuModifierProvider');
};

export const orchestrateGetCombo = async (
  deps: MenuSdkOrchestratorDeps,
  query: ComboQuery
): SdkAsyncResult<Combo> => {
  const telemetry = createMenuTelemetryEmitter(deps.onTelemetry, 'getCombo');
  telemetry.request({ tenantId: String(query.tenantId) });

  const validated = validateMenuQuery({ tenantId: query.tenantId, branchId: query.branchId });
  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { tenantId: String(query.tenantId) });
    return validated;
  }

  const disabled = ensureRepositoryEnabled(deps, 'getCombo');
  if (disabled) {
    telemetry.failure(disabled.error.code, { tenantId: String(query.tenantId) });
    return disabled;
  }

  telemetry.repositoryRead({ tenantId: String(query.tenantId) });
  const comboResult = mapRepositoryResultToSdk(await deps.repository.getCombo(query));
  if (!isSdkSuccess(comboResult)) {
    telemetry.failure(comboResult.error.code, { tenantId: String(query.tenantId) });
    return comboResult;
  }

  const domainValidation = ComboValidator.validate(mapComboDtoToDomain(comboResult.value));
  const domainFailure = failDomainValidation(domainValidation);
  if (domainFailure) {
    telemetry.failure(domainFailure.error.code, { tenantId: String(query.tenantId) });
    return domainFailure;
  }

  telemetry.success(undefined, { tenantId: String(query.tenantId) });
  return sdkOk(comboResult.value);
};

export const orchestrateValidateMenu = (
  deps: MenuSdkOrchestratorDeps,
  input: MenuValidationInput
): SdkResult<MenuValidationResult> => {
  const telemetry = createMenuTelemetryEmitter(deps.onTelemetry, 'validateMenu');
  telemetry.request({ tenantId: String(input.tenantId) });

  const validated = validateMenuValidationInput(input);
  if (!isSdkSuccess(validated)) {
    telemetry.failure(validated.error.code, { tenantId: String(input.tenantId) });
    return validated;
  }

  const disabled = ensureRepositoryEnabled(deps, 'validateMenu');
  if (disabled) {
    telemetry.failure(disabled.error.code, { tenantId: String(input.tenantId) });
    return disabled;
  }

  if (!deps.syncCatalogResolver) {
    telemetry.failure('CATALOG_RESOLVER_REQUIRED', { tenantId: String(input.tenantId) });
    return repositoryUnavailable('validateMenu');
  }

  const catalog = deps.syncCatalogResolver(validated.value);
  if (!catalog) {
    telemetry.failure('NOT_FOUND', { tenantId: String(input.tenantId) });
    return menuNotFound('Menu catalog', String(input.tenantId));
  }

  const domainValidation = MenuDomainValidator.validate(catalog);
  telemetry.validationCompleted();
  telemetry.success(undefined, { tenantId: String(input.tenantId) });
  return sdkOk(mapDomainValidationToMenuValidationResult(domainValidation));
};
