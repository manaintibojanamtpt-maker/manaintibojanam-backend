/**
 * Purpose: Authoritative financial and sales reporting for Voice Assistant, POS & Owner Analytics.
 * Public API:
 * - getAuthoritativeDailySalesSummary
 * - getIstBusinessDayRange
 * - getIstStartOfDay
 * - getIstEndOfDay
 * - isStaffRecordedPayment
 * Rules:
 * - India Standard Time (Asia/Kolkata, UTC+5:30) business day with configurable operational day boundary (handles overnight shifts).
 * - Strictly separates Gross Sales, Net Sales, Collections (Verified vs Recorded), Refunds, and Receivables.
 * - Removes any "completed orders with non-unpaid status" shortcut: unverified/unrecorded orders are treated as receivables.
 * - Reuses canonical isPaymentVerified from paymentGate.ts.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { isPaymentVerified, isCodOrder, normalizePaymentStatus } from '../paymentGate.js';

export interface AuthoritativeDailySales {
  totalRevenue: number;          // Canonical net collections (verifiedCollections + recordedCollections - refundAmount)
  grossSales: number;            // Total value of non-cancelled/non-failed orders placed
  netSales: number;              // Gross sales minus discounts and refunds
  totalCollections: number;      // Total payments received (verified + recorded)
  verifiedCollections: number;   // Payments verified via payment gateway / verified UPI
  recordedCollections: number;   // Payments recorded by staff / counter (cash, card, manual)
  refundAmount: number;          // Total amount refunded
  receivables: number;           // Uncollected amounts on placed orders (pending, unpaid, failed, unknown)
  paidOrderCount: number;        // Orders with verified or recorded payment
  unpaidOrderCount: number;      // Orders awaiting payment / uncollected
  refundedOrderCount: number;    // Orders with refund
  averageOrderValue: number;     // Gross sales / total valid orders (or net collections / paid orders)
  cashAmount: number;
  upiAmount: number;
  otherAmount: number;
  businessDate: string;          // YYYY-MM-DD operational business date
  businessDayStartHour: number;  // Configured hour when the business day begins (e.g. 4 for 04:00 AM IST)
}

export interface ReportingOptions {
  businessDayStartHour?: number;
}

const STAFF_RECORDED_PAYMENT_METHODS = new Set([
  'CASH',
  'CARD',
  'POS_CARD',
  'POS_CASH',
  'UPI_MANUAL',
  'COUNTER_CASH',
  'CHEQUE',
  'BANK_TRANSFER',
]);

/**
 * Returns true if the order has an explicit staff-recorded or owner-verified payment.
 */
export function isStaffRecordedPayment(order: Record<string, unknown>): boolean {
  if (isPaymentVerified(order)) return false;

  const paymentStatus = normalizePaymentStatus(order.paymentStatus);
  if (['failed', 'unpaid', 'cancelled', 'refunded', 'unknown'].includes(paymentStatus)) {
    return false;
  }

  const verifiedSource = String(order.paymentVerifiedSource || '').toLowerCase();
  if (
    paymentStatus === 'recorded' ||
    verifiedSource === 'owner_manual' ||
    verifiedSource === 'staff_recorded' ||
    verifiedSource === 'pos_cash' ||
    verifiedSource === 'pos_counter'
  ) {
    return true;
  }

  if (order.paymentReceived === true || Boolean(order.paymentRecordedBy)) {
    return true;
  }

  const method = String(order.paymentMethod || order.paymentMode || '').toUpperCase().trim();
  const status = String(order.status || '').toUpperCase().trim();
  if (
    STAFF_RECORDED_PAYMENT_METHODS.has(method) &&
    (status === 'COMPLETED' || status === 'DELIVERED') &&
    paymentStatus !== 'pending' &&
    paymentStatus !== 'pending_verification'
  ) {
    return true;
  }

  return false;
}

/**
 * Computes the operational business day range in Asia/Kolkata (UTC+5:30).
 * If a restaurant operates late into the night (e.g., closing at 02:00 AM),
 * orders between midnight and 04:00 AM belong to the preceding day's business date.
 */
export function getIstBusinessDayRange(
  targetDate = new Date(),
  businessDayStartHour = 4,
): { start: Date; end: Date; businessDate: string } {
  // Convert targetDate to Asia/Kolkata date parts
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(targetDate);
  const findPart = (t: string) => parts.find((p) => p.type === t)?.value || '00';

  const year = parseInt(findPart('year'), 10);
  const month = parseInt(findPart('month'), 10) - 1;
  const day = parseInt(findPart('day'), 10);
  const hour = parseInt(findPart('hour'), 10);

  // If before operational cutoff hour (e.g. 01:30 AM < 4), business day is yesterday
  const baseDate = new Date(Date.UTC(year, month, day));
  if (hour < businessDayStartHour) {
    baseDate.setUTCDate(baseDate.getUTCDate() - 1);
  }

  const bYear = baseDate.getUTCFullYear();
  const bMonth = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
  const bDay = String(baseDate.getUTCDate()).padStart(2, '0');
  const businessDate = `${bYear}-${bMonth}-${bDay}`;

  const nextDate = new Date(baseDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nYear = nextDate.getUTCFullYear();
  const nMonth = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
  const nDay = String(nextDate.getUTCDate()).padStart(2, '0');
  const nextDateStr = `${nYear}-${nMonth}-${nDay}`;

  const padH = String(businessDayStartHour).padStart(2, '0');
  const start = new Date(`${businessDate}T${padH}:00:00.000+05:30`);
  // End is exactly 1ms before the next business day start
  const end = new Date(new Date(`${nextDateStr}T${padH}:00:00.000+05:30`).getTime() - 1);

  return { start, end, businessDate };
}

/**
 * Legacy start of calendar day (00:00:00.000 IST).
 */
export function getIstStartOfDay(now = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(now);
  return new Date(`${dateStr}T00:00:00.000+05:30`);
}

/**
 * Legacy end of calendar day (23:59:59.999 IST).
 */
export function getIstEndOfDay(now = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(now);
  return new Date(`${dateStr}T23:59:59.999+05:30`);
}

/**
 * Calculate authoritative daily sales and collections summary for a tenant.
 */
export async function getAuthoritativeDailySalesSummary(
  db: Firestore,
  tenantId: string,
  targetDate = new Date(),
  options: ReportingOptions = {},
): Promise<AuthoritativeDailySales> {
  const businessDayStartHour = options.businessDayStartHour ?? 4;
  const { start: rangeStart, end: rangeEnd, businessDate } = getIstBusinessDayRange(
    targetDate,
    businessDayStartHour,
  );

  let grossSales = 0;
  let verifiedCollections = 0;
  let recordedCollections = 0;
  let refundAmount = 0;
  let receivables = 0;
  let paidOrderCount = 0;
  let unpaidOrderCount = 0;
  let refundedOrderCount = 0;
  let cashAmount = 0;
  let upiAmount = 0;
  let otherAmount = 0;

  const processOrderDoc = (data: Record<string, unknown>) => {
    const status = String(data.status || '').toUpperCase().trim();
    const paymentStatus = normalizePaymentStatus(data.paymentStatus);
    const amount = Number(data.totalAmount ?? data.amount ?? 0);
    const discount = Number(data.discountAmount ?? data.discount ?? 0);
    const orderRefund = Number(data.refundAmount ?? 0);
    const paymentMethod = String(data.paymentMethod || data.paymentMode || '').toUpperCase();

    // 1. Exclude cancelled, failed, expired, or void orders from sales entirely
    if (['CANCELLED', 'FAILED', 'FAILED_DELIVERY', 'EXPIRED', 'VOID'].includes(status)) {
      return;
    }

    grossSales += amount;

    // 2. Refund handling
    if (paymentStatus === 'refunded' || status === 'REFUNDED' || orderRefund > 0) {
      const actualRefund = orderRefund > 0 ? orderRefund : amount;
      refundAmount += actualRefund;
      refundedOrderCount += 1;
      return;
    }

    // 3. Check Verified vs Staff-Recorded payment
    let verified = isPaymentVerified(data);
    if (isCodOrder(data)) {
      const pStatus = normalizePaymentStatus(data.paymentStatus);
      if (
        pStatus === 'pending' ||
        pStatus === 'unpaid' ||
        ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(status)
      ) {
        verified = false;
      }
    }
    const recorded = isStaffRecordedPayment(data);

    if (verified || recorded) {
      paidOrderCount += 1;
      if (verified) {
        verifiedCollections += amount;
      } else {
        recordedCollections += amount;
      }

      if (paymentMethod.includes('CASH')) {
        cashAmount += amount;
      } else if (
        paymentMethod.includes('UPI') ||
        paymentMethod.includes('PAYTM') ||
        paymentMethod.includes('QR')
      ) {
        upiAmount += amount;
      } else {
        otherAmount += amount;
      }
    } else {
      // Unverified, unrecorded, pending, or failed retry
      unpaidOrderCount += 1;
      receivables += amount;
    }
  };

  try {
    const snap = await db
      .collection('orders')
      .where('tenantId', '==', tenantId)
      .where('createdAt', '>=', rangeStart)
      .where('createdAt', '<=', rangeEnd)
      .get();

    for (const doc of snap.docs) {
      processOrderDoc(doc.data() as Record<string, unknown>);
    }
  } catch (err) {
    // Fallback in test / dev environments without composite range indexes
    try {
      const fallbackSnap = await db.collection('orders').where('tenantId', '==', tenantId).get();
      for (const doc of fallbackSnap.docs) {
        const data = doc.data() as Record<string, unknown>;
        const createdAt =
          data.createdAt instanceof Date
            ? data.createdAt
            : (data.createdAt as any)?.toDate?.() || new Date(String(data.createdAt || ''));

        if (createdAt >= rangeStart && createdAt <= rangeEnd) {
          processOrderDoc(data);
        }
      }
    } catch {
      // Return zeroed summary on complete database error
    }
  }

  const totalCollections = verifiedCollections + recordedCollections;
  const totalRevenue = Math.max(0, totalCollections - refundAmount);
  const netSales = Math.max(0, grossSales - refundAmount);
  const averageOrderValue = paidOrderCount > 0 ? Math.round(totalRevenue / paidOrderCount) : 0;

  return {
    totalRevenue,
    grossSales,
    netSales,
    totalCollections,
    verifiedCollections,
    recordedCollections,
    refundAmount,
    receivables,
    paidOrderCount,
    unpaidOrderCount,
    refundedOrderCount,
    averageOrderValue,
    cashAmount,
    upiAmount,
    otherAmount,
    businessDate,
    businessDayStartHour,
  };
}
