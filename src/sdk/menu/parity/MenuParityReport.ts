/**
 * Menu parity report repository (M7 PR-8).
 * In-memory store for validation reports — no Firestore.
 */

import type { MenuParityReportRepositoryPort } from './menuParityPorts';
import type { MenuParityReportRecord } from '../../../domain/menu/parity/MenuParityResult';
import type { MenuParityStatistics } from '../../../domain/menu/parity/MenuParityStatistics';
import {
  EMPTY_MENU_PARITY_STATISTICS,
  accumulateMenuParityStatistics,
  summarizeMenuParityStatistics,
} from '../../../domain/menu/parity/MenuParityStatistics';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class MenuParityReportRepository implements MenuParityReportRepositoryPort {
  private readonly reports = new Map<string, MenuParityReportRecord>();
  private statistics: MenuParityStatistics = { ...EMPTY_MENU_PARITY_STATISTICS };

  save(report: MenuParityReportRecord): SdkAsyncResult<void> {
    this.reports.set(report.reportId, report);
    this.statistics = accumulateMenuParityStatistics(
      this.statistics,
      report.outcome,
      report.durationMs ?? 0
    );
    return Promise.resolve(sdkOk(undefined));
  }

  get(reportId: string): SdkAsyncResult<MenuParityReportRecord | null> {
    return Promise.resolve(sdkOk(this.reports.get(reportId) ?? null));
  }

  getLatestByCatalog(catalogId: string): SdkAsyncResult<MenuParityReportRecord | null> {
    const latest = [...this.reports.values()]
      .filter((report) => report.catalogId === catalogId)
      .sort((left, right) => right.comparedAt.localeCompare(left.comparedAt))[0];
    return Promise.resolve(sdkOk(latest ?? null));
  }

  listByCatalog(catalogId: string, limit: number): SdkAsyncResult<MenuParityReportRecord[]> {
    const items = [...this.reports.values()]
      .filter((report) => report.catalogId === catalogId)
      .slice(-limit);
    return Promise.resolve(sdkOk(items));
  }

  count(): SdkAsyncResult<number> {
    return Promise.resolve(sdkOk(this.reports.size));
  }

  getStatistics(): MenuParityStatistics {
    return this.statistics;
  }

  getStatisticsSummary() {
    return summarizeMenuParityStatistics(this.statistics);
  }
}

export function createMenuParityReportRepository(): MenuParityReportRepository {
  return new MenuParityReportRepository();
}

export function buildMenuParityReportRecord(
  reportId: string,
  result: import('../../../domain/menu/parity/MenuParityResult').MenuParityResult,
  tenantId?: string,
  durationMs?: number
): MenuParityReportRecord {
  return {
    reportId,
    ...result,
    tenantId,
    durationMs,
  };
}
