/**
 * PollingProvider — default realtime strategy (M1 PR-6).
 * Delegates reads to OrderSDK; no Firestore listeners, SSE, or WebSockets.
 */

import type { OrderId, TenantId, UserId } from '../../core/types';
import type { OrderSDK } from '../OrderSDK';
import type { OrderAccessContext, OrderReadModel } from '../types';
import type { RealtimeProvider } from './RealtimeProvider';
import type {
  RealtimeOrderListOptions,
  RealtimeProviderConfig,
  RealtimeWatchOrderOptions,
} from './types';

const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_MAX_GUEST_ORDER_IDS = 10;

const sortOrdersNewestFirst = (orders: readonly OrderReadModel[]): OrderReadModel[] =>
  [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

export class PollingProvider implements RealtimeProvider {
  readonly kind = 'polling' as const;

  private readonly pollIntervalMs: number;
  private readonly maxGuestOrderIds: number;

  constructor(
    private readonly sdk: OrderSDK,
    config: RealtimeProviderConfig = {}
  ) {
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.maxGuestOrderIds = config.maxGuestOrderIds ?? DEFAULT_MAX_GUEST_ORDER_IDS;
  }

  subscribeOrderList(
    options: RealtimeOrderListOptions,
    onSnapshot: (orders: readonly OrderReadModel[]) => void,
    onError?: (error: unknown) => void
  ): () => void {
    let cancelled = false;

    const load = async () => {
      try {
        if (options.userId) {
          const orders = await this.fetchLoggedInOrders(
            options.userId,
            options.tenantId,
            options.limit,
            options.context
          );
          if (!cancelled) {
            onSnapshot(orders);
          }
          return;
        }

        const guestIds = options.guestOrderIds ?? [];
        if (guestIds.length === 0) {
          if (!cancelled) {
            onSnapshot([]);
          }
          return;
        }

        const orders = await this.fetchGuestOrders(guestIds, options.context);
        if (!cancelled) {
          onSnapshot(orders);
        }
      } catch (error) {
        if (!cancelled) {
          onError?.(error);
          onSnapshot([]);
        }
      }
    };

    void load();
    const pollTimer = setInterval(() => {
      void load();
    }, this.pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
    };
  }

  subscribeOrder(
    orderId: OrderId,
    onSnapshot: (order: OrderReadModel | null) => void,
    onError?: (error: unknown) => void,
    options?: RealtimeWatchOrderOptions
  ): () => void {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await this.sdk.getOrderById(orderId, options?.context);
        if (cancelled) {
          return;
        }
        if (result.ok === false) {
          onSnapshot(null);
          return;
        }
        onSnapshot(result.value);
      } catch (error) {
        if (!cancelled) {
          onError?.(error);
          onSnapshot(null);
        }
      }
    };

    void load();
    const pollTimer = setInterval(() => {
      void load();
    }, this.pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
    };
  }

  private async fetchLoggedInOrders(
    userId: string,
    tenantId?: string,
    limit?: number,
    context?: OrderAccessContext
  ): Promise<readonly OrderReadModel[]> {
    const result = await this.sdk.listOrdersForUser(
      {
        userId: userId as UserId,
        tenantId: tenantId as TenantId | undefined,
        limit,
      },
      context ?? {}
    );

    if (result.ok === false) {
      return [];
    }

    return sortOrdersNewestFirst(result.value);
  }

  private async fetchGuestOrders(
    orderIds: readonly string[],
    context?: OrderAccessContext
  ): Promise<readonly OrderReadModel[]> {
    const slicedIds = orderIds.slice(0, this.maxGuestOrderIds);

    const results = await Promise.all(
      slicedIds.map(async (orderId) => {
        const result = await this.sdk.getOrderById(orderId as OrderId, context);
        if (result.ok === false) {
          return null;
        }
        return result.value;
      })
    );

    return sortOrdersNewestFirst(
      results.filter((order): order is OrderReadModel => order !== null)
    );
  }
}

export const createPollingProvider = (
  sdk: OrderSDK,
  config?: RealtimeProviderConfig
): PollingProvider => new PollingProvider(sdk, config);
