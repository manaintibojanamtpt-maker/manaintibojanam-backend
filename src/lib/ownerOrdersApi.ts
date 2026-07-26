import { ownerApiRequest } from './ownerProvisioning';

/** Live queue refresh — cache covers instant navigation between polls. */
export const OWNER_ORDERS_POLL_MS = 20_000;

export async function fetchOwnerOrdersFromApi(tenantId: string, limit = 50) {
  return ownerApiRequest<{
    success: boolean;
    tenantId: string;
    orders: import('../sdk/orders/mappers/mapOrderToReadModel').ApiOrderRecord[];
    hasMore: boolean;
  }>('GET', `/api/owner/orders?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}`);
}

export interface VerifyOwnerPaymentResult {
  success: boolean;
  orderId: string;
  tenantId: string;
  paymentStatus: string;
  status: string;
  alreadyVerified: boolean;
  accepted: boolean;
  error?: string;
  code?: string;
}

export async function verifyOwnerOrderPayment(
  tenantId: string,
  orderId: string,
  options?: {
    acceptOrder?: boolean;
    upiReference?: string;
    notes?: string;
  },
): Promise<VerifyOwnerPaymentResult> {
  return ownerApiRequest<VerifyOwnerPaymentResult>(
    'POST',
    `/api/owner/orders/${encodeURIComponent(orderId)}/verify-payment`,
    {
      tenantId,
      acceptOrder: options?.acceptOrder !== false,
      upiReference: options?.upiReference?.trim() || undefined,
      notes: options?.notes?.trim() || undefined,
    },
  );
}

export interface UpdateOwnerOrderStatusResult {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
}

/** Owner dispatch / status — honors notifyCustomer for OUT_FOR_DELIVERY fanout. */
export async function updateOwnerOrderStatus(
  orderId: string,
  status: string,
  deliveryData?: Record<string, unknown>,
): Promise<UpdateOwnerOrderStatusResult> {
  return ownerApiRequest<UpdateOwnerOrderStatusResult>(
    'PUT',
    `/api/owner/orders/${encodeURIComponent(orderId)}/status`,
    {
      status,
      ...(deliveryData ? { deliveryData } : {}),
    },
  );
}
