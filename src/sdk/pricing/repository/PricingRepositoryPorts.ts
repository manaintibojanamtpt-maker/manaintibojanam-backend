/**
 * PricingSDK — persistence port and repository options (M8 PR-3).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { PricingRepository } from '../contracts/ports';
import type { PricingFeatureFlagReader } from '../featureFlags/featureFlags';
import type {
  CampaignRecord,
  CouponRecord,
  OfferRecord,
  PriceListRecord,
  PriceRecord,
  PricingSearchRecordResult,
} from './PricingPersistenceModels';

export interface PricingPersistenceQuery {
  readonly tenantId: string;
  readonly branchId?: string;
  readonly includeInactive?: boolean;
}

export interface PricePersistenceQuery extends PricingPersistenceQuery {
  readonly itemId: string;
  readonly priceListId?: string;
}

export interface PriceListPersistenceQuery extends PricingPersistenceQuery {
  readonly priceListId: string;
}

export interface CouponPersistenceQuery extends PricingPersistenceQuery {
  readonly couponCode: string;
}

export interface CampaignPersistenceQuery extends PricingPersistenceQuery {
  readonly campaignId?: string;
}

export interface OfferPersistenceQuery extends PricingPersistenceQuery {
  readonly offerId?: string;
}

export interface PricingSearchPersistenceQuery extends PricingPersistenceQuery {
  readonly text: string;
  readonly limit?: number;
}

export interface PricingPersistencePort {
  loadPrice(query: PricePersistenceQuery): SdkAsyncResult<PriceRecord>;
  loadPriceList(query: PriceListPersistenceQuery): SdkAsyncResult<PriceListRecord>;
  loadCoupon(query: CouponPersistenceQuery): SdkAsyncResult<CouponRecord>;
  loadCampaign(query: CampaignPersistenceQuery): SdkAsyncResult<CampaignRecord>;
  loadOffer(query: OfferPersistenceQuery): SdkAsyncResult<OfferRecord>;
  searchPricing(query: PricingSearchPersistenceQuery): SdkAsyncResult<PricingSearchRecordResult>;
  validateConnection(): SdkAsyncResult<{ readonly ok: true }>;
}

export interface CreatePricingRepositoryOptions {
  readonly repository?: PricingRepository;
  readonly persistencePort?: PricingPersistencePort;
  readonly featureFlags?: PricingFeatureFlagReader;
}
