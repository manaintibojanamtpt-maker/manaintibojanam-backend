import type { TenantInfo } from '../context/TenantContext';
import { isDeliveryFeeEnabled } from './deliveryFee';

export type CheckoutPaymentMethod = 'online' | 'cod';

export function formatTenantPickupAddress(
  location?: TenantInfo['location'] & { address?: string; city?: string; state?: string; pincode?: string }
): string | null {
  if (!location?.address?.trim()) return null;
  return [location.address, location.city, location.state, location.pincode].filter(Boolean).join(', ');
}

export function getEnabledPaymentMethods(
  paymentConfig?: TenantInfo['paymentConfig'],
  tenantId?: string | null
): CheckoutPaymentMethod[] {
  if ((!paymentConfig?.providers || Object.keys(paymentConfig.providers).length === 0) && tenantId === 'mana-inti') {
    return ['online', 'cod'];
  }

  const methods: CheckoutPaymentMethod[] = [];
  if (paymentConfig?.providers?.cod?.enabled) methods.push('cod');
  if (paymentConfig?.providers?.razorpay?.enabled) methods.push('online');
  if (methods.length === 0) return ['cod'];
  return methods;
}

export function resolveDefaultPaymentMethod(
  paymentConfig?: TenantInfo['paymentConfig']
): CheckoutPaymentMethod {
  const enabled = getEnabledPaymentMethods(paymentConfig);
  const preferred = paymentConfig?.defaultProvider;
  if (preferred === 'cod' && enabled.includes('cod')) return 'cod';
  if (preferred === 'razorpay' && enabled.includes('online')) return 'online';
  return enabled[0];
}

export function isDeliveryFeesConfigured(tenantInfo?: TenantInfo | null): boolean {
  return isDeliveryFeeEnabled(tenantInfo?.deliveryConfig) || tenantInfo?.deliveryConfig?.feesConfigured === true;
}

export function hasTaxOrPackagingCharges(tenantInfo?: TenantInfo | null): boolean {
  const gst = tenantInfo?.pricingConfig?.gstPercent ?? 0;
  const packing = tenantInfo?.pricingConfig?.packingFee ?? 0;
  return gst > 0 || packing > 0;
}

export function resolveTenantPricing(
  tenantId: string | null | undefined,
  tenantInfo?: TenantInfo | null,
  globalFees?: { gst?: number; packingFee?: number; deliveryFee?: number; surgeEnabled?: boolean; peakPricingEnabled?: boolean }
) {
  const isLegacyTenant = !tenantId || tenantId === 'mana-inti';

  if (isLegacyTenant && globalFees) {
    return {
      gstPercent: Number(globalFees.gst ?? 5),
      packingFee: Number(globalFees.packingFee ?? 10),
      baseDeliveryFee: Number(globalFees.deliveryFee ?? 30),
      feesConfigured: true,
      surgeEnabled: globalFees.surgeEnabled ?? true,
      peakPricingEnabled: globalFees.peakPricingEnabled ?? true,
      freeDeliveryThreshold: 299,
    };
  }

  const delivery = tenantInfo?.deliveryConfig;
  const pricing = tenantInfo?.pricingConfig;

  return {
    gstPercent: Number(pricing?.gstPercent ?? 0),
    packingFee: Number(pricing?.packingFee ?? 0),
    baseDeliveryFee: isDeliveryFeeEnabled(delivery) ? Number(delivery?.baseFee ?? 0) : 0,
    feesConfigured: isDeliveryFeeEnabled(delivery),
    surgeEnabled: false,
    peakPricingEnabled: false,
    freeDeliveryThreshold: delivery?.feesConfigured
      ? Number(delivery.freeDeliveryMinOrder ?? Infinity)
      : Infinity,
  };
}
