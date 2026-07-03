/**
 * Realtime provider factory (M1 PR-6).
 * Returns PollingProvider by default — the only registered implementation.
 */

import type { OrderSDK } from '../OrderSDK';
import type { RealtimeProvider } from './RealtimeProvider';
import { createPollingProvider } from './PollingProvider';
import type { CreateRealtimeProviderOptions, RealtimeProviderKind } from './types';

export const DEFAULT_REALTIME_PROVIDER_KIND: RealtimeProviderKind = 'polling';

const unsupportedKind = (kind: RealtimeProviderKind): never => {
  throw new Error(
    `Realtime provider "${kind}" is not implemented. Use "${DEFAULT_REALTIME_PROVIDER_KIND}" (PR-6).`
  );
};

/**
 * Creates a RealtimeProvider backed by the given OrderSDK.
 * SDK consumers should depend on RealtimeProvider — not PollingProvider.
 */
export const createOrderRealtimeProvider = (
  sdk: OrderSDK,
  options: CreateRealtimeProviderOptions = {}
): RealtimeProvider => {
  const kind = options.kind ?? DEFAULT_REALTIME_PROVIDER_KIND;

  switch (kind) {
    case 'polling':
      return createPollingProvider(sdk, options.config);
    case 'firestore':
    case 'sse':
    case 'websocket':
      return unsupportedKind(kind);
    default: {
      const exhaustive: never = kind;
      return unsupportedKind(exhaustive);
    }
  }
};

export type { RealtimeProviderKind, CreateRealtimeProviderOptions, RealtimeProviderConfig } from './types';
