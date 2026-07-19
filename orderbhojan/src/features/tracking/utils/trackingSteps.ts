export const TRACKING_STEPS = [
  { id: 'PLACED', label: 'Order placed', message: 'We received your order' },
  {
    id: 'PAYMENT_VERIFICATION',
    label: 'Payment verification',
    message: 'Kitchen is verifying your UPI payment',
  },
  { id: 'ACCEPTED', label: 'Restaurant accepted', message: 'Kitchen confirmed your order' },
  { id: 'PREPARING', label: 'Preparing your meal', message: 'Chef is preparing your meal' },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for delivery', message: 'Your order is on the way' },
  { id: 'DELIVERED', label: 'Delivered', message: 'Enjoy your meal' },
] as const;

export type TrackingStepId = (typeof TRACKING_STEPS)[number]['id'];

export function normalizeTrackingStatus(status: string): TrackingStepId | 'CANCELLED' | 'REJECTED' {
  const upper = status.trim().toUpperCase();
  if (['CANCELLED', 'REJECTED', 'EXPIRED', 'FAILED_DELIVERY'].includes(upper)) return 'CANCELLED';
  if (upper === 'PAYMENT_VERIFICATION') return 'PAYMENT_VERIFICATION';
  if (['PENDING', 'CREATED', 'PLACED', 'PENDING_PAYMENT', 'CONFIRMED'].includes(upper)) return 'PLACED';
  if (upper === 'ACCEPTED') return 'ACCEPTED';
  if (['PREPARING', 'READY'].includes(upper)) return 'PREPARING';
  if (['OUT_FOR_DELIVERY', 'DISPATCHED', 'PICKED_UP', 'COURIER_BOOKED'].includes(upper)) {
    return 'OUT_FOR_DELIVERY';
  }
  if (upper === 'DELIVERED') return 'DELIVERED';
  return 'PLACED';
}

export function trackingStepIndex(status: string): number {
  const normalized = normalizeTrackingStatus(status);
  if (normalized === 'CANCELLED' || normalized === 'REJECTED') return -1;
  return TRACKING_STEPS.findIndex((step) => step.id === normalized);
}

export function trackingStepLabel(status: string): string {
  const normalized = normalizeTrackingStatus(status);
  if (normalized === 'CANCELLED' || normalized === 'REJECTED') return 'Cancelled';
  return TRACKING_STEPS.find((step) => step.id === normalized)?.label ?? status;
}
