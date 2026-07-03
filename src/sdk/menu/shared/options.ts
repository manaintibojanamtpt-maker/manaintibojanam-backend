/**
 * MenuSDK factory options (M7 PR-1 / M7 PR-4).
 */

import type { MenuCatalog } from '../../../domain/menu/catalog/MenuCatalog';
import type { MenuRepository } from '../repository/MenuRepository';
import type { MenuProjectionRepository } from '../repository/MenuProjectionRepository';
import type { MenuValidator } from '../repository/MenuValidator';
import type { MenuSearchProvider } from '../repository/MenuSearchProvider';
import type { MenuAvailabilityProvider } from '../repository/MenuAvailabilityProvider';
import type { MenuPersistencePort } from '../repository/MenuRepositoryPorts';
import type { MenuFeatureFlagReader } from '../featureFlags/featureFlags';
import type { MenuProviderKind } from '../types/branded';
import type { MenuTelemetryHook } from '../orchestration/MenuTelemetry';
import type { MenuSDK } from '../contracts/MenuSDK';
import type { MenuValidationInput } from '../dto';

export interface CreateMenuSDKOptions {
  readonly menuSdk?: MenuSDK;
  readonly menuRepository?: MenuRepository;
  readonly menuProjectionRepository?: MenuProjectionRepository;
  readonly menuValidator?: MenuValidator;
  readonly menuSearchProvider?: MenuSearchProvider;
  readonly menuAvailabilityProvider?: MenuAvailabilityProvider;
  readonly persistencePort?: MenuPersistencePort;
  readonly providerKind?: MenuProviderKind;
  readonly featureFlags?: MenuFeatureFlagReader;
  readonly onTelemetry?: MenuTelemetryHook;
  readonly syncCatalogResolver?: (input: MenuValidationInput) => MenuCatalog | undefined;
}
