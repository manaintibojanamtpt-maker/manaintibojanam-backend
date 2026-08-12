/**
 * Manual Fallback Provider Adapter (Phase 5 Step 16).
 *
 * Used for self-pickup / manual merchant fulfillment.
 * Explicitly classified as MANUAL_FALLBACK / UNKNOWN — never masquerades as a live provider quote.
 */

import type {
  DeliveryDispatchRequest,
  DeliveryDispatchResult,
  DeliveryProviderAdapter,
  DeliveryQuoteRequest,
} from './types.js';
import { isValidQuoteCoordinate } from './types.js';
import type { ProviderQuoteResult } from '../deliveryIntelligenceTypes.js';

export const manualFallbackAdapter: DeliveryProviderAdapter = {
  provider: 'self_pickup',

  async validateCredentials() {
    return {
      ok: true,
      message: 'Self pickup / manual fallback is built-in. No credentials required.',
    };
  },

  async quote(_credentials: Record<string, string>, request: DeliveryQuoteRequest): Promise<ProviderQuoteResult> {
    const now = request.now ?? new Date();
    const nowIso = now.toISOString();

    if (!request.tenantId) {
      return {
        provider: 'self_pickup',
        connectionType: 'manual_only',
        quoteId: null,
        quotedAt: nowIso,
        providerExpiresAt: null,
        cost: null,
        etaMinutes: null,
        source: 'UNKNOWN',
        status: 'UNAVAILABLE',
      };
    }

    if (!isValidQuoteCoordinate(request.pickupLat, request.pickupLng) || !isValidQuoteCoordinate(request.dropoffLat, request.dropoffLng)) {
      return {
        provider: 'self_pickup',
        connectionType: 'manual_only',
        quoteId: null,
        quotedAt: nowIso,
        providerExpiresAt: null,
        cost: null,
        etaMinutes: null,
        source: 'UNKNOWN',
        status: 'UNAVAILABLE',
      };
    }

    return {
      provider: 'self_pickup',
      connectionType: 'manual_only',
      quoteId: null,
      quotedAt: nowIso,
      providerExpiresAt: null,
      cost: 0,
      etaMinutes: null,
      vehicleType: 'MANUAL',
      pickup: { lat: request.pickupLat, lng: request.pickupLng, address: request.pickupAddress },
      dropoff: { lat: request.dropoffLat, lng: request.dropoffLng, address: request.dropoffAddress },
      source: 'UNKNOWN',
      status: 'UNAVAILABLE',
    };
  },

  async createDispatch(
    _credentials,
    request: DeliveryDispatchRequest,
  ): Promise<DeliveryDispatchResult> {
    return {
      provider: 'self_pickup',
      tripId: `self_pickup_${request.orderId}`,
      status: 'manual_fallback',
      message: 'Self-pickup / manual dispatch completed.',
    };
  },
};
