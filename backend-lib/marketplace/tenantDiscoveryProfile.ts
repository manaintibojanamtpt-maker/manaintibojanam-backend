import { parseFirestoreTenant, type FirestoreTenantRecord } from './projectFoodMenuV1.js';
import {
  extractTenantSyncRevision,
  isStoreOpenNow,
  resolveStoreTiming,
} from './tenantProjectionHelpers.js';
import { isConsumerListedTenant } from './marketplaceVisibility.js';

export const TENANT_DISCOVERY_PROFILE_VERSION = '1.0' as const;

export interface TenantDiscoveryProfile {
  readonly schemaVersion: typeof TENANT_DISCOVERY_PROFILE_VERSION;
  readonly tenantId: string;
  readonly slug: string;
  readonly displayName: string;
  readonly visible: boolean;
  readonly sandboxMode: boolean;
  readonly status: string;
  readonly storeStatus?: string;
  readonly location?: {
    readonly lat: number;
    readonly lng: number;
    readonly city?: string;
    readonly state?: string;
  };
  readonly cuisines: readonly string[];
  readonly logoUrl?: string;
  readonly coverUrl?: string;
  readonly rating?: number;
  readonly ratingCount?: number;
  readonly priceForTwo?: number;
  readonly prepTime?: number;
  readonly isOpen: boolean;
  readonly openTime?: string;
  readonly closeTime?: string;
  readonly feesConfigured: boolean;
  readonly deliveryEnabled: boolean;
  readonly menuItemCount: number;
  readonly syncRevision?: string;
  readonly projectedAt: string;
}

export interface PublishValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

export function projectTenantDiscoveryProfile(input: {
  tenantId: string;
  raw: Record<string, unknown>;
  menuItemCount?: number;
}): TenantDiscoveryProfile {
  const tenant = parseFirestoreTenant(input.tenantId, input.raw);
  const timing = resolveStoreTiming(tenant, input.raw);
  const mp = tenant.marketplace;
  const visible = isConsumerListedTenant(input.raw);

  let location: TenantDiscoveryProfile['location'];
  if (tenant.location && tenant.location.lat && tenant.location.lng) {
    location = {
      lat: tenant.location.lat,
      lng: tenant.location.lng,
      city: tenant.location.city,
      state: tenant.location.state,
    };
  }

  return {
    schemaVersion: TENANT_DISCOVERY_PROFILE_VERSION,
    tenantId: input.tenantId,
    slug: tenant.slug,
    displayName: tenant.name,
    visible,
    sandboxMode: input.raw.sandboxMode === true,
    status: typeof input.raw.status === 'string' ? input.raw.status : 'active',
    storeStatus: typeof input.raw.storeStatus === 'string' ? input.raw.storeStatus : undefined,
    location,
    cuisines: [...(mp?.cuisineTags ?? tenant.cuisineTags ?? [])],
    logoUrl: mp?.theme?.logoUrl ?? tenant.branding?.logoUrl,
    coverUrl: mp?.theme?.coverUrl ?? tenant.branding?.coverUrl,
    rating: mp?.rating,
    ratingCount: mp?.ratingCount,
    priceForTwo: mp?.priceForTwo,
    prepTime: tenant.deliveryConfig?.prepTime,
    isOpen: isStoreOpenNow(timing),
    openTime: timing.openTime,
    closeTime: timing.closeTime,
    feesConfigured: tenant.deliveryConfig?.feesConfigured === true,
    deliveryEnabled: tenant.deliveryConfig?.enabled !== false,
    menuItemCount: input.menuItemCount ?? 0,
    syncRevision: extractTenantSyncRevision(input.raw),
    projectedAt: new Date().toISOString(),
  };
}

export function validateTenantPublishable(
  raw: Record<string, unknown>,
  menuItemCount: number,
): PublishValidationResult {
  const errors: string[] = [];
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const slug = typeof raw.slug === 'string' ? raw.slug.trim() : '';

  if (!name) errors.push('Restaurant name is required.');
  if (!slug) errors.push('Restaurant slug is required.');

  const location = raw.location;
  if (!location || typeof location !== 'object') {
    errors.push('Kitchen location is required before publishing.');
  } else {
    const lat = (location as { lat?: unknown }).lat;
    const lng = (location as { lng?: unknown }).lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
      errors.push('Valid kitchen coordinates are required before publishing.');
    }
  }

  const ops = raw.storeOperations;
  if (!ops || typeof ops !== 'object') {
    errors.push('Store hours (Store Live Control) must be configured before publishing.');
  }

  if (menuItemCount < 1) {
    errors.push('At least one menu item is required before publishing.');
  }

  const deliveryConfig = raw.deliveryConfig;
  if (deliveryConfig && typeof deliveryConfig === 'object') {
    const enabled = (deliveryConfig as { enabled?: unknown }).enabled !== false;
    const feesConfigured = (deliveryConfig as { feesConfigured?: unknown }).feesConfigured === true;
    if (enabled && !feesConfigured) {
      errors.push('Delivery fees must be configured (feesConfigured) before publishing with delivery enabled.');
    }
  }

  return { ok: errors.length === 0, errors };
}

export function discoveryProfileToTenantRecord(
  profile: TenantDiscoveryProfile,
): Pick<FirestoreTenantRecord, 'id' | 'slug' | 'name' | 'location' | 'deliveryConfig' | 'cuisineTags' | 'branding' | 'marketplace'> {
  return {
    id: profile.tenantId,
    slug: profile.slug,
    name: profile.displayName,
    location: profile.location,
    cuisineTags: profile.cuisines,
    branding: {
      logoUrl: profile.logoUrl,
      coverUrl: profile.coverUrl,
    },
    marketplace: {
      cuisineTags: profile.cuisines,
      rating: profile.rating,
      ratingCount: profile.ratingCount,
      priceForTwo: profile.priceForTwo,
      theme: {
        logoUrl: profile.logoUrl,
        coverUrl: profile.coverUrl,
      },
    },
    deliveryConfig: {
      prepTime: profile.prepTime,
      feesConfigured: profile.feesConfigured,
      enabled: profile.deliveryEnabled,
    },
  };
}
