/**
 * DiscoverySDK — tenant read port (M3 PR-3).
 * Vendor-neutral tenant records for tenant-as-branch discovery.
 */

import type { SdkAsyncResult } from '../../../core/result';

export interface TenantLocationReadRecord {
  readonly lat?: number;
  readonly lng?: number;
  readonly geohash?: string;
}

export interface TenantDeliveryConfigReadRecord {
  readonly maxRadius?: number;
  readonly prepTime?: number;
}

export interface TenantStoreOperationsReadRecord {
  readonly isStoreOpen?: boolean;
}

/** Neutral tenant document shape — no Firestore types. */
export interface TenantReadRecord {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly status?: string;
  readonly storeStatus?: string;
  readonly location?: TenantLocationReadRecord;
  readonly deliveryConfig?: TenantDeliveryConfigReadRecord;
  readonly storeOperations?: TenantStoreOperationsReadRecord;
  readonly branding?: {
    readonly logoUrl?: string;
  };
  readonly logo?: string;
  readonly cuisineTags?: readonly string[];
  readonly ratingAggregate?: number;
}

export interface TenantRepositoryPort {
  listActiveTenants(): SdkAsyncResult<TenantReadRecord[]>;
  getTenantsByIds(ids: readonly string[]): SdkAsyncResult<TenantReadRecord[]>;
}

export interface TenantRepositoryPortFactory {
  create(): TenantRepositoryPort;
}
