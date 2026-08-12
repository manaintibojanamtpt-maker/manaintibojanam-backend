/**
 * Porter Provider Adapter (Phase 5 Step 16).
 *
 * CRITICAL SAFETY RULES:
 *  1. Live network calls are strictly gated by PORTER_LIVE=1 (default FALSE).
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
import { isPorterLiveEnabled } from '../porterApprovalReadiness.js';

const PORTER_API_BASE =
  process.env.PORTER_API_BASE_URL || 'https://api.porter.in/v2';

export const porterAdapter: DeliveryProviderAdapter = {
  provider: 'porter',

  async validateCredentials(credentials) {
    const apiKey = credentials.apiKey?.trim();
    const merchantAccountId = credentials.merchantAccountId?.trim();
    if (!apiKey) {
      return { ok: false, message: 'Porter requires apiKey (partner-provisioned).' };
    }
    if (!isPorterLiveEnabled()) {
      return {
        ok: true,
        message:
          'Porter credentials accepted for storage only. Partner API approval + PORTER_LIVE are still required before auto-booking. Manual tracking stays available.',
        merchantAccountId: merchantAccountId || undefined,
      };
    }
    try {
      const res = await fetch(`${PORTER_API_BASE}/me`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return { ok: false, message: `Porter validate failed (${res.status})` };
      }
      return {
        ok: true,
        message: 'Porter connection validated.',
        merchantAccountId: merchantAccountId || undefined,
      };
    } catch {
      return { ok: false, message: 'Porter connection validation network error.' };
    }
  },

  async quote(credentials: Record<string, string>, request: DeliveryQuoteRequest): Promise<ProviderQuoteResult> {
    const now = request.now ?? new Date();
    const nowIso = now.toISOString();

    if (!request.tenantId) {
      return {
        provider: 'porter',
        connectionType: 'api_credentials',
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
        provider: 'porter',
        connectionType: 'api_credentials',
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
        provider: 'porter',
        connectionType: 'api_credentials',
        quoteId: override.quoteId ?? `porter_quote_${Date.now()}`,
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

    // Safety Gate: No live network calls when PORTER_LIVE is false
    if (!isPorterLiveEnabled()) {
      return {
        provider: 'porter',
        connectionType: 'api_credentials',
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

    const apiKey = credentials.apiKey;
    if (!apiKey) {
      return {
        provider: 'porter',
        connectionType: 'api_credentials',
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
      const res = await fetch(`${PORTER_API_BASE}/deliveries/quote`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: request.orderId,
          pickup: { lat: request.pickupLat, lng: request.pickupLng },
          dropoff: { lat: request.dropoffLat, lng: request.dropoffLng },
        }),
      });

      if (!res.ok) {
        return {
          provider: 'porter',
          connectionType: 'api_credentials',
          quoteId: null,
          quotedAt: nowIso,
          providerExpiresAt: null,
          cost: null,
          etaMinutes: null,
          source: 'LIVE_PROVIDER',
          status: 'UNAVAILABLE',
        };
      }

      const data = (await res.json()) as { quoteId?: string; fee?: number; expiresAt?: string; eta?: number };
      const expiresAt = data.expiresAt || new Date(now.getTime() + 15 * 60000).toISOString();
      const expired = isQuoteExpired(expiresAt, now.getTime());

      return {
        provider: 'porter',
        connectionType: 'api_credentials',
        quoteId: String(data.quoteId || ''),
        quotedAt: nowIso,
        providerExpiresAt: expiresAt,
        cost: typeof data.fee === 'number' ? data.fee : null,
        etaMinutes: typeof data.eta === 'number' ? { min: data.eta, max: data.eta + 5 } : null,
        vehicleType: request.vehicleType ?? 'BIKE',
        pickup: { lat: request.pickupLat, lng: request.pickupLng, address: request.pickupAddress },
        dropoff: { lat: request.dropoffLat, lng: request.dropoffLng, address: request.dropoffAddress },
        source: 'LIVE_PROVIDER',
        status: expired ? 'EXPIRED' : 'QUOTED',
      };
    } catch {
      return {
        provider: 'porter',
        connectionType: 'api_credentials',
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
    if (!isPorterLiveEnabled()) {
      return {
        provider: 'porter',
        tripId: '',
        status: 'blocked',
        message:
          'Porter live booking unavailable (partner API access required). Use manual tracking-link dispatch.',
      };
    }
    try {
      const res = await fetch(`${PORTER_API_BASE}/deliveries/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: request.orderId,
          pickupAddress: request.pickupAddress,
          dropoffAddress: request.dropoffAddress,
          customerName: request.customerName,
          customerPhone: request.customerPhone,
        }),
      });
      if (!res.ok) throw new Error(`Porter create dispatch failed (${res.status})`);
      const data = (await res.json()) as { tripId?: string; trackingUrl?: string };
      return {
        provider: 'porter',
        tripId: String(data.tripId || ''),
        trackingUrl: data.trackingUrl,
        status: 'booked',
        raw: data,
      };
    } catch {
      return {
        provider: 'porter',
        tripId: '',
        status: 'blocked',
        message: 'Porter create dispatch failed.',
      };
    }
  },
};
