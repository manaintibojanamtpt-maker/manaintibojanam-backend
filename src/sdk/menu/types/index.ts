/**
 * MenuSDK — type barrel exports (M7 PR-1).
 */

export type {
  MenuItemId,
  MenuCategoryId,
  ModifierGroupId,
  ModifierId,
  ComboId,
  MenuId,
  MenuProviderKind,
  MenuItemKind,
  MenuTimestamp,
  MenuTenantScope,
} from './branded';

export type { MenuSDK, MenuSDKFactory } from '../contracts/MenuSDK';
export type { MenuRepository } from '../repository/MenuRepository';
export type { MenuProjectionRepository } from '../repository/MenuProjectionRepository';
export type { MenuValidator } from '../repository/MenuValidator';
export type { MenuSearchProvider } from '../repository/MenuSearchProvider';
export type {
  MenuAvailabilityProvider,
  MenuAvailabilityQuery,
} from '../repository/MenuAvailabilityProvider';

export type {
  Menu,
  MenuCategory,
  MenuItem,
  Modifier,
  ModifierGroup,
  Combo,
  ComboComponent,
  PriceReference,
  AvailabilityReference,
  BranchOverrideReference,
  MenuQuery,
  MenuItemQuery,
  MenuCategoryQuery,
  ModifierGroupQuery,
  ComboQuery,
  MenuSearchQuery,
  MenuValidationInput,
  MenuSearchHit,
  MenuSearchResult,
  MenuValidationIssue,
  MenuValidationResult,
  MenuMetadata,
} from '../dto';

export type { MenuSdkFeatureFlag, MenuFeatureFlagReader } from '../featureFlags/featureFlags';
export {
  MENU_SDK_FEATURE_FLAG_DEFAULTS,
  MENU_SDK_FEATURE_FLAG_ENV_KEYS,
  readMenuFlagDefault,
} from '../featureFlags/featureFlags';

export {
  MENU_SDK_VERSION,
  MENU_SDK_FROZEN,
  MENU_SDK_MODULE,
} from '../version';

export type { CreateMenuSDKOptions } from '../shared/options';

export {
  createMenuSDK,
  menuSdkFactory,
  resolveMenuEnabled,
  createStubMenuAdapter,
  createDefaultMenuAdapter,
  menuNotConfigured,
  menuNotConfiguredAsync,
  menuNotConfiguredSync,
} from '../factory/createMenuSDK';

export type {
  MenuPersistencePort,
  MenuPersistenceQuery,
  MenuItemPersistenceQuery,
  ComboPersistenceQuery,
  MenuSearchPersistenceQuery,
  CreateMenuRepositoryOptions,
} from '../repository/MenuRepositoryPorts';
export type {
  MenuRecord,
  CategoryRecord,
  MenuItemRecord,
  ModifierGroupRecord,
  ModifierRecord,
  ComboRecord,
  PriceRecord,
  AvailabilityRecord,
  BranchOverrideRecord,
  MenuSearchRecordResult,
} from '../repository/MenuPersistenceModels';
export {
  createMenuRepository,
  createStubMenuRepository,
  createMenuRepositoryAdapter,
} from '../repository/MenuRepositoryFactory';
export {
  mapMenuRecordToMenu,
  mapCategoryRecord,
  mapMenuItemRecord,
  mapComboRecord,
  mapPersistenceError,
} from '../repository/MenuRepositoryMapper';

export { createOrchestratedMenuSDK } from '../orchestration/MenuSdkFactory';
export type { MenuTelemetryHook, MenuTelemetryEvent } from '../orchestration/MenuTelemetry';