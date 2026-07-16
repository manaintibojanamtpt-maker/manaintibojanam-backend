export interface InvoicePricingBreakdown {
  readonly subtotal: number;
  readonly gstAmount?: number;
  readonly packingFee?: number;
  readonly deliveryFee?: number;
  readonly discountAmount?: number;
  readonly grandTotal?: number;
}

export interface InvoicePaymentContext {
  readonly paymentStatus?: string;
  readonly paymentMethod?: string;
  /** When true, COD is treated as collected (post-delivery invoice). */
  readonly codCollected?: boolean;
  readonly orderStatus?: string;
}

export type InvoicePaymentTone = 'paid' | 'pending' | 'failed';

export interface InvoicePaymentPresentation {
  readonly badgeLabel: string;
  readonly badgeTone: InvoicePaymentTone;
  readonly totalLabel: 'Total paid' | 'Amount due';
}

export function computeInvoiceGrandTotal(breakdown: InvoicePricingBreakdown): number {
  const subtotal = Number(breakdown.subtotal ?? 0);
  const discount = Number(breakdown.discountAmount ?? 0);
  const gst = Number(breakdown.gstAmount ?? 0);
  const packing = Number(breakdown.packingFee ?? 0);
  const delivery = Number(breakdown.deliveryFee ?? 0);
  const computed = Math.max(0, subtotal - discount + gst + packing + delivery);
  const stored = Number(breakdown.grandTotal ?? 0);

  if (stored > 0 && Math.abs(stored - computed) > 1) {
    return computed;
  }

  return stored > 0 ? stored : computed;
}

export function resolveInvoicePaymentPresentation(
  context: InvoicePaymentContext,
): InvoicePaymentPresentation {
  const status = (context.paymentStatus ?? '').toLowerCase();
  const method = (context.paymentMethod ?? '').toLowerCase();
  const orderStatus = (context.orderStatus ?? '').toUpperCase();
  const codCollected =
    context.codCollected === true || (method === 'cod' && orderStatus === 'DELIVERED');

  if (['paid', 'success', 'verified'].includes(status)) {
    return { badgeLabel: 'Paid', badgeTone: 'paid', totalLabel: 'Total paid' };
  }
  if (['failed', 'expired'].includes(status)) {
    return { badgeLabel: 'Failed', badgeTone: 'failed', totalLabel: 'Amount due' };
  }
  if (method === 'cod' && codCollected) {
    return { badgeLabel: 'Paid', badgeTone: 'paid', totalLabel: 'Total paid' };
  }
  if (method === 'cod') {
    return { badgeLabel: 'Cash on delivery', badgeTone: 'pending', totalLabel: 'Amount due' };
  }
  return { badgeLabel: 'Pending', badgeTone: 'pending', totalLabel: 'Amount due' };
}

export function resolveInvoiceGstAmount(input: {
  readonly subtotal?: number;
  readonly gst?: number;
  readonly gstAmount?: number;
}): number {
  if (typeof input.gstAmount === 'number' && Number.isFinite(input.gstAmount) && input.gstAmount > 0) {
    return input.gstAmount;
  }

  const gst = Number(input.gst ?? 0);
  const subtotal = Number(input.subtotal ?? 0);
  if (gst > 0 && gst <= 100 && subtotal > 0) {
    return Math.round((subtotal * gst) / 100);
  }

  return Number.isFinite(gst) ? gst : 0;
}
