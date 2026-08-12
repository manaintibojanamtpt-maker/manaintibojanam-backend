import type { DeliveryProviderId } from '../providerCapabilityMatrix.js';
import type { ProviderQuoteResult } from '../deliveryIntelligenceTypes.js';

export interface DeliveryQuoteRequest {
  readonly tenantId: string;
  readonly orderId?: string;
  readonly pickupAddress?: string;
  readonly dropoffAddress?: string;
  readonly pickupLat: number;
  readonly pickupLng: number;
  readonly dropoffLat: number;
  readonly dropoffLng: number;
  readonly vehicleType?: string;
  readonly orderTotal?: number;
  readonly now?: Date;
  readonly fixtureOverride?: Partial<ProviderQuoteResult>;
}

export interface DeliveryDispatchRequest {
  readonly tenantId: string;
  readonly orderId: string;
  readonly pickupAddress: string;
  readonly dropoffAddress: string;
  readonly pickupLat?: number;
  readonly pickupLng?: number;
  readonly dropoffLat?: number;
  readonly dropoffLng?: number;
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
  quote(
    credentials: Record<string, string>,
    request: DeliveryQuoteRequest,
  ): Promise<ProviderQuoteResult>;
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

/**
 * Validates latitude/longitude coordinates against geographic boundaries (-90..90, -180..180)
 * and rejects Null-Island (0,0) and non-finite values (NaN, Infinity).
 */
export function isValidQuoteCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/**
 * Checks if a provider quote is expired relative to current time.
 */
export function isQuoteExpired(expiresAt: string | null | undefined, nowMs: number = Date.now()): boolean {
  if (!expiresAt) return false;
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs)) return false;
  return expiresMs <= nowMs;
}
