import type { PublicPromoCoupon, RestaurantOffer } from '@/types/marketplace-restaurant';

function OfferCard({ offer }: { offer: RestaurantOffer }) {
  return (
    <div className="inline-flex max-w-full flex-col rounded-2xl border border-[#FF7A00]/30 bg-[#FF7A00]/10 px-3 py-2 text-left">
      <span className="text-sm font-bold text-[#FF7A00]">{offer.badge ?? offer.title}</span>
      {offer.description && offer.description !== offer.title ? (
        <span className="mt-0.5 text-xs text-white/65">{offer.description}</span>
      ) : null}
    </div>
  );
}

function PromoLabelCard({ coupon }: { coupon: PublicPromoCoupon }) {
  return (
    <div className="inline-flex max-w-full flex-col rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-2 text-left">
      <span className="text-sm font-bold text-white">{coupon.discountLabel}</span>
      {coupon.minOrder > 0 ? (
        <span className="mt-0.5 text-xs text-white/60">Min order ₹{coupon.minOrder}</span>
      ) : null}
    </div>
  );
}

export function OrderBhojanAvailableOffersSection({
  offers,
  promoCodes = [],
}: {
  readonly offers: readonly RestaurantOffer[];
  readonly promoCodes?: readonly PublicPromoCoupon[];
}) {
  const linkedCodes = new Set(
    offers.map((offer) => offer.couponCode?.trim().toUpperCase()).filter(Boolean) as string[],
  );
  const standalonePromos = promoCodes.filter((coupon) => !linkedCodes.has(coupon.code));

  if (offers.length === 0 && standalonePromos.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
      {standalonePromos.map((coupon) => (
        <PromoLabelCard key={coupon.id} coupon={coupon} />
      ))}
    </div>
  );
}
