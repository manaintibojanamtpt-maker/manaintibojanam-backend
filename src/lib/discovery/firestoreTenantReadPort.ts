/**
 * M3 PR-3 — Firestore tenant read port for discovery (presentation wiring).
 * Lives in lib so DiscoverySDK factory stays free of Firebase init in tests.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { getDb } from '../firebase-db';
import type { FirestoreTenantReadPort } from '../../sdk/discovery/repository/adapters/FirestoreTenantRepositoryAdapter';

export function createLibFirestoreTenantReadPort(): FirestoreTenantReadPort {
  return {
    async fetchTenantDocuments() {
      const db = getDb();
      const tenantsRef = collection(db, 'tenants');

      try {
        const activeQuery = query(tenantsRef, where('status', '==', 'active'));
        const snapshot = await getDocs(activeQuery);
        if (!snapshot.empty) {
          return snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            data: docSnap.data() as Record<string, unknown>,
          }));
        }
      } catch {
        // Fall back to full collection read below.
      }

      const snapshot = await getDocs(tenantsRef);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        data: docSnap.data() as Record<string, unknown>,
      }));
    },
  };
}
