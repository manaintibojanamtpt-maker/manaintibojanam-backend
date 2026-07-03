/**
 * Order parity report repository (M6 PR-8).
 * In-memory store for validation reports — no Firestore.
 */

import type { ParityReportRepositoryPort } from '../../contracts/orderParityPorts';
import type { OrderParityReportRecord } from '../../../../domain/events/parity/order/OrderParityResult';
import type {
  OrderParityStatistics,
} from '../../../../domain/events/parity/order/OrderParityStatistics';
import {
  EMPTY_ORDER_PARITY_STATISTICS,
  accumulateParityStatistics,
} from '../../../../domain/events/parity/order/OrderParityStatistics';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';

export class OrderParityReportRepository implements ParityReportRepositoryPort {
  private readonly reports = new Map<string, OrderParityReportRecord>();
  private statistics: OrderParityStatistics = { ...EMPTY_ORDER_PARITY_STATISTICS };

  save(report: OrderParityReportRecord): SdkAsyncResult<void> {
    this.reports.set(report.reportId, report);
    this.statistics = accumulateParityStatistics(this.statistics, report.outcome);
    return Promise.resolve(sdkOk(undefined));
  }

  get(reportId: string): SdkAsyncResult<OrderParityReportRecord | null> {
    return Promise.resolve(sdkOk(this.reports.get(reportId) ?? null));
  }

  getLatestByOrder(orderId: string): SdkAsyncResult<OrderParityReportRecord | null> {
    const latest = [...this.reports.values()]
      .filter((r) => r.orderId === orderId)
      .sort((a, b) => b.comparedAt.localeCompare(a.comparedAt))[0];
    return Promise.resolve(sdkOk(latest ?? null));
  }

  listByOrder(orderId: string, limit: number): SdkAsyncResult<OrderParityReportRecord[]> {
    const items = [...this.reports.values()]
      .filter((r) => r.orderId === orderId)
      .slice(-limit);
    return Promise.resolve(sdkOk(items));
  }

  count(): SdkAsyncResult<number> {
    return Promise.resolve(sdkOk(this.reports.size));
  }

  getStatistics(): OrderParityStatistics {
    return this.statistics;
  }
}

export function createOrderParityReportRepository(): OrderParityReportRepository {
  return new OrderParityReportRepository();
}

export function buildParityReportRecord(
  reportId: string,
  result: import('../../../../domain/events/parity/order/OrderParityResult').OrderParityResult,
  tenantId?: string,
  durationMs?: number
): OrderParityReportRecord {
  return {
    reportId,
    ...result,
    tenantId,
    durationMs,
  };
}
