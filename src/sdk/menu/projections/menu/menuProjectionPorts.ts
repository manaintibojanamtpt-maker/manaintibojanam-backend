/**
 * Menu catalog shadow projection ports (M7 PR-7).
 * Business read-model ports — distinct from M7 PR-6 infrastructure ports.
 */

import type { SdkAsyncResult } from '../../../core/result';
import type {
  MenuCatalogProjectionReadModel,
  MenuCatalogProjectionSnapshotRecord,
} from '../../../../domain/menu/projections/menu/MenuProjectionState';

export interface MenuProjectionEnvelope<TPayload = unknown> {
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

export interface MenuProjectionRepositoryPort {
  save(model: MenuCatalogProjectionReadModel): SdkAsyncResult<void>;
  get(catalogId: string): SdkAsyncResult<MenuCatalogProjectionReadModel | null>;
  listByTenant(tenantId: string, limit: number): SdkAsyncResult<MenuCatalogProjectionReadModel[]>;
  count(): SdkAsyncResult<number>;
}

export interface MenuProjectionSnapshotPort {
  save(snapshot: MenuCatalogProjectionSnapshotRecord): SdkAsyncResult<void>;
  loadLatest(catalogId: string): SdkAsyncResult<MenuCatalogProjectionSnapshotRecord | null>;
  listByCatalog(
    catalogId: string,
    limit: number
  ): SdkAsyncResult<MenuCatalogProjectionSnapshotRecord[]>;
}

export interface MenuProjectionProcessResult {
  readonly catalogId: string;
  readonly eventType: string;
  readonly eventId: string;
  readonly applied: boolean;
  readonly readModel?: MenuCatalogProjectionReadModel;
  readonly reason?: string;
}

export interface MenuProjectionWorkerPort {
  process<TPayload>(
    envelope: MenuProjectionEnvelope<TPayload>
  ): SdkAsyncResult<MenuProjectionProcessResult>;
}
