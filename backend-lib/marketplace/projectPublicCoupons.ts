import type { Firestore } from 'firebase-admin/firestore';
import {
  resolveActiveMarketplaceOffers,
  resolvePrimaryMarketplaceOfferLabel,
} from '../domain/marketplaceOffers.js';
import type { TenantMarketplaceOffer } from '../domain/tenant-marketplace.js';

export interface PublicPromoCoupon {
  readonly id: string;
  readonly code: string;
  readonly discountLabel: string;
  readonly minOrder: number;
}

export interface PublicRestaurantOffer {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly badge?: string;
  readonly couponCode?: string;
}

export function normalizeCouponTenantRef(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

/** Coupon tenantId must match the checkout tenant document id or slug (same kitchen only). */
export function couponBelongsToTenant(
  coupon: Record<string, unknown>,
  tenantId: string,
  tenantSlug?: string,
): boolean {
  const couponTenant = normalizeCouponTenantRef(coupon.tenantId);
  if (!couponTenant) return false;
  const candidates = new Set<string>([tenantId.trim()]);
  const slug = tenantSlug?.trim();
  if (slug) candidates.add(slug);
  return candidates.has(couponTenant);
}

export function assertCouponBelongsToTenant(
  coupon: Record<string, unknown>,
  tenantId: string,
  tenantSlug?: string,
): void {
  if (!couponBelongsToTenant(coupon, tenantId, tenantSlug)) {
    throw Object.assign(new Error('This promo code is not valid for this kitchen'), { statusCode: 400 });
  }
}

export function formatPublicCouponDiscountLabel(coupon: {
  readonly discountType?: unknown;
  readonly discountValue?: unknown;
}): string {
  const discountType = coupon.discountType === 'percentage' ? 'percentage' : 'fixed';
  const discountValue = Number(coupon.discountValue ?? 0);
  if (!Number.isFinite(discountValue) || discountValue <= 0) return 'Special offer';
  return discountType === 'percentage' ? `${discountValue}% off` : `₹${discountValue} off`;
}

export function mapCouponDocToPublic(id: string, data: Record<string, unknown>): PublicPromoCoupon {
  return {
    id,
    code: String(data.code ?? '').trim().toUpperCase(),
    discountLabel: formatPublicCouponDiscountLabel(data),
    minOrder: Number(data.minOrder ?? 0),
  };
}

export async function loadActivePublicCouponsForTenant(
  db: Firestore,
  tenantId: string,
): Promise<PublicPromoCoupon[]> {
  const snapshot = await db
    .collection('coupons')
    .where('tenantId', '==', tenantId)
    .where('isActive', '==', true)
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
    .filter(({ data }) => couponBelongsToTenant(data, tenantId))
    .map(({ id, data }) => mapCouponDocToPublic(id, data))
    .filter((coupon) => coupon.code.length > 0)
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function loadActivePublicCouponsByTenantIds(
  db: Firestore,
  tenantIds: readonly string[],
): Promise<Map<string, PublicPromoCoupon[]>> {
  const uniqueIds = [...new Set(tenantIds.filter(Boolean))];
  const grouped = new Map<string, PublicPromoCoupon[]>();
  if (uniqueIds.length === 0) return grouped;

  const chunkSize = 30;
  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const snapshot = await db
      .collection('coupons')
      .where('tenantId', 'in', chunk)
      .where('isActive', '==', true)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data() as Record<string, unknown>;
      const tenantId = normalizeCouponTenantRef(data.tenantId);
      if (!tenantId || !uniqueIds.includes(tenantId)) continue;
      const coupon = mapCouponDocToPublic(doc.id, data);
      if (!coupon.code) continue;
      const current = grouped.get(tenantId) ?? [];
      current.push(coupon);
      grouped.set(tenantId, current);
    }
  }

  for (const [tenantId, coupons] of grouped.entries()) {
    grouped.set(
      tenantId,
      coupons.sort((a, b) => a.code.localeCompare(b.code)),
    );
  }

  return grouped;
}

export function projectPublicRestaurantOffers(
  marketplaceOffers: readonly TenantMarketplaceOffer[] | undefined,
  promoCoupons: readonly PublicPromoCoupon[],
): PublicRestaurantOffer[] {
  const activeOffers = resolveActiveMarketplaceOffers(marketplaceOffers);
  const linkedCodes = new Set(
    activeOffers
      .map((offer) => offer.couponCode?.trim().toUpperCase())
      .filter((code): code is string => Boolean(code)),
  );

  const offerRows: PublicRestaurantOffer[] = activeOffers.map((offer) => ({
    id: offer.offerId,
    title: offer.title?.trim() || offer.displayText,
    description: offer.description ?? offer.displayText,
    badge: offer.badge ?? offer.title ?? resolvePrimaryMarketplaceOfferLabel(offer),
    couponCode: offer.couponCode?.trim().toUpperCase() || undefined,
  }));

  for (const coupon of promoCoupons) {
    if (linkedCodes.has(coupon.code)) continue;
    offerRows.push({
      id: `coupon_${coupon.id}`,
      title: coupon.discountLabel,
      description: coupon.minOrder > 0 ? `Min order ₹${coupon.minOrder}` : 'Available at checkout',
      badge: coupon.discountLabel,
      couponCode: coupon.code,
    });
  }

  return offerRows;
}

export function resolvePrimaryCustomerOfferLabel(input: {
  readonly marketplaceOffers?: readonly TenantMarketplaceOffer[];
  readonly promoCoupons?: readonly PublicPromoCoupon[];
}): string | undefined {
  const activeOffers = resolveActiveMarketplaceOffers(input.marketplaceOffers);
  const primaryOffer = activeOffers[0];
  if (primaryOffer) {
    return resolvePrimaryMarketplaceOfferLabel(primaryOffer);
  }
  const primaryCoupon = input.promoCoupons?.[0];
  if (primaryCoupon) {
    return primaryCoupon.discountLabel;
  }
  return undefined;
}

export function hasVisibleCustomerOffers(input: {
  readonly marketplaceOffers?: readonly TenantMarketplaceOffer[];
  readonly promoCoupons?: readonly PublicPromoCoupon[];
}): boolean {
  return (
    resolveActiveMarketplaceOffers(input.marketplaceOffers).length > 0 ||
    (input.promoCoupons?.length ?? 0) > 0
  );
}
