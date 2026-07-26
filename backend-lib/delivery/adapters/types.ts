import type { DeliveryProviderId } from '../providerCapabilityMatrix.js';

export interface DeliveryQuoteRequest {
  readonly tenantId: string;
  readonly orderId: string;
  readonly pickupAddress: string;
  readonly dropoffAddress: string;
  readonly pickupLat?: number;
  readonly pickupLng?: number;
  readonly dropoffLat?: number;
  readonly dropoffLng?: number;
}

export interface DeliveryQuoteResult {
  readonly provider: DeliveryProviderId;
  readonly quoteId: string;
  readonly feeAmount?: number;
  readonly currency?: string;
  readonly etaMinutes?: number;
  readonly raw?: unknown;
}

export interface DeliveryDispatchRequest extends DeliveryQuoteRequest {
  readonly quoteId?: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly orderTotal?: number;
  readonly externalOrderId?: string;
}

export interface DeliveryDispatchResult {
  readonly provider: DeliveryProviderId;
  readonly tripId: string;
  readonly trackingUrl?: string;
  readonly riderName?: string;
  readonly riderPhone?: string;
  readonly status: 'booked' | 'manual_fallback' | 'blocked';
  readonly message?: string;
  readonly raw?: unknown;
}

export interface DeliveryProviderAdapter {
  readonly provider: DeliveryProviderId;
  quote?(
    credentials: Record<string, string>,
    request: DeliveryQuoteRequest,
  ): Promise<DeliveryQuoteResult>;
  createDispatch(
    credentials: Record<string, string>,
    request: DeliveryDispatchRequest,
  ): Promise<DeliveryDispatchResult>;
  validateCredentials(credentials: Record<string, string>): Promise<{
    ok: boolean;
    message: string;
    merchantAccountId?: string;
  }>;
}
