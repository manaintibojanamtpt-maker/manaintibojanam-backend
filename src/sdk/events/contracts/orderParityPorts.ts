/**
 * EventSDK — order parity ports (M6 PR-8).
 * Additive contracts — no changes to frozen SDKs.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { LegacyOrderDocument } from '../../../domain/events/orders/OrderEventMetadata';
import type { OrderProjectionReadModel } from '../../../domain/events/projections/order/OrderProjectionState';
import type { OrderParityReportRecord } from '../../../domain/events/parity/order/OrderParityResult';

export interface LegacyOrderReadPort {
  get(orderId: string): SdkAsyncResult<LegacyOrderDocument | null>;
}

export interface ProjectionOrderReadPort {
  get(orderId: string): SdkAsyncResult<OrderProjectionReadModel | null>;
}

export interface ParityReportRepositoryPort {
  save(report: OrderParityReportRecord): SdkAsyncResult<void>;
  get(reportId: string): SdkAsyncResult<OrderParityReportRecord | null>;
  getLatestByOrder(orderId: string): SdkAsyncResult<OrderParityReportRecord | null>;
  listByOrder(orderId: string, limit: number): SdkAsyncResult<OrderParityReportRecord[]>;
  count(): SdkAsyncResult<number>;
}

export interface OrderParityValidateResult {
  readonly orderId: string;
  readonly valid: boolean;
  readonly reason?: string;
}

export interface OrderParityValidatorPort {
  validateOrderId(orderId: string): import('../../core/result').SdkResult<OrderParityValidateResult>;
}

export interface OrderParityComparatorPort {
  compare(orderId: string): SdkAsyncResult<import('../../../domain/events/parity/order/OrderParityResult').OrderParityResult>;
}

export interface OrderParityInfrastructurePort {
  validate(orderId: string): SdkAsyncResult<OrderParityValidateResult>;
  compare(orderId: string): SdkAsyncResult<import('../../../domain/events/parity/order/OrderParityResult').OrderParityResult>;
  compareAndReport(orderId: string): SdkAsyncResult<OrderParityReportRecord>;
  statistics(): SdkAsyncResult<import('../../../domain/events/parity/order/OrderParityStatistics').OrderParityStatistics>;
}
