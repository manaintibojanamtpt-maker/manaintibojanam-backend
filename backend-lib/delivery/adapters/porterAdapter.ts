/**
 * Porter adapter scaffold — EXTERNAL ACCESS REQUIRED.
 * Public merchant API docs were not available at implementation time.
 * When Porter provisions API access, replace EXTERNAL_ACCESS_REQUIRED markers
 * with real endpoints and enable PORTER_LIVE=1.
 */

import type {
  DeliveryDispatchRequest,
  DeliveryDispatchResult,
  DeliveryProviderAdapter,
  DeliveryQuoteRequest,
  DeliveryQuoteResult,
} from './types.js';
import { isPorterLiveEnabled } from '../porterApprovalReadiness.js';

/** @external-access-required Porter partner API base URL (placeholder). */
const PORTER_API_BASE =
  process.env.PORTER_API_BASE_URL || 'https://api.porter.in/v2'; /* EXTERNAL_ACCESS_REQUIRED */

function liveEnabled(): boolean {
  return isPorterLiveEnabled();
}

export const porterAdapter: DeliveryProviderAdapter = {
  provider: 'porter',

  async validateCredentials(credentials) {
    const apiKey = credentials.apiKey?.trim();
    const merchantAccountId = credentials.merchantAccountId?.trim();
    if (!apiKey) {
      return { ok: false, message: 'Porter requires apiKey (partner-provisioned).' };
    }
    if (!liveEnabled()) {
      return {
        ok: true,
        message:
          'Porter credentials accepted for storage only. Partner API approval + PORTER_LIVE are still required before auto-booking. Manual tracking stays available.',
        merchantAccountId: merchantAccountId || undefined,
      };
    }
    // EXTERNAL_ACCESS_REQUIRED: hit Porter auth/ping when docs available.
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
  },

  async quote(credentials, request: DeliveryQuoteRequest): Promise<DeliveryQuoteResult> {
    if (!liveEnabled()) {
      return {
        provider: 'porter',
        quoteId: `porter_quote_scaffold_${request.orderId}`,
        raw: { scaffold: true, externalAccessRequired: true },
      };
    }
    // EXTERNAL_ACCESS_REQUIRED
    const res = await fetch(`${PORTER_API_BASE}/deliveries/quote`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: request.orderId,
        pickup: request.pickupAddress,
        dropoff: request.dropoffAddress,
      }),
    });
    if (!res.ok) throw new Error(`Porter quote failed (${res.status})`);
    const data = (await res.json()) as { quoteId?: string; fee?: number };
    return {
      provider: 'porter',
      quoteId: String(data.quoteId || ''),
      feeAmount: data.fee,
      currency: 'INR',
      raw: data,
    };
  },

  async createDispatch(
    credentials,
    request: DeliveryDispatchRequest,
  ): Promise<DeliveryDispatchResult> {
    if (!liveEnabled()) {
      return {
        provider: 'porter',
        tripId: '',
        status: 'blocked',
        message:
          'Porter live booking unavailable (partner API access required). Use manual tracking-link dispatch.',
      };
    }
    // EXTERNAL_ACCESS_REQUIRED
    const res = await fetch(`${PORTER_API_BASE}/deliveries/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: request.orderId,
        merchantAccountId: credentials.merchantAccountId,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        pickupLocation: request.pickupAddress,
        deliveryLocation: request.dropoffAddress,
        amount: request.orderTotal,
      }),
    });
    if (!res.ok) throw new Error(`Porter dispatch failed (${res.status})`);
    const data = (await res.json()) as {
      tripId?: string;
      trackingUrl?: string;
      riderName?: string;
      riderPhone?: string;
    };
    return {
      provider: 'porter',
      tripId: String(data.tripId || ''),
      trackingUrl: data.trackingUrl,
      riderName: data.riderName,
      riderPhone: data.riderPhone,
      status: 'booked',
      raw: data,
    };
  },
};
