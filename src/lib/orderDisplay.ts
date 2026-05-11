import { safeParseDate } from './utils';
import { Order, OrderStatus } from '../types';

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired' | 'pending_verification' | 'verified' | 'paid' | 'unpaid';
export type FulfillmentType = 'instant' | 'scheduled';
export type OrderPhase = 'created' | 'confirmed' | 'scheduled' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled' | 'expired';
export type ScheduledOrderStage = 'future_scheduled' | 'prep_due' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'expired' | 'created' | 'confirmed' | 'scheduled';

export interface OrderDisplayState {
  phase: OrderPhase;
  orderStage: ScheduledOrderStage;
  paymentStatus: PaymentStatus;
  fulfillmentType: FulfillmentType;
  isInvalidPayment: boolean;
  isScheduledFuture: boolean;
  isPrepWindowOpen: boolean;
  scheduledFor?: Date | null;
  scheduledDateLabel?: string | null;
  scheduledTimeLabel?: string | null;
  showEta: boolean;
  showScheduledLabel: boolean;
  showPreparing: boolean;
  showReady: boolean;
  customerTitle: string;
  customerSubtitle: string;
  adminBadge: string;
  adminBadgeColor: string;
  allowMarkReady: boolean;
  allowReject: boolean;
}

export const normalizePaymentStatus = (value?: string): PaymentStatus => {
  const raw = String(value || '').trim().toLowerCase();
  if (['success', 'paid', 'verified'].includes(raw)) return 'success';
  if (['expired'].includes(raw)) return 'expired';
  if (['failed', 'failure', 'payment_failed'].includes(raw)) return 'failed';
  if (['pending_verification', 'verification_pending', 'payment_pending', 'pending', 'unpaid'].includes(raw)) return 'pending';
  return 'pending';
};

export const getFulfillmentType = (deliveryType?: string, scheduledTime?: any): FulfillmentType => {
  if (String(deliveryType || '').toLowerCase() === 'scheduled') return 'scheduled';
  if (scheduledTime) return 'scheduled';
  return 'instant';
};

export const resolveOrderPhase = (
  status?: string,
  paymentStatus: PaymentStatus = 'pending',
  fulfillmentType: FulfillmentType = 'instant',
  scheduledTime?: any,
  now: Date = new Date()
): OrderPhase => {
  if (paymentStatus === 'failed' || paymentStatus === 'expired') {
    return 'expired';
  }

  const normalized = String(status || '').trim().toUpperCase().replace(/\s+/g, '_');
  const scheduleAt = scheduledTime ? safeParseDate(scheduledTime) : null;
  const isFutureScheduled = fulfillmentType === 'scheduled' && scheduleAt && now < scheduleAt;

  if (normalized === OrderStatus.CANCELLED || normalized === 'CANCELLED') return 'cancelled';
  if (normalized === OrderStatus.DELIVERED || normalized === 'DELIVERED') return 'delivered';
  if (['OUT_FOR_DELIVERY', OrderStatus.COURIER_BOOKED, OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY].includes(normalized)) return 'dispatched';
  if (normalized === OrderStatus.READY || normalized === 'READY') return 'ready';
  if (normalized === OrderStatus.PREPARING || normalized === 'PREPARING') return 'preparing';
  if (normalized === OrderStatus.ACCEPTED || normalized === 'ACCEPTED') return 'confirmed';
  if (normalized === OrderStatus.SCHEDULED || normalized === 'SCHEDULED') return 'scheduled';
  if (normalized === OrderStatus.PAYMENT_VERIFICATION || normalized === 'PAYMENT_VERIFICATION' || normalized === OrderStatus.PAYMENT_PENDING || normalized === 'PAYMENT_PENDING' || normalized === OrderStatus.PENDING || normalized === 'PENDING' || normalized === OrderStatus.PLACED || normalized === 'PLACED') {
    if (isFutureScheduled) return 'scheduled';
    return 'created';
  }

  if (isFutureScheduled) return 'scheduled';
  return 'created';
};

export const getScheduledOrderStage = (
  fulfillmentType: FulfillmentType,
  phase: OrderPhase,
  scheduledFor?: Date | null,
  now: Date = new Date()
): ScheduledOrderStage => {
  if (!scheduledFor || fulfillmentType !== 'scheduled') {
    if (phase === 'created' || phase === 'confirmed') return phase;
    if (phase === 'preparing') return 'preparing';
    if (phase === 'ready') return 'preparing';
    if (phase === 'dispatched') return 'out_for_delivery';
    return phase;
  }

  const prepStart = new Date(scheduledFor.getTime() - 60 * 60000);
  if (now < prepStart) return 'future_scheduled';
  if (now >= prepStart && now < scheduledFor) return 'prep_due';
  if (phase === 'dispatched') return 'out_for_delivery';
  if (phase === 'delivered') return 'delivered';
  if (phase === 'preparing' || phase === 'ready') return 'preparing';
  if (phase === 'scheduled') return 'prep_due';
  return 'scheduled';
};

const colorMap: Record<OrderPhase | PaymentStatus | ScheduledOrderStage, string> = {
  created: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  confirmed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  scheduled: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300',
  preparing: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  ready: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  dispatched: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  delivered: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  expired: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400',
  pending: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  failed: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400',
  pending_verification: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  verified: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  paid: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  unpaid: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300',
  future_scheduled: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300',
  prep_due: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300',
  out_for_delivery: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
};

export const getOrderDisplayLabel = (phase: OrderPhase, paymentStatus: PaymentStatus, scheduledTime?: Date | null): string => {
  if (paymentStatus === 'expired') return 'Order expired';
  if (paymentStatus === 'failed') return 'Payment failed';
  switch (phase) {
    case 'created': return 'Order created';
    case 'confirmed': return 'Order confirmed';
    case 'scheduled': return 'Scheduled';
    case 'preparing': return 'Preparing';
    case 'ready': return 'Ready';
    case 'dispatched': return 'Dispatched';
    case 'delivered': return 'Delivered';
    case 'cancelled': return 'Cancelled';
    default: return 'Order status';
  }
};

export const getOrderDisplayState = (order: Partial<Order>, now: Date = new Date()): OrderDisplayState => {
  const paymentStatus = normalizePaymentStatus(order.paymentStatus);
  const fulfillmentType = getFulfillmentType(order.orderType || order.deliveryType, order.scheduledFor || order.scheduledTime);
  const scheduledFor = order.scheduledFor ? safeParseDate(order.scheduledFor) : order.scheduledTime ? safeParseDate(order.scheduledTime) : null;
  const scheduledDateLabel = scheduledFor ? scheduledFor.toISOString().split('T')[0] : null;
  const scheduledTimeLabel = scheduledFor ? scheduledFor.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) : null;
  const phase = resolveOrderPhase(order.status, paymentStatus, fulfillmentType, scheduledFor || order.scheduledTime, now);
  
  // COD orders should NEVER be considered invalid payment
  const isInvalidPayment = (paymentStatus === 'failed' || paymentStatus === 'expired') && order.paymentMethod !== 'cod' && !order.isCOD;
  
  const isScheduledFuture = fulfillmentType === 'scheduled' && scheduledFor && now < new Date(scheduledFor.getTime() - 60 * 60000);
  const isPrepWindowOpen = fulfillmentType === 'scheduled' && scheduledFor && now >= new Date(scheduledFor.getTime() - 60 * 60000) && now < scheduledFor;
  const orderStage = getScheduledOrderStage(fulfillmentType, phase, scheduledFor, now);
  const showEta = phase === 'dispatched' && !isInvalidPayment;
  const showScheduledLabel = isScheduledFuture && paymentStatus === 'success';
  const showPreparing = phase === 'preparing' && !isInvalidPayment;
  const showReady = phase === 'ready' && !isInvalidPayment;
  const allowMarkReady = showPreparing && !isInvalidPayment && !isScheduledFuture;
  const allowReject = !['delivered', 'cancelled', 'expired'].includes(phase);
  const scheduledLabel = scheduledFor ? `${scheduledFor.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${scheduledTimeLabel}` : 'Scheduled time unavailable';
  
  const customerTitle = isInvalidPayment
    ? paymentStatus === 'expired'
      ? 'Order expired before payment confirmation'
      : 'Payment failed'
    : orderStage === 'future_scheduled'
      ? `Scheduled for ${scheduledLabel}`
      : orderStage === 'prep_due'
        ? `Preparing for ${scheduledLabel}`
        : phase === 'preparing'
          ? 'Preparing your meal'
          : phase === 'ready'
            ? 'Your order is almost ready'
            : phase === 'dispatched'
              ? 'Your order is on the way'
              : phase === 'delivered'
                ? 'Delivered'
                : phase === 'cancelled'
                  ? 'Order cancelled'
                  : // COD orders show different message
                    (order.paymentMethod === 'cod' || order.isCOD)
                    ? 'Cash on Delivery - Pay at doorstep'
                    : 'Order received';

  const customerSubtitle = isInvalidPayment
    ? paymentStatus === 'expired'
      ? 'Your order could not be completed because payment expired.'
      : 'Your payment could not be processed. Please contact support.'
    : orderStage === 'future_scheduled'
      ? 'We will begin preparing your meal closer to the scheduled time.'
      : orderStage === 'prep_due'
        ? 'Your order is scheduled and preparing soon.'
        : phase === 'preparing'
          ? 'Our kitchen is preparing your meal now.'
          : phase === 'ready'
            ? 'Your order is ready for delivery.'
            : phase === 'dispatched'
              ? 'Your food is on the way to your doorstep.'
              : phase === 'delivered'
                ? 'Enjoy your meal!'
                : phase === 'cancelled'
                  ? 'This order has been cancelled.'
                  : // COD orders show different message
                    (order.paymentMethod === 'cod' || order.isCOD)
                    ? 'Please have exact change ready for the delivery person.'
                    : 'Your order has been received and is being processed.';

  const adminBadge = isInvalidPayment
    ? paymentStatus === 'expired'
      ? 'Order expired'
      : 'Payment failed'
    : // COD orders show different badge
      (order.paymentMethod === 'cod' || order.isCOD)
      ? `COD - ${getOrderDisplayLabel(phase, paymentStatus, scheduledFor)}`
      : getOrderDisplayLabel(phase, paymentStatus, scheduledFor);

  return {
    phase,
    orderStage,
    paymentStatus,
    fulfillmentType,
    isInvalidPayment,
    isScheduledFuture,
    isPrepWindowOpen,
    scheduledFor,
    scheduledDateLabel,
    scheduledTimeLabel,
    showEta,
    showScheduledLabel,
    showPreparing,
    showReady,
    customerTitle,
    customerSubtitle,
    adminBadge,
    adminBadgeColor: colorMap[isInvalidPayment ? 'expired' : phase] || colorMap.created,
    allowMarkReady,
    allowReject,
  };
};
