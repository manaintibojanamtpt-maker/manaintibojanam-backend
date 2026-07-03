/**
 * M1B PR-1 — maps SDK read models to OwnerOrders presentation shape.
 */

import type { OrderReadModel } from '../sdk/orders/types';
import type { ApiOrderRecord } from '../sdk/orders/mappers/mapOrderToReadModel';
import { mapOrderToReadModel } from '../sdk/orders/mappers/mapOrderToReadModel';

export interface OwnerOrderSnapshot {
  id: string;
  customerName?: string;
  customerPhone?: string;
  phone?: string;
  address?: string;
  deliveryAddress?: { addressLine1: string; city: string };
  totalAmount: number;
  status: string;
  createdAt: unknown;
  items?: unknown[];
  deliveryPartner?: string;
  trackingUrl?: string;
  trackingLink?: string;
  riderName?: string;
  riderPhone?: string;
  deliveryAssignedAt?: string;
  tenantId?: string;
  timeline?: unknown;
  statusHistory?: unknown;
}

export const readModelToOwnerOrder = (
  model: OrderReadModel,
  raw?: Partial<ApiOrderRecord>
): OwnerOrderSnapshot => ({
  id: model.id,
  tenantId: model.tenantId,
  customerName: model.customerName ?? undefined,
  customerPhone: raw?.customerPhone as string | undefined,
  phone: model.phone,
  address: model.address,
  deliveryAddress: raw?.deliveryAddress as OwnerOrderSnapshot['deliveryAddress'],
  totalAmount: model.totalAmount,
  status: raw?.status !== undefined ? String(raw.status) : model.status,
  createdAt: raw?.createdAt ?? model.createdAt,
  items: raw?.items ?? [...model.items],
  deliveryPartner:
    typeof model.deliveryPartner === 'string'
      ? model.deliveryPartner
      : (raw?.deliveryPartner as string | undefined),
  trackingUrl: model.trackingUrl,
  trackingLink: model.trackingLink,
  riderName: model.riderName,
  riderPhone: model.riderPhone,
  deliveryAssignedAt: raw?.deliveryAssignedAt as string | undefined,
  timeline: raw?.timeline,
  statusHistory: raw?.statusHistory,
});

export const apiRecordToOwnerOrder = (record: ApiOrderRecord): OwnerOrderSnapshot =>
  readModelToOwnerOrder(mapOrderToReadModel(record), record);

export const sortOwnerOrdersNewestFirst = (
  orders: readonly OwnerOrderSnapshot[]
): OwnerOrderSnapshot[] =>
  [...orders].sort((a, b) => {
    const timeA = toSortableTime(a.createdAt);
    const timeB = toSortableTime(b.createdAt);
    return timeB - timeA;
  });

const toSortableTime = (value: unknown): number => {
  if (value && typeof value === 'object') {
    const record = value as { seconds?: number; toDate?: () => Date };
    if (typeof record.seconds === 'number') {
      return record.seconds * 1000;
    }
    if (typeof record.toDate === 'function') {
      return record.toDate().getTime();
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};
