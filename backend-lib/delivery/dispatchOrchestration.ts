import type { DeliveryConnectionServiceDeps } from './deliveryConnectionService.js';
import { loadTenantProviderCredentials } from './deliveryConnectionService.js';
import { getDeliveryAdapter } from './adapters/index.js';
import type { DeliveryDispatchResult } from './adapters/types.js';
import type { DeliveryProviderId } from './providerCapabilityMatrix.js';

export interface OrchestratedDispatchInput {
  readonly tenantId: string;
  readonly provider: DeliveryProviderId;
  readonly orderId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly pickupAddress: string;
  readonly dropoffAddress: string;
  readonly orderTotal?: number;
  /** Owner-pasted tracking URL for manual fallback. */
  readonly manualTrackingUrl?: string;
  readonly riderName?: string;
  readonly riderPhone?: string;
  readonly allowManualFallback?: boolean;
}

export interface OrchestratedDispatchResult {
  readonly mode: 'provider_api' | 'manual_fallback' | 'blocked';
  readonly provider: DeliveryProviderId;
  readonly dispatch?: DeliveryDispatchResult;
  readonly deliveryData: {
    readonly deliveryPartner: string;
    readonly trackingUrl: string | null;
    readonly trackingLink: string | null;
    readonly riderName: string | null;
    readonly riderPhone: string | null;
    readonly courierProvider?: string;
    readonly courierTripId?: string;
    readonly deliveryAssignedAt: string;
  };
  readonly message: string;
}

const PROVIDER_LABEL: Record<DeliveryProviderId, string> = {
  porter: 'Porter',
  uber_direct: 'Uber',
  rapido: 'Rapido',
  self_pickup: 'Self Pickup',
};

export async function orchestrateTenantDispatch(
  deps: DeliveryConnectionServiceDeps,
  input: OrchestratedDispatchInput,
): Promise<OrchestratedDispatchResult> {
  const allowManual = input.allowManualFallback !== false;
  const now = new Date().toISOString();
  const label = PROVIDER_LABEL[input.provider] || input.provider;

  if (input.provider === 'self_pickup') {
    return {
      mode: 'manual_fallback',
      provider: 'self_pickup',
      deliveryData: {
        deliveryPartner: 'Self Pickup',
        trackingUrl: null,
        trackingLink: null,
        riderName: null,
        riderPhone: null,
        deliveryAssignedAt: now,
      },
      message: 'Self pickup — no external delivery connection required.',
    };
  }

  const loaded = await loadTenantProviderCredentials(deps, input.tenantId, input.provider);
  const adapter = getDeliveryAdapter(input.provider);

  // Connected + API-capable → attempt provider booking.
  if (loaded && adapter && loaded.connection.connectionType !== 'manual_only') {
    const result = await adapter.createDispatch(loaded.credentials, {
      tenantId: input.tenantId,
      orderId: input.orderId,
      pickupAddress: input.pickupAddress,
      dropoffAddress: input.dropoffAddress,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      orderTotal: input.orderTotal,
      externalOrderId: input.orderId,
    });

    if (result.status === 'booked') {
      return {
        mode: 'provider_api',
        provider: input.provider,
        dispatch: result,
        deliveryData: {
          deliveryPartner: label,
          trackingUrl: result.trackingUrl || input.manualTrackingUrl || null,
          trackingLink: result.trackingUrl || input.manualTrackingUrl || null,
          riderName: result.riderName || input.riderName || null,
          riderPhone: result.riderPhone || input.riderPhone || null,
          courierProvider: input.provider,
          courierTripId: result.tripId || undefined,
          deliveryAssignedAt: now,
        },
        message: result.message || `Booked via merchant-linked ${label} account.`,
      };
    }

    if (result.status === 'blocked' && !allowManual) {
      return {
        mode: 'blocked',
        provider: input.provider,
        dispatch: result,
        deliveryData: {
          deliveryPartner: label,
          trackingUrl: null,
          trackingLink: null,
          riderName: null,
          riderPhone: null,
          deliveryAssignedAt: now,
        },
        message:
          result.message ||
          `No valid ${label} booking available. Connect credentials or use manual tracking.`,
      };
    }
  }

  // Manual fallback (default proven path).
  if (allowManual) {
    const tracking = input.manualTrackingUrl?.trim() || null;
    if (
      !tracking &&
      loaded?.connection.connectionType !== 'manual_only' &&
      input.provider !== 'rapido'
    ) {
      // Soft allow — owner can still dispatch without URL for own riders.
    }
    return {
      mode: 'manual_fallback',
      provider: input.provider,
      deliveryData: {
        deliveryPartner: label,
        trackingUrl: tracking,
        trackingLink: tracking,
        riderName: input.riderName?.trim() || null,
        riderPhone: input.riderPhone?.trim() || null,
        deliveryAssignedAt: now,
      },
      message: loaded
        ? `Using manual tracking fallback for ${label} (API booking unavailable or not live).`
        : `No linked ${label} connection — using manual tracking-link dispatch.`,
    };
  }

  return {
    mode: 'blocked',
    provider: input.provider,
    deliveryData: {
      deliveryPartner: label,
      trackingUrl: null,
      trackingLink: null,
      riderName: null,
      riderPhone: null,
      deliveryAssignedAt: now,
    },
    message: `Tenant has no valid ${label} connection and manual fallback is disabled.`,
  };
}

export function mapUiPartnerToProviderId(partner: string): DeliveryProviderId {
  const v = partner.trim().toLowerCase();
  if (v.includes('porter')) return 'porter';
  if (v.includes('uber')) return 'uber_direct';
  if (v.includes('rapido')) return 'rapido';
  if (v.includes('self') || v.includes('pickup')) return 'self_pickup';
  return 'rapido';
}
