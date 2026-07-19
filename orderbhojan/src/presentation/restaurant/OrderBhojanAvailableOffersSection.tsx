import { Copy, Tag } from 'lucide-react';
import type { PublicPromoCoupon, RestaurantOffer } from '@/types/marketplace-restaurant';
import { listCopyableCouponCodes } from '@/features/restaurant/domain/promoOffers';
import { notifyToast } from '@/shared/providers/BdsToastProvider';

async function copyCouponCode(code: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(code);
    notifyToast(`${code} copied — apply at checkout`, 'success');
  } catch {
    notifyToast('Could not copy code', 'warning');
  }
}

function OfferCard({
  offer,
  coupon,
}: {
  offer: RestaurantOffer;
  coupon?: PublicPromoCoupon;
}) {
  const code = offer.couponCode ?? coupon?.code;
  return (
    <div className="inline-flex max-w-full flex-col rounded-2xl border border-[#FF7A00]/30 bg-[#FF7A00]/10 px-3 py-2 text-left">
      <span className="text-sm font-bold text-[#FF7A00]">{offer.badge ?? offer.title}</span>
      {offer.description && offer.description !== offer.title ? (
        <span className="mt-0.5 text-xs text-white/65">{offer.description}</span>
      ) : null}
      {code ? (
        <button
          type="button"
          onClick={() => void copyCouponCode(code)}
          className="mt-2 inline-flex items-center gap-2 self-start rounded-lg border border-white/15 bg-black/30 px-2.5 py-1 text-xs font-bold tracking-wider text-white hover:border-[#FF7A00]/40"
          aria-label={`Copy promo code ${code}`}
        >
          {code}
          <Copy className="h-3.5 w-3.5" aria-hidden />
        </button>
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
  const copyableCodes = listCopyableCouponCodes({ offers, promoCodes });
  if (offers.length === 0 && copyableCodes.length === 0) return null;

  const linkedCodes = new Set(
    offers.map((offer) => offer.couponCode?.trim().toUpperCase()).filter(Boolean) as string[],
  );
  const standaloneCoupons = copyableCodes.filter((coupon) => !linkedCodes.has(coupon.code));

  return (
    <div className="flex flex-wrap gap-2">
      {offers.map((offer) => {
        const coupon = copyableCodes.find(
          (entry) => entry.code === offer.couponCode?.trim().toUpperCase(),
        );
        return <OfferCard key={offer.id} offer={offer} coupon={coupon} />;
      })}
      {standaloneCoupons.map((coupon) => (
        <div
          key={coupon.id}
          className="inline-flex max-w-full flex-col rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-2 text-left"
        >
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-white/50">
            <Tag className="h-3.5 w-3.5" aria-hidden />
            Promo code
          </span>
          <span className="mt-1 text-sm font-bold text-white">{coupon.discountLabel}</span>
          {coupon.minOrder > 0 ? (
            <span className="mt-0.5 text-xs text-white/60">Min order ₹{coupon.minOrder}</span>
          ) : null}
          <button
            type="button"
            onClick={() => void copyCouponCode(coupon.code)}
            className="mt-2 inline-flex items-center gap-2 self-start rounded-lg border border-[#FF7A00]/30 bg-[#FF7A00]/10 px-2.5 py-1 text-xs font-bold tracking-wider text-[#FF7A00] hover:bg-[#FF7A00]/15"
            aria-label={`Copy promo code ${coupon.code}`}
          >
            {coupon.code}
            <Copy className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
