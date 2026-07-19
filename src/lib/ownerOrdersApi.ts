import { ownerApiRequest } from './ownerProvisioning';

export const OWNER_ORDERS_POLL_MS = 15_000;

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
