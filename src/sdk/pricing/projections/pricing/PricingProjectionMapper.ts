/**
 * Pricing catalog shadow projection mapper (M8 PR-7).
 */

import type { SdkResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import {
  PRICING_CATALOG_EVENT_TYPES,
  type PricingCatalogCreatedPayload,
  type PricingCatalogDeletedPayload,
  type PricingCatalogUpdatedPayload,
} from '../../../../domain/pricing/projections/pricing/PricingProjectionMetadata';
import {
  applyPricingCatalogProjectionDeleted,
  applyPricingCatalogProjectionUpdated,
  buildPricingCatalogProjectionFromCreated,
  type PricingCatalogProjectionEventContext,
} from '../../../../domain/pricing/projections/pricing/PricingProjectionBuilders';
import type { PricingCatalogProjectionReadModel } from '../../../../domain/pricing/projections/pricing/PricingProjectionState';
import type { PricingProjectionEnvelope } from './pricingProjectionPorts';

export class PricingProjectionMapper {
  private buildContext<TPayload>(
    envelope: PricingProjectionEnvelope<TPayload>
  ): PricingCatalogProjectionEventContext {
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
    envelope: PricingProjectionEnvelope,
    existing: PricingCatalogProjectionReadModel | null
  ): SdkResult<PricingCatalogProjectionReadModel> {
    const context = this.buildContext(envelope);
    const eventType = envelope.header.type;

    if (eventType === PRICING_CATALOG_EVENT_TYPES.CREATED) {
      return sdkOk(
        buildPricingCatalogProjectionFromCreated(
          envelope.payload as PricingCatalogCreatedPayload,
          context
        )
      );
    }

    if (!existing) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: `No read model for price list ${envelope.header.aggregateId}`,
        },
      };
    }

    if (eventType === PRICING_CATALOG_EVENT_TYPES.UPDATED) {
      return sdkOk(
        applyPricingCatalogProjectionUpdated(
          existing,
          envelope.payload as PricingCatalogUpdatedPayload,
          context
        )
      );
    }

    if (eventType === PRICING_CATALOG_EVENT_TYPES.DELETED) {
      return sdkOk(
        applyPricingCatalogProjectionDeleted(
          existing,
          envelope.payload as PricingCatalogDeletedPayload,
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

export function createPricingProjectionMapper(): PricingProjectionMapper {
  return new PricingProjectionMapper();
}
