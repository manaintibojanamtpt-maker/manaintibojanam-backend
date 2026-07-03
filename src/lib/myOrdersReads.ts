/**
 * M1 PR-5 — MyOrders read paths (api.ts subscriptions vs OrderSDK behind FF_SDK_MYORDERS_ENABLED).
 */

import { createOrderSDK } from '../sdk/orders/createOrderSDK';
import type { OrderId, UserId } from '../sdk/core/types';
import type { OrderReadModel } from '../sdk/orders/types';
import {
  subscribeToGuestOrders,
  subscribeToOrders,
} from '../services/api';
import { sortOrdersNewestFirst } from './activeOrder';
import { readModelToOrder } from './orderReadModelMapper';
import { isSdkMyOrdersEnabled } from './sdkFeatureFlags';
import { Order } from '../types';

const MY_ORDERS_SDK_POLL_MS = 30_000;
const MAX_GUEST_ORDER_IDS = 10;

export interface MyOrdersSubscribeOptions {
  readonly userId?: string;
  readonly guestOrderIds?: readonly string[];
}

const readModelsToOrders = (models: readonly OrderReadModel[]): Order[] =>
  sortOrdersNewestFirst(models.map(readModelToOrder));

const fetchLoggedInOrdersViaSdk = async (userId: string): Promise<Order[]> => {
  const sdk = createOrderSDK();
  const result = await sdk.listOrdersForUser({ userId: userId as UserId }, {});

  if (result.ok === false) {
    return [];
  }

  return readModelsToOrders(result.value);
};

const fetchGuestOrdersViaSdk = async (orderIds: readonly string[]): Promise<Order[]> => {
  const sdk = createOrderSDK();
  const slicedIds = orderIds.slice(0, MAX_GUEST_ORDER_IDS);

  const results = await Promise.all(
    slicedIds.map(async (orderId) => {
      const result = await sdk.getOrderById(orderId as OrderId);
      if (result.ok === false) {
        return null;
      }
      return readModelToOrder(result.value);
    })
  );

  return sortOrdersNewestFirst(results.filter((order): order is Order => order !== null));
};

const subscribeViaSdk = (
  options: MyOrdersSubscribeOptions,
  callback: (orders: Order[]) => void,
  onError?: (error: unknown) => void
): (() => void) => {
  let cancelled = false;

  const load = async () => {
    try {
      if (options.userId) {
        const orders = await fetchLoggedInOrdersViaSdk(options.userId);
        if (!cancelled) {
          callback(orders);
        }
        return;
      }

      const guestIds = options.guestOrderIds ?? [];
      if (guestIds.length === 0) {
        if (!cancelled) {
          callback([]);
        }
        return;
      }

      const orders = await fetchGuestOrdersViaSdk(guestIds);
      if (!cancelled) {
        callback(orders);
      }
    } catch (error) {
      if (!cancelled) {
        onError?.(error);
        callback([]);
      }
    }
  };

  void load();
  const pollTimer = setInterval(() => {
    void load();
  }, MY_ORDERS_SDK_POLL_MS);

  return () => {
    cancelled = true;
    clearInterval(pollTimer);
  };
};

/**
 * Subscribe to the current user's order list (logged-in Firestore listener or guest batch listener).
 * When FF_SDK_MYORDERS_ENABLED is ON, uses OrderSDK polling instead of Firestore onSnapshot.
 */
export const subscribeMyOrders = (
  options: MyOrdersSubscribeOptions,
  callback: (orders: Order[]) => void,
  onError?: (error: unknown) => void
): (() => void) => {
  if (!isSdkMyOrdersEnabled()) {
    if (options.userId) {
      return subscribeToOrders(callback, options.userId, onError);
    }

    const guestIds = [...(options.guestOrderIds ?? [])];
    return subscribeToGuestOrders(guestIds, callback);
  }

  return subscribeViaSdk(options, callback, onError);
};
