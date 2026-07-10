import type { OrderTrackingResponse } from '@/types/marketplace';
import type {
  TrackingDeliveryViewModel,
  TrackingHeroViewModel,
  TrackingInvoiceViewModel,
  TrackingTimelineIcon,
  TrackingTimelineStepState,
  TrackingTimelineStepViewModel,
} from '@bhojan/storefront-design-system/orders/tracking';
import {
  TRACKING_STEPS,
  normalizeTrackingStatus,
  trackingStepIndex,
  trackingStepLabel,
} from '@/features/tracking/utils/trackingSteps';

function formatTimelineAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function stepIcon(stepId: string): TrackingTimelineIcon {
  const normalized = stepId.toUpperCase();
  if (normalized === 'DELIVERED') return 'delivered';
  if (normalized === 'OUT_FOR_DELIVERY') return 'delivery';
  if (normalized === 'PREPARING') return 'preparing';
  if (normalized === 'ACCEPTED') return 'accepted';
  return 'placed';
}

function eventTimeForStep(stepId: string, tracking: OrderTrackingResponse): string | undefined {
  const match = [...tracking.timeline]
    .reverse()
    .find((entry) => normalizeTrackingStatus(entry.status) === stepId);
  return match?.at;
}

export function mapTrackingTimelineSteps(tracking: OrderTrackingResponse): {
  steps: TrackingTimelineStepViewModel[];
  cancelled: boolean;
} {
  const normalized = normalizeTrackingStatus(tracking.status);
  if (normalized === 'CANCELLED') {
    return { steps: [], cancelled: true };
  }

  const currentIndex = trackingStepIndex(tracking.status);

  const steps = TRACKING_STEPS.map((step, index) => {
    const isDone = currentIndex > index;
    const isActive = currentIndex === index;
    const timestamp = eventTimeForStep(step.id, tracking);

    const state: TrackingTimelineStepState = isActive ? 'active' : isDone ? 'done' : 'pending';

    return {
      id: step.id,
      label: step.label,
      message: isActive || isDone ? step.message : undefined,
      timestampLabel: timestamp ? formatTimelineAt(timestamp) : undefined,
      state,
      icon: stepIcon(step.id),
    } satisfies TrackingTimelineStepViewModel;
  });

  return { steps, cancelled: false };
}

export function mapTrackingHero(
  tracking: OrderTrackingResponse,
  options: { etaLabel: string | null; liveActive: boolean },
): TrackingHeroViewModel {
  const phase = normalizeTrackingStatus(tracking.status);
  const isTerminal = phase === 'DELIVERED' || phase === 'CANCELLED';

  return {
    statusLabel: trackingStepLabel(tracking.status),
    kitchenName: tracking.restaurant?.displayName,
    orderNumberLabel: `Order #${tracking.orderNumber}`,
    etaLabel: options.etaLabel && !isTerminal ? options.etaLabel : undefined,
    liveLabel: options.liveActive ? 'Updating live…' : 'Live updates every 5s',
    liveActive: options.liveActive,
    showLive: !isTerminal,
  };
}

export function mapTrackingDelivery(
  delivery: NonNullable<OrderTrackingResponse['delivery']>,
): TrackingDeliveryViewModel {
  return {
    partner: delivery.partner,
    riderName: delivery.riderName,
    riderPhone: delivery.riderPhone,
    trackingUrl: delivery.trackingUrl,
    trackButtonLabel: `Track live on ${delivery.partner ?? 'partner app'}`,
  };
}

function formatMoney(value: number): string {
  return `₹${Math.round(value)}`;
}

function paymentStatusLabel(invoice: NonNullable<OrderTrackingResponse['invoice']>): {
  label: string;
  tone: 'paid' | 'pending' | 'failed';
} {
  const status = (invoice.paymentStatus ?? '').toLowerCase();
  const method = (invoice.paymentMethod ?? '').toLowerCase();
  if (['paid', 'success', 'verified'].includes(status)) {
    return { label: 'Paid', tone: 'paid' };
  }
  if (['failed', 'expired'].includes(status)) {
    return { label: 'Failed', tone: 'failed' };
  }
  if (method === 'cod') {
    return { label: 'Cash on delivery', tone: 'pending' };
  }
  return { label: 'Pending', tone: 'pending' };
}

export function mapTrackingInvoice(invoice: NonNullable<OrderTrackingResponse['invoice']>): TrackingInvoiceViewModel {
  const created = new Date(invoice.createdAt).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const payment = paymentStatusLabel(invoice);
  const gstPercent = invoice.gstPercent ?? 0;

  const totals = [
    { label: 'Subtotal', amountLabel: formatMoney(invoice.subtotal) },
    ...(invoice.discountAmount && invoice.discountAmount > 0
      ? [{ label: 'Discount', amountLabel: `−${formatMoney(invoice.discountAmount)}` }]
      : []),
    ...(invoice.gstAmount > 0
      ? [{ label: gstPercent > 0 ? `GST (${gstPercent}%)` : 'GST', amountLabel: formatMoney(invoice.gstAmount) }]
      : []),
    ...(invoice.packingFee > 0 ? [{ label: 'Packaging', amountLabel: formatMoney(invoice.packingFee) }] : []),
    ...(invoice.deliveryFee > 0 ? [{ label: 'Delivery', amountLabel: formatMoney(invoice.deliveryFee) }] : []),
    {
      label: payment.tone === 'paid' ? 'Total paid' : 'Amount due',
      amountLabel: formatMoney(invoice.grandTotal),
      emphasis: true,
    },
  ];

  return {
    kitchenName: invoice.kitchenName,
    orderNumberLabel: `Digital invoice • Order #${invoice.orderNumber}`,
    customerName: invoice.customerName ?? 'Customer',
    createdLabel: `Date: ${created}`,
    paymentBadgeLabel: payment.label,
    paymentBadgeTone: payment.tone,
    phoneLabel: invoice.phone ? `Phone: ${invoice.phone}` : undefined,
    addressLabel: invoice.address ? `Delivery address: ${invoice.address}` : undefined,
    paymentMethodLabel: invoice.paymentMethod
      ? `Payment method: ${invoice.paymentMethod.toUpperCase() === 'RAZORPAY' ? 'Online (Razorpay)' : invoice.paymentMethod.toUpperCase()}`
      : undefined,
    items: invoice.items.map((item) => ({
      id: `${item.itemId}-${item.name}`,
      name: item.name,
      quantityLabel: String(item.quantity),
      rateLabel: formatMoney(item.unitPrice),
      totalLabel: formatMoney(item.unitPrice * item.quantity),
    })),
    totals,
    footerNote: `Thank you for ordering from ${invoice.kitchenName}. This is a computer-generated invoice.`,
  };
}
