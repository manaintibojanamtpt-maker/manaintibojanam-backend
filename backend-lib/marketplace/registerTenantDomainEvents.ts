import { registerMarketplaceSyncSubscriber } from './subscribers/marketplaceSyncSubscriber.js';

let registered = false;

/** Register default tenant domain event subscribers (idempotent). */
export function registerTenantDomainEventSubscribers(): void {
  if (registered) return;
  registerMarketplaceSyncSubscriber();
  registered = true;
}
