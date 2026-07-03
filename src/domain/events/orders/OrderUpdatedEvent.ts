/** Order updated event payload (M6 PR-5). Pure domain — no SDK imports. */

import type { LegacyOrderDocument } from './OrderEventMetadata';
import { ORDER_PAYLOAD_VERSION } from './OrderEventSchema';

export interface OrderUpdatedPayload {
  readonly orderId: string;
  readonly tenantId: string;
  readonly status: string;
  readonly previousStatus?: string;
  readonly totalAmount?: number;
  readonly paymentStatus?: string;
  readonly updatedFields: readonly string[];
  readonly payloadVersion: string;
}

export function buildOrderUpdatedPayload(
  order: LegacyOrderDocument,
  options: { previousStatus?: string; updatedFields?: readonly string[] } = {}
): OrderUpdatedPayload | null {
  if (!order.id || !order.tenantId || !order.status) return null;
  return {
    orderId: order.id,
    tenantId: order.tenantId,
    status: order.status,
    previousStatus: options.previousStatus,
    totalAmount: order.totalAmount,
    paymentStatus: order.paymentStatus,
    updatedFields: options.updatedFields ?? ['status'],
    payloadVersion: ORDER_PAYLOAD_VERSION,
  };
}
