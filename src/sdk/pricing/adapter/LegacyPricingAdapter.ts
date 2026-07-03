/**
 * Legacy pricing read adapter (M8 PR-11).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { GetPriceQuery, PricingContext } from '../dto';
import type { PriceResult } from '../dto';
import type { LegacyPricingReadPort } from './pricingAdapterPorts';

export class LegacyPricingAdapter {
  constructor(private readonly repository: LegacyPricingReadPort) {}

  getPriceList(query: PricingContext): SdkAsyncResult<PriceResult> {
    return this.repository.getPriceList(query);
  }

  getPrice(query: GetPriceQuery): SdkAsyncResult<PriceResult> {
    return this.repository.getPrice(query);
  }

  listPriceListEntries(query: PricingContext): SdkAsyncResult<PriceResult[]> {
    return this.repository.listPriceListEntries(query);
  }
}

export function createLegacyPricingAdapter(repository: LegacyPricingReadPort): LegacyPricingAdapter {
  return new LegacyPricingAdapter(repository);
}
