/**
 * Pricing parity report repository (M8 PR-8).
 * In-memory store for validation reports — no Firestore.
 */

import type { PricingParityReportRepositoryPort } from './pricingParityPorts';
import type { PricingParityReportRecord } from '../../../domain/pricing/parity/PricingParityResult';
import type { PricingParityStatistics } from '../../../domain/pricing/parity/PricingParityStatistics';
import {
  EMPTY_PRICING_PARITY_STATISTICS,
  accumulatePricingParityStatistics,
  summarizePricingParityStatistics,
} from '../../../domain/pricing/parity/PricingParityStatistics';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class PricingParityReportRepository implements PricingParityReportRepositoryPort {
  private readonly reports = new Map<string, PricingParityReportRecord>();
  private statistics: PricingParityStatistics = { ...EMPTY_PRICING_PARITY_STATISTICS };

  save(report: PricingParityReportRecord): SdkAsyncResult<void> {
    this.reports.set(report.reportId, report);
    this.statistics = accumulatePricingParityStatistics(
      this.statistics,
      report.outcome,
      report.durationMs ?? 0
    );
    return Promise.resolve(sdkOk(undefined));
  }

  get(reportId: string): SdkAsyncResult<PricingParityReportRecord | null> {
    return Promise.resolve(sdkOk(this.reports.get(reportId) ?? null));
  }

  getLatestByPriceList(priceListId: string): SdkAsyncResult<PricingParityReportRecord | null> {
    const latest = [...this.reports.values()]
      .filter((report) => report.priceListId === priceListId)
      .sort((left, right) => right.comparedAt.localeCompare(left.comparedAt))[0];
    return Promise.resolve(sdkOk(latest ?? null));
  }

  listByPriceList(priceListId: string, limit: number): SdkAsyncResult<PricingParityReportRecord[]> {
    const items = [...this.reports.values()]
      .filter((report) => report.priceListId === priceListId)
      .slice(-limit);
    return Promise.resolve(sdkOk(items));
  }

  count(): SdkAsyncResult<number> {
    return Promise.resolve(sdkOk(this.reports.size));
  }

  getStatistics(): PricingParityStatistics {
    return this.statistics;
  }

  getStatisticsSummary() {
    return summarizePricingParityStatistics(this.statistics);
  }
}

export function createPricingParityReportRepository(): PricingParityReportRepository {
  return new PricingParityReportRepository();
}

export function buildPricingParityReportRecord(
  reportId: string,
  result: import('../../../domain/pricing/parity/PricingParityResult').PricingParityResult,
  tenantId?: string,
  durationMs?: number
): PricingParityReportRecord {
  return {
    reportId,
    ...result,
    tenantId,
    durationMs,
  };
}
