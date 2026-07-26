import { ownerApiRequest } from './ownerProvisioning';

export type DeliveryProviderId = 'porter' | 'uber_direct' | 'rapido' | 'self_pickup';

export interface DeliveryProviderCapabilityRow {
  id: DeliveryProviderId;
  displayName: string;
  connectionType: 'oauth' | 'hosted_onboarding' | 'api_credentials' | 'manual_only';
  maturity: string;
  capabilities: string[];
  docsUrl?: string;
  externalAccessNote: string;
  requiredCredentialFields: string[];
}

export interface DeliveryProviderConnectionPublic {
  tenantId: string;
  provider: DeliveryProviderId;
  connectionType: string;
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  merchantAccountId?: string;
  providerAccountRef?: string;
  lastValidatedAt?: string;
  scopes: string[];
  capabilities: string[];
  metadata: Record<string, unknown>;
  hasSecretRef: boolean;
  errorMessage?: string;
  updatedAt?: string;
}

export async function fetchDeliveryIntegrationCapabilities() {
  return ownerApiRequest<{
    success: boolean;
    providers: DeliveryProviderCapabilityRow[];
    securityNote: string;
  }>('GET', '/api/owner/delivery-integrations/capabilities');
}

export async function fetchTenantDeliveryIntegrations(tenantId: string) {
  return ownerApiRequest<{
    success: boolean;
    tenantId: string;
    connections: DeliveryProviderConnectionPublic[];
    providers: DeliveryProviderCapabilityRow[];
    securityNote: string;
  }>('GET', `/api/owner/delivery-integrations/${encodeURIComponent(tenantId)}`);
}

export async function startDeliveryConnection(tenantId: string, provider: DeliveryProviderId) {
  return ownerApiRequest<{ success: boolean; connection: DeliveryProviderConnectionPublic }>(
    'POST',
    `/api/owner/delivery-integrations/${encodeURIComponent(tenantId)}/${provider}/start`,
  );
}

export async function completeDeliveryConnection(
  tenantId: string,
  provider: DeliveryProviderId,
  body: {
    credentials?: Record<string, string>;
    merchantAccountId?: string;
  },
) {
  return ownerApiRequest<{ success: boolean; connection: DeliveryProviderConnectionPublic }>(
    'POST',
    `/api/owner/delivery-integrations/${encodeURIComponent(tenantId)}/${provider}/complete`,
    body,
  );
}

export async function validateDeliveryConnection(tenantId: string, provider: DeliveryProviderId) {
  return ownerApiRequest<{ success: boolean; connection: DeliveryProviderConnectionPublic }>(
    'POST',
    `/api/owner/delivery-integrations/${encodeURIComponent(tenantId)}/${provider}/validate`,
  );
}

export async function revokeDeliveryConnection(tenantId: string, provider: DeliveryProviderId) {
  return ownerApiRequest<{ success: boolean; connection: DeliveryProviderConnectionPublic | null }>(
    'POST',
    `/api/owner/delivery-integrations/${encodeURIComponent(tenantId)}/${provider}/revoke`,
  );
}

export interface OrchestratedDispatchResponse {
  success: boolean;
  mode: 'provider_api' | 'manual_fallback' | 'blocked';
  provider: DeliveryProviderId;
  message: string;
  deliveryData: {
    deliveryPartner: string;
    trackingUrl: string | null;
    trackingLink: string | null;
    riderName: string | null;
    riderPhone: string | null;
    courierProvider?: string;
    courierTripId?: string;
    deliveryAssignedAt: string;
  };
}

/** Resolve merchant-linked provider booking, else manual tracking fallback. */
export async function orchestrateOwnerDispatch(
  tenantId: string,
  body: {
    orderId: string;
    deliveryPartner?: string;
    provider?: DeliveryProviderId;
    customerName?: string;
    customerPhone?: string;
    pickupAddress?: string;
    dropoffAddress?: string;
    orderTotal?: number;
    trackingUrl?: string;
    riderName?: string;
    riderPhone?: string;
    allowManualFallback?: boolean;
  },
) {
  return ownerApiRequest<OrchestratedDispatchResponse>(
    'POST',
    `/api/owner/delivery-integrations/${encodeURIComponent(tenantId)}/dispatch`,
    body,
  );
}
