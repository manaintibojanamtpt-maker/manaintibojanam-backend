/**
 * Menu catalog shadow projection validator (M7 PR-7).
 */

import type { SdkResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import { MENU_CATALOG_EVENT_TYPES } from '../../../../domain/menu/projections/menu/MenuProjectionMetadata';
import { resolveMenuCatalogProjectionTransition } from '../../../../domain/menu/projections/menu/MenuProjectionBuilders';
import {
  assertNoForbiddenPayloadFieldsInReadModel,
  canApplyCatalogDelete,
  canApplyCatalogUpdate,
  validateMenuCatalogProjectionEventType,
  validateMenuCatalogProjectionReadModel,
} from '../../../../domain/menu/projections/menu/MenuProjectionValidation';
import type { MenuCatalogProjectionReadModel } from '../../../../domain/menu/projections/menu/MenuProjectionState';
import type { MenuProjectionEnvelope } from './menuProjectionPorts';

export class MenuProjectionValidator {
  validateEnvelope<TPayload>(envelope: MenuProjectionEnvelope<TPayload>): SdkResult<void> {
    const errors = validateMenuCatalogProjectionEventType(envelope.header.type);
    if (errors.length > 0) {
      return { ok: false, error: { code: 'VALIDATION', message: errors.join('; ') } };
    }
    if (!envelope.metadata?.correlationId) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: 'correlationId is required' },
      };
    }
    if (!envelope.header.aggregateId) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: 'aggregateId is required' },
      };
    }
    return sdkOk(undefined);
  }

  validateReadModel(model: MenuCatalogProjectionReadModel): SdkResult<void> {
    const errors = [
      ...validateMenuCatalogProjectionReadModel(model),
      ...assertNoForbiddenPayloadFieldsInReadModel(model as unknown as Record<string, unknown>),
    ];
    if (errors.length > 0) {
      return { ok: false, error: { code: 'VALIDATION', message: errors.join('; ') } };
    }
    return sdkOk(undefined);
  }

  validateTransition(
    eventType: string,
    existing: MenuCatalogProjectionReadModel | null
  ): SdkResult<void> {
    const transition = resolveMenuCatalogProjectionTransition(eventType);
    if (transition === 'unsupported') {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: `Unsupported event: ${eventType}` },
      };
    }
    if (transition === 'create') {
      return sdkOk(undefined);
    }
    if (transition === 'update' && !canApplyCatalogUpdate(existing)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION',
          message: 'Cannot apply menu.catalog.updated.v1 without existing read model',
        },
      };
    }
    if (transition === 'delete' && !canApplyCatalogDelete(existing)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION',
          message: 'Cannot apply menu.catalog.deleted.v1 without existing read model',
        },
      };
    }
    if (eventType === MENU_CATALOG_EVENT_TYPES.CREATED && existing !== null) {
      return sdkOk(undefined);
    }
    return sdkOk(undefined);
  }
}

export function createMenuProjectionValidator(): MenuProjectionValidator {
  return new MenuProjectionValidator();
}
