/**
 * DiscoverySDK — Firestore tenant read adapter (M3 PR-3).
 */

import type { SdkAsyncResult } from '../../../core/result';
import { sdkError, sdkFail, sdkFromError, sdkOk } from '../../../core/resultHelpers';
import type { TenantReadRecord, TenantRepositoryPort } from '../ports/TenantRepositoryPort';

export interface FirestoreTenantDocument {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

export interface FirestoreTenantReadPort {
  fetchTenantDocuments(): Promise<FirestoreTenantDocument[]>;
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : undefined;

export function mapFirestoreTenantDocument(doc: FirestoreTenantDocument): TenantReadRecord {
  const data = doc.data;
  const location = asRecord(data.location);
  const deliveryConfig = asRecord(data.deliveryConfig);
  const storeOperations = asRecord(data.storeOperations);
  const branding = asRecord(data.branding);

  return {
    id: doc.id,
    slug: asString(data.slug),
    name: asString(data.name),
    status: asString(data.status),
    storeStatus: asString(data.storeStatus),
    location: location
      ? {
          lat: asNumber(location.lat),
          lng: asNumber(location.lng),
          geohash: asString(location.geohash),
        }
      : undefined,
    deliveryConfig: deliveryConfig
      ? {
          maxRadius: asNumber(deliveryConfig.maxRadius),
          prepTime: asNumber(deliveryConfig.prepTime),
        }
      : undefined,
    storeOperations: storeOperations
      ? {
          isStoreOpen:
            typeof storeOperations.isStoreOpen === 'boolean'
              ? storeOperations.isStoreOpen
              : undefined,
        }
      : undefined,
    branding: branding
      ? {
          logoUrl: asString(branding.logoUrl),
        }
      : undefined,
    logo: asString(data.logo),
    cuisineTags: asStringArray(data.cuisineTags),
    ratingAggregate: asNumber(data.ratingAggregate),
  };
}

export function createFirestoreTenantRepositoryAdapter(
  readPort: FirestoreTenantReadPort
): TenantRepositoryPort {
  const mapActiveTenants = (documents: FirestoreTenantDocument[]): TenantReadRecord[] =>
    documents
      .map(mapFirestoreTenantDocument)
      .filter((tenant) => String(tenant.status ?? '').toLowerCase() === 'active');

  return {
    async listActiveTenants(): SdkAsyncResult<TenantReadRecord[]> {
      try {
        const documents = await readPort.fetchTenantDocuments();
        return sdkOk(mapActiveTenants(documents));
      } catch (error) {
        return sdkFromError(error, 'UNAVAILABLE');
      }
    },

    async getTenantsByIds(ids: readonly string[]): SdkAsyncResult<TenantReadRecord[]> {
      if (!ids.length) {
        return sdkOk([]);
      }

      try {
        const documents = await readPort.fetchTenantDocuments();
        const idSet = new Set(ids);
        return sdkOk(mapActiveTenants(documents.filter((document) => idSet.has(document.id))));
      } catch (error) {
        return sdkFromError(error, 'UNAVAILABLE');
      }
    },
  };
}

export async function fetchActiveTenantsFromFirestoreDb(
  getDocuments: () => Promise<FirestoreTenantDocument[]>
): SdkAsyncResult<TenantReadRecord[]> {
  try {
    const documents = await getDocuments();
    const active = documents
      .map(mapFirestoreTenantDocument)
      .filter((tenant) => String(tenant.status ?? '').toLowerCase() === 'active');
    return sdkOk(active);
  } catch (error) {
    return sdkFail(sdkError('UNAVAILABLE', 'Could not read active tenants', { cause: String(error) }));
  }
}
