/**
 * RealtimeProvider strategy interface (M1 PR-6).
 * Future implementations: Firestore onSnapshot, SSE, WebSocket — without changing this contract.
 */

import type { OrderId } from '../../core/types';
import type { OrderReadModel } from '../types';
import type {
  RealtimeProviderKind,
  RealtimeUnsubscribe,
  RealtimeWatchOrderOptions,
  RealtimeOrderListOptions,
} from './types';

/**
 * Strategy interface for order realtime subscriptions.
 * Consumers depend on this interface — not on PollingProvider or future transports.
 */
export interface RealtimeProvider {
  readonly kind: RealtimeProviderKind;

  /**
   * Subscribe to a user's order list (logged-in) or a guest order batch.
   */
  subscribeOrderList(
    options: RealtimeOrderListOptions,
    onSnapshot: (orders: readonly OrderReadModel[]) => void,
    onError?: (error: unknown) => void
  ): RealtimeUnsubscribe;

  /**
   * Subscribe to a single order snapshot stream.
   */
  subscribeOrder(
    orderId: OrderId,
    onSnapshot: (order: OrderReadModel | null) => void,
    onError?: (error: unknown) => void,
    options?: RealtimeWatchOrderOptions
  ): RealtimeUnsubscribe;
}

export type RealtimeProviderFactory = (
  kind?: RealtimeProviderKind
) => RealtimeProvider;
