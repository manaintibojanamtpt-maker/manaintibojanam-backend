/**
 * Uber Direct adapter scaffold.
 * Docs: https://developer.uber.com/docs/deliveries/get-started
 * Auth: client_credentials → scope eats.deliveries
 * Quote: POST /v1/customers/{customer_id}/delivery_quotes
 * Create: POST /v1/customers/{customer_id}/deliveries
 *
 * Live network calls are gated by UBER_DIRECT_LIVE=1 to keep CI/dev safe.
 */

import type {
  DeliveryDispatchRequest,
  DeliveryDispatchResult,
  DeliveryProviderAdapter,
  DeliveryQuoteRequest,
  DeliveryQuoteResult,
} from './types.js';
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

function liveEnabled(): boolean {
  return isUberDirectLiveEnabled();
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
    if (!liveEnabled()) {
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

  async quote(credentials, request: DeliveryQuoteRequest): Promise<DeliveryQuoteResult> {
    const customerId = credentials.customerId!;
    if (!liveEnabled()) {
      return {
        provider: 'uber_direct',
        quoteId: `uber_quote_scaffold_${request.orderId}`,
        feeAmount: undefined,
        currency: 'INR',
        raw: { scaffold: true },
      };
    }
    const token = await fetchAccessToken(credentials.clientId!, credentials.clientSecret!);
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
    if (!res.ok) throw new Error(`Uber quote failed (${res.status})`);
    const data = (await res.json()) as { id?: string; fee?: number };
    return {
      provider: 'uber_direct',
      quoteId: String(data.id || ''),
      feeAmount: typeof data.fee === 'number' ? data.fee / 100 : undefined,
      currency: 'INR',
      raw: data,
    };
  },

  async createDispatch(
    credentials,
    request: DeliveryDispatchRequest,
  ): Promise<DeliveryDispatchResult> {
    const customerId = credentials.customerId!;
    if (!liveEnabled()) {
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
      const quoteId =
        request.quoteId ||
        (await uberDirectAdapter.quote!(credentials, request)).quoteId;
      const res = await fetch(`${API_BASE}/customers/${encodeURIComponent(customerId)}/deliveries`, {
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
