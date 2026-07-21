export { OrderBhojanAuthShellPage as AuthShellPage } from '@/presentation/auth';
export { OrderBhojanProfilePage as ProfilePage } from '@/presentation/profile';
export { RequireAuth } from './ui/RequireAuth';
export { RequireBrowseAuth } from './ui/RequireBrowseAuth';
export { useCustomerProfile } from './hooks/useCustomerProfile';
export * from './domain/auth.types';
export {
  canPlaceMarketplaceOrder,
  hasVerifiedCheckoutEmail,
  hasVerifiedCheckoutIdentity,
  hasVerifiedCheckoutPhone,
  needsCheckoutPhoneVerification,
  resolveCheckoutAuthGate,
} from './domain/checkoutAuth';
export { useAuthSessionStore } from './store/authSessionStore';
