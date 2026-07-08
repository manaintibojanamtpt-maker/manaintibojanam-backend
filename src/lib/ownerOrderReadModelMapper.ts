/**
 * M1B PR-1 — maps SDK read models to OwnerOrders presentation shape.
 */

import type { OrderReadModel } from '../sdk/orders/types';
import type { ApiOrderRecord } from '../sdk/orders/mappers/mapOrderToReadModel';
import { mapOrderToReadModel } from '../sdk/orders/mappers/mapOrderToReadModel';
import { deliveryPartnerLabel } from './deliveryPartners';

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
    deliveryPartnerLabel(model.deliveryPartner) ||
    deliveryPartnerLabel(raw?.deliveryPartner) ||
    undefined,
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

/** Normalize Firestore Timestamp, ISO string, epoch ms, or seconds object to Date. */
export const coerceOwnerOrderDate = (value: unknown): Date | null => {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'object') {
    const record = value as { seconds?: number; toDate?: () => Date };
    if (typeof record.toDate === 'function') {
      const parsed = record.toDate();
      return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }
    if (typeof record.seconds === 'number') {
      return new Date(record.seconds * 1000);
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const toSortableTime = (value: unknown): number => {
  return coerceOwnerOrderDate(value)?.getTime() ?? 0;
};
