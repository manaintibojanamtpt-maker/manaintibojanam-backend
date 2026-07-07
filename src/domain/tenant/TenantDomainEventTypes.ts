/** Pure tenant domain event types — no SDK or Firestore imports. */

export const TENANT_DOMAIN_EVENT_VERSION = '1.0.0' as const;

export type TenantDomainEventType =
  | 'StorefrontUpdated'
  | 'MenuUpdated'
  | 'CategoryUpdated'
  | 'VariantUpdated'
  | 'OfferUpdated'
  | 'GalleryUpdated'
  | 'ThemeUpdated'
  | 'DeliveryUpdated'
  | 'StoreOperationsUpdated'
  | 'InventoryUpdated';

export interface TenantDomainEventPayload {
  readonly tenantId: string;
  readonly source: string;
  readonly aggregateType: 'tenant';
  readonly aggregateId: string;
}

export interface TenantDomainEvent {
  readonly eventId: string;
  readonly type: TenantDomainEventType;
  readonly version: typeof TENANT_DOMAIN_EVENT_VERSION;
  readonly occurredAt: string;
  readonly payload: TenantDomainEventPayload;
}

export function createTenantDomainEvent(input: {
  type: TenantDomainEventType;
  tenantId: string;
  source: string;
  eventId?: string;
  occurredAt?: string;
}): TenantDomainEvent {
  return {
    eventId: input.eventId ?? `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    type: input.type,
    version: TENANT_DOMAIN_EVENT_VERSION,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    payload: {
      tenantId: input.tenantId,
      source: input.source,
      aggregateType: 'tenant',
      aggregateId: input.tenantId,
    },
  };
}

export function inferTenantEventTypeFromLegacySource(source: string): TenantDomainEventType {
  if (source.includes('menu')) return 'MenuUpdated';
  if (source.includes('gallery')) return 'GalleryUpdated';
  if (source.includes('theme')) return 'ThemeUpdated';
  if (source.includes('delivery')) return 'DeliveryUpdated';
  if (source.includes('offer')) return 'OfferUpdated';
  if (source.includes('store_operations') || source.includes('storefront_publish')) {
    return 'StoreOperationsUpdated';
  }
  return 'StorefrontUpdated';
}

export function inferStorefrontEventType(body: Record<string, unknown>): TenantDomainEventType {
  const marketplace = body.marketplace;
  if (marketplace && typeof marketplace === 'object' && !Array.isArray(marketplace)) {
    const mp = marketplace as Record<string, unknown>;
    if (Array.isArray(mp.gallery)) return 'GalleryUpdated';
    if (mp.theme && typeof mp.theme === 'object') return 'ThemeUpdated';
    if (Array.isArray(mp.offers)) return 'OfferUpdated';
  }
  if (body.deliveryConfig && typeof body.deliveryConfig === 'object') return 'DeliveryUpdated';
  if (body.storeOperations && typeof body.storeOperations === 'object') return 'StoreOperationsUpdated';
  return 'StorefrontUpdated';
}
