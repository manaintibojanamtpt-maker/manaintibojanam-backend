/**
 * SearchSDK — Firestore document → search tenant record (M4 PR-3).
 */

import type { FirestoreSearchDocument } from './FirestoreSearchPort';
import type { SearchTenantReadRecord } from './SearchTenantReadRecord';

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : undefined;

export function mapFirestoreSearchDocument(doc: FirestoreSearchDocument): SearchTenantReadRecord {
  const data = doc.data;
  const location = asRecord(data.location);

  return {
    id: doc.id,
    slug: asString(data.slug),
    name: asString(data.name),
    status: asString(data.status),
    description: asString(data.description),
    cuisineTags: asStringArray(data.cuisineTags),
    ratingAggregate: asNumber(data.ratingAggregate),
    location: location
      ? {
          lat: asNumber(location.lat),
          lng: asNumber(location.lng),
          geohash: asString(location.geohash),
          areaCode: asString(location.areaCode) ?? asString(location.localityCode),
          localityName:
            asString(location.localityName) ??
            asString(location.areaName) ??
            asString(location.locality),
          cityName: asString(location.cityName) ?? asString(location.city),
          pincode: asString(location.pincode),
          districtName: asString(location.districtName),
          stateName: asString(location.stateName) ?? asString(location.state),
          formattedAddress: asString(location.formattedAddress) ?? asString(location.address),
        }
      : undefined,
  };
}

export function isActiveSearchTenant(tenant: SearchTenantReadRecord): boolean {
  return String(tenant.status ?? '').toLowerCase() === 'active';
}

export function mapActiveSearchTenants(documents: readonly FirestoreSearchDocument[]): SearchTenantReadRecord[] {
  return documents.map(mapFirestoreSearchDocument).filter(isActiveSearchTenant);
}
