/**
 * Menu catalog shadow projection repository — in-memory store (M7 PR-7 test only).
 */

import type { MenuProjectionRepositoryPort } from './menuProjectionPorts';
import type { MenuCatalogProjectionReadModel } from '../../../../domain/menu/projections/menu/MenuProjectionState';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';

export class MenuCatalogProjectionRepository implements MenuProjectionRepositoryPort {
  private readonly store = new Map<string, MenuCatalogProjectionReadModel>();

  save(model: MenuCatalogProjectionReadModel): SdkAsyncResult<void> {
    this.store.set(model.catalogId, model);
    return Promise.resolve(sdkOk(undefined));
  }

  get(catalogId: string): SdkAsyncResult<MenuCatalogProjectionReadModel | null> {
    return Promise.resolve(sdkOk(this.store.get(catalogId) ?? null));
  }

  listByTenant(tenantId: string, limit: number): SdkAsyncResult<MenuCatalogProjectionReadModel[]> {
    const items = [...this.store.values()]
      .filter((model) => model.tenantId === tenantId)
      .slice(0, limit);
    return Promise.resolve(sdkOk(items));
  }

  count(): SdkAsyncResult<number> {
    return Promise.resolve(sdkOk(this.store.size));
  }
}

export function createMenuProjectionRepository(): MenuProjectionRepositoryPort {
  return new MenuCatalogProjectionRepository();
}
