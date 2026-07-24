import type { MarketingAssistChannel } from '../types';

/** Marketing site always uses the locked merchant_marketing channel. */
export function resolveMarketingAssistChannel(): MarketingAssistChannel {
  return 'bhojanos_marketing';
}
