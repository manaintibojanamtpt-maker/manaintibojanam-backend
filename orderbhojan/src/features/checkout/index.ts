export const CHECKOUT_FEATURE = 'checkout' as const;

export { OrderBhojanCheckoutPage as CheckoutPage } from '@/presentation/checkout';
export { useCheckoutFlow, type CheckoutFlowState, type CheckoutFlowStatus } from './hooks/useCheckoutFlow';
export { useCheckoutScheduleStore } from './store/checkoutScheduleStore';
export {
  normalizeDeliveryScheduleActions,
  pickLatestDeliverySchedulePreference,
  pickScheduleVoiceFeedback,
  type DeliverySchedulePreference,
  type ScheduleVoiceFeedback,
} from './domain/deliveryScheduleFromAssist';
export {
  formatBillDeliveryScheduleLine,
  formatCheckoutDeliveryAddress,
  formatCheckoutEstimatedDelivery,
  formatTrustPanelDeliverySchedule,
  type BillDeliveryScheduleLine,
} from './domain/checkoutDeliveryDisplay';
export {
  resolveSlotFromScheduleAction,
  tryResolveSlotFromScheduleAction,
} from './domain/resolveVoiceScheduleSlot';
