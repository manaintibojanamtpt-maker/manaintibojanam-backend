import type { DeliveryProviderId } from '../providerCapabilityMatrix.js';
import { porterAdapter } from './porterAdapter.js';
import { rapidoManualAdapter } from './rapidoManualAdapter.js';
import type { DeliveryProviderAdapter } from './types.js';
import { uberDirectAdapter } from './uberDirectAdapter.js';

const ADAPTERS: Partial<Record<DeliveryProviderId, DeliveryProviderAdapter>> = {
  uber_direct: uberDirectAdapter,
  porter: porterAdapter,
  rapido: rapidoManualAdapter,
};

export function getDeliveryAdapter(
  provider: DeliveryProviderId,
): DeliveryProviderAdapter | null {
  return ADAPTERS[provider] ?? null;
}

export type { DeliveryProviderAdapter, DeliveryDispatchRequest, DeliveryDispatchResult } from './types.js';
