/**
 * Pricing catalog shadow projection ports (M8 PR-7).
 * Business read-model ports — distinct from M8 PR-6 infrastructure ports.
 */

import type { SdkAsyncResult } from '../../../core/result';
import type {
  PricingCatalogProjectionReadModel,
  PricingCatalogProjectionSnapshotRecord,
} from '../../../../domain/pricing/projections/pricing/PricingProjectionState';

export interface PricingProjectionEnvelope<TPayload = unknown> {
  readonly header: {
    readonly eventId: string;
    readonly type: string;
    readonly version: string;
    readonly aggregateId: string;
    readonly occurredAt: string;
  };
  readonly metadata?: {
    readonly correlationId?: string;
    readonly custom?: Record<string, unknown>;
  };
  readonly payload: TPayload;
}

export interface PricingProjectionRepositoryPort {
  save(model: PricingCatalogProjectionReadModel): SdkAsyncResult<void>;
  load(priceListId: string): SdkAsyncResult<PricingCatalogProjectionReadModel | null>;
  get(priceListId: string): SdkAsyncResult<PricingCatalogProjectionReadModel | null>;
  listByTenant(tenantId: string, limit: number): SdkAsyncResult<PricingCatalogProjectionReadModel[]>;
  count(): SdkAsyncResult<number>;
  delete(priceListId: string): SdkAsyncResult<void>;
}

export interface PricingProjectionSnapshotPort {
  save(snapshot: PricingCatalogProjectionSnapshotRecord): SdkAsyncResult<void>;
  loadLatest(priceListId: string): SdkAsyncResult<PricingCatalogProjectionSnapshotRecord | null>;
  listByPriceList(
    priceListId: string,
    limit: number
  ): SdkAsyncResult<PricingCatalogProjectionSnapshotRecord[]>;
}

export interface PricingProjectionProcessResult {
  readonly priceListId: string;
  readonly eventType: string;
  readonly eventId: string;
  readonly applied: boolean;
  readonly readModel?: PricingCatalogProjectionReadModel;
  readonly reason?: string;
}

export interface PricingProjectionWorkerPort {
  process<TPayload>(
    envelope: PricingProjectionEnvelope<TPayload>
  ): SdkAsyncResult<PricingProjectionProcessResult>;
}
