/** Order created event payload (M6 PR-5). Pure domain — no SDK imports. */

import type { LegacyOrderDocument, LegacyOrderLineItem } from './OrderEventMetadata';
import { ORDER_PAYLOAD_VERSION } from './OrderEventSchema';

export interface OrderCreatedPayload {
  readonly orderId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly status: string;
  readonly orderNumber?: number;
  readonly totalAmount?: number;
  readonly subtotal?: number;
  readonly paymentMethod?: string;
  readonly paymentStatus?: string;
  readonly itemCount: number;
  readonly items: readonly OrderCreatedLineItemPayload[];
  readonly payloadVersion: string;
}

export interface OrderCreatedLineItemPayload {
  readonly menuItemId?: string;
  readonly name?: string;
  readonly quantity?: number;
  readonly lineTotal?: number;
}

export function mapLegacyLineItem(item: LegacyOrderLineItem): OrderCreatedLineItemPayload {
  return {
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  };
}

export function buildOrderCreatedPayload(order: LegacyOrderDocument): OrderCreatedPayload | null {
  if (!order.id || !order.tenantId || !order.status) return null;
  const items = (order.items ?? []).map(mapLegacyLineItem);
  return {
    orderId: order.id,
    tenantId: order.tenantId,
    userId: order.userId ?? undefined,
    status: order.status,
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount,
    subtotal: order.subtotal,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    itemCount: items.length,
    items,
    payloadVersion: ORDER_PAYLOAD_VERSION,
  };
}
