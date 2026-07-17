import type { TenantInfo } from '../context/TenantContext';
import {
  calculateDeliveryDistanceKm,
  computeDeliveryFee,
  isDeliveryFeeEnabled,
} from './deliveryFee';

export type CheckoutPaymentMethod = 'online' | 'cod' | 'upi';

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
  if (paymentConfig?.providers?.upi?.enabled === true && paymentConfig.providers.upi.upiId) {
    methods.push('upi');
  }
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
  if (preferred === 'upi' && enabled.includes('upi')) return 'upi';
  return enabled[0];
}

export function isDeliveryFeesConfigured(tenantInfo?: TenantInfo | null): boolean {
  return isDeliveryFeeEnabled(tenantInfo?.deliveryConfig) || tenantInfo?.deliveryConfig?.feesConfigured === true;
}

export function hasTaxOrPackagingCharges(tenantInfo?: TenantInfo | null): boolean {
  const gst = tenantInfo?.pricingConfig?.gstPercent ?? 0;
  const packing = readPackagingFee(tenantInfo);
  return gst > 0 || packing > 0;
}

function readPackagingFee(tenantInfo?: TenantInfo | null): number {
  const pricing = tenantInfo?.pricingConfig as { packingFee?: number; packagingFee?: number } | undefined;
  return Number(pricing?.packingFee ?? pricing?.packagingFee ?? 0);
}

function hasOwnerStorefrontPricing(tenantInfo?: TenantInfo | null): boolean {
  if (!tenantInfo) return false;
  const pricing = tenantInfo.pricingConfig;
  const delivery = tenantInfo.deliveryConfig;
  return (
    pricing?.gstPercent !== undefined ||
    pricing?.packingFee !== undefined ||
    (pricing as { packagingFee?: number } | undefined)?.packagingFee !== undefined ||
    delivery?.feesConfigured === true ||
    isDeliveryFeeEnabled(delivery)
  );
}

export function hasValidDeliveryCoordinates(
  address?: { lat?: number; lng?: number } | null
): boolean {
  if (!address) return false;
  const { lat, lng } = address;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

export function formatTaxAndChargesLabel(gstPercent: number, packingFee: number): string {
  if (gstPercent > 0 && packingFee > 0) return `GST (${gstPercent}%) + Packaging`;
  if (gstPercent > 0) return `GST (${gstPercent}%)`;
  if (packingFee > 0) return 'Packaging';
  return 'Taxes and Charges';
}

export function resolveTenantPricing(
  tenantId: string | null | undefined,
  tenantInfo?: TenantInfo | null,
  globalFees?: { gst?: number; packingFee?: number; deliveryFee?: number; surgeEnabled?: boolean; peakPricingEnabled?: boolean }
) {
  const delivery = tenantInfo?.deliveryConfig;
  const pricing = tenantInfo?.pricingConfig;
  const ownerConfigured = hasOwnerStorefrontPricing(tenantInfo);

  if (ownerConfigured) {
    return {
      gstPercent: Number(pricing?.gstPercent ?? 0),
      packingFee: readPackagingFee(tenantInfo),
      baseDeliveryFee: isDeliveryFeesConfigured(tenantInfo) ? Number(delivery?.baseFee ?? 0) : 0,
      perKmCharge: Number(delivery?.perKmCharge ?? 0),
      freeRadius: Number(delivery?.freeRadius ?? 0),
      paidRadius: Number(delivery?.paidRadius ?? delivery?.maxRadius ?? 0),
      maxRadius: Number(delivery?.maxRadius ?? 0),
      feesConfigured: isDeliveryFeesConfigured(tenantInfo),
      surgeEnabled: false,
      peakPricingEnabled: false,
      freeDeliveryThreshold: delivery?.feesConfigured
        ? Number(delivery.freeDeliveryMinOrder ?? Infinity)
        : Infinity,
      usesLegacyGlobalFees: false,
    };
  }

  const isLegacyTenant = !tenantId || tenantId === 'mana-inti';

  if (isLegacyTenant && globalFees) {
    return {
      gstPercent: Number(globalFees.gst ?? 5),
      packingFee: Number(globalFees.packingFee ?? 10),
      baseDeliveryFee: Number(globalFees.deliveryFee ?? 30),
      perKmCharge: 0,
      freeRadius: 0,
      paidRadius: 0,
      maxRadius: 0,
      feesConfigured: true,
      surgeEnabled: globalFees.surgeEnabled ?? true,
      peakPricingEnabled: globalFees.peakPricingEnabled ?? true,
      freeDeliveryThreshold: 299,
      usesLegacyGlobalFees: true,
    };
  }

  return {
    gstPercent: 0,
    packingFee: 0,
    baseDeliveryFee: 0,
    perKmCharge: 0,
    freeRadius: 0,
    paidRadius: 0,
    maxRadius: 0,
    feesConfigured: false,
    surgeEnabled: false,
    peakPricingEnabled: false,
    freeDeliveryThreshold: Infinity,
    usesLegacyGlobalFees: false,
  };
}

export function resolveCheckoutDeliveryFee(params: {
  orderType: 'delivery' | 'pickup';
  tenantInfo?: TenantInfo | null;
  address?: { lat?: number; lng?: number; distanceKm?: number } | null;
  subtotal: number;
  pricing: ReturnType<typeof resolveTenantPricing>;
}): { fee: number; pending: boolean; unserviceable: boolean; distanceKm: number } {
  if (params.orderType === 'pickup') {
    return { fee: 0, pending: false, unserviceable: false, distanceKm: 0 };
  }

  if (!hasValidDeliveryCoordinates(params.address)) {
    return { fee: 0, pending: true, unserviceable: false, distanceKm: 0 };
  }

  const kitchen = params.tenantInfo?.location;
  const address = params.address!;
  let distanceKm = Number(address.distanceKm ?? 0);

  if (
    (!Number.isFinite(distanceKm) || distanceKm <= 0) &&
    kitchen?.lat &&
    kitchen?.lng &&
    address.lat != null &&
    address.lng != null
  ) {
    distanceKm = calculateDeliveryDistanceKm(kitchen.lat, kitchen.lng, address.lat, address.lng);
  }

  const computed = computeDeliveryFee(distanceKm, params.tenantInfo?.deliveryConfig);
  if (computed === -1) {
    return { fee: 0, pending: false, unserviceable: true, distanceKm };
  }

  return { fee: Math.max(0, Math.round(computed)), pending: false, unserviceable: false, distanceKm };
}
