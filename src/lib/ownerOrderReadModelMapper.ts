/**
 * M1B PR-1 — maps SDK read models to OwnerOrders presentation shape.
 */

import type { OrderReadModel } from '../sdk/orders/types';
import type { ApiOrderRecord } from '../sdk/orders/mappers/mapOrderToReadModel';
import { mapOrderToReadModel } from '../sdk/orders/mappers/mapOrderToReadModel';
import { deliveryPartnerLabel } from './deliveryPartners';
import { phoneDigits, safeNumber, safeText } from './safeRenderValue';

export interface OwnerOrderSnapshot {
  id: string;
  orderNumber?: number;
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

function normalizeLineItems(rawItems: unknown, modelItems: OrderReadModel['items']): unknown[] {
  if (Array.isArray(rawItems)) return rawItems;
  if (Array.isArray(modelItems)) return [...modelItems];
  return [];
}

function composeOwnerAddressLine(record: {
  addressLine1?: unknown;
  displayLabel?: unknown;
  formattedAddress?: unknown;
  fullAddress?: unknown;
  flat?: unknown;
  building?: unknown;
  landmark?: unknown;
  city?: unknown;
  cityName?: unknown;
  area?: unknown;
  suburb?: unknown;
}): string | undefined {
  const flat = safeText(record.flat);
  const building = safeText(record.building);
  const landmark = safeText(record.landmark);
  const area = safeText(record.area) ?? safeText(record.suburb);
  const city = safeText(record.city) ?? safeText(record.cityName);
  const detailParts = [flat, building, landmark].filter(Boolean);
  const areaParts = [area, city].filter(Boolean);

  if (detailParts.length > 0) {
    const line = detailParts.join(', ');
    return areaParts.length > 0 ? `${line}, ${areaParts.join(', ')}` : line;
  }

  return (
    safeText(record.addressLine1) ??
    safeText(record.displayLabel) ??
    safeText(record.formattedAddress) ??
    safeText(record.fullAddress)
  );
}

function normalizeDeliveryAddress(
  value: unknown,
): OwnerOrderSnapshot['deliveryAddress'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as {
    addressLine1?: unknown;
    displayLabel?: unknown;
    formattedAddress?: unknown;
    fullAddress?: unknown;
    flat?: unknown;
    building?: unknown;
    landmark?: unknown;
    city?: unknown;
    cityName?: unknown;
    area?: unknown;
    suburb?: unknown;
  };
  const addressLine1 = composeOwnerAddressLine(record);
  const city = safeText(record.city) ?? safeText(record.cityName);
  if (!addressLine1 && !city) return undefined;
  return { addressLine1: addressLine1 || 'Address', city: city || '' };
}

function resolveOwnerOrderAddress(
  address: unknown,
  deliveryAddress: unknown,
): string | undefined {
  const normalized = normalizeDeliveryAddress(deliveryAddress);
  if (normalized?.addressLine1 && normalized.addressLine1 !== 'Address') {
    return normalized.city
      ? `${normalized.addressLine1}, ${normalized.city}`
      : normalized.addressLine1;
  }
  if (typeof address === 'string') {
    const trimmed = address.trim();
    if (trimmed) return trimmed;
  }
  if (address && typeof address === 'object' && !Array.isArray(address)) {
    const fromAddress = normalizeDeliveryAddress(address)?.addressLine1;
    if (fromAddress && fromAddress !== 'Address') return fromAddress;
  }
  return normalized?.addressLine1;
}

export const readModelToOwnerOrder = (
  model: OrderReadModel,
  raw?: Partial<ApiOrderRecord>
): OwnerOrderSnapshot => ({
  id: safeText(model.id, safeText(raw?.id, 'order')),
  orderNumber: typeof raw?.orderNumber === 'number' ? raw.orderNumber : model.orderNumber,
  tenantId: safeText(model.tenantId, safeText(raw?.tenantId)),
  customerName: safeText(model.customerName ?? raw?.customerName, undefined) || undefined,
  customerPhone: phoneDigits(raw?.customerPhone) || undefined,
  phone: phoneDigits(model.phone ?? raw?.phone) || undefined,
  address:
    resolveOwnerOrderAddress(raw?.address ?? model.address, raw?.deliveryAddress) ||
    safeText(model.address ?? raw?.address, undefined) ||
    undefined,
  deliveryAddress: normalizeDeliveryAddress(raw?.deliveryAddress),
  totalAmount: safeNumber(raw?.totalAmount ?? model.totalAmount, 0),
  status: safeText(raw?.status ?? model.status, 'UNKNOWN').toUpperCase(),
  createdAt: raw?.createdAt ?? model.createdAt,
  items: normalizeLineItems(raw?.items, model.items),
  deliveryPartner:
    deliveryPartnerLabel(model.deliveryPartner) ||
    deliveryPartnerLabel(raw?.deliveryPartner) ||
    undefined,
  trackingUrl: safeText(model.trackingUrl ?? raw?.trackingUrl, undefined) || undefined,
  trackingLink: safeText(model.trackingLink ?? raw?.trackingLink, undefined) || undefined,
  riderName: safeText(model.riderName ?? raw?.riderName, undefined) || undefined,
  riderPhone: phoneDigits(model.riderPhone ?? raw?.riderPhone) || undefined,
  deliveryAssignedAt: safeText(raw?.deliveryAssignedAt, undefined) || undefined,
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
    const record = value as {
      seconds?: number;
      _seconds?: number;
      nanoseconds?: number;
      _nanoseconds?: number;
      toDate?: () => Date;
    };
    if (typeof record.toDate === 'function') {
      const parsed = record.toDate();
      return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }
    const seconds =
      typeof record.seconds === 'number'
        ? record.seconds
        : typeof record._seconds === 'number'
          ? record._seconds
          : undefined;
    if (typeof seconds === 'number') {
      const nanos =
        typeof record.nanoseconds === 'number'
          ? record.nanoseconds
          : typeof record._nanoseconds === 'number'
            ? record._nanoseconds
            : 0;
      return new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
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
