/**
 * Menu parity ports (M7 PR-8).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { LegacyMenuCatalogDocument } from '../../../domain/menu/parity/MenuCanonicalModel';
import type { MenuCatalogProjectionReadModel } from '../../../domain/menu/projections/menu/MenuProjectionState';
import type { MenuParityReportRecord } from '../../../domain/menu/parity/MenuParityResult';
import type {
  MenuParityStatistics,
  MenuParityStatisticsSummary,
} from '../../../domain/menu/parity/MenuParityStatistics';
import type { MenuParityResult } from '../../../domain/menu/parity/MenuParityResult';

export interface LegacyMenuReadPort {
  get(catalogId: string): SdkAsyncResult<LegacyMenuCatalogDocument | null>;
}

export interface ProjectionMenuReadPort {
  get(catalogId: string): SdkAsyncResult<MenuCatalogProjectionReadModel | null>;
}

export interface MenuParityReportRepositoryPort {
  save(report: MenuParityReportRecord): SdkAsyncResult<void>;
  get(reportId: string): SdkAsyncResult<MenuParityReportRecord | null>;
  getLatestByCatalog(catalogId: string): SdkAsyncResult<MenuParityReportRecord | null>;
  listByCatalog(catalogId: string, limit: number): SdkAsyncResult<MenuParityReportRecord[]>;
  count(): SdkAsyncResult<number>;
  getStatistics(): MenuParityStatistics;
  getStatisticsSummary(): MenuParityStatisticsSummary;
}

export interface MenuParityValidateResult {
  readonly catalogId: string;
  readonly valid: boolean;
  readonly reason?: string;
}

export interface MenuParityValidatorPort {
  validateCatalogId(catalogId: string): import('../../core/result').SdkResult<MenuParityValidateResult>;
}

export interface MenuParityComparatorPort {
  compare(catalogId: string): SdkAsyncResult<MenuParityResult>;
}

export interface MenuParityInfrastructurePort {
  validate(catalogId: string): SdkAsyncResult<MenuParityValidateResult>;
  compare(catalogId: string): SdkAsyncResult<MenuParityResult>;
  compareAndReport(catalogId: string): SdkAsyncResult<MenuParityReportRecord>;
  statistics(): SdkAsyncResult<MenuParityStatisticsSummary>;
}
