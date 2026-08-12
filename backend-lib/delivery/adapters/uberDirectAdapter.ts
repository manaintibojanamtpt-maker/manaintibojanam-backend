/**
 * Uber Direct Provider Adapter (Phase 5 Step 16).
 *
 * Docs: https://developer.uber.com/docs/deliveries/get-started
 * Auth: client_credentials → scope eats.deliveries
 *
 * CRITICAL SAFETY RULES:
 *  1. Live network calls are strictly gated by UBER_DIRECT_LIVE=1 (default FALSE).
 *  2. When false, ZERO network requests occur.
 *  3. Normalizes canonical ProviderQuoteResult from deliveryIntelligenceTypes.ts.
 *  4. Secrets are NEVER returned in quote output, logs, or errors.
 */

import type {
  DeliveryDispatchRequest,
  DeliveryDispatchResult,
  DeliveryProviderAdapter,
  DeliveryQuoteRequest,
} from './types.js';
import { isValidQuoteCoordinate, isQuoteExpired } from './types.js';
import type { ProviderQuoteResult } from '../deliveryIntelligenceTypes.js';
import {
  isUberDirectLiveEnabled,
  mapUberDirectErrorMessage,
} from '../uberDirectReadiness.js';

const AUTH_URL = 'https://auth.uber.com/oauth/v2/token';
const API_BASE = 'https://api.uber.com/v1';

async function fetchAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: 'eats.deliveries',
  });
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(mapUberDirectErrorMessage(new Error(`Uber OAuth failed (${res.status})`)));
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error(mapUberDirectErrorMessage(new Error('Uber OAuth missing access_token')));
  }
  return data.access_token;
}

export const uberDirectAdapter: DeliveryProviderAdapter = {
  provider: 'uber_direct',

  async validateCredentials(credentials) {
    const customerId = credentials.customerId?.trim();
    const clientId = credentials.clientId?.trim();
    const clientSecret = credentials.clientSecret?.trim();
    if (!customerId || !clientId || !clientSecret) {
      return {
        ok: false,
        message: 'Uber Direct requires customerId, clientId, and clientSecret.',
      };
    }
    if (!isUberDirectLiveEnabled()) {
      return {
        ok: true,
        message:
          'Credentials saved shape looks OK. Live Uber OAuth check stays off until UBER_DIRECT_LIVE=1. Manual tracking remains available.',
        merchantAccountId: customerId,
      };
    }
    try {
      await fetchAccessToken(clientId, clientSecret);
      return {
        ok: true,
        message: 'Uber Direct OAuth validated — live booking path is ready for this account.',
        merchantAccountId: customerId,
      };
    } catch (err) {
      return { ok: false, message: mapUberDirectErrorMessage(err) };
    }
  },

  async quote(credentials: Record<string, string>, request: DeliveryQuoteRequest): Promise<ProviderQuoteResult> {
    const now = request.now ?? new Date();
    const nowIso = now.toISOString();

    // Tenant and coordinate validation
    if (!request.tenantId) {
      return {
        provider: 'uber_direct',
        connectionType: 'oauth',
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
        provider: 'uber_direct',
        connectionType: 'oauth',
        quoteId: null,
        quotedAt: nowIso,
        providerExpiresAt: null,
        cost: null,
        etaMinutes: null,
        source: 'UNKNOWN',
        status: 'UNAVAILABLE',
      };
    }

    // Explicit test fixture override path
    if (request.fixtureOverride) {
      const override = request.fixtureOverride;
      const expiresAt = override.providerExpiresAt ?? null;
      const expired = isQuoteExpired(expiresAt, now.getTime());

      return {
        provider: 'uber_direct',
        connectionType: 'oauth',
        quoteId: override.quoteId ?? `uber_quote_${Date.now()}`,
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

    // Safety Gate: No live network calls when UBER_DIRECT_LIVE is false
    if (!isUberDirectLiveEnabled()) {
      return {
        provider: 'uber_direct',
        connectionType: 'oauth',
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
    }

    // Live path (guarded by UBER_DIRECT_LIVE=1)
    const customerId = credentials.customerId;
    const clientId = credentials.clientId;
    const clientSecret = credentials.clientSecret;
    if (!customerId || !clientId || !clientSecret) {
      return {
        provider: 'uber_direct',
        connectionType: 'oauth',
        quoteId: null,
        quotedAt: nowIso,
        providerExpiresAt: null,
        cost: null,
        etaMinutes: null,
        source: 'SCAFFOLD',
        status: 'UNAVAILABLE',
      };
    }

    try {
      const token = await fetchAccessToken(clientId, clientSecret);
      const res = await fetch(`${API_BASE}/customers/${encodeURIComponent(customerId)}/delivery_quotes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickup_address: request.pickupAddress,
          dropoff_address: request.dropoffAddress,
          pickup_latitude: request.pickupLat,
          pickup_longitude: request.pickupLng,
          dropoff_latitude: request.dropoffLat,
          dropoff_longitude: request.dropoffLng,
        }),
      });

      if (!res.ok) {
        return {
          provider: 'uber_direct',
          connectionType: 'oauth',
          quoteId: null,
          quotedAt: nowIso,
          providerExpiresAt: null,
          cost: null,
          etaMinutes: null,
          source: 'LIVE_PROVIDER',
          status: 'UNAVAILABLE',
        };
      }

      const data = (await res.json()) as { id?: string; fee?: number; expires_at?: string; eta?: number };
      const expiresAt = data.expires_at || new Date(now.getTime() + 15 * 60000).toISOString();
      const expired = isQuoteExpired(expiresAt, now.getTime());

      return {
        provider: 'uber_direct',
        connectionType: 'oauth',
        quoteId: String(data.id || ''),
        quotedAt: nowIso,
        providerExpiresAt: expiresAt,
        cost: typeof data.fee === 'number' ? data.fee / 100 : null,
        etaMinutes: typeof data.eta === 'number' ? { min: data.eta, max: data.eta + 5 } : null,
        vehicleType: request.vehicleType ?? 'BIKE',
        pickup: { lat: request.pickupLat, lng: request.pickupLng, address: request.pickupAddress },
        dropoff: { lat: request.dropoffLat, lng: request.dropoffLng, address: request.dropoffAddress },
        source: 'LIVE_PROVIDER',
        status: expired ? 'EXPIRED' : 'QUOTED',
      };
    } catch {
      return {
        provider: 'uber_direct',
        connectionType: 'oauth',
        quoteId: null,
        quotedAt: nowIso,
        providerExpiresAt: null,
        cost: null,
        etaMinutes: null,
        source: 'LIVE_PROVIDER',
        status: 'UNAVAILABLE',
      };
    }
  },

  async createDispatch(
    credentials,
    request: DeliveryDispatchRequest,
  ): Promise<DeliveryDispatchResult> {
    const customerId = credentials.customerId;
    if (!isUberDirectLiveEnabled()) {
      return {
        provider: 'uber_direct',
        tripId: '',
        status: 'blocked',
        message:
          'Uber Direct live booking is off (UBER_DIRECT_LIVE). Paste a tracking link on Dispatch — do not treat scaffold IDs as real trips.',
        trackingUrl: undefined,
      };
    }
    try {
      const token = await fetchAccessToken(credentials.clientId!, credentials.clientSecret!);
      const quoteId = request.quoteId || `quote_${request.orderId}`;
      const res = await fetch(`${API_BASE}/customers/${encodeURIComponent(customerId!)}/deliveries`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: quoteId,
          pickup_name: 'Kitchen',
          pickup_address: request.pickupAddress,
          pickup_phone_number: credentials.pickupPhone || undefined,
          dropoff_name: request.customerName,
          dropoff_address: request.dropoffAddress,
          dropoff_phone_number: request.customerPhone,
          external_order_id: request.externalOrderId || request.orderId,
        }),
      });
      if (!res.ok) {
        throw new Error(`Uber create delivery failed (${res.status})`);
      }
      const data = (await res.json()) as {
        id?: string;
        tracking_url?: string;
        courier?: { name?: string; phone_number?: string };
      };
      return {
        provider: 'uber_direct',
        tripId: String(data.id || ''),
        trackingUrl: data.tracking_url,
        riderName: data.courier?.name,
        riderPhone: data.courier?.phone_number,
        status: 'booked',
        raw: data,
      };
    } catch (err) {
      return {
        provider: 'uber_direct',
        tripId: '',
        status: 'blocked',
        message: mapUberDirectErrorMessage(err),
      };
    }
  },
};
