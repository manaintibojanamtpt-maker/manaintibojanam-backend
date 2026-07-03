/**
 * SearchSDK — Firestore tenant scan for search indexing (M4 PR-3).
 * Read-only — no ranking, eligibility, or discovery orchestration.
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkFromError, sdkOk } from '../../core/resultHelpers';
import type { TenantId } from '../../core/types';
import type { FirestoreSearchPort } from './FirestoreSearchPort';
import { mapActiveSearchTenants } from './SearchFirestoreMapper';
import type { SearchTenantReadRecord } from './SearchTenantReadRecord';

export class FirestoreSearchRepository {
  constructor(private readonly readPort: FirestoreSearchPort) {}

  async loadActiveTenants(tenantIds?: readonly TenantId[]): SdkAsyncResult<SearchTenantReadRecord[]> {
    try {
      const documents = await this.readPort.fetchTenantDocuments();
      let tenants = mapActiveSearchTenants(documents);

      if (tenantIds?.length) {
        const allowed = new Set(tenantIds.map(String));
        tenants = tenants.filter((tenant) => allowed.has(tenant.id));
      }

      return sdkOk(tenants);
    } catch (error) {
      return sdkFromError(error, 'UNAVAILABLE');
    }
  }
}

export function createFirestoreSearchRepository(readPort: FirestoreSearchPort): FirestoreSearchRepository {
  return new FirestoreSearchRepository(readPort);
}
