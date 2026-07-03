/**
 * Convenience entry: OrderSDK + default polling realtime provider (M1 PR-6).
 * Separate module to keep ProviderFactory free of infrastructure imports.
 */

import { createOrderSDK } from '../createOrderSDK';
import { createOrderRealtimeProvider } from './ProviderFactory';
import type { CreateRealtimeProviderOptions } from './types';
import type { RealtimeProvider } from './RealtimeProvider';

/**
 * Creates OrderSDK and wraps it with the default polling realtime provider.
 * Not wired to presentation until a future PR enables it behind a feature flag.
 */
export const createDefaultOrderRealtimeProvider = (
  options: CreateRealtimeProviderOptions = {}
): RealtimeProvider => createOrderRealtimeProvider(createOrderSDK(), options);
