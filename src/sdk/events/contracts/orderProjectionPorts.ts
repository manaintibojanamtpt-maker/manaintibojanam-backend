/**
 * EventSDK — order projection ports (M6 PR-7).
 * Additive contracts — no changes to frozen SDKs.
 */

import type { SdkAsyncResult } from '../../core/result';
import type {
  OrderProjectionReadModel,
  OrderProjectionSnapshotRecord,
} from '../../../domain/events/projections/order/OrderProjectionState';

export interface OrderProjectionRepositoryPort {
  save(model: OrderProjectionReadModel): SdkAsyncResult<void>;
  get(orderId: string): SdkAsyncResult<OrderProjectionReadModel | null>;
  listByTenant(tenantId: string, limit: number): SdkAsyncResult<OrderProjectionReadModel[]>;
  count(): SdkAsyncResult<number>;
}

export interface OrderProjectionSnapshotPort {
  save(snapshot: OrderProjectionSnapshotRecord): SdkAsyncResult<void>;
  loadLatest(orderId: string): SdkAsyncResult<OrderProjectionSnapshotRecord | null>;
  listByOrder(orderId: string, limit: number): SdkAsyncResult<OrderProjectionSnapshotRecord[]>;
}

export interface OrderProjectionProcessResult {
  readonly orderId: string;
  readonly eventType: string;
  readonly eventId: string;
  readonly applied: boolean;
  readonly readModel?: OrderProjectionReadModel;
  readonly reason?: string;
}

export interface OrderProjectionWorkerPort {
  process<TPayload>(envelope: import('../dto/EventEnvelope').EventEnvelope<TPayload>): SdkAsyncResult<OrderProjectionProcessResult>;
}
