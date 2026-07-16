import { ownerApiRequest } from './ownerProvisioning';

export interface OwnerStorefrontPayload {
  marketplace?: Record<string, unknown>;
  storeOperations?: Record<string, unknown>;
  branding?: Record<string, unknown>;
  name?: string;
  businessType?: string;
  contact?: Record<string, unknown>;
  deliveryNotes?: string;
  location?: Record<string, unknown>;
  deliveryConfig?: Record<string, unknown>;
  pricingConfig?: Record<string, unknown>;
  paymentConfig?: Record<string, unknown>;
  features?: Record<string, unknown>;
}

export interface OwnerStorefrontResponse {
  success: boolean;
  tenantId: string;
  name?: string;
  businessType?: string;
  contact?: Record<string, unknown>;
  deliveryNotes?: string;
  location?: Record<string, unknown>;
  deliveryConfig?: Record<string, unknown>;
  pricingConfig?: Record<string, unknown>;
  paymentConfig?: Record<string, unknown>;
  features?: Record<string, unknown>;
  marketplace: Record<string, unknown>;
  storeOperations: Record<string, unknown>;
  branding: Record<string, unknown>;
  storeStatus?: string;
  acceptingOrders?: boolean;
  tenantSyncRevision?: string | null;
}

export async function fetchOwnerStorefront(tenantId: string) {
  return ownerApiRequest<OwnerStorefrontResponse>('GET', `/api/owner/storefront/${tenantId}`);
}

export async function updateOwnerStorefront(tenantId: string, body: OwnerStorefrontPayload) {
  return ownerApiRequest<{ success: boolean; tenantId: string; tenantSyncRevision?: string }>(
    'PUT',
    `/api/owner/storefront/${tenantId}`,
    body,
  );
}

export async function publishOwnerStorefront(tenantId: string) {
  return ownerApiRequest<{
    success: boolean;
    tenantId: string;
    storeStatus: string;
    menuItemCount: number;
    validationErrors?: string[];
  }>('POST', `/api/owner/storefront/${tenantId}/publish`);
}
