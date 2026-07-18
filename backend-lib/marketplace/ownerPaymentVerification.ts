import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  isCodOrder,
  isPaymentVerified,
  normalizePaymentStatus,
} from '../paymentGate.ts';
import { writePaymentVerification } from '../paymentAudit.ts';

const VERIFIED_PAYMENT_STATUSES = new Set(['success', 'verified', 'paid']);
const PENDING_PAYMENT_STATUSES = new Set(['pending', 'pending_verification']);
const AWAITING_PAYMENT_ORDER_STATUSES = new Set([
  'PENDING_PAYMENT',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFICATION',
  'PLACED',
  'PENDING',
  'CREATED',
]);

export interface OwnerVerifyPaymentInput {
  orderId: string;
  tenantId: string;
  ownerUserId: string;
  ownerEmail?: string | null;
  acceptOrder?: boolean;
  upiReference?: string | null;
  notes?: string | null;
}

export interface OwnerVerifyPaymentResult {
  orderId: string;
  tenantId: string;
  paymentStatus: string;
  status: string;
  alreadyVerified: boolean;
  accepted: boolean;
}

export function isDirectUpiOrder(order: Record<string, unknown>): boolean {
  if (isCodOrder(order)) return false;
  const method = String(order.paymentMethod || '').toLowerCase();
  return method === 'upi';
}

export function isAwaitingUpiPayment(order: Record<string, unknown>): boolean {
  if (!isDirectUpiOrder(order)) return false;
  if (isPaymentVerified(order)) return false;
  const paymentStatus = normalizePaymentStatus(order.paymentStatus);
  if (!PENDING_PAYMENT_STATUSES.has(paymentStatus)) return false;
  const status = String(order.status || '').toUpperCase();
  return AWAITING_PAYMENT_ORDER_STATUSES.has(status);
}

function resolvePostVerifyOrderStatus(
  currentStatus: string,
  acceptOrder: boolean,
): string {
  const normalized = String(currentStatus || '').toUpperCase();
  if (acceptOrder) {
    return 'ACCEPTED';
  }
  if (['PENDING_PAYMENT', 'PAYMENT_PENDING', 'PAYMENT_VERIFICATION'].includes(normalized)) {
    return 'PLACED';
  }
  return normalized || 'PLACED';
}

export async function verifyOwnerOrderPayment(
  db: Firestore,
  fieldValue: typeof FieldValue,
  input: OwnerVerifyPaymentInput,
): Promise<OwnerVerifyPaymentResult> {
  const orderRef = db.collection('orders').doc(input.orderId);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) {
    throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  }

  const orderData = orderDoc.data() as Record<string, unknown>;
  const orderTenantId = String(orderData.tenantId || '');
  if (orderTenantId !== input.tenantId) {
    throw Object.assign(new Error('Order does not belong to this kitchen'), { statusCode: 403 });
  }

  if (!isDirectUpiOrder(orderData)) {
    throw Object.assign(
      new Error('Only direct UPI orders can be manually verified by the owner'),
      { statusCode: 400, code: 'UNSUPPORTED_PAYMENT_METHOD' },
    );
  }

  const previousPaymentStatus = normalizePaymentStatus(orderData.paymentStatus);
  const previousStatus = String(orderData.status || 'UNKNOWN').toUpperCase();
  const acceptOrder = input.acceptOrder !== false;
  const alreadyVerified = VERIFIED_PAYMENT_STATUSES.has(previousPaymentStatus);

  if (alreadyVerified) {
    const currentStatus = previousStatus;
    if (acceptOrder && currentStatus !== 'ACCEPTED' && AWAITING_PAYMENT_ORDER_STATUSES.has(currentStatus)) {
      await orderRef.update({
        status: 'ACCEPTED',
        updatedAt: fieldValue.serverTimestamp(),
        statusHistory: fieldValue.arrayUnion({
          status: 'ACCEPTED',
          timestamp: new Date().toISOString(),
          description: 'Order accepted after payment was already verified',
          metadata: { verifiedBy: input.ownerUserId },
        }),
      });
      return {
        orderId: input.orderId,
        tenantId: input.tenantId,
        paymentStatus: previousPaymentStatus,
        status: 'ACCEPTED',
        alreadyVerified: true,
        accepted: true,
      };
    }

    return {
      orderId: input.orderId,
      tenantId: input.tenantId,
      paymentStatus: previousPaymentStatus,
      status: currentStatus,
      alreadyVerified: true,
      accepted: currentStatus === 'ACCEPTED',
    };
  }

  if (!isAwaitingUpiPayment(orderData)) {
    throw Object.assign(
      new Error('Order is not awaiting UPI payment verification'),
      { statusCode: 409, code: 'NOT_AWAITING_PAYMENT' },
    );
  }

  const nextStatus = resolvePostVerifyOrderStatus(previousStatus, acceptOrder);
  const verifiedAt = new Date().toISOString();
  const verificationExtras: Record<string, unknown> = {
    paymentStatus: 'success',
    paymentVerifiedBy: input.ownerUserId,
    paymentVerifiedAt: verifiedAt,
    paymentVerifiedSource: 'owner_manual',
    updatedAt: fieldValue.serverTimestamp(),
    status: nextStatus,
    statusHistory: fieldValue.arrayUnion({
      status: nextStatus,
      timestamp: verifiedAt,
      description: acceptOrder
        ? 'Owner verified UPI payment and accepted order'
        : 'Owner verified UPI payment',
      metadata: {
        verifiedBy: input.ownerUserId,
        ownerEmail: input.ownerEmail ?? null,
        upiReference: input.upiReference ?? null,
        notes: input.notes ?? null,
      },
    }),
  };

  if (input.upiReference?.trim()) {
    verificationExtras.customerUpiReference = input.upiReference.trim();
  }
  if (input.notes?.trim()) {
    verificationExtras.ownerPaymentNotes = input.notes.trim();
  }

  await orderRef.update(verificationExtras);

  await writePaymentVerification(db, {
    tenantId: input.tenantId,
    orderId: input.orderId,
    action: 'verified',
    actorRole: 'owner',
    actorUserId: input.ownerUserId,
    source: 'owner_manual_upi',
    previousPaymentStatus,
    newPaymentStatus: 'success',
    upiReference: input.upiReference?.trim() || null,
    notes: input.notes?.trim() || null,
  });

  return {
    orderId: input.orderId,
    tenantId: input.tenantId,
    paymentStatus: 'success',
    status: nextStatus,
    alreadyVerified: false,
    accepted: acceptOrder,
  };
}

export async function claimCustomerUpiPayment(
  db: Firestore,
  fieldValue: typeof FieldValue,
  params: {
    orderId: string;
    phone: string;
    upiReference?: string | null;
  },
): Promise<{ recorded: boolean }> {
  const orderRef = db.collection('orders').doc(params.orderId);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) {
    throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  }

  const orderData = orderDoc.data() as Record<string, unknown>;
  const orderPhone = String(orderData.phone || '').replace(/\D/g, '');
  const claimPhone = params.phone.replace(/\D/g, '');
  if (!orderPhone || orderPhone.slice(-10) !== claimPhone.slice(-10)) {
    throw Object.assign(new Error('Phone number does not match this order'), { statusCode: 403 });
  }

  if (!isAwaitingUpiPayment(orderData)) {
    throw Object.assign(new Error('This order is not awaiting UPI payment'), { statusCode: 409 });
  }

  const reference = params.upiReference?.trim();

  await orderRef.update({
    ...(reference ? { customerUpiReference: reference } : {}),
    customerPaymentClaimedAt: fieldValue.serverTimestamp(),
    customerPaymentClaimed: true,
    updatedAt: fieldValue.serverTimestamp(),
  });

  return { recorded: true };
}

export async function resolveOwnerNotificationPhone(
  db: Firestore,
  tenantId: string,
): Promise<string | null> {
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) return null;
  const tenantData = tenantDoc.data() as Record<string, unknown>;

  const contactPhone =
    typeof tenantData.contactPhone === 'string'
      ? tenantData.contactPhone
      : typeof tenantData.phone === 'string'
        ? tenantData.phone
        : null;
  if (contactPhone?.trim()) return contactPhone.trim();

  const ownerId = typeof tenantData.ownerId === 'string' ? tenantData.ownerId : null;
  if (!ownerId) return null;

  const ownerDoc = await db.collection('users').doc(ownerId).get();
  if (!ownerDoc.exists) return null;
  const ownerData = ownerDoc.data() as Record<string, unknown>;
  const ownerPhone =
    typeof ownerData.phone === 'string'
      ? ownerData.phone
      : typeof ownerData.mobileNumber === 'string'
        ? ownerData.mobileNumber
        : null;
  return ownerPhone?.trim() || null;
}

export function buildOwnerUpiPendingMessage(order: Record<string, unknown>): string {
  const orderNumber = order.orderNumber ?? order.id;
  const customer = order.customerName || order.userName || 'Customer';
  const total = order.totalAmount ?? order.total ?? 0;
  return (
    `💳 *UPI payment pending*\n\n` +
    `Order #${orderNumber}\n` +
    `Customer: ${customer}\n` +
    `Amount: ₹${total}\n\n` +
    `Open BhojanOS → Orders and tap *Verify & Accept* after you confirm payment in your UPI app.`
  );
}

export function buildCustomerPaymentVerifiedMessage(order: Record<string, unknown>): string {
  const orderNumber = order.orderNumber ?? order.id;
  const accepted = String(order.status || '').toUpperCase() === 'ACCEPTED';
  return accepted
    ? `✅ Payment confirmed for order #${orderNumber}. Your kitchen has accepted the order and will start preparing soon.`
    : `✅ Payment confirmed for order #${orderNumber}. We will update you when the kitchen accepts your order.`;
}
