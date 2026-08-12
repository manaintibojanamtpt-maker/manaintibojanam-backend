import { Bike, ShieldCheck } from 'lucide-react';

export interface OrderBhojanHomeTrustStripProps {
  readonly freeDeliveryThreshold?: number;
  readonly etaDisplay?: string;
}

export function OrderBhojanHomeTrustStrip({
  freeDeliveryThreshold,
  etaDisplay,
}: OrderBhojanHomeTrustStripProps = {}) {
  const subtitleText = freeDeliveryThreshold
    ? `Free delivery on orders over ₹${freeDeliveryThreshold} · Freshly prepared`
    : etaDisplay
      ? `Estimated delivery ${etaDisplay} · Freshly prepared`
      : 'Direct from home kitchens to you — delivered hot and fresh.';

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-[var(--mib-border)] bg-gradient-to-r from-[#120d0c] to-[#1a1412] px-4 py-3.5 shadow-[var(--mib-shadow-card)]"
      role="region"
      aria-label="Why order from home kitchens"
      data-testid="home-trust-strip"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e85d04]/15">
        {freeDeliveryThreshold ? (
          <ShieldCheck className="h-5 w-5 text-[#f4a261]" aria-hidden />
        ) : (
          <Bike className="h-5 w-5 text-[#f4a261]" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold leading-tight text-[#fff8f0]">Cooked in trusted kitchens</p>
        <p className="mt-0.5 text-[12px] leading-snug text-[#c4b5a5]">
          {subtitleText}
        </p>
      </div>
    </div>
  );
}
