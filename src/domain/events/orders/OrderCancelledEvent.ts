/** Order cancelled event payload (M6 PR-5). Pure domain — no SDK imports. */

import type { LegacyOrderDocument } from './OrderEventMetadata';
import { ORDER_PAYLOAD_VERSION } from './OrderEventSchema';

export interface OrderCancelledPayload {
  readonly orderId: string;
  readonly tenantId: string;
  readonly status: string;
  readonly cancellationReason?: string;
  readonly totalAmount?: number;
  readonly payloadVersion: string;
}

export function buildOrderCancelledPayload(
  order: LegacyOrderDocument,
  cancellationReason?: string
): OrderCancelledPayload | null {
  if (!order.id || !order.tenantId) return null;
  return {
    orderId: order.id,
    tenantId: order.tenantId,
    status: order.status ?? 'CANCELLED',
    cancellationReason: cancellationReason ?? order.cancellationReason,
    totalAmount: order.totalAmount,
    payloadVersion: ORDER_PAYLOAD_VERSION,
  };
}
