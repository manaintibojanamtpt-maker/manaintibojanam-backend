/**
 * Maps legacy app order records (from api.ts) to SDK OrderReadModel.
 * Pure function — no Firestore or network imports.
 */

import type { OrderId, IsoDateTime, TenantId, UserId } from '../../core/types';
import type {
  OrderLineItemReadModel,
  OrderReadModel,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../types';

/** Minimal order shape returned by src/services/api.ts (avoids SDK → Firestore coupling). */
export interface ApiOrderRecord {
  id: string;
  tenantId: string;
  userId?: string | null;
  orderNumber?: number;
  customerName?: string | null;
  phone?: string;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  items?: Array<{
    menuItemId?: string;
    name?: string;
    unitPrice?: number;
    quantity?: number;
    lineSubtotal?: number;
    lineTax?: number;
    lineTotal?: number;
  }>;
  subtotal?: number;
  totalAmount?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  prepTime?: number;
  deliveryTime?: number;
  reviewed?: boolean;
  gst?: number;
  gstAmount?: number;
  packingFee?: number;
  deliveryFee?: number;
  address?: string;
  deliveryPartner?: string | { name: string; phone: string };
  riderName?: string;
  riderPhone?: string;
  trackingUrl?: string;
  trackingLink?: string;
  deliveryType?: string;
  scheduledTime?: unknown;
  scheduledFor?: unknown;
  orderType?: string;
  deliveryTimeSlot?: string;
  isCOD?: boolean;
  expiresAt?: unknown;
  rating?: number;
  feedback?: string;
  feedbackStatus?: string;
  specialInstructions?: string;
  customerPhone?: string;
  deliveryAddress?: { addressLine1: string; city: string };
  deliveryAssignedAt?: string;
  statusHistory?: unknown;
  timeline?: unknown;
}

const SDK_ORDER_STATUSES: ReadonlySet<string> = new Set([
  'PENDING',
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED',
  'ACTIVE',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFICATION',
]);

const SDK_PAYMENT_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'success',
  'failed',
  'expired',
  'verified',
  'pending_verification',
]);

export const toIsoDateTime = (value: unknown): IsoDateTime => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString() as IsoDateTime;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.toDate === 'function') {
      const date = (record.toDate as () => Date)();
      return date.toISOString() as IsoDateTime;
    }
    if (typeof record._seconds === 'number') {
      return new Date(record._seconds * 1000).toISOString() as IsoDateTime;
    }
    if (typeof record.seconds === 'number') {
      return new Date(record.seconds * 1000).toISOString() as IsoDateTime;
    }
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString() as IsoDateTime;
    }
  }
  return new Date(0).toISOString() as IsoDateTime;
};

export const normalizeOrderStatus = (value: string | undefined | null): OrderStatus => {
  if (!value) {
    return 'PENDING';
  }

  let normalized = String(value).trim();
  if (normalized === 'placed') return 'PENDING';
  if (normalized === 'pending_payment') return 'PAYMENT_PENDING';
  if (normalized === 'payment_pending_verification') return 'PAYMENT_VERIFICATION';

  normalized = normalized.toUpperCase().replace(/\s+/g, '_');
  if (SDK_ORDER_STATUSES.has(normalized)) {
    return normalized as OrderStatus;
  }
  return 'PENDING';
};

export const normalizePaymentMethod = (value: string | undefined | null): PaymentMethod => {
  return value === 'cod' ? 'cod' : 'razorpay';
};

export const normalizePaymentStatus = (value: string | undefined | null): PaymentStatus => {
  const normalized = String(value || 'pending').trim().toLowerCase();
  if (SDK_PAYMENT_STATUSES.has(normalized)) {
    return normalized as PaymentStatus;
  }
  return 'pending';
};

const mapLineItem = (item: NonNullable<ApiOrderRecord['items']>[number]): OrderLineItemReadModel => {
  const unitPrice = item.unitPrice ?? 0;
  const quantity = item.quantity ?? 0;
  const lineSubtotal = item.lineSubtotal ?? unitPrice * quantity;
  const lineTotal = item.lineTotal ?? lineSubtotal + (item.lineTax ?? 0);

  return {
    menuItemId: item.menuItemId ?? '',
    name: item.name ?? '',
    unitPrice,
    quantity,
    lineSubtotal,
    lineTax: item.lineTax,
    lineTotal,
  };
};

export const mapOrderToReadModel = (order: ApiOrderRecord): OrderReadModel => ({
  id: order.id as OrderId,
  tenantId: order.tenantId as TenantId,
  userId: order.userId ? (order.userId as UserId) : null,
  orderNumber: order.orderNumber,
  customerName: order.customerName ?? null,
  phone: order.phone,
  status: normalizeOrderStatus(order.status),
  paymentMethod: normalizePaymentMethod(order.paymentMethod),
  paymentStatus: normalizePaymentStatus(order.paymentStatus),
  items: (order.items ?? []).map(mapLineItem),
  subtotal: order.subtotal ?? 0,
  totalAmount: order.totalAmount ?? 0,
  createdAt: toIsoDateTime(order.createdAt),
  updatedAt: order.updatedAt ? toIsoDateTime(order.updatedAt) : undefined,
  prepTime: order.prepTime,
  deliveryTime: order.deliveryTime,
  reviewed: order.reviewed,
  gst: order.gst,
  gstAmount: order.gstAmount,
  packingFee: order.packingFee,
  deliveryFee: order.deliveryFee,
  address: order.address,
  deliveryPartner: order.deliveryPartner,
  riderName: order.riderName,
  riderPhone: order.riderPhone,
  trackingUrl: order.trackingUrl,
  trackingLink: order.trackingLink,
  deliveryType: order.deliveryType,
  scheduledTime: order.scheduledTime,
  scheduledFor: order.scheduledFor,
  orderType: order.orderType,
  deliveryTimeSlot: order.deliveryTimeSlot,
  isCOD: order.isCOD,
  expiresAt: order.expiresAt,
  rating: order.rating,
  feedback: order.feedback,
  feedbackStatus: order.feedbackStatus,
  specialInstructions: order.specialInstructions,
  customerPhone: order.customerPhone,
  deliveryAddress: order.deliveryAddress,
  deliveryAssignedAt: order.deliveryAssignedAt,
  statusHistory: order.statusHistory,
  timeline: order.timeline,
});

export const mapOrdersToReadModels = (orders: ApiOrderRecord[]): OrderReadModel[] =>
  orders.map(mapOrderToReadModel);
