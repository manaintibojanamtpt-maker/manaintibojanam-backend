import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import type { TenantDomainEvent } from '../../../src/domain/tenant/TenantDomainEventTypes.js';
import { runTenantMarketplaceSync } from '../tenantSyncService.js';
import { subscribeTenantDomainEvent } from '../tenantDomainEventBus.js';

export function registerMarketplaceSyncSubscriber(): () => void {
  return subscribeTenantDomainEvent('*', async (db, fieldValue, event: TenantDomainEvent) => {
    return runTenantMarketplaceSync(db, event.payload.tenantId, fieldValue, event.type, event.payload.source);
  });
}
