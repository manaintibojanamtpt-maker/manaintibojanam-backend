/**
 * Rapido Provider Adapter (Phase 5 Step 16).
 *
 * CRITICAL SAFETY RULES:
 *  1. Rapido remains non-live (no public merchant API onboarding).
 *  2. ZERO network requests occur.
 *  3. Normalizes canonical ProviderQuoteResult from deliveryIntelligenceTypes.ts.
 *  4. Never invents live pricing or ETA.
 */

import type {
  DeliveryDispatchRequest,
  DeliveryDispatchResult,
  DeliveryProviderAdapter,
  DeliveryQuoteRequest,
} from './types.js';
import { isValidQuoteCoordinate, isQuoteExpired } from './types.js';
import type { ProviderQuoteResult } from '../deliveryIntelligenceTypes.js';

export const rapidoAdapter: DeliveryProviderAdapter = {
  provider: 'rapido',

  async validateCredentials() {
    return {
      ok: true,
      message:
        'Rapido is manual-only. Paste the Rapido tracking link at dispatch; no API credentials required.',
    };
  },

  async quote(_credentials: Record<string, string>, request: DeliveryQuoteRequest): Promise<ProviderQuoteResult> {
    const now = request.now ?? new Date();
    const nowIso = now.toISOString();

    if (!request.tenantId) {
      return {
        provider: 'rapido',
        connectionType: 'hosted_onboarding',
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
        provider: 'rapido',
        connectionType: 'hosted_onboarding',
        quoteId: null,
        quotedAt: nowIso,
        providerExpiresAt: null,
        cost: null,
        etaMinutes: null,
        source: 'UNKNOWN',
        status: 'UNAVAILABLE',
      };
    }

    if (request.fixtureOverride) {
      const override = request.fixtureOverride;
      const expiresAt = override.providerExpiresAt ?? null;
      const expired = isQuoteExpired(expiresAt, now.getTime());

      return {
        provider: 'rapido',
        connectionType: 'hosted_onboarding',
        quoteId: override.quoteId ?? `rapido_quote_${Date.now()}`,
        quotedAt: override.quotedAt ?? nowIso,
        providerExpiresAt: expiresAt,
        cost: expired ? null : (override.cost ?? null),
        etaMinutes: override.etaMinutes ?? null,
        vehicleType: override.vehicleType ?? request.vehicleType ?? 'BIKE',
        pickup: override.pickup ?? { lat: request.pickupLat, lng: request.pickupLng, address: request.pickupAddress },
        dropoff: override.dropoff ?? { lat: request.dropoffLat, lng: request.dropoffLng, address: request.dropoffAddress },
        source: override.source ?? 'LIVE_PROVIDER',
        status: expired ? 'EXPIRED' : (override.status ?? 'QUOTED'),
      };
    }

    return {
      provider: 'rapido',
      connectionType: 'hosted_onboarding',
      quoteId: null,
      quotedAt: nowIso,
      providerExpiresAt: null,
      cost: null,
      etaMinutes: null,
      vehicleType: request.vehicleType ?? 'BIKE',
      pickup: { lat: request.pickupLat, lng: request.pickupLng, address: request.pickupAddress },
      dropoff: { lat: request.dropoffLat, lng: request.dropoffLng, address: request.dropoffAddress },
      source: 'SCAFFOLD',
      status: 'UNAVAILABLE',
    };
  },

  async createDispatch(
    _credentials,
    request: DeliveryDispatchRequest,
  ): Promise<DeliveryDispatchResult> {
    return {
      provider: 'rapido',
      tripId: `rapido_manual_${request.orderId}`,
      status: 'manual_fallback',
      message:
        'Rapido has no merchant API onboarding in BhojanOS yet. Confirm dispatch with a pasted tracking URL.',
    };
  },
};

/** Backward compatibility alias. */
export const rapidoManualAdapter = rapidoAdapter;
