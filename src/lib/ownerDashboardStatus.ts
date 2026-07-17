import type { TenantInfo } from '../context/TenantContext';

type TenantSnapshot = Pick<TenantInfo, 'deliveryConfig' | 'paymentConfig' | 'location'> | null | undefined;

/** Matches storeSetupProgress delivery step — not just truthy radius fields. */
export function isOwnerDeliveryConfigured(tenant: TenantSnapshot): boolean {
  if (!tenant?.deliveryConfig) return false;
  if (tenant.deliveryConfig.enabled === false) return false;
  const maxRadius = tenant.deliveryConfig.maxRadius ?? 0;
  const paidRadius = tenant.deliveryConfig.paidRadius ?? 0;
  const freeRadius = tenant.deliveryConfig.freeRadius ?? 0;
  return maxRadius > 0 || paidRadius > 0 || freeRadius > 0;
}

/** Payouts pill = at least one customer payment method enabled (same as setup guide). */
export function isOwnerPayoutsConfigured(tenant: TenantSnapshot): boolean {
  const providers = tenant?.paymentConfig?.providers;
  if (!providers || Object.keys(providers).length === 0) return false;
  return Object.values(providers).some((provider) => provider?.enabled === true);
}

export function isOwnerOnlinePaymentEnabled(tenant: TenantSnapshot): boolean {
  const providers = tenant?.paymentConfig?.providers;
  return (
    providers?.razorpay?.enabled === true ||
    providers?.upi?.enabled === true
  );
}
