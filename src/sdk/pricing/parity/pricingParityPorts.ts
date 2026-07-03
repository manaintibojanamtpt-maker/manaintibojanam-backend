/**
 * Pricing parity ports (M8 PR-8).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { LegacyPricingCatalogDocument } from '../../../domain/pricing/parity/PricingCanonicalModel';
import type { PricingCatalogProjectionReadModel } from '../../../domain/pricing/projections/pricing/PricingProjectionState';
import type { PricingParityReportRecord } from '../../../domain/pricing/parity/PricingParityResult';
import type {
  PricingParityStatistics,
  PricingParityStatisticsSummary,
} from '../../../domain/pricing/parity/PricingParityStatistics';
import type { PricingParityResult } from '../../../domain/pricing/parity/PricingParityResult';

export interface LegacyPricingReadPort {
  get(priceListId: string): SdkAsyncResult<LegacyPricingCatalogDocument | null>;
}

export interface ProjectionPricingReadPort {
  get(priceListId: string): SdkAsyncResult<PricingCatalogProjectionReadModel | null>;
}

export interface PricingParityReportRepositoryPort {
  save(report: PricingParityReportRecord): SdkAsyncResult<void>;
  get(reportId: string): SdkAsyncResult<PricingParityReportRecord | null>;
  getLatestByPriceList(priceListId: string): SdkAsyncResult<PricingParityReportRecord | null>;
  listByPriceList(priceListId: string, limit: number): SdkAsyncResult<PricingParityReportRecord[]>;
  count(): SdkAsyncResult<number>;
  getStatistics(): PricingParityStatistics;
  getStatisticsSummary(): PricingParityStatisticsSummary;
}

export interface PricingParityValidateResult {
  readonly priceListId: string;
  readonly valid: boolean;
  readonly reason?: string;
}

export interface PricingParityValidatorPort {
  validatePriceListId(
    priceListId: string
  ): import('../../core/result').SdkResult<PricingParityValidateResult>;
}

export interface PricingParityComparatorPort {
  compare(priceListId: string): SdkAsyncResult<PricingParityResult>;
}

export interface PricingParityInfrastructurePort {
  validate(priceListId: string): SdkAsyncResult<PricingParityValidateResult>;
  compare(priceListId: string): SdkAsyncResult<PricingParityResult>;
  compareAndReport(priceListId: string): SdkAsyncResult<PricingParityReportRecord>;
  statistics(): SdkAsyncResult<PricingParityStatisticsSummary>;
}
