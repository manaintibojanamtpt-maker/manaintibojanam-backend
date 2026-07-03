/**
 * M1B PR-1 — tenant-scoped order fetch for owner SDK port (not api.ts).
 * Same Firestore query shape as OwnerOrders legacy listener; used by OrderApiPort only.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { getDb } from './firebase-db';
import type { ApiOrderRecord } from '../sdk/orders/mappers/mapOrderToReadModel';

export const fetchOrdersByTenant = async (tenantId: string): Promise<ApiOrderRecord[]> => {
  const snapshot = await getDocs(
    query(collection(getDb(), 'orders'), where('tenantId', '==', tenantId))
  );

  return snapshot.docs.map(
    (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as ApiOrderRecord
  );
};
