/**
 * MenuSDK — default orchestrated adapter (M7 PR-4).
 */

import type { SdkAsyncResult, SdkResult } from '../../core/result';
import type { MenuSDK } from '../contracts/MenuSDK';
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
import {
  orchestrateGetCombo,
  orchestrateGetMenu,
  orchestrateGetMenuItem,
  orchestrateGetModifierGroups,
  orchestrateListCategories,
  orchestrateSearchMenu,
  orchestrateValidateMenu,
  type MenuSdkOrchestratorDeps,
} from './MenuSdkOrchestrator';
import type { MenuTelemetryHook } from './MenuTelemetry';

export interface DefaultMenuAdapterDeps {
  readonly repository: MenuRepository;
  readonly repositoryEnabled: boolean;
  readonly searchProvider?: MenuSearchProvider;
  readonly onTelemetry?: MenuTelemetryHook;
  readonly syncCatalogResolver?: MenuSdkOrchestratorDeps['syncCatalogResolver'];
}

export class DefaultMenuAdapter implements MenuSDK {
  private readonly orchestratorDeps: MenuSdkOrchestratorDeps;

  constructor(deps: DefaultMenuAdapterDeps) {
    this.orchestratorDeps = {
      repository: deps.repository,
      repositoryEnabled: deps.repositoryEnabled,
      searchProvider: deps.searchProvider,
      onTelemetry: deps.onTelemetry,
      syncCatalogResolver: deps.syncCatalogResolver,
    };
  }

  getMenu(query: MenuQuery): SdkAsyncResult<Menu> {
    return orchestrateGetMenu(this.orchestratorDeps, query);
  }

  getMenuItem(query: MenuItemQuery): SdkAsyncResult<MenuItem> {
    return orchestrateGetMenuItem(this.orchestratorDeps, query);
  }

  listCategories(query: MenuCategoryQuery): SdkAsyncResult<MenuCategory[]> {
    return orchestrateListCategories(this.orchestratorDeps, query);
  }

  searchMenu(query: MenuSearchQuery): SdkAsyncResult<MenuSearchResult> {
    return orchestrateSearchMenu(this.orchestratorDeps, query);
  }

  getModifierGroups(query: ModifierGroupQuery): SdkAsyncResult<ModifierGroup[]> {
    return orchestrateGetModifierGroups(this.orchestratorDeps, query);
  }

  getCombo(query: ComboQuery): SdkAsyncResult<Combo> {
    return orchestrateGetCombo(this.orchestratorDeps, query);
  }

  validateMenu(input: MenuValidationInput): SdkResult<MenuValidationResult> {
    return orchestrateValidateMenu(this.orchestratorDeps, input);
  }
}

export function createDefaultMenuAdapter(deps: DefaultMenuAdapterDeps): MenuSDK {
  return new DefaultMenuAdapter(deps);
}
