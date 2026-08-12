import type { DeliveryProviderId } from '../providerCapabilityMatrix.js';
import { porterAdapter } from './porterAdapter.js';
import { rapidoAdapter } from './rapidoAdapter.js';
import { manualFallbackAdapter } from './manualFallbackAdapter.js';
import { uberDirectAdapter } from './uberDirectAdapter.js';
import type { DeliveryProviderAdapter } from './types.js';

const ADAPTERS: Record<DeliveryProviderId, DeliveryProviderAdapter> = {
  uber_direct: uberDirectAdapter,
  porter: porterAdapter,
  rapido: rapidoAdapter,
  self_pickup: manualFallbackAdapter,
};

export function getDeliveryAdapter(
  provider: DeliveryProviderId,
): DeliveryProviderAdapter | null {
  return ADAPTERS[provider] ?? null;
}

export type {
  DeliveryProviderAdapter,
  DeliveryQuoteRequest,
  DeliveryDispatchRequest,
  DeliveryDispatchResult,
} from './types.js';

export { isValidQuoteCoordinate, isQuoteExpired } from './types.js';

export {
  uberDirectAdapter,
  porterAdapter,
  rapidoAdapter,
  manualFallbackAdapter,
};
