import type {
  PublicPromoCoupon,
  RestaurantOffer,
} from '@/types/marketplace-restaurant';

export function syncPromoContextFromExperience(input: {
  readonly offers?: readonly RestaurantOffer[];
  readonly promoCodes?: readonly PublicPromoCoupon[];
}): {
  readonly offers: readonly RestaurantOffer[];
  readonly promoCodes: readonly PublicPromoCoupon[];
} {
  return {
    offers: input.offers ?? [],
    promoCodes: input.promoCodes ?? [],
  };
}

export function listCopyableCouponCodes(input: {
  readonly offers?: readonly RestaurantOffer[];
  readonly promoCodes?: readonly PublicPromoCoupon[];
}): readonly PublicPromoCoupon[] {
  const byCode = new Map<string, PublicPromoCoupon>();
  for (const coupon of input.promoCodes ?? []) {
    if (coupon.code) byCode.set(coupon.code, coupon);
  }
  for (const offer of input.offers ?? []) {
    const code = offer.couponCode?.trim().toUpperCase();
    if (!code || byCode.has(code)) continue;
    byCode.set(code, {
      id: `offer_${offer.id}`,
      code,
      discountLabel: offer.title,
      minOrder: 0,
    });
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}
