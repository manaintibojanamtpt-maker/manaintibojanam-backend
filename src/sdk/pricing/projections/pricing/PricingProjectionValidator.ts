/**
 * Pricing catalog shadow projection validator (M8 PR-7).
 */

import type { SdkResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import { PRICING_CATALOG_EVENT_TYPES } from '../../../../domain/pricing/projections/pricing/PricingProjectionMetadata';
import { resolvePricingCatalogProjectionTransition } from '../../../../domain/pricing/projections/pricing/PricingProjectionBuilders';
import {
  assertNoForbiddenFieldsInPricingReadModel,
  canApplyPricingCatalogDelete,
  canApplyPricingCatalogUpdate,
  validatePricingCatalogProjectionEventType,
  validatePricingCatalogProjectionReadModel,
} from '../../../../domain/pricing/projections/pricing/PricingProjectionValidation';
import type { PricingCatalogProjectionReadModel } from '../../../../domain/pricing/projections/pricing/PricingProjectionState';
import type { PricingProjectionEnvelope } from './pricingProjectionPorts';

export class PricingProjectionValidator {
  validateEnvelope<TPayload>(envelope: PricingProjectionEnvelope<TPayload>): SdkResult<void> {
    const errors = validatePricingCatalogProjectionEventType(envelope.header.type);
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

  validateReadModel(model: PricingCatalogProjectionReadModel): SdkResult<void> {
    const errors = [
      ...validatePricingCatalogProjectionReadModel(model),
      ...assertNoForbiddenFieldsInPricingReadModel(model as unknown as Record<string, unknown>),
    ];
    if (errors.length > 0) {
      return { ok: false, error: { code: 'VALIDATION', message: errors.join('; ') } };
    }
    return sdkOk(undefined);
  }

  validateTransition(
    eventType: string,
    existing: PricingCatalogProjectionReadModel | null
  ): SdkResult<void> {
    const transition = resolvePricingCatalogProjectionTransition(eventType);
    if (transition === 'unsupported') {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: `Unsupported event: ${eventType}` },
      };
    }
    if (transition === 'create') {
      return sdkOk(undefined);
    }
    if (transition === 'update' && !canApplyPricingCatalogUpdate(existing)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION',
          message: 'Cannot apply pricing.catalog.updated.v1 without existing read model',
        },
      };
    }
    if (transition === 'delete' && !canApplyPricingCatalogDelete(existing)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION',
          message: 'Cannot apply pricing.catalog.deleted.v1 without existing read model',
        },
      };
    }
    if (eventType === PRICING_CATALOG_EVENT_TYPES.CREATED && existing !== null) {
      return sdkOk(undefined);
    }
    return sdkOk(undefined);
  }
}

export function createPricingProjectionValidator(): PricingProjectionValidator {
  return new PricingProjectionValidator();
}
