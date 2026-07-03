/**
 * M1B PR-1 — Owner Order Management read paths (Firestore vs OrderSDK behind FF_SDK_OWNER_ORDERS_ENABLED).
 *
 * Performance: flag ON preserves the same single Firestore onSnapshot listener as legacy.
 * SDK path maps snapshots through OrderReadModel contracts; one-shot list uses OrderSDK.listOrdersForTenant.
 */

import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { createOrderSDK } from '../sdk/orders/createOrderSDK';
import type { OrderId, TenantId } from '../sdk/core/types';
import type { ApiOrderRecord } from '../sdk/orders/mappers/mapOrderToReadModel';
import { mapOrdersToReadModels } from '../sdk/orders/mappers/mapOrderToReadModel';
import { getDb } from './firebase-db';
import { ownerOrderApiPort } from './ownerOrderApiPort';
import {
  apiRecordToOwnerOrder,
  readModelToOwnerOrder,
  sortOwnerOrdersNewestFirst,
  type OwnerOrderSnapshot,
} from './ownerOrderReadModelMapper';
import { isSdkOwnerOrdersEnabled } from './sdkFeatureFlags';

export type OwnerOrder = OwnerOrderSnapshot;

const createTenantOrdersQuery = (tenantId: string) =>
  query(collection(getDb(), 'orders'), where('tenantId', '==', tenantId));

const mapSnapshotDocsToOwnerOrders = (
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
  tenantId: string,
  useSdkMapping: boolean
): OwnerOrder[] => {
  const records = docs.map(
    (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as ApiOrderRecord
  );

  if (!useSdkMapping) {
    return sortOwnerOrdersNewestFirst(records as unknown as OwnerOrder[]);
  }

  const models = mapOrdersToReadModels(records);
  return sortOwnerOrdersNewestFirst(
    models
      .filter((model) => model.tenantId === tenantId)
      .map((model, index) => readModelToOwnerOrder(model, records[index]))
  );
};

const subscribeLegacyTenantOrders = (
  tenantId: string,
  orderLimit: number,
  callback: (orders: OwnerOrder[], hasMore: boolean) => void,
  onError?: (error: unknown) => void,
  useSdkMapping = false
): (() => void) =>
  onSnapshot(
    createTenantOrdersQuery(tenantId),
    (snapshot) => {
      const fetchedOrders = mapSnapshotDocsToOwnerOrders(
        snapshot.docs,
        tenantId,
        useSdkMapping
      ).slice(0, orderLimit);

      callback(fetchedOrders, snapshot.docs.length === orderLimit);
    },
    (error) => {
      onError?.(error);
    }
  );

/**
 * One-shot owner order list via OrderSDK (same tenant query as onSnapshot via ownerOrderApiPort).
 */
export const fetchOwnerOrdersList = async (
  tenantId: string,
  limit?: number
): Promise<OwnerOrder[]> => {
  const sdk = createOrderSDK(ownerOrderApiPort);
  const result = await sdk.listOrdersForTenant({ tenantId: tenantId as TenantId, limit }, {});

  if (result.ok === false) {
    return [];
  }

  return sortOwnerOrdersNewestFirst(
    result.value.map((model) => readModelToOwnerOrder(model))
  ).slice(0, limit ?? result.value.length);
};

/**
 * Fetch a single order for owner detail views via OrderSDK.
 */
export const fetchOwnerOrderById = async (orderId: string): Promise<OwnerOrder | null> => {
  if (!isSdkOwnerOrdersEnabled()) {
    return null;
  }

  const sdk = createOrderSDK(ownerOrderApiPort);
  const result = await sdk.getOrderById(orderId as OrderId);

  if (result.ok === false) {
    return null;
  }

  return readModelToOwnerOrder(result.value);
};

/**
 * Subscribe to tenant order list. Flag OFF: legacy mapping. Flag ON: SDK read-model mapping, same listener.
 */
export const subscribeOwnerOrders = (
  tenantId: string,
  orderLimit: number,
  callback: (orders: OwnerOrder[], hasMore: boolean) => void,
  onError?: (error: unknown) => void
): (() => void) => {
  const useSdkMapping = isSdkOwnerOrdersEnabled();
  return subscribeLegacyTenantOrders(
    tenantId,
    orderLimit,
    callback,
    onError,
    useSdkMapping
  );
};

/**
 * Maps raw API/Firestore records to owner orders using SDK mapper (parity helper for tests).
 */
export const mapOwnerOrderRecords = (records: ApiOrderRecord[]): OwnerOrder[] =>
  sortOwnerOrdersNewestFirst(records.map(apiRecordToOwnerOrder));
