/**
 * OrderSDK realtime provider contracts (M1 PR-6).
 * Presentation-safe — no Firestore, SSE, or WebSocket types.
 */

import type { OrderId } from '../../core/types';
import type { OrderAccessContext, OrderReadModel } from '../types';

/** Registered provider kinds. Only `polling` is implemented in PR-6. */
export type RealtimeProviderKind = 'polling' | 'firestore' | 'sse' | 'websocket';

export type RealtimeUnsubscribe = () => void;

export interface RealtimeOrderListOptions {
  readonly userId?: string;
  readonly guestOrderIds?: readonly string[];
  readonly tenantId?: string;
  readonly limit?: number;
  readonly context?: OrderAccessContext;
}

export interface RealtimeWatchOrderOptions {
  readonly context?: OrderAccessContext;
}

export interface RealtimeProviderConfig {
  /** Poll interval when using PollingProvider. Default: 30_000 ms. */
  readonly pollIntervalMs?: number;
  /** Max guest order ids per batch (matches legacy subscribeToGuestOrders). */
  readonly maxGuestOrderIds?: number;
}

export interface CreateRealtimeProviderOptions {
  readonly kind?: RealtimeProviderKind;
  readonly config?: RealtimeProviderConfig;
}

export type RealtimeOrderListSnapshotHandler = (orders: readonly OrderReadModel[]) => void;

export type RealtimeOrderSnapshotHandler = (order: OrderReadModel | null) => void;

export type RealtimeErrorHandler = (error: unknown) => void;

export interface RealtimeWatchOrderParams {
  readonly orderId: OrderId;
  readonly onSnapshot: RealtimeOrderSnapshotHandler;
  readonly onError?: RealtimeErrorHandler;
  readonly options?: RealtimeWatchOrderOptions;
}

export interface RealtimeSubscribeOrderListParams {
  readonly options: RealtimeOrderListOptions;
  readonly onSnapshot: RealtimeOrderListSnapshotHandler;
  readonly onError?: RealtimeErrorHandler;
}
