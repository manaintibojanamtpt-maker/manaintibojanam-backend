/**
 * Owner order reads — API polling (no client Firestore listeners).
 */

import { createOrderSDK } from '../sdk/orders/createOrderSDK';
import type { OrderId, TenantId } from '../sdk/core/types';
import type { ApiOrderRecord } from '../sdk/orders/mappers/mapOrderToReadModel';
import { mapOrdersToReadModels } from '../sdk/orders/mappers/mapOrderToReadModel';
import { fetchOwnerOrdersFromApi, OWNER_ORDERS_POLL_MS } from './ownerOrdersApi';
import { ownerOrderApiPort } from './ownerOrderApiPort';
import {
  apiRecordToOwnerOrder,
  readModelToOwnerOrder,
  sortOwnerOrdersNewestFirst,
  type OwnerOrderSnapshot,
} from './ownerOrderReadModelMapper';
import { isSdkOwnerOrdersEnabled } from './sdkFeatureFlags';
import { peekOwnerOrdersCache, seedOwnerOrdersCache } from './ownerOrdersCache';

export type OwnerOrder = OwnerOrderSnapshot;

const mapApiRecordsToOwnerOrders = (
  records: ApiOrderRecord[],
  tenantId: string,
  useSdkMapping: boolean,
): OwnerOrder[] => {
  if (useSdkMapping) {
    const models = mapOrdersToReadModels(records);
    return sortOwnerOrdersNewestFirst(
      models
        .filter((model) => model.tenantId === tenantId)
        .map((model, index) => readModelToOwnerOrder(model, records[index])),
    );
  }

  return sortOwnerOrdersNewestFirst(
    records
      .filter((record) => String(record.tenantId ?? '') === tenantId)
      .map(apiRecordToOwnerOrder),
  );
};

/**
 * Poll tenant orders via authenticated owner API.
 */
export const subscribeOwnerOrders = (
  tenantId: string,
  orderLimit: number,
  callback: (orders: OwnerOrder[], hasMore: boolean) => void,
  onError?: (error: unknown) => void,
): (() => void) => {
  let cancelled = false;
  const useSdkMapping = isSdkOwnerOrdersEnabled();

  // Instant paint from session/memory cache (native-app feel).
  const cached = peekOwnerOrdersCache(tenantId, orderLimit);
  if (cached?.orders?.length) {
    callback(cached.orders.slice(0, orderLimit), cached.hasMore || cached.orders.length >= orderLimit);
  }

  const poll = async () => {
    try {
      const response = await fetchOwnerOrdersFromApi(tenantId, orderLimit);
      if (cancelled) return;
      const records = (response.orders ?? []) as ApiOrderRecord[];
      const orders = mapApiRecordsToOwnerOrders(records, tenantId, useSdkMapping);
      const hasMore = response.hasMore === true;
      seedOwnerOrdersCache(tenantId, orders, { limit: orderLimit, hasMore });
      callback(orders, hasMore);
    } catch (error) {
      onError?.(error);
    }
  };

  void poll();
  const timer = window.setInterval(() => {
    void poll();
  }, OWNER_ORDERS_POLL_MS);

  return () => {
    cancelled = true;
    window.clearInterval(timer);
  };
};

export const fetchOwnerOrdersList = async (
  tenantId: string,
  limit?: number,
): Promise<OwnerOrder[]> => {
  if (isSdkOwnerOrdersEnabled()) {
    const sdk = createOrderSDK(ownerOrderApiPort);
    const result = await sdk.listOrdersForTenant({ tenantId: tenantId as TenantId, limit }, {});

    if (result.ok === false) {
      return [];
    }

    return sortOwnerOrdersNewestFirst(
      result.value.map((model) => readModelToOwnerOrder(model)),
    ).slice(0, limit ?? result.value.length);
  }

  const response = await fetchOwnerOrdersFromApi(tenantId, limit ?? 50);
  return mapApiRecordsToOwnerOrders(
    (response.orders ?? []) as ApiOrderRecord[],
    tenantId,
    false,
  ).slice(0, limit ?? response.orders.length);
};

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

export const mapOwnerOrderRecords = (records: ApiOrderRecord[]): OwnerOrder[] =>
  sortOwnerOrdersNewestFirst(records.map(apiRecordToOwnerOrder));

export { OWNER_ORDERS_POLL_MS };
