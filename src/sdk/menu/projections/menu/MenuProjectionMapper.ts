/**
 * Menu catalog shadow projection mapper (M7 PR-7).
 */

import type { SdkResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import {
  MENU_CATALOG_EVENT_TYPES,
  type MenuCatalogCreatedPayload,
  type MenuCatalogDeletedPayload,
  type MenuCatalogUpdatedPayload,
} from '../../../../domain/menu/projections/menu/MenuProjectionMetadata';
import {
  applyMenuCatalogProjectionDeleted,
  applyMenuCatalogProjectionUpdated,
  buildMenuCatalogProjectionFromCreated,
  type MenuCatalogProjectionEventContext,
} from '../../../../domain/menu/projections/menu/MenuProjectionBuilders';
import type { MenuCatalogProjectionReadModel } from '../../../../domain/menu/projections/menu/MenuProjectionState';
import type { MenuProjectionEnvelope } from './menuProjectionPorts';

export class MenuProjectionMapper {
  private buildContext<TPayload>(
    envelope: MenuProjectionEnvelope<TPayload>
  ): MenuCatalogProjectionEventContext {
    const branchId =
      typeof envelope.metadata?.custom?.branchId === 'string'
        ? envelope.metadata.custom.branchId
        : undefined;

    return {
      eventId: envelope.header.eventId,
      eventType: envelope.header.type,
      schemaVersion: envelope.header.version,
      occurredAt: envelope.header.occurredAt,
      branchId,
    };
  }

  mapEvent(
    envelope: MenuProjectionEnvelope,
    existing: MenuCatalogProjectionReadModel | null
  ): SdkResult<MenuCatalogProjectionReadModel> {
    const context = this.buildContext(envelope);
    const eventType = envelope.header.type;

    if (eventType === MENU_CATALOG_EVENT_TYPES.CREATED) {
      return sdkOk(
        buildMenuCatalogProjectionFromCreated(
          envelope.payload as MenuCatalogCreatedPayload,
          context
        )
      );
    }

    if (!existing) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: `No read model for catalog ${envelope.header.aggregateId}`,
        },
      };
    }

    if (eventType === MENU_CATALOG_EVENT_TYPES.UPDATED) {
      return sdkOk(
        applyMenuCatalogProjectionUpdated(
          existing,
          envelope.payload as MenuCatalogUpdatedPayload,
          context
        )
      );
    }

    if (eventType === MENU_CATALOG_EVENT_TYPES.DELETED) {
      return sdkOk(
        applyMenuCatalogProjectionDeleted(
          existing,
          envelope.payload as MenuCatalogDeletedPayload,
          context
        )
      );
    }

    return {
      ok: false,
      error: { code: 'VALIDATION', message: `Unsupported event type: ${eventType}` },
    };
  }
}

export function createMenuProjectionMapper(): MenuProjectionMapper {
  return new MenuProjectionMapper();
}
