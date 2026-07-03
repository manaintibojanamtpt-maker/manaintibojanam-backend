/**
 * BhojanOS SDK — order read-model contracts (presentation-safe, no Firestore fields).
 */

import type { IsoDateTime, OrderId, TenantId, UserId } from '../core/types';

export type OrderStatus =
  | 'PENDING'
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'ACTIVE'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_VERIFICATION';

export type PaymentMethod = 'razorpay' | 'cod';
export type PaymentStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'expired'
  | 'verified'
  | 'pending_verification';

export interface OrderLineItemReadModel {
  readonly menuItemId: string;
  readonly name: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly lineSubtotal: number;
  readonly lineTax?: number;
  readonly lineTotal: number;
}

export interface OrderReadModel {
  readonly id: OrderId;
  readonly tenantId: TenantId;
  readonly userId: UserId | null;
  readonly orderNumber?: number;
  readonly customerName?: string | null;
  readonly phone?: string;
  readonly status: OrderStatus;
  readonly paymentMethod: PaymentMethod;
  readonly paymentStatus: PaymentStatus;
  readonly items: readonly OrderLineItemReadModel[];
  readonly subtotal: number;
  readonly totalAmount: number;
  readonly createdAt: IsoDateTime;
  readonly updatedAt?: IsoDateTime;
  /** Passthrough display fields preserved during strangler migration (PR-4+). */
  readonly prepTime?: number;
  readonly deliveryTime?: number;
  readonly reviewed?: boolean;
  readonly gst?: number;
  readonly gstAmount?: number;
  readonly packingFee?: number;
  readonly deliveryFee?: number;
  readonly address?: string;
  readonly deliveryPartner?: string | { name: string; phone: string };
  readonly riderName?: string;
  readonly riderPhone?: string;
  readonly trackingUrl?: string;
  readonly trackingLink?: string;
  readonly deliveryType?: string;
  readonly scheduledTime?: unknown;
  readonly scheduledFor?: unknown;
  readonly orderType?: string;
  readonly deliveryTimeSlot?: string;
  readonly isCOD?: boolean;
  readonly expiresAt?: unknown;
  readonly rating?: number;
  readonly feedback?: string;
  readonly feedbackStatus?: string;
  readonly specialInstructions?: string;
  readonly customerPhone?: string;
  readonly deliveryAddress?: { addressLine1: string; city: string };
  readonly deliveryAssignedAt?: string;
  readonly statusHistory?: unknown;
  readonly timeline?: unknown;
}

export interface OrderAccessContext {
  /** Firebase ID token when caller is authenticated. */
  readonly bearerToken?: string;
  /** Guest order view JWT (ADR-012). */
  readonly guestToken?: string;
}

export interface OrderListFilter {
  readonly userId?: UserId;
  readonly tenantId?: TenantId;
  readonly limit?: number;
}

export interface OrderTenantListFilter {
  readonly tenantId: TenantId;
  readonly limit?: number;
}

export interface GuestViewTokenInput {
  readonly phone?: string;
  readonly phoneLast4?: string;
}

export interface GuestViewTokenResult {
  readonly token: string;
  readonly expiresAt: IsoDateTime;
}
