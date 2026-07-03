/**
 * Menu parity mapper (M7 PR-8).
 * Normalizes legacy documents and projection read models to canonical catalog views.
 */

import type { LegacyMenuCatalogDocument } from '../../../domain/menu/parity/MenuCanonicalModel';
import {
  normalizeMenuParityStatus,
  resolveMenuParityTimestamp,
  type MenuCanonicalModel,
} from '../../../domain/menu/parity/MenuCanonicalModel';
import type { MenuCatalogProjectionReadModel } from '../../../domain/menu/projections/menu/MenuProjectionState';

export class MenuParityMapper {
  mapLegacy(document: LegacyMenuCatalogDocument): MenuCanonicalModel {
    const updatedAt = resolveMenuParityTimestamp(document.updatedAt, new Date(0).toISOString());

    return {
      catalogId: document.catalogId,
      tenantId: document.tenantId,
      branchId: document.branchId,
      catalogVersion: document.catalogVersion,
      status: normalizeMenuParityStatus(document.status),
      categoryCount: document.categoryCount,
      itemCount: document.itemCount,
      modifierGroupCount: document.modifierGroupCount,
      comboCount: document.comboCount,
      updatedAt,
    };
  }

  mapProjection(model: MenuCatalogProjectionReadModel): MenuCanonicalModel {
    return {
      catalogId: model.catalogId,
      tenantId: model.tenantId,
      branchId: model.branchId,
      catalogVersion: model.catalogVersion,
      status: normalizeMenuParityStatus(model.status),
      categoryCount: model.categoryCount,
      itemCount: model.itemCount,
      modifierGroupCount: model.modifierGroupCount,
      comboCount: model.comboCount,
      updatedAt: model.updatedAt,
    };
  }
}

export function createMenuParityMapper(): MenuParityMapper {
  return new MenuParityMapper();
}
