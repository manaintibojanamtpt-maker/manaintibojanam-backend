export const CHECKOUT_FEATURE = 'checkout' as const;

export { OrderBhojanCheckoutPage as CheckoutPage } from '@/presentation/checkout';
export { useCheckoutFlow, type CheckoutFlowState, type CheckoutFlowStatus } from './hooks/useCheckoutFlow';
